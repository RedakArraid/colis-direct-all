# COLISDIRECT — Plateforme de Livraison

Plateforme de livraison de colis à Abidjan via un réseau de points relais locaux.

## Démarrage rapide avec Docker

### Prérequis
- Docker & Docker Compose installés
- Node.js 18+ (pour développement local sans Docker)

### Lancer l'environnement de développement local

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Accès :
- Frontend (Vite) : http://localhost:5173
- Backend API : http://localhost:3001
- PostgreSQL (hôte) : **localhost:5434** → port 5432 dans le conteneur

```bash
# Arrêter
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

### Fichiers d'environnement

Pour le développement, les valeurs par défaut suffisent. Pour staging et production, copier les modèles :

```bash
cp env.staging.example .env.staging
cp env.production.example .env.production
```

Référence complète : [Variables d'environnement](docs/guides/configuration/VARIABLES_ENVIRONNEMENT.md).

## Workflow Git

Toujours développer sur **`dev`**, puis merger dans **`staging`** pour tests, puis dans **`main`** pour la production.

```
dev  →  staging  →  main
```

Ne jamais commiter directement dans `staging` ou `main`.

Détail : [WORKFLOW_SOLO.md](docs/guides/development/WORKFLOW_SOLO.md) · [WORKFLOW_DEV_STAGING_PROD.md](docs/guides/development/WORKFLOW_DEV_STAGING_PROD.md).

## Déploiement sur VPS (Contabo)

VPS : `178.238.229.159` — projet dans `/root/colis-direct`.

### Staging

```bash
# Sur le VPS, branche staging
git pull origin staging

# Build + démarrage
docker compose -f docker-compose.staging.yml \
  --project-name colisdirect-staging \
  --env-file .env.staging \
  build --no-cache

docker compose -f docker-compose.staging.yml \
  --project-name colisdirect-staging \
  --env-file .env.staging \
  up -d
```

Domaines : `https://staging.colisdirect.com` · `https://staging-api.colisdirect.com`

### Production

Le projet name Docker est **`colis-direct`** (défini dans `docker-compose.prod.yml`). La DB tourne indépendamment — ne pas la recréer avec compose up.

```bash
# Sur le VPS, branche main
git pull origin main

# Build
docker compose -f docker-compose.prod.yml \
  --env-file .env.production \
  build --no-cache

# Redémarrer backend + frontend sans toucher la DB
docker stop colisdirect-frontend colisdirect-backend
docker rm colisdirect-frontend colisdirect-backend

docker compose -f docker-compose.prod.yml \
  --env-file .env.production \
  up -d --no-deps colisdirect-backend colisdirect-frontend
```

Domaines : `https://colisdirect.com` · `https://api.colisdirect.com`

Guide complet : [DEPLOYMENT.md](docs/guides/deployment/DEPLOYMENT.md).

## Structure du projet

```
├── backend/              # API Express/TypeScript
│   ├── src/
│   │   ├── routes/      # Routes API
│   │   ├── middleware/  # Authentification JWT
│   │   └── db/          # Connexion PostgreSQL
│   └── Dockerfile
├── src/                 # Frontend React/TypeScript
│   ├── components/
│   ├── pages/
│   ├── contexts/
│   ├── lib/             # Client API (api.ts)
│   └── Dockerfile
├── database/
│   ├── init/            # Scripts SQL au premier démarrage
│   └── migrations/      # Migrations SQL versionnées
├── docs/                # Documentation
├── docker-compose.yml           # Base commune
├── docker-compose.dev.yml       # Overrides développement local
├── docker-compose.staging.yml   # Staging (VPS)
└── docker-compose.prod.yml      # Production (VPS)
```

## Base de données

PostgreSQL 15. Tables principales (49 tables) :
- `users` — comptes et authentification (rôles : user, client, pro, admin, relay_partner, transporter, support)
- `relay_points` — points relais (relay_code, commune, zone_id)
- `shipments` — envois (`shipment_code` 4 chiffres + 2 lettres, `pickup_code` 6 chiffres généré à la 1ère réception)
- `tracking_events` — événements de scan (`process_shipment_scan`)
- `shipment_status_history` — historique transitions statut
- `transporters` — transporteurs (`current_packages` pour le scoring d'affectation)
- `transporter_assignments` — affectations transporteur↔colis
- `delivery_zones` — zones de livraison (communes[], bbox)
- `automated_payments` — paiements Paystack/CinetPay (raw_response jsonb)
- `relay_cash_payments` — paiements espèces au relais

Migrations auto au démarrage si `RUN_MIGRATIONS=true`. Manuellement : `docker exec colisdirect-backend npm run migrate`.

Connexion locale :

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec postgres psql -U colisdirect -d colisdirect_db
```

Compte admin par défaut : `admin@colisdirect.ci` / `admin123` — **à changer en production**.

## API

### Authentification
- `POST /api/auth/signup` · `POST /api/auth/signin` · `GET /api/auth/me` · `POST /api/auth/signout`

### Envois
- `GET /api/shipments` · `GET /api/shipments/:id` · `POST /api/shipments` · `PATCH /api/shipments/:id/status`

### Suivi public
- `GET /api/tracking/:trackingNumber` — accepte numéro de suivi, `shipment_code` (ex. `1234AB`) ou `pickup_code` (6 chiffres)

### Scans
- `POST /api/scan` — scan générique
- `POST /api/scan/extras/*` — flux relais (intake, mise à disposition, retrait)
- `POST /api/handoffs/scan` — transferts relais ↔ transporteur

### Paiements
- `POST /api/payments/paystack/init` · `POST /api/payments/paystack/webhook`

### API partenaires (clé Bearer)
- `GET /api/v1/tracking/:number` — suivi enrichi avec `effective_status`

Flux métier complet : [FLUX_STATUTS_ET_SCANS.md](docs/guides/business/FLUX_STATUTS_ET_SCANS.md).

## Règles métier clés

- **Relais de dépôt ≠ relais de livraison** : un colis ne peut pas avoir le même relais comme origine et destination. Validé côté frontend (`AssistClientForm`) et backend (`scan.ts` relay-intake + création).
- **`origin_relay_id`** : nul à la création pour les flux client normaux. Défini automatiquement lors du scan d'intake par le relais. Pour les créations assistées (gérant relais), défini à la création puis scan d'intake appelé immédiatement.
- **`RELAY_FINAL_RECEIVED`** : le relais de destination peut mettre le colis à disposition (`opsMakeAvailable`) depuis ce statut. Le `pickup_code` (code de retrait) n'est affiché qu'à `AVAILABLE_FOR_PICKUP`, jamais avant.
- **`current_packages`** transporteur : incrémenté à l'affectation, décrémenté par trigger PostgreSQL sur transition vers statut terminal. Critique pour le scoring d'affectation.
- **Toute modification de schéma DB** doit passer par `database/migrations/`. Jamais directement en base.

## SSL

Géré automatiquement par Traefik avec Let's Encrypt (résolveur `mytlschallenge`). Certificats stockés dans le volume `traefik_data:/letsencrypt`. Le domaine `www.staging.colisdirect.com` n'est **pas** inclus dans le router staging (pas d'enregistrement DNS).

## Technologies

- **Frontend** : React 18, TypeScript, Tailwind CSS, Vite
- **Backend** : Node.js, Express, TypeScript
- **Base de données** : PostgreSQL 15
- **Authentification** : JWT
- **Paiements** : Paystack (Mobile Money, Visa), CinetPay (optionnel)
- **Proxy / SSL** : Traefik + Let's Encrypt
- **Conteneurisation** : Docker & Docker Compose

## Licence

Propriétaire
