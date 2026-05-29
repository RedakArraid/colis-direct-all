# 📦 Migrations de Base de Données

## Migrations notables (rappel)

- **`20260501120000_unify_process_shipment_scan_payment_bypass.sql`** — introduction du 8ᵉ argument **`p_bypass_scanner_checks`** (historique ; la définition a été **remplacée** par les migrations suivantes).
- **`20260502120000_remove_mobile_money_support_gate.sql`** — définition **courante** de **`process_shipment_scan`** côté paiement (hors `relay_cash` : `payment_status = paid`, etc.).
- **`20260503140000_pickup_code_on_service_reception.sql`** — **`pickup_code`** différé, élargissement **`PAYMENT_CONFIRMED_AWAITING_DROP`** (voir aussi `README_MIGRATIONS.md`).
- **`20260504120000_cleanup_phantom_migration_records.sql`** — supprime dans la table **`migrations`** les lignes fantômes (noms du type **`… 2.sql`**, copies système), sans toucher au schéma.

## 📋 Règles de Gestion

### ✅ À CONSERVER
- **TOUTES** les migrations avec timestamp (format: `YYYYMMDDHHMMSS_description.sql`)
- Historique complet de l'évolution du schéma
- Nécessaires pour recréer la base de données

### ❌ À SUPPRIMER (si redondantes)
- Migrations de fix manuels sans timestamp
- Uniquement si leur contenu est déjà dans une migration timestampée

## 📊 État Actuel

- **Total (fichiers `*.sql` versionnés dans Git)** : **88** migrations avec préfixe timestamp (mai 2026 ; recompter avec `ls database/migrations/*.sql | wc -l` si besoin)
- **Format** : uniquement des fichiers `YYYYMMDDHHMMSS_description.sql` dans le dépôt principal
- **Prêtes pour production** : à valider avant chaque déploiement

## 🔄 Exécution

Les migrations sont exécutées automatiquement au démarrage du backend si :

- `NODE_ENV=production` **ou**
- `RUN_MIGRATIONS=true`

### Manuellement (poste développeur)

Depuis le dossier **`backend/`**, avec Postgres joignable (ex. Docker compose dev : port hôte **5434**) :

```bash
cd backend
DB_HOST=localhost DB_PORT=5434 npm run migrate
```

Adapter **`DB_HOST`**, **`DB_PORT`**, **`DB_USER`**, **`DB_PASSWORD`**, **`DB_NAME`** à ton `.env` si besoin.

Les fichiers SQL lus sont **`database/migrations/*.sql`** (tri par nom).

## 📝 Format des Noms

Format: `YYYYMMDDHHMMSS_description.sql`

Exemple: `20251121120000_fix_payment_status_inconsistencies.sql`

## ⚠️ Important

- **NE JAMAIS** supprimer de migrations exécutées en production
- **TOUJOURS** tester les migrations avant de les déployer
- Documenter les migrations complexes
