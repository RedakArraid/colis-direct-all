# Variables d'environnement — référence

Ce document liste les variables utilisées par Colis Direct (backend Node, frontend Vite, Docker Compose) et la façon dont elles sont injectées selon l'environnement.

## Base de données PostgreSQL

Le pool PostgreSQL (`backend/src/db/connection.ts`) lit :

| Variable | Rôle | Défaut local |
|----------|------|----------------|
| `DB_HOST` | Hôte PostgreSQL | `postgres` |
| `DB_PORT` | Port | `5432` |
| `DB_NAME` | Nom de la base | `colisdirect_db` |
| `DB_USER` | Utilisateur | `colisdirect` |
| `DB_PASSWORD` | Mot de passe | `colisdirect_password` |

Variantes acceptées si `DB_*` est absent : `COLISDIRECT_DB_NAME`, `COLISDIRECT_DB_USER`, `COLISDIRECT_DB_PASSWORD` (même ordre de priorité dans le code).

**Fichiers d'exemple dédiés**

- Production (`env.production.example`) : `COLISDIRECT_DB_NAME`, `COLISDIRECT_DB_USER`, `COLISDIRECT_DB_PASSWORD`. Docker Compose production expose en plus `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` à partir de ces valeurs.
- Staging (`env.staging.example`) : `COLISDIRECT_STAGING_DB_NAME`, `COLISDIRECT_STAGING_DB_USER`, `COLISDIRECT_STAGING_DB_PASSWORD`. Le compose staging les mappe vers `DB_*` (et duplique sous `COLISDIRECT_DB_*` pour compatibilité).

## Authentification JWT

Le backend lit **`JWT_SECRET`** et **`JWT_EXPIRES_IN`** (`JWT_EXPIRES_IN` défaut : `7d`).

Dans les déploiements production/staging décrits dans ce dépôt, le secret est souvent défini dans le fichier `.env` sous le nom **`COLISDIRECT_JWT_SECRET`**, puis **`JWT_SECRET=${COLISDIRECT_JWT_SECRET}`** est passé au conteneur (`docker-compose.prod.yml`, `docker-compose.staging.yml`). À l'intérieur du conteneur, c'est bien `JWT_SECRET` qui doit être présent pour signer et vérifier les tokens.

- **`AUTH_RATE_LIMIT_MAX`** (optionnel) — nombre maximal de tentatives de connexion avant limitation (défaut côté code : `10`).

Génération d'un secret fort :

```bash
openssl rand -base64 64
```

## Paiements (backend)

Le flux principal utilise **Paystack** :

| Variable | Rôle |
|----------|------|
| `PAYSTACK_SECRET_KEY` | Clé secrète (dashboard Paystack) ; utilisée pour les appels API et la vérification des signatures webhook |

**CinetPay** (secours Mobile Money CI, si configuré) :

| Variable | Rôle |
|----------|------|
| `CINETPAY_API_KEY` | Clé API |
| `CINETPAY_SITE_ID` | Identifiant du site marchand |

URLs utilisées pour les callbacks / redirections (`backend/src/routes/payments.ts`) :

| Variable | Défaut développement |
|----------|----------------------|
| `FRONTEND_URL` | `http://localhost:5173` |
| `BACKEND_URL` | `http://localhost:3001` |

Le dépôt migre les stacks Docker vers **Paystack** / **CinetPay** ; conservez des clés **`PAYSTACK_SECRET_KEY`** (`env.*.example`) et des webhooks correspondants côté dashboards.

## Frontend (build Vite)

| Variable | Rôle |
|----------|------|
| `VITE_API_URL` | URL de l'API exposée au navigateur (ex. `https://api.colisdirect.com/api`). Défaut si absent : `http://localhost:3001/api` (`src/lib/api.ts`). |

Staging : le compose passe un argument de build `VITE_API_URL` depuis **`VITE_STAGING_API_URL`** (voir `env.staging.example`).

Les flags `import.meta.env.DEV` / production sont fournis par Vite ; aucune configuration supplémentaire n'est nécessaire.

## URLs et portail (support, uploads)

| Variable | Rôle |
|----------|------|
| `BACKEND_URL` | URL publique du backend (URLs de fichiers uploadés, paiements, etc.) |
| `FRONTEND_URL` | URL du front pour redirections et liens |
| `CUSTOMER_PORTAL_URL` | Portail client (`support`) ; sinon repli sur `FRONTEND_URL`, puis défaut `https://colisdirect.com` |

## Email et notifications (`backend/src/services/emailService.ts`, `chatbot`)

**Canal email**

1. Si **`N8N_EMAIL_WEBHOOK_URL`** est défini, l'envoi passe par ce webhook n8n.
2. Sinon, si SMTP est configuré (`SMTP_HOST` présent), envoi direct via nodemailer.

SMTP :

| Variable | Rôle |
|----------|------|
| `SMTP_HOST` | Serveur SMTP |
| `SMTP_PORT` | Port (défaut `587`) |
| `SMTP_SECURE` | `true` pour TLS strict |
| `SMTP_USER` | Utilisateur |
| `SMTP_PASSWORD` | Mot de passe (prioritaire pour nodemailer) |
| `SMTP_PASS` | **Alias** pris en charge si `SMTP_PASSWORD` est vide (`emailService`, `chatbot`) — les fichiers d’exemple staging utilisent souvent `SMTP_PASS` ; en **staging/prod Docker**, le compose expose aussi **`SMTP_PASSWORD`** pour injecter la même valeur depuis `.env`. |
| `EMAILS_FROM_EMAIL` | Adresse expéditrice des mails transactionnels (défaut `noreply@colisdirect.com`) |

Autres emails :

| Variable | Rôle |
|----------|------|
| `SUPPORT_EMAIL` | Email affiché / utilisé pour le support (défaut `support@colisdirect.com`) |

**Chatbot / SMTP secondaire** (`backend/src/routes/chatbot.ts`) : réutilise `SMTP_*` ; même repli **`SMTP_PASS`** si `SMTP_PASSWORD` est absent. **`SMTP_FROM`** et **`COMPANY_EMAIL`** peuvent surcharger l'expéditeur et l'email société.

**SMS / WhatsApp via n8n** (optionnel) :

| Variable | Rôle |
|----------|------|
| `N8N_SMS_WEBHOOK_URL` | Webhook pour SMS |
| `N8N_WHATSAPP_WEBHOOK_URL` | Webhook pour WhatsApp |

> **Compose production / staging** (`docker-compose.prod.yml`, `docker-compose.staging.yml`) : les services backend reçoivent **`SMTP_PASS`**, **`SMTP_PASSWORD`** (souvent vide dans `.env` ; défini explicitement en prod dans `env.production.example`) et **`EMAIL_FROM`**. Le code nodemailer utilise **`SMTP_PASSWORD || SMTP_PASS`** et **`EMAILS_FROM_EMAIL`** pour l’en-tête From si vous standardisez sur ces noms.

## Exécution du backend

| Variable | Rôle |
|----------|------|
| `PORT` | Port HTTP du serveur (défaut `3001`) |
| `NODE_ENV` | Ex. `production`, `staging`, `development` |
| `RUN_MIGRATIONS` | Si `true`, les migrations s'exécutent au démarrage avec `NODE_ENV === 'production'` **ou** dès que `RUN_MIGRATIONS=true` (`backend/src/index.ts`) |

## Client HTTP interne backend

`backend/src/lib/apiClient.ts` utilise **`API_URL`** (défaut `http://localhost:3001/api`) pour les appels internes si besoin.

## Clés API partenaires (API REST)

Les intégrations partenaires s'authentifient avec des clés stockées en base (`api_keys`), pas via une variable d'environnement dédiée. Aucune variable globale du type « master API key » n'est requise pour cette fonctionnalité.

---

## Configuration par environnement

### Développement local

Souvent : `docker-compose.yml` / `docker-compose.dev.yml` avec `JWT_SECRET`. Les clés **`PAYSTACK_SECRET_KEY`** (et éventuellement CinetPay) peuvent être passées pour tester les paiements en local depuis un `.env` à la racine. Sinon, défauts du compose et du code.

### Staging

```bash
cp env.staging.example .env.staging
# Éditer .env.staging
docker compose -f docker-compose.staging.yml --project-name colisdirect-staging --env-file .env.staging up -d
```

### Production

```bash
cp env.production.example .env.production
# Éditer .env.production
docker compose -f docker-compose.prod.yml --project-name colisdirect-prod --env-file .env.production up -d
```

## Sécurité

- Ne jamais committer `.env`, `.env.production`, `.env.staging` ni de secrets (déjà ignorés par Git en principe).
- Mots de passe DB et `JWT_SECRET` / `COLISDIRECT_JWT_SECRET` distincts et forts entre staging et production.
- Permissions restrictives sur les fichiers secrets : `chmod 600 .env.production`

## Dépannage rapide

**Connexion DB** — Dans le conteneur backend : `env | grep -E '^DB_'` ; vérifier cohérence avec Postgres.

**JWT** — Vérifier `JWT_SECRET` dans le conteneur (`printenv JWT_SECRET`) ; en prod il doit correspondre à la valeur attendue (souvent dérivée de `COLISDIRECT_JWT_SECRET` dans le fichier sur l'hôte).

**Paystack** — Vérifier `PAYSTACK_SECRET_KEY` et la configuration du webhook côté Paystack (URL publique du backend).

## Ressources

- [README principal](../../../README.md)
- [Guide de workflow](../development/WORKFLOW_DEV_STAGING_PROD.md)
- Fichiers modèles : [env.production.example](../../../env.production.example), [env.staging.example](../../../env.staging.example)
