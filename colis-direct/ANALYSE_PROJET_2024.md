# Analyse projet Colis Direct — Mai 2026

> Document de référence technique généré par analyse du code source. Source de vérité : le code, pas ce fichier.

---

## Stack technique

| Couche | Technologies |
|--------|-------------|
| **Frontend** | React 18.3 · Vite 5.4 · TypeScript 5.5 · Tailwind 3.4 · Recharts · Leaflet |
| **Backend** | Node.js · Express · TypeScript 5.3 |
| **Base de données** | PostgreSQL 15 |
| **Paiements** | Paystack (principal) · CinetPay (secours) · Relay Cash (espèces) |
| **Infrastructure** | Docker Compose · Traefik · VPS Contabo (178.238.229.159) |
| **Tests** | Playwright E2E |

---

## Structure du projet

```
colis-direct/
├── backend/src/          # API Express (routes, middleware, db)
├── src/                  # Frontend React (pages, components, utils)
├── database/
│   ├── init/             # 01_init_schema.sql (schéma complet PostgreSQL)
│   └── migrations/       # Migrations SQL auto-appliquées au démarrage
├── docs/                 # Documentation technique
├── docker-compose.yml             # Dev local
├── docker-compose.dev.yml         # Dev avec volumes hot-reload
├── docker-compose.staging.yml     # Staging (Traefik HTTPS)
└── docker-compose.prod.yml        # Production
```

---

## Base de données

### Enum `shipment_status` (statuts logistiques)

```
READY_FOR_DROP_OFF          → En attente de dépôt au relais
PICKUP_PENDING              → Ramassage à domicile en attente
RELAY_ORIGIN_RECEIVED       → Reçu au relais de départ
CARRIER_COLLECTED           → Pris en charge par le transporteur
IN_TRANSIT                  → En transit
RELAY_FINAL_RECEIVED        → Reçu au relais de destination
AVAILABLE_FOR_PICKUP        → Disponible au retrait (prêt pour le client)
PICKED_UP_BY_CUSTOMER       → Retiré par le destinataire
DELIVERED                   → Livré (usage relais, historique)
DELIVERED_TO_CUSTOMER       → Livré à domicile
RETURN_TO_SENDER            → Retour à l'expéditeur
CANCELLED                   → Annulé
PAYMENT_AWAITING_VALIDATION → Paiement en attente de validation
PAYMENT_VALIDATED           → Paiement validé
PAYMENT_REJECTED            → Paiement rejeté
PAYMENT_CONFIRMED_AWAITING_DROP  → Paiement OK, en attente de dépôt
PAYMENT_PENDING_AT_RELAY    → Paiement à effectuer au relais
PAYMENT_RECEIVED_AT_RELAY   → Paiement encaissé au relais
```

> **Important** : `PAYMENT_AWAITING_VALIDATION`, `PAYMENT_CONFIRMED_AWAITING_DROP`, `PAYMENT_PENDING_AT_RELAY`, `PAYMENT_RECEIVED_AT_RELAY` sont des **effective_status calculés** (logistique + paiement fusionnés). Le champ `shipments.current_status` ne contient que les statuts purement logistiques.

### Rôles utilisateurs

`user` · `client` · `pro` · `admin` · `relay_partner` · `transporter` · `support` · `support_supervisor`

### Tables principales (49 tables)

| Table | Description |
|-------|-------------|
| `users` | Comptes (tous rôles) |
| `shipments` | Colis — tracking_number, shipment_code, current_status, payment_method, pickup_code |
| `relay_points` | Points relais (relay_code, commune, zone_id) |
| `transporters` | Profils transporteurs (current_packages, transporter_code) |
| `transporter_assignments` | Affectations transporteur↔colis (assignment_status) |
| `transporter_delivery_zones` | Zones de livraison par transporteur |
| `delivery_zones` | Zones (communes[], bbox lat/lon) |
| `tracking_events` | Historique des scans (shipment_id, status, scanner_id, timestamp) |
| `shipment_status_history` | Historique des transitions de statut |
| `mobile_money_payments` | Paiements Mobile Money (status, transaction_id) |
| `relay_cash_payments` | Paiements espèces au relais (amount_expected/collected, status) |
| `automated_payments` | Paiements Paystack/CinetPay (provider, transaction_id, raw_response jsonb) |
| `relay_point_daily_metrics` | Métriques quotidiennes relais (recalculées par trigger) |
| `pricing_settings` | Grilles tarifaires (weight_ranges, delivery_modes en jsonb) |
| `additional_pricing_options` | Options additionnelles (impression, assistance, emballage) |
| `support_tickets` | Tickets support |
| `support_messages` | Messages dans les tickets |
| `customer_messages` | Messages directs client→support |

### Fonctions PL/pgSQL clés

| Fonction | Rôle |
|----------|------|
| `generate_shipment_code()` | 4 chiffres + 2 lettres (ex. `1234AB`) |
| `generate_pickup_code()` | 6 chiffres unique par colis |
| `generate_relay_code()` | 6 chiffres identifiant relais |
| `generate_transporter_code()` | 6 chiffres identifiant transporteur |
| `assign_shipment_to_transporter(shipment_uuid)` | Score = distance + charge ; insert dans transporter_assignments + incrémente current_packages |
| `process_shipment_scan(...)` | Moteur de transition de statut avec validations paiement |
| `refresh_relay_daily_metrics(relay_id, date)` | Recalcule métriques relais |
| `decrement_transporter_packages()` | **Trigger** : décrémente current_packages quand un colis atteint un statut terminal |

### Migrations actives (database/migrations/)

| Fichier | Ce qu'elle fait |
|---------|----------------|
| `20260520100000_add_paystack_to_shipments_payment_method.sql` | Ajoute `'paystack'` à la contrainte `payment_method` de la table `shipments` |
| `20260520110000_fix_transporter_current_packages_decrement.sql` | Crée le trigger `trg_decrement_transporter_packages` + recalcule les compteurs existants |

---

## Backend API (port 3001)

### Authentification
JWT HS256, secret `JWT_SECRET`, expiry `JWT_EXPIRES_IN` (défaut 7j). Token stocké côté client en localStorage. Middleware `authenticate()` + `requireRole(...)`.

### Routes principales

| Préfixe | Fichier | Fonctions clés |
|---------|---------|----------------|
| `/api/auth` | auth.ts | signin, signup, signout, /me |
| `/api/shipments` | shipments.ts | CRUD colis, assign, confirm-payment, cancel |
| `/api/scan` | scan.ts | relay-intake, relay-final-intake, carrier-pickup, confirm-home-pickup, make-available, complete-delivery |
| `/api/handoffs` | handoffs.ts | transporter/assignments, transporter/delivered-shipments, relay/pickups, verify-pickup, find-transporter |
| `/api/payments` | payments.ts | relay-cash/confirm, paystack/init, paystack/webhook, cinetpay/notify, mobile-money/init-batch |
| `/api/tracking` | tracking.ts | tracking public par numéro/code |
| `/api/relay-points` | relayPoints.ts | CRUD, stats, métriques journalières |
| `/api/transporters` | transporters.ts | CRUD transporteurs |
| `/api/delivery-zones` | deliveryZones.ts | CRUD zones, affectation transporteurs |
| `/api/analytics` | analytics.ts | stats daily/monthly/relay-performance |
| `/api/support` | support.ts | tickets, messages, notes, reminders, assign |
| `/api/v1` | apiV1.ts | API publique partenaires (clé API) |
| `/api/chatbot` | chatbot.ts | messages chatbot |
| `/api/pricing` | pricing.ts | grilles tarifaires |
| `/api/additional-options` | additionalOptions.ts | options impression/assistance/emballage |

### Système de migrations (`backend/src/db/migrate.ts`)
- Lit les `.sql` dans `database/migrations/` (montés en volume dans Docker)
- Exécution dans des transactions PostgreSQL
- Enregistre dans la table `migrations(filename, executed_at)`
- Les erreurs non critiques (`already exists`, `duplicate key`) sont ignorées

---

## Frontend

### Pages

| Page | Rôle | Accès |
|------|------|-------|
| `HomePage` | Landing page | Public |
| `TrackingPage` | Suivi public colis | Public |
| `LoginPage` | Authentification | Public |
| `CreateShipmentPage` | Formulaire création colis | Client/Guest |
| `CartPage` | Panier + paiement (batch Paystack) | Client |
| `MyShipmentsPage` | Historique envois | Client |
| `MyProfilePage` | Profil utilisateur | Client |
| `TransporterLoginPage` | Dashboard transporteur (tournée, scans, livraisons) | Transporter |
| `TransporterPickupPage` | Formulaire pickup + confirmation | Transporter |
| `RelayDashboard` | Opérations relais (scan, paiement, métriques) | Relay Partner |
| `ProDashboard` | Dashboard professionnel | Pro |
| `AdminDashboard` | Administration complète | Admin |
| `MessageriesPage` | Support client (tickets) | Client |
| `PricingPage` | Tarification publique | Public |
| `MapPage` | Carte des relais (Leaflet) | Public |

### Utilitaires clés (`src/utils/shipmentStatus.ts`)

- `normalizeShipmentStatus(status)` → enum canonique
- `isShipmentDelivered(status)` → true pour DELIVERED, DELIVERED_TO_CUSTOMER, PICKED_UP_BY_CUSTOMER (**pas** RELAY_FINAL_RECEIVED ni AVAILABLE_FOR_PICKUP)
- `isTerminalForTransporter(status)` → true pour tous les précédents **plus** RELAY_FINAL_RECEIVED et AVAILABLE_FOR_PICKUP (défini localement dans `TransporterLoginPage.tsx`)
- `isShipmentAtDestinationRelay(status)` → true pour RELAY_FINAL_RECEIVED, AVAILABLE_FOR_PICKUP, PICKED_UP_BY_CUSTOMER
- `getEffectiveShipmentStatus(shipment)` → statut affiché fusionné logistique + paiement
- `getDeliveryStatusLabel(shipment)` → label FR pour affichage

---

## Flux métier

### 1. Création de commande

```
Client → CartPage/CreateShipmentPage
  POST /api/shipments
    ↓
  current_status = READY_FOR_DROP_OFF (si dépôt relais)
                OU PICKUP_PENDING (si ramassage à domicile)
  shipment_code = 4 chiffres + 2 lettres
  tracking_number = CD + timestamp + random
    ↓
  assign_shipment_to_transporter() → transporter_assignments
```

### 2. Flux relais complet

```
READY_FOR_DROP_OFF
  → relay-intake         → RELAY_ORIGIN_RECEIVED   (scan relais départ)
  → carrier-pickup       → CARRIER_COLLECTED        (scan transporteur)
  → [interne]            → IN_TRANSIT               (départ)
  → relay-final-intake   → RELAY_FINAL_RECEIVED     (scan relais destination)
  → ops/make-available   → AVAILABLE_FOR_PICKUP     (mise à disposition)
  → complete-delivery    → PICKED_UP_BY_CUSTOMER    (retrait client avec pickup_code)
```

### 3. Ramassage à domicile → livraison relais

```
PICKUP_PENDING
  → confirm-home-pickup  → CARRIER_COLLECTED        (transporteur chez l'expéditeur)
  → [interne]            → IN_TRANSIT
  → relay-final-intake   → RELAY_FINAL_RECEIVED
  → ops/make-available   → AVAILABLE_FOR_PICKUP
  → complete-delivery    → PICKED_UP_BY_CUSTOMER
```

### 4. Ramassage à domicile → livraison à domicile

```
PICKUP_PENDING
  → confirm-home-pickup  → CARRIER_COLLECTED
  → [interne]            → IN_TRANSIT
  → handoffs/scan        → DELIVERED_TO_CUSTOMER
```

### 5. Paiement Paystack (individuel)

```
POST /api/payments/paystack/init
  → Paystack API /transaction/initialize
  → authorization_url → redirect client
  → Webhook charge.success
    → UPDATE shipments SET payment_status='paid', payment_method='paystack'
    → UPDATE effective_status → PAYMENT_CONFIRMED_AWAITING_DROP
```

### 6. Paiement Paystack (batch, CartPage)

```
POST /api/payments/mobile-money/init-batch
  { tracking_numbers: [...] }
  → batch_ref = BATCH-{ts}-{rand}
  → INSERT automated_payments (provider='batch_pending', raw_response={tracking_numbers:[...]})
  → Paystack API → authorization_url avec metadata.batch_ref
  → Webhook: detect via metadata.batch_ref (PAS via ref.startsWith('BATCH-'))
    → Lit tracking_numbers depuis automated_payments.raw_response
    → UPDATE tous les shipments: payment_status='paid', payment_method='paystack'
```

### 7. Dashboard transporteur (`TransporterLoginPage`)

**Règle clé — statuts terminaux pour le transporteur :**
Un colis quitte les colonnes actives (Relay / Domicile) dès qu'il atteint un statut **terminal pour le transporteur** :
- `DELIVERED`, `DELIVERED_TO_CUSTOMER`, `PICKED_UP_BY_CUSTOMER`
- **`RELAY_FINAL_RECEIVED`** ← le colis est déposé au relais de destination → tournée terminée
- **`AVAILABLE_FOR_PICKUP`** ← le relais a confirmé disponibilité → tournée terminée

Ces packages passent dans la section "Colis livrés" (lecture seule).

**`current_packages` :** Incrémenté par `assign_shipment_to_transporter()`, décrémenté par le trigger `trg_decrement_transporter_packages` à chaque transition vers un statut terminal (DELIVERED, DELIVERED_TO_CUSTOMER, PICKED_UP_BY_CUSTOMER, CANCELLED, RETURN_TO_SENDER).

### 8. Pickup code (code de retrait)

- Généré à la **première réception** (`RELAY_ORIGIN_RECEIVED` ou `CARRIER_COLLECTED` en home_pickup)
- **Affiché au client** uniquement à `AVAILABLE_FOR_PICKUP` (pas à RELAY_FINAL_RECEIVED)
- **Affiché sur la TrackingPage** : message "Présentez-vous avec votre code de retrait" uniquement à `AVAILABLE_FOR_PICKUP`
- Vérifié par `complete-delivery` côté relais de destination

---

## Page de suivi TrackingPage — étapes

### Dépôt relais → livraison relais (`RELAY_STEPS`)
`Commande créée` → `Déposé au relais` → `En transit` → `Au relais de livraison` → `Retiré`

### Dépôt relais → livraison domicile (`HOME_STEPS_RELAY`)
`Commande créée` → `Déposé au relais` → `En transit` → `Livré à domicile`

### Ramassage domicile → livraison relais (`HOME_PICKUP_STEPS_RELAY`)
`Commande créée` → **`Ramassage`** → `En transit` → `Au relais de livraison` → `Retiré`

### Ramassage domicile → livraison domicile (`HOME_STEPS_DIRECT`)
`Commande créée` → **`Ramassage`** → `En transit` → `Livré à domicile`

> **`Ramassage`** correspond au statut `CARRIER_COLLECTED` (transporteur a collecté le colis chez l'expéditeur).

---

## Infrastructure déploiement

### VPS Contabo
- IP : `178.238.229.159` — alias SSH : `vps-contabo`
- Projet dans : `/root/colis-direct`
- Traefik gère le SSL Let's Encrypt et le routing HTTPS

### Conteneurs

| Conteneur | Env | URL |
|-----------|-----|-----|
| `colisdirect-frontend` | Prod | https://colisdirect.com |
| `colisdirect-backend` | Prod | https://api.colisdirect.com |
| `colisdirect-db` | Prod | Interne |
| `colisdirect-frontend-staging` | Staging | https://staging.colisdirect.com |
| `colisdirect-backend-staging` | Staging | https://staging-api.colisdirect.com |
| `colisdirect-db-staging` | Staging | Interne |

### Workflow Git

```
dev  →  staging (tests VPS)  →  main (production)
```

Commits uniquement sur `dev`. Merge vers `staging` pour tests, vers `main` pour prod.

### Déploiement rapide staging (depuis dev)

```bash
ssh vps-contabo
cd /root/colis-direct
git fetch origin && git reset --hard origin/dev
docker compose -f docker-compose.staging.yml up -d --build colisdirect-frontend colisdirect-backend
```

### Variables d'environnement critiques

| Variable | Usage |
|----------|-------|
| `JWT_SECRET` | Signature JWT |
| `PAYSTACK_SECRET_KEY` | API Paystack + validation webhook (HMAC SHA512) |
| `DB_HOST/NAME/USER/PASSWORD` | Connexion PostgreSQL |
| `VITE_API_URL` | URL API exposée au navigateur |
| `FRONTEND_URL` / `BACKEND_URL` | URLs callbacks paiement |
| `SMTP_*` | Envoi d'emails |
| `N8N_SMS_WEBHOOK_URL` | Notifications SMS via n8n |
| `RUN_MIGRATIONS` | `true` en staging/prod pour auto-migration au démarrage |

---

## Règles critiques

1. **Toutes les modifications de schéma PostgreSQL** (ALTER TABLE, CREATE FUNCTION, CREATE TRIGGER, CREATE INDEX) **DOIVENT** passer par un fichier dans `database/migrations/`. Jamais directement en base.

2. **Migrations nommées** : `YYYYMMDDHHMMSS_description.sql` — ordre chronologique strict.

3. **Ne jamais modifier** une migration déjà déployée en production → créer une migration corrective.

4. **Le pickup_code** n'est jamais affiché avant `AVAILABLE_FOR_PICKUP` — même s'il est généré plus tôt.

5. **Le scoring d'affectation transporteur** dépend de `current_packages`. Si ce compteur est faux (bug de décrémentation), l'affectation est cassée.

---

*Mise à jour : mai 2026 — générée par analyse du code source.*
