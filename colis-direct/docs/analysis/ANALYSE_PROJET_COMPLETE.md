# Analyse complète du projet Colis Direct — Mai 2026

> Générée par analyse du code source. Valider contre le dépôt actuel.

---

## Vue d'ensemble

**Colis Direct** est une plateforme web de livraison de colis à Abidjan (Côte d'Ivoire) via un réseau de points relais locaux. Full-stack conteneurisé, multi-acteurs (client, relais, transporteur, admin, support).

---

## Architecture technique

### Stack

| Couche | Technologies |
|--------|-------------|
| **Frontend** | React 18.3 · Vite 5.4 · TypeScript 5.5 · Tailwind 3.4 · Recharts · Leaflet |
| **Backend** | Node.js · Express 4 · TypeScript 5.3 |
| **Base de données** | PostgreSQL 15 |
| **Paiements** | Paystack (principal) · CinetPay (secours) · Relay Cash |
| **Notifications** | SMTP · n8n webhooks (SMS, WhatsApp) |
| **Infrastructure** | Docker Compose · Traefik · VPS Contabo |
| **Tests** | Playwright E2E |

### Ports

| Service | Dev | Staging/Prod |
|---------|-----|-------------|
| Frontend | 5173 | 80 (interne) |
| Backend | 3001 | 3001 (interne) |
| PostgreSQL | 5434 (exposé hôte) | interne uniquement |

---

## Structure des répertoires

```
colis-direct/
├── backend/
│   ├── src/
│   │   ├── routes/          # 30+ fichiers de routes Express
│   │   ├── middleware/       # auth.ts, rateLimit, upload
│   │   ├── db/              # connection.ts, migrate.ts
│   │   └── services/        # emailService.ts
│   ├── tsconfig.json
│   └── package.json
├── src/                     # Frontend React
│   ├── pages/               # ~25 pages
│   ├── components/          # Composants réutilisables
│   ├── lib/api.ts           # Client API (70+ méthodes)
│   └── utils/               # shipmentStatus.ts, waybillUtils, invoiceUtils
├── database/
│   ├── init/01_init_schema.sql   # Schéma PostgreSQL complet (4760 lignes)
│   └── migrations/               # Fichiers SQL ordonnés par timestamp
├── docs/                    # Documentation technique
├── docker-compose.yml       # Dev
├── docker-compose.dev.yml   # Dev avec hot-reload volumes
├── docker-compose.staging.yml
└── docker-compose.prod.yml
```

---

## Base de données (PostgreSQL 15)

### Enum `shipment_status`

Valeurs logistiques réelles en base (`current_status`) :

```
READY_FOR_DROP_OFF          RELAY_ORIGIN_RECEIVED    CARRIER_COLLECTED
PICKUP_PENDING              IN_TRANSIT               RELAY_FINAL_RECEIVED
AVAILABLE_FOR_PICKUP        PICKED_UP_BY_CUSTOMER    DELIVERED
DELIVERED_TO_CUSTOMER       RETURN_TO_SENDER         CANCELLED
```

Valeurs calculées (`effective_status`, jamais en base) :

```
PAYMENT_AWAITING_VALIDATION   PAYMENT_VALIDATED        PAYMENT_REJECTED
PAYMENT_CONFIRMED_AWAITING_DROP   PAYMENT_PENDING_AT_RELAY   PAYMENT_RECEIVED_AT_RELAY
```

### Rôles utilisateurs

```
user · client · pro · admin · relay_partner · transporter · support · support_supervisor
```

### Tables clés (49 tables au total)

| Table | Colonnes notables |
|-------|-------------------|
| `users` | id, email, role, relay_point_id, phone, commune |
| `shipments` | tracking_number, shipment_code, current_status, payment_method, payment_status, pickup_code, home_delivery, pickup_method, origin_relay_id, destination_relay_id, transporter_id, price |
| `relay_points` | relay_code, commune, zone_id, latitude, longitude, is_active |
| `transporters` | user_id, current_packages, transporter_code, status |
| `transporter_assignments` | transporter_id, shipment_id, assignment_status, picked_up_at |
| `transporter_delivery_zones` | transporter_id, zone_id, priority |
| `delivery_zones` | communes (text[]), bbox lat/lon |
| `tracking_events` | shipment_id, status, scanner_id, scanner_type, timestamp |
| `automated_payments` | provider, transaction_id, raw_response (jsonb), status |
| `relay_cash_payments` | amount_expected, amount_collected, status (pending/collected) |
| `relay_point_daily_metrics` | metric_date, shipments_total, revenue_total, commissions_total |
| `pricing_settings` | weight_ranges (jsonb), delivery_modes (jsonb), is_active |

### Fonctions PL/pgSQL

| Fonction | Description |
|----------|-------------|
| `assign_shipment_to_transporter(uuid)` | Scoring distance + charge → insert transporter_assignments, incrémente current_packages |
| `process_shipment_scan(...)` | Transitions de statut avec validation paiement (8 paramètres) |
| `refresh_relay_daily_metrics(relay_id, date)` | Recalcul métriques relais |
| `decrement_transporter_packages()` | Trigger : décrémente current_packages sur transition terminale |
| `generate_shipment_code()` | 4 chiffres + 2 lettres (ex. `2844BG`) |
| `generate_pickup_code()` | 6 chiffres unique par colis |
| `generate_relay_code()` | 6 chiffres identifiant relais |
| `generate_transporter_code()` | 6 chiffres identifiant transporteur |

### Migrations actives

| Fichier | Description |
|---------|-------------|
| `20260520100000_add_paystack_to_shipments_payment_method.sql` | Ajoute `'paystack'` à la contrainte CHECK de `payment_method` |
| `20260520110000_fix_transporter_current_packages_decrement.sql` | Trigger de décrémentation + recalcul initial des compteurs |

---

## Backend

### Configuration (index.ts)

- Port : `3001`
- CORS : `localhost:5173`, `localhost:3000`, `*.colisdirect.com`
- Rate limiting : auth 20/15min, création 30/15min, paiements 20/15min
- Migrations auto au démarrage si `RUN_MIGRATIONS=true`
- Health check : `GET /health`

### Authentification

JWT HS256, secret `JWT_SECRET`, expiry `JWT_EXPIRES_IN` (défaut 7d).
Middleware `authenticate()` → `req.user = { id, email, role }`.
`requireRole(...roles)` pour restriction par rôle.

### Routes API (sélection)

| Endpoint | Méthode | Rôle | Description |
|----------|---------|------|-------------|
| `/api/auth/signin` | POST | Public | Authentification |
| `/api/shipments` | POST | Client | Créer un colis |
| `/api/scan/extras/relay-intake` | POST | relay_partner | Scan réception origine |
| `/api/scan/extras/relay-final-intake` | POST | relay_partner | Scan réception destination |
| `/api/scan/extras/ops/make-available` | POST | relay_partner | Mettre à disposition |
| `/api/scan/extras/relay/complete-delivery` | POST | relay_partner | Retrait avec pickup_code |
| `/api/scan/extras/carrier-pickup` | POST | transporter | Ramassage |
| `/api/scan/extras/confirm-home-pickup` | POST | transporter | Confirmer ramassage domicile |
| `/api/handoffs/transporter/assignments` | GET | transporter | Colis affectés (actifs + zone) |
| `/api/handoffs/transporter/delivered-shipments` | GET | transporter | Colis livrés (RELAY_FINAL_RECEIVED, AVAILABLE_FOR_PICKUP, DELIVERED*) |
| `/api/payments/paystack/init` | POST | Client | Initialiser paiement Paystack |
| `/api/payments/paystack/webhook` | POST | Paystack | Webhook (HMAC SHA512) |
| `/api/payments/mobile-money/init-batch` | POST | Client | Paiement batch multiple colis |
| `/api/payments/relay-cash/confirm` | POST | relay_partner | Confirmer paiement cash |
| `/api/tracking/:trackingNumber` | GET | Public | Suivi public |
| `/api/v1/tracking/:number` | GET | API partner | Suivi partenaire (clé API) |

### `GET /api/handoffs/transporter/assignments` — logique de réponse

Retourne la **fusion** de :
1. Colis avec `transporter_assignments.transporter_id = moi` (assignés explicitement)
2. Colis dans la zone du transporteur avec statuts : `RELAY_ORIGIN_RECEIVED`, `CARRIER_COLLECTED`, `IN_TRANSIT`, **`RELAY_FINAL_RECEIVED`**, **`AVAILABLE_FOR_PICKUP`**, `PICKUP_PENDING`

> RELAY_FINAL_RECEIVED et AVAILABLE_FOR_PICKUP sont dans la réponse API mais filtrés côté frontend par `isTerminalForTransporter()` pour ne PAS apparaître dans les colonnes actives.

### Système de migrations

- Lit `database/migrations/*.sql` triés alphabétiquement
- Exécute dans transactions PostgreSQL
- Enregistre dans `migrations(filename, executed_at)`
- Idempotent : erreurs `already exists` et `duplicate key` ignorées

---

## Frontend

### Client API (`src/lib/api.ts`)

Classe `ApiClient` avec :
- `baseUrl` depuis `VITE_API_URL` (défaut `http://localhost:3001/api`)
- Token JWT en localStorage
- Timeout 10s (30s pour uploads)
- 70+ méthodes organisées par domaine

### Pages principales

| Page | Rôle | Accès |
|------|------|-------|
| `HomePage` | Landing page | Public |
| `TrackingPage` | Suivi colis avec timeline | Public |
| `LoginPage` | Auth (email ou téléphone) | Public |
| `CreateShipmentPage` | Formulaire création | Client/Guest |
| `CartPage` | Panier + paiement batch Paystack | Client |
| `MyShipmentsPage` | Historique + filtres | Client |
| `TransporterLoginPage` | Dashboard tournée + livraisons | Transporter |
| `RelayDashboard` | Scans, paiements, métriques relais | Relay Partner |
| `AdminDashboard` | Administration complète | Admin |
| `ProDashboard` | Analytics pro | Pro |

### `TransporterLoginPage` — logique d'affichage

```javascript
// Statuts terminaux pour le transporteur (défini localement)
function isTerminalForTransporter(status: string): boolean {
  return isShipmentDelivered(status) ||          // DELIVERED, DELIVERED_TO_CUSTOMER, PICKED_UP_BY_CUSTOMER
    status === 'RELAY_FINAL_RECEIVED' ||          // Déposé au relais de destination
    status === 'AVAILABLE_FOR_PICKUP';            // Mis à disposition
}
```

Colonnes affichées :
- **Livraison en Point Relais** : colis scannés avec destination_relay, NON terminaux
- **Livraison à Domicile** : colis IN_TRANSIT/CARRIER_COLLECTED avec home_delivery
- **Colis livrés** : tous les colis terminaux (y compris RELAY_FINAL_RECEIVED, AVAILABLE_FOR_PICKUP)
- **Tournée (home_pickup)** : colis PICKUP_PENDING à ramasser chez l'expéditeur

### `TrackingPage` — étapes de progression

| Flux | Étapes |
|------|--------|
| Relais → Relais | Commande créée → Déposé au relais → En transit → Au relais de livraison → Retiré |
| Relais → Domicile | Commande créée → Déposé au relais → En transit → Livré à domicile |
| Ramassage → Relais | Commande créée → **Ramassage** → En transit → Au relais de livraison → Retiré |
| Ramassage → Domicile | Commande créée → **Ramassage** → En transit → Livré à domicile |

**Ramassage** = `CARRIER_COLLECTED` (collecté chez l'expéditeur). **En transit** = `IN_TRANSIT`.

### `ShipmentDetailsModal` — pickup_code

Affiché uniquement si `current_status === 'AVAILABLE_FOR_PICKUP'`. Jamais à `RELAY_FINAL_RECEIVED`.

### Utilitaires statuts (`src/utils/shipmentStatus.ts`)

| Fonction | Retourne vrai pour |
|----------|-------------------|
| `isShipmentDelivered` | DELIVERED, DELIVERED_TO_CUSTOMER, PICKED_UP_BY_CUSTOMER |
| `isShipmentAtDestinationRelay` | RELAY_FINAL_RECEIVED, AVAILABLE_FOR_PICKUP, PICKED_UP_BY_CUSTOMER |
| `isTerminalForTransporter` (local TransporterLoginPage) | Tout ce qui précède + RELAY_FINAL_RECEIVED + AVAILABLE_FOR_PICKUP |

---

## Flux paiement Paystack

### Individuel

```
POST /api/payments/paystack/init { tracking_number, amount_fcfa, ... }
  → Paystack /transaction/initialize → authorization_url
  → Client redirigé → paiement
  → Webhook POST /api/payments/paystack/webhook (HMAC SHA512)
    event.data.metadata.tracking_number → UPDATE shipments
    payment_status='paid', payment_method='paystack'
```

### Batch (CartPage, plusieurs colis)

```
POST /api/payments/mobile-money/init-batch { tracking_numbers: [...] }
  → batch_ref = "BATCH-{timestamp}-{random}"
  → INSERT automated_payments(provider='batch_pending', raw_response={tracking_numbers:[...]})
  → Paystack init avec metadata.batch_ref
  → UPDATE automated_payments SET transaction_id=paystack_ref

Webhook:
  batchRef = event.data.metadata.batch_ref  ← CLEF de détection (pas ref.startsWith)
  SELECT raw_response FROM automated_payments WHERE transaction_id = paystack_ref
  → raw_response.tracking_numbers → UPDATE tous les shipments
```

### Provider actif

Configuré dans `admin_settings.payment.activeProvider` : `'paystack'` ou `'cinetpay'`.

---

## Infrastructure déploiement

### VPS Contabo

- IP : `178.238.229.159` — alias SSH : `vps-contabo`
- Projet : `/root/colis-direct`
- Traefik : SSL Let's Encrypt automatique, routing HTTPS

### Branches Git

| Branche | Rôle |
|---------|------|
| `dev` | Développement quotidien |
| `staging` | Tests VPS → https://staging.colisdirect.com |
| `main` | Production → https://colisdirect.com |

### Déploiement staging (commande réelle utilisée)

```bash
ssh vps-contabo "cd /root/colis-direct && git fetch origin && git reset --hard origin/dev && \
  docker compose -f docker-compose.staging.yml up -d --build colisdirect-frontend colisdirect-backend"
```

### Variables d'environnement critiques

| Variable | Usage |
|----------|-------|
| `JWT_SECRET` | Signature JWT (générer avec `openssl rand -base64 64`) |
| `PAYSTACK_SECRET_KEY` | Appels API Paystack + validation webhook |
| `DB_HOST/NAME/USER/PASSWORD` | Connexion PostgreSQL |
| `VITE_API_URL` | URL API exposée au navigateur (build frontend) |
| `FRONTEND_URL` | Callback paiement, liens emails |
| `BACKEND_URL` | Webhook callbacks |
| `SMTP_HOST/PORT/USER/PASS/FROM` | Envoi emails |
| `N8N_SMS_WEBHOOK_URL` | Notifications SMS |
| `RUN_MIGRATIONS` | `true` → auto-migration au démarrage backend |

---

## Règles de développement importantes

1. **Toute modification de schéma** (ALTER TABLE, CREATE FUNCTION, trigger, index) → fichier dans `database/migrations/`, jamais directement en base.

2. **Nommage migrations** : `YYYYMMDDHHMMSS_description.sql` (ordre chronologique).

3. **Ne jamais modifier** une migration déjà en prod → migration corrective.

4. **`pickup_code`** : affiché seulement à `AVAILABLE_FOR_PICKUP`. Jamais avant.

5. **Webhook Paystack batch** : détection par `metadata.batch_ref`, PAS par `ref.startsWith('BATCH-')`.

6. **`current_packages`** transporteur : critique pour le scoring. Le trigger le décrémente, mais uniquement sur DELIVERED/DELIVERED_TO_CUSTOMER/PICKED_UP_BY_CUSTOMER/CANCELLED/RETURN_TO_SENDER — pas sur RELAY_FINAL_RECEIVED.

7. **`scannedPackages` localStorage** : cache persistant côté transporteur. Ne montrer que les colis confirmés côté serveur (`packageByTracking.has(trackingNumber)`).

---

*Mise à jour : mai 2026 — générée par analyse code source.*
