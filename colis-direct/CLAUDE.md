# CLAUDE.md — Colis Direct

**Plateforme marketplace de livraison** en Côte d'Ivoire — mise en relation entre expéditeurs et livreurs indépendants.
ColisDirect fixe les tarifs, prélève une commission (20% par défaut), gère les relais/paiements/dispatch.
Multi-rôles, multi-points relais, paiements mobiles (Orange Money, Paystack, CinetPay).

> **Dernière mise à jour : 2026-05-28** — Sprints marketplace 1–4 déployés (tarification, onboarding livreur, dispatch, portefeuille).

---

## Architecture

```
colis-direct/
├── backend/          Node.js + Express + TypeScript (API REST)
├── src/              React 18 + Vite + TypeScript (frontend)
├── database/
│   ├── init/         Schema SQL initial (01_init_schema.sql)
│   └── migrations/   Migrations numérotées (YYYYMMDDHHMMSS_*.sql)
├── tests/e2e/        Playwright (tests sur staging uniquement)
├── scripts/          Utilitaires Node.js (ex: apply-staging-migrations.mjs)
└── docker-compose*.yml  dev / staging / prod
```

**Frontend :** React Router custom hash-based, TailwindCSS, Lucide icons, Recharts, Leaflet, @zxing (scan QR/barcode).
**Backend :** Express, `pg` (node-postgres), JWT, bcryptjs, Nodemailer, Multer.
**DB :** PostgreSQL 15.

---

## Workflow obligatoire

```
dev  →  staging (tests E2E + validation manuelle)  →  main (prod)
```

- **Ne jamais merger dans `main` sans permission explicite.**
- **Déploiement uniquement sur Contabo** (jamais Hostinger).
- Toute migration doit passer par staging avant prod.

---

## Déploiement

- **Staging :** `staging.colisdirect.com` / `staging-api.colisdirect.com`
- **Prod :** `colisdirect.com` / `api.colisdirect.com`
- Les deux tournent sur Contabo via Docker Compose.

### Commandes de déploiement

```bash
# Staging — merge + rebuild
git merge origin/dev --no-edit
docker compose -f docker-compose.staging.yml up -d --build --no-deps colisdirect-backend colisdirect-frontend

# Prod — TOUJOURS utiliser --env-file .env.production (sinon ${COLISDIRECT_DB_PASSWORD} prend la valeur par défaut incorrecte)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build --no-deps colisdirect-backend colisdirect-frontend
```

> **⚠️ CRITIQUE** : Ne jamais exécuter `docker compose -f docker-compose.prod.yml up` sans `--env-file .env.production`. Sans ce flag, la substitution `${COLISDIRECT_DB_PASSWORD}` utilise le fallback `colisdirect_password` au lieu du mot de passe réel, ce qui provoque un crash en boucle du backend prod.

- Pour appliquer des migrations sur staging sans SSH direct :
  ```bash
  E2E_JWT_SECRET=<secret> node scripts/apply-staging-migrations.mjs
  ```
- Pour un fichier unique via SCP :
  ```bash
  scp <fichier_local> vps-contabo:/root/colis-direct/<chemin>
  ```

---

## Migrations

- Fichier : `database/migrations/YYYYMMDDHHMMSS_description.sql`
- Toujours numéroté avec timestamp pour garantir l'ordre.
- Le runner (`backend/src/db/migrate.ts`) les applique séquentiellement.
- Déclenchable via API : `POST /api/admin/settings/run-migrations` (admin JWT requis).
- **Ne jamais modifier une migration déjà appliquée en prod.** Créer une nouvelle.

---

## Rôles utilisateurs

| Rôle | Description |
|---|---|
| `client` | Expéditeur standard |
| `pro` | Client professionnel (carnet d'adresses, volume) |
| `relay_partner` | Opérateur d'un point relais |
| `transporter` | Livreur / chauffeur |
| `admin` | Administrateur système |
| `support` | Agent service client |

---

## Statuts d'un colis (shipment_status)

**Phase collecte :**
- `READY_FOR_DROP_OFF` — paiement confirmé, client doit déposer au relais
- `PAYMENT_CONFIRMED_AWAITING_DROP` — variante paiement avant dépôt
- `PICKUP_PENDING` — ramassage à domicile en attente (home_pickup)

**Phase transit :**
- `RELAY_ORIGIN_RECEIVED` → `CARRIER_COLLECTED` → `IN_TRANSIT` → `RELAY_FINAL_RECEIVED`

**Phase livraison :**
- `AVAILABLE_FOR_PICKUP` — disponible au relais destinataire
- `DELIVERED_TO_CUSTOMER` — livré à domicile
- `PICKED_UP_BY_CUSTOMER` — retiré au relais

**États paiement (mobile money) :**
- `PAYMENT_PENDING_AT_RELAY` → `PAYMENT_RECEIVED_AT_RELAY` → `PAYMENT_AWAITING_VALIDATION` → `PAYMENT_VALIDATED` / `PAYMENT_REJECTED`

**États terminaux :** `DELIVERED`, `CANCELLED`, `RETURN_TO_SENDER`

---

## Méthodes de collecte & livraison

**Collecte (pickup_method) :**
- `relay_deposit` — client dépose au point relais (défaut)
- `home_pickup` — transporteur passe récupérer à domicile

**Livraison :**
- `home_delivery = true` — livraison à domicile
- `home_delivery = false` — retrait au point relais destinataire

---

## Paiements

| Méthode | Valeur en DB | Notes |
|---|---|---|
| Mobile Money | `mobile_money` | Orange Money, etc. |
| Cash au relais | `relay_cash` | Collecté par le relais |
| Paystack | `paystack` | Carte bancaire |
| CinetPay | `cinetpay` | Carte bancaire |

---

## Routes backend principales

| Préfixe | Fichier | Rôle |
|---|---|---|
| `/api/auth` | `auth.ts` | Signin, signup, me |
| `/api/shipments` | `shipments.ts` | CRUD + transitions de statut |
| `/api/tracking/:id` | `tracking.ts` | Tracking public |
| `/api/relay-points` | `relayPoints.ts` | Gestion des relais |
| `/api/transporters` | `transporters.ts` | Profils transporteurs |
| `/api/payments` | `payments.ts` | Init paiement + webhooks |
| `/api/analytics` | `analytics.ts` | Stats admin (vues SQL) |
| `/api/stats` | `stats.ts` | Dashboard métriques |
| `/api/support` | `support.ts` | Tickets & messages |
| `/api/admin/settings` | `adminSettings.ts` | Config + migrations + purge |
| `/api/scan` | `scan.ts` | Traitement QR/barcode |
| `/api/handoffs` | `handoffs.ts` | Remise transporteur (`POST /scan`) + crédit portefeuille à la livraison |
| `/api/promo-codes` | `promoCodes.ts` | Codes promo |
| `/api/cart` | `cart.ts` | Panier persistant |
| `/api/v1` | `apiV1.ts` | API publique (clés API) |
| `/api/pricing-grids` | `pricingGrids.ts` | Grilles de prix + `GET /calculate` (4 modes) |
| `/api/transporter-applications` | `transporterApplications.ts` | Candidatures livreurs (public POST + admin PATCH status) |
| `/api/delivery-offers` | `deliveryOffers.ts` | Offres de course dispatch + accept/decline |
| `/api/transporter/wallet` | `transporterWallet.ts` | Portefeuille livreur + retraits + admin validation |

### Routes shipments notables

| Méthode | Chemin | Rôle |
|---|---|---|
| `POST` | `/:tn/relay-return` | relay_partner initie retour expéditeur (statut `RELAY_ORIGIN_RECEIVED` → `RETURN_TO_SENDER`) |
| `POST` | `/:tn/relay-incident` | relay_partner signale un incident sur un colis |
| `POST` | `/:tn/assign-transporter` | admin/relay assigne un transporteur |
| `PATCH` | `/:tn/status` | transition de statut générique (admin) |
| `POST` | `/:tn/switch-to-relay-payment` | client bascule vers paiement à la prise en charge |

---

## Vues analytiques (créées en migration)

- `daily_statistics` — agrégats journaliers
- `monthly_reports` — agrégats mensuels + taux de succès
- `relay_point_performance` — performance par relais
- `shipment_statistics` — utilisée par `/api/analytics/shipment-stats`

---

## Pages frontend

**Public :** HomePage, TrackingPage, MapPage, PricingPage, HowItWorksPage, BecomeRelayPage, BecomeTransporterPage (`/become-transporter`), CareerPage
**Client :** CreateShipmentPage (étape Mode → DeliveryModeSelector), CartPage, MyShipmentsPage, MyProfilePage, MyAddressBookPage, PaymentSuccessPage
**Dashboards :** AdminDashboard, RelayDashboard, TransporterLoginPage (feed courses + portefeuille), TransporterPickupPage, ProDashboard, CustomerSupportDashboard

### AdminDashboard — sections disponibles
`dashboard` | `users` | `relay-points` | `relay-applications` | `transporter-applications` | `shipments` | `transporters` | `delivery-zones` | `pricing` | `promo-codes` | `marketplace-finance` | `support-messages` | `job-postings` | `api-keys` | `settings`

---

## Compteur `current_packages` (transporteurs)

Champ `transporters.current_packages` — nombre de colis actifs assignés.
- Incrémenté à l'assignation.
- Décrémenté par trigger `trg_decrement_transporter_packages` sur transition vers statut terminal.
- En cas de drift : la migration `20260521020000_fix_current_packages_recalc.sql` recalcule depuis `transporter_assignments JOIN shipments`.

---

## Tests E2E (Playwright)

- Tournent **uniquement sur staging** (`staging.colisdirect.com`).
- Comptes de test : `e2e+<role>@colisdirect.test`, mot de passe `admin123`.
- Roles couverts : `client`, `admin`, `relay`, `transporter`, `support`.
- Specs : `infrastructure`, `auth-smoke`, `signup-smoke`, `public-smoke`, `relay-dashboard-smoke`, `admin-dashboard-smoke`.
- Commandes :
  ```bash
  npm run test:e2e:staging    # headless sur staging
  npm run test:e2e:headed     # avec navigateur visible
  npm run test:e2e:ui         # interface interactive
  ```

---

## Route de purge (dev/staging uniquement)

`POST /api/admin/settings/purge-shipments` supprime tous les colis en cascade et remet `current_packages` à 0.
Bloqué si `NODE_ENV === 'production'` (retourne 403).

---

## Commandes utiles

```bash
# Dev local
npm run dev                    # frontend Vite
cd backend && npm run dev      # backend watch

# Build
npx tsc --noEmit               # typecheck frontend
cd backend && npm run build    # compile backend

# Migrations
cd backend && npm run migrate  # appliquer migrations locales

# E2E
npm run test:e2e:staging
```

---

## Principes de développement

- Les transitions de statut côté backend sont la source de vérité — le frontend reflète, ne décide pas.
- `getEffectiveShipmentStatus()` côté frontend normalise les statuts pour l'affichage (ne pas dupliquer cette logique).
- Toujours utiliser des paramètres SQL bindés (`$1`, `$2`…) — jamais d'interpolation de chaîne dans les requêtes.
- Pour les intervalles PostgreSQL dynamiques : `($1 || ' days')::interval` (pas `INTERVAL '$1 days'`).
- Les triggers DB sont préférés aux mises à jour applicatives pour les compteurs (ex: `current_packages`).
- Pas de commentaires évidents dans le code — seulement les WHY non-obvieux.

---

## Sécurité CORS

La liste blanche des origines autorisées est **explicite** dans `backend/src/index.ts` :
```
https://colisdirect.com
https://www.colisdirect.com
https://staging.colisdirect.com
http://localhost:5173
http://localhost:3000
http://127.0.0.1:5173
http://127.0.0.1:3000
```
**Ne jamais** utiliser `origin.includes('colisdirect.com')` comme fallback — vulnérable à l'injection de sous-domaine malveillant.

---

## Incidents (`shipment_incidents`)

Migration `20260524010000_relay_incident_and_return.sql` :
- `transporter_id` est nullable (était `NOT NULL`)
- Colonne `relay_partner_id UUID REFERENCES users(id)` ajoutée
- Contrainte `chk_incident_reporter` : `transporter_id IS NOT NULL OR relay_partner_id IS NOT NULL`
- Types d'incident acceptés : `colis_endommage`, `client_absent`, `adresse_erronee`, `relais_ferme`, `autre`

---

## RelayDashboard — logique boutons

Dans le modal d'action (`isShipmentActionModalOpen`) et le modal transporteur :

| Statut | Contexte | Actions |
|---|---|---|
| `RELAY_ORIGIN_RECEIVED` | relais d'origine | Signaler incident / Retirer le colis (retour expéditeur) |
| `RELAY_ORIGIN_RECEIVED` | modal transporteur | Remettre au transporteur (`api.scanHandoff`) |
| Autre statut nécessitant paiement | tout | Confirmer le paiement |
| Autre statut sans paiement | tout | Réceptionner |

`isAtOriginRelay` = `user.relay_point_id === shipment.origin_relay_id`
`isAtDestinationRelay` = `user.relay_point_id === shipment.destination_relay_id`

---

## API frontend (`src/lib/api.ts`) — méthodes notables

- `relayInitiateReturn(trackingNumber)` → `POST /shipments/:tn/relay-return`
- `relayReportIncident(trackingNumber, incidentType, description)` → `POST /shipments/:tn/relay-incident`
- `scanHandoff(tracking, relay?, transporterId?)` → `POST /handoffs/scan` — remise au transporteur
- `carrierPickup(tracking)` → `POST /scan/extras/carrier-pickup` — **transporteur uniquement**
- `switchToRelayPayment(trackingNumber)` → `POST /shipments/:tn/switch-to-relay-payment`
- `initMobileMoneyPayment(payload)` → `POST /payments/mobile-money/init` — route unifiée (provider actif dans admin_settings)
- `getTransporterApplications(status?)` / `updateTransporterApplicationStatus(id, status, reason?, notes?)`
- `getAdminWallets()` / `getAdminWithdrawals()` / `approveWithdrawal(txId, ref?)` / `rejectWithdrawal(txId, reason?)`

---

## Marketplace — tables DB ajoutées (migration 20260528000000)

| Table | Rôle |
|---|---|
| `commission_settings` | Taux de commission configurable (défaut 20%) |
| `transporter_wallets` | Solde + totaux par livreur |
| `wallet_transactions` | Historique (commission_earned, withdrawal, adjustment, bonus) |
| `delivery_offers` | Offres de course dispatch (pending→accepted/declined/expired) |
| `transporter_applications` | Candidatures livreurs indépendants |

### Service dispatch (`backend/src/services/dispatchService.ts`)
- `dispatchShipment(shipmentId)` — sélectionne livreurs dans la zone + crée offres
- `processExpiredOffers()` — avance la cascade si offre expirée (cron 60s au boot)
- `creditTransporterWallet(shipmentId, transporterId)` — calcule net = price × (1 - commission_rate) et crédite

### Tarification 4 modes (`GET /api/pricing-grids/calculate`)
```
relay → relay   = prix × 0.90  (-10%)  — seul mode inter-régions autorisé
home  → relay   = prix × 0.95  (-5%)
relay → home    = prix × 0.95  (-5%)
home  → home    = prix × 1.00  (0%)
```

### Déploiement staging — note clé
Les variables `PAYSTACK_SECRET_KEY`, `CINETPAY_API_KEY`, `CINETPAY_SITE_ID` viennent **uniquement de `.env.staging`** (env_file).
Elles ont été retirées du bloc `environment:` du `docker-compose.staging.yml` car `${VAR}` shell vide écrasait les valeurs de env_file.

---

## Dette technique connue (audit 2026-05-24)

Voir `RAPPORT_AUDIT.md` pour le rapport complet et la roadmap en 5 sprints.

Points critiques à traiter en priorité :
1. **Validation Zod manquante** sur les routes backend (tout est validé manuellement ou pas du tout)
2. **Transactions SQL absentes** dans la création de colis (3 INSERT sans `BEGIN/COMMIT`)
3. **JWT TTL 7 jours** — réduire à 1h access + refresh token
4. **Vérification MIME** absente sur l'upload de fichiers (Multer accepte tout)
5. **278 `any` TypeScript** dans le frontend — à typer progressivement
6. **38 méthodes API mortes** dans `src/lib/api.ts` — à supprimer après validation

Tables DB potentiellement inutilisées (à vérifier avant suppression) :
`relay_partners`, `shipment_status_history`, `shipment_tracking`, `relay_point_metrics`, `customer_messages`

Index dupliqué connu : `tracking_events.shipment_id` a deux index (dont un inutile créé en migration).
