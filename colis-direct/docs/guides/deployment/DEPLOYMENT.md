# Guide de déploiement — Colis Direct

VPS Contabo : `178.238.229.159` — alias SSH `vps-contabo` — projet dans `/root/colis-direct`.

## Architecture infrastructure

```
/root/
├── docker-compose.yml          # Infrastructure partagée (Traefik, Portainer, n8n…)
└── colis-direct/
    ├── docker-compose.prod.yml      # Stack production Colis Direct
    ├── docker-compose.staging.yml   # Stack staging Colis Direct
    ├── .env.production              # Secrets prod (non versionné)
    ├── .env.staging                 # Secrets staging (non versionné)
    ├── env.production.example       # Template prod
    └── env.staging.example          # Template staging
```

### Conteneurs actifs

| Conteneur | Environnement | Domaine |
|-----------|---------------|---------|
| `colisdirect-frontend` | Prod | https://colisdirect.com |
| `colisdirect-backend` | Prod | https://api.colisdirect.com |
| `colisdirect-db` | Prod | interne uniquement |
| `colisdirect-frontend-staging` | Staging | https://staging.colisdirect.com |
| `colisdirect-backend-staging` | Staging | https://staging-api.colisdirect.com |
| `colisdirect-db-staging` | Staging | interne uniquement |

### SSL / HTTPS

Géré par **Traefik** avec **Let's Encrypt** (challenge TLS, résolveur `mytlschallenge`, email `kader.diarrassouba9@gmail.com`). Certificats stockés dans le volume Docker `traefik_data:/letsencrypt/acme.json`.

Le certificat est émis automatiquement dès que le conteneur est démarré avec les bons labels Traefik **et** que le DNS du domaine pointe vers le VPS. Vérifier :

```bash
# Lister les certs Let's Encrypt actifs
docker exec traefik cat /letsencrypt/acme.json | python3 -c \
  "import sys,json; d=json.load(sys.stdin); [print(c['domain']['main']) for c in d.get('mytlschallenge',{}).get('Certificates',[])]"

# Vérifier le cert d'un domaine
echo | openssl s_client -connect staging.colisdirect.com:443 -servername staging.colisdirect.com 2>/dev/null \
  | openssl x509 -noout -dates -issuer
```

> **Important** : `www.staging.colisdirect.com` n'a pas d'enregistrement DNS et n'est pas inclus dans le router staging. Ne pas l'ajouter sans créer d'abord l'enregistrement DNS.

---

## Prérequis réseau

```bash
# Le réseau Traefik doit exister
docker network create traefik_network 2>/dev/null || true
```

---

## Déploiement Staging

### Nom du projet Docker : `colisdirect-staging`

**Méthode standard** (branche staging validée) :
```bash
cd /root/colis-direct

# 1. Récupérer le code (branche staging)
git checkout staging && git pull origin staging

# 2. Build complet
docker compose -f docker-compose.staging.yml \
  --project-name colisdirect-staging \
  --env-file .env.staging \
  build --no-cache

# 3. Démarrer / redémarrer
docker compose -f docker-compose.staging.yml \
  --project-name colisdirect-staging \
  --env-file .env.staging \
  up -d
```

**Méthode rapide** (tester une branche dev directement sans merge) :
```bash
cd /root/colis-direct
git fetch origin && git reset --hard origin/dev
docker compose -f docker-compose.staging.yml up -d --build colisdirect-frontend colisdirect-backend
```

### Logs staging

```bash
docker compose -f docker-compose.staging.yml --project-name colisdirect-staging logs -f
docker compose -f docker-compose.staging.yml --project-name colisdirect-staging logs -f colisdirect-backend-staging
```

### Statut staging

```bash
docker compose -f docker-compose.staging.yml --project-name colisdirect-staging ps
```

---

## Déploiement Production

### Nom du projet Docker : `colis-direct` (défini dans `docker-compose.prod.yml`)

La base de données prod (`colisdirect-db`) tourne indépendamment — elle n'est **jamais** recréée par un `compose up` global (conflit de noms). On redémarre uniquement **backend** et **frontend**.

```bash
cd /root/colis-direct

# 1. Récupérer le code (branche main)
git checkout main && git pull origin main

# 2. Build complet
docker compose -f docker-compose.prod.yml \
  --env-file .env.production \
  build --no-cache

# 3. Arrêter et supprimer les anciens conteneurs app
docker stop colisdirect-frontend colisdirect-backend
docker rm colisdirect-frontend colisdirect-backend

# 4. Redémarrer sans toucher la DB
docker compose -f docker-compose.prod.yml \
  --env-file .env.production \
  up -d --no-deps colisdirect-backend colisdirect-frontend
```

### Logs production

```bash
docker logs colisdirect-backend -f
docker logs colisdirect-frontend -f
```

### Vérification après déploiement

```bash
docker ps | grep colisdirect
curl -s https://api.colisdirect.com/health
curl -s -o /dev/null -w "%{http_code}" https://colisdirect.com
```

---

## Configuration

### Variables d'environnement importantes

| Variable | Description |
|----------|-------------|
| `COLISDIRECT_DB_PASSWORD` | Mot de passe PostgreSQL (fort et unique) |
| `COLISDIRECT_JWT_SECRET` | Secret JWT — `openssl rand -base64 64` |
| `PAYSTACK_SECRET_KEY` | Clé Paystack (paiements Mobile Money / Visa) |
| `SMTP_PASSWORD` / `SMTP_PASS` | Mot de passe SMTP |
| `VITE_API_URL` | URL de l'API pour le build frontend |

Référence complète : [VARIABLES_ENVIRONNEMENT.md](../configuration/VARIABLES_ENVIRONNEMENT.md).

### Créer le fichier d'environnement

```bash
cp env.production.example .env.production
nano .env.production   # remplir les vraies valeurs
```

---

## Migrations base de données

Les migrations s'exécutent automatiquement au démarrage backend (`RUN_MIGRATIONS=true`). Pour forcer manuellement :

```bash
docker exec -it colisdirect-backend npm run migrate
# ou en staging :
docker exec -it colisdirect-backend-staging npm run migrate
```

Toujours **tester une nouvelle migration sur staging** avant de la déployer en production.

---

## Rollback

```bash
# Revenir à un commit connu fonctionnel
git checkout <commit-sha-ou-tag>

# Rebuild et redéployer (même procédure que ci-dessus)
```

---

## Dépannage

### Le backend ne démarre pas

```bash
docker logs colisdirect-backend
# Vérifier la connexion DB
docker exec -it colisdirect-db psql -U colisdirect -d colisdirect_db -c "SELECT 1"
```

### Problème de certificat SSL

```bash
# Logs Traefik filtrés sur le domaine
docker logs traefik 2>&1 | grep -i "colisdirect\|acme\|certificate\|error" | tail -20

# Causes fréquentes :
# 1. DNS du domaine ne pointe pas vers le VPS → vérifier avec: dig +short mondomaine.com
# 2. Un sous-domaine inclus dans la règle router n'a pas de DNS (ex. www.staging) → le retirer du label
# 3. Rate limit Let's Encrypt (5 échecs / heure par domaine) → attendre avant de réessayer
```

### La base de données est vide

```bash
docker exec -it colisdirect-backend npm run migrate
```

### Voir tous les conteneurs Colis Direct

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep colisdirect
```

---

## Sécurité

- La base de données est sur un réseau interne isolé (`colisdirect_internal`)
- Seuls backend et frontend sont exposés via Traefik
- Les secrets sont dans `.env.production` / `.env.staging` (non versionnés)
- CORS configuré pour les domaines autorisés uniquement
