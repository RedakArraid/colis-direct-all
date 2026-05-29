# Workflow développement solo — convention Colis Direct

Ce document définit **comment nous travaillons** sur Colis Direct. Il sert de **référence** pour tout le monde, y compris pour les assistants IA : **suivre ce flux en priorité** sauf indication contraire explicite.

---

## Règle fondamentale

**Toujours développer sur `dev`.** Ne jamais commiter directement dans `staging` ou `main`.

```
dev  →  staging (tests)  →  main (production)
```

---

## Branches Git

| Branche | Rôle |
|---------|------|
| **`dev`** | Branche de travail quotidien. Tous les commits vont ici en premier. |
| **`staging`** | Candidat release. Déployé sur le VPS staging pour validation. Merge depuis `dev` uniquement. |
| **`main`** | Production. Merge depuis `staging` uniquement après validation. |

Les trois branches sont régulièrement **alignées** après chaque release (même commit). Repartir toujours de cet état aligné.

### Commandes Git typiques

```bash
# Développer sur dev, puis passer en staging
git checkout staging && git pull origin staging
git merge origin/dev -m "build: fusion dev → staging"
git push origin staging

# Staging validé → production
git checkout main && git pull origin main
git merge origin/staging -m "release: fusion staging → main"
git push origin main

# Aligner les trois branches après une release
git checkout staging && git reset --hard origin/main && git push --force origin staging
git checkout dev && git reset --hard origin/main && git push --force origin dev
```

---

## Boucle locale quotidienne

1. **Se placer sur `dev`** : `git checkout dev && git pull origin dev`
2. **Lancer le dev** : `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`
3. **Coder, tester** localement sur http://localhost:5173
4. **Avant chaque push** : `npm run lint && npm run typecheck && npm run build` (racine + `backend/`)
5. **Commiter** : `git add <fichiers> && git commit -m "..."` puis `git push origin dev`

---

## Staging sur le VPS

1. Merger `dev` → `staging` et pousser
2. Sur le VPS : `git checkout staging && git pull origin staging`
3. Rebuild et redémarrer (voir [DEPLOYMENT.md](../deployment/DEPLOYMENT.md))
4. Tester le flux critique sur https://staging.colisdirect.com
5. Si OK → merger `staging` → `main`

---

## Production sur le VPS

1. Merger `staging` → `main` et pousser
2. Sur le VPS : `git checkout main && git pull origin main`
3. Build + redémarrer backend et frontend (voir [DEPLOYMENT.md](../deployment/DEPLOYMENT.md))
4. Vérifier `/health` et un parcours rapide

---

## Migrations base de données

- Fichiers dans `database/migrations/`, nommés `YYYYMMDDHHMMSS_description.sql`
- Exécutées automatiquement au démarrage backend (`RUN_MIGRATIONS=true`)
- **Toujours valider une nouvelle migration sur staging avant prod**
- **Ne jamais modifier** une migration déjà déployée en prod → créer une nouvelle migration corrective

---

## Principes durables

1. `main` = ce qui est (ou va être) en production
2. Staging avant prod pour tout ce qui est sensible : paiements, migrations SQL, refactor important
3. Secrets et `.env*` jamais committés — les fichiers `*.example` restent à jour
4. Petits commits fréquents, messages clairs

---

## Travailler avec un assistant IA

- Toujours vérifier que la branche courante est **`dev`** avant de commencer
- Ne jamais pousser directement vers `staging` ou `main` sans accord explicite
- Les secrets (`.env*`) restent hors Git, de la responsabilité du développeur
- Les commandes de déploiement VPS doivent correspondre à [DEPLOYMENT.md](../deployment/DEPLOYMENT.md)

---

*Workflow en vigueur depuis mai 2026. Toute évolution du flux doit mettre à jour ce fichier.*
