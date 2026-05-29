# Workflow de Développement : Dev → Staging → Production

> **Référence de travail (développement solo)** : tout le monde (y compris les assistants IA) doit s’aligner sur **[WORKFLOW_SOLO.md](WORKFLOW_SOLO.md)** pour le flux d’ensemble, branches et règles long terme. Ce fichier complète avec des exemples de commandes et le schéma branche **`dev`** / **`staging`** / **`main`**.

Ce document décrit le workflow de développement pour Colis Direct, similaire à HappyResi, avec trois environnements : **dev**, **staging**, et **production** (main).

> Les exemples « sur le serveur » utilisent parfois le chemin **`/root/colis-direct`** (clone typique sur un VPS). Remplacez-le par le répertoire réel du projet sur votre machine.

## 📋 Vue d'ensemble

```
┌─────────┐      ┌──────────┐      ┌──────────┐
│   dev   │ ───> │ staging  │ ───> │   main   │
│ (local) │      │ (serveur)│      │(serveur) │
└─────────┘      └──────────┘      └──────────┘
```

## 🔧 Environnements

### 1. **Dev (Branche `dev`)** - Développement Local
- **Branche**: `dev`
- **Usage**: Développement local sur votre PC
- **Fichiers**: `docker-compose.yml` + `docker-compose.dev.yml`
- **URLs locales**:
  - Frontend: http://localhost:5173
  - Backend API: http://localhost:3001
  - Database (hôte) : **localhost:5434** → Postgres du compose dev

### 2. **Staging (Branche `staging`)** - Tests avant Production
- **Branche**: `staging`
- **Usage**: Tests en conditions réelles avant la mise en production
- **Fichiers**: `docker-compose.staging.yml`
- **Domaine**: `staging.colisdirect.com` et `staging-api.colisdirect.com`

### 3. **Production (Branche `main`)** - Environnement Live
- **Branche**: `main`
- **Usage**: Application en production
- **Fichiers**: `docker-compose.prod.yml`
- **Domaine**: `colisdirect.com` et `api.colisdirect.com`

## 🚀 Workflow de Développement

### Étape 1 : Développement Local (Branche `dev`)

#### 1.1. Cloner et se placer sur la branche dev
```bash
git clone <repository-url>
cd colis-direct
git checkout dev
```

#### 1.2. Configuration locale
Les variables d'environnement par défaut fonctionnent pour le développement local. Pas besoin de fichier `.env` pour dev.

#### 1.3. Lancer l'environnement de développement
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

#### 1.4. Développer et tester localement
- Modifier le code
- Les changements sont automatiquement rechargés (hot-reload)
- Tester sur http://localhost:5173

#### 1.5. Commiter et pousser vers la branche dev
```bash
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin dev
```

### Étape 2 : Déployer en Staging (Branche `staging`)

#### 2.1. Merger dev vers staging
```bash
git checkout staging
git pull origin staging
git merge dev
# Résoudre les conflits si nécessaire
git push origin staging
```

#### 2.2. Déployer sur le serveur staging

**Sur le serveur**, connectez-vous et :

```bash
cd /root/colis-direct
git checkout staging
git pull origin staging

# Créer .env.staging si nécessaire
cp env.staging.example .env.staging
# Éditer .env.staging avec les valeurs de staging

# Rebuild et redémarrer sans cache
docker compose -f docker-compose.staging.yml --project-name colisdirect-staging --env-file .env.staging build --no-cache
docker compose -f docker-compose.staging.yml --project-name colisdirect-staging --env-file .env.staging up -d --force-recreate

# Vérifier les logs
docker compose -f docker-compose.staging.yml --project-name colisdirect-staging logs -f
```

#### 2.3. Tester en staging
- Accéder à https://staging.colisdirect.com
- Tester toutes les fonctionnalités
- Vérifier les logs pour les erreurs

#### 2.4. Si des corrections sont nécessaires
```bash
# Revenir à dev, corriger, puis répéter les étapes 2.1-2.3
git checkout dev
# Corriger le code
git commit -m "fix: correction du bug"
git push origin dev
# Re-merger vers staging
```

### Étape 3 : Déployer en Production (Branche `main`)

#### 3.1. Une fois satisfait du staging, merger vers main
```bash
git checkout main
git pull origin main
git merge staging
# Résoudre les conflits si nécessaire
git push origin main
```

#### 3.2. Déployer sur le serveur de production

**Sur le serveur**, connectez-vous et :

```bash
cd /root/colis-direct
git checkout main
git pull origin main

# Vérifier que .env.production existe et est à jour
# (ne jamais pousser .env.production dans git!)

# Rebuild et redémarrer sans cache
docker compose -f docker-compose.prod.yml --project-name colisdirect-prod --env-file .env.production build --no-cache
docker compose -f docker-compose.prod.yml --project-name colisdirect-prod --env-file .env.production up -d --force-recreate

# Vérifier les logs
docker compose -f docker-compose.prod.yml --project-name colisdirect-prod logs -f
```

#### 3.3. Vérifier la production
- Accéder à https://colisdirect.com
- Vérifier que tout fonctionne correctement
- Surveiller les logs pour détecter les erreurs

## 🔄 Commandes Utiles

### Développement Local

```bash
# Démarrer
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Arrêter
docker compose -f docker-compose.yml -f docker-compose.dev.yml down

# Voir les logs
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f [service]

# Rebuild un service
docker compose -f docker-compose.yml -f docker-compose.dev.yml build --no-cache [service]
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --force-recreate [service]
```

### Staging

```bash
# Démarrer
docker compose -f docker-compose.staging.yml --project-name colisdirect-staging --env-file .env.staging up -d

# Arrêter
docker compose -f docker-compose.staging.yml --project-name colisdirect-staging down

# Rebuild sans cache
docker compose -f docker-compose.staging.yml --project-name colisdirect-staging --env-file .env.staging build --no-cache
docker compose -f docker-compose.staging.yml --project-name colisdirect-staging --env-file .env.staging up -d --force-recreate

# Voir les logs
docker compose -f docker-compose.staging.yml --project-name colisdirect-staging logs -f
```

### Production

```bash
# Démarrer
docker compose -f docker-compose.prod.yml --project-name colisdirect-prod --env-file .env.production up -d

# Arrêter
docker compose -f docker-compose.prod.yml --project-name colisdirect-prod down

# Rebuild sans cache
docker compose -f docker-compose.prod.yml --project-name colisdirect-prod --env-file .env.production build --no-cache
docker compose -f docker-compose.prod.yml --project-name colisdirect-prod --env-file .env.production up -d --force-recreate

# Voir les logs
docker compose -f docker-compose.prod.yml --project-name colisdirect-prod logs -f
```

## 📝 Notes Importantes

### ⚠️ Toujours rebuild sans cache lors des déploiements
Lorsque vous modifiez du code ou des configurations Docker, **toujours** utiliser `--no-cache` pour forcer la reconstruction complète :

```bash
docker compose -f <compose-file> build --no-cache
docker compose -f <compose-file> up -d --force-recreate
```

### 🔐 Fichiers d'environnement
- **Ne jamais** commiter les fichiers `.env*` dans git (ils sont dans `.gitignore`)
- Utiliser les fichiers `.example` comme modèles
- Chaque environnement a son propre fichier `.env` :
  - Dev: pas nécessaire (valeurs par défaut)
  - Staging: `.env.staging`
  - Production: `.env.production`

### 🐳 Dockerfile Frontend
Le Dockerfile du frontend se trouve maintenant dans `src/Dockerfile` (au lieu de la racine). Les configurations docker-compose pointent automatiquement vers le bon emplacement.

### 🔄 Migration de la base de données
Les migrations s'exécutent automatiquement au démarrage du backend si `RUN_MIGRATIONS=true` est défini dans les variables d'environnement.

## 🆘 En cas de problème

### Le service ne démarre pas
1. Vérifier les logs : `docker compose logs -f [service]`
2. Vérifier les variables d'environnement
3. Vérifier la connectivité réseau (Traefik pour staging/prod)
4. Rebuild sans cache

### Erreur de connexion à la base de données
1. Vérifier que le service database est healthy
2. Vérifier les credentials dans le fichier `.env`
3. Vérifier que les variables d'environnement sont correctement chargées

### Problème CORS
1. Vérifier que les headers CORS sont correctement configurés dans Traefik
2. Vérifier que les domaines autorisés correspondent dans `docker-compose.staging.yml` ou `docker-compose.prod.yml`

## 📚 Ressources

- [README principal](../../../README.md)
- [Variables d'environnement](../configuration/VARIABLES_ENVIRONNEMENT.md)
- [Configuration Docker](../../../docker-compose.yml)
- [Configuration Staging](../../../docker-compose.staging.yml)
- [Configuration Production](../../../docker-compose.prod.yml)

