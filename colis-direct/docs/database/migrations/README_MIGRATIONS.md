# 📦 Guide des Migrations

## PostgreSQL — fonction `process_shipment_scan`

La chaîne **à jour** pour la définition en production est :

1. **`20260502120000_remove_mobile_money_support_gate.sql`** — règles paiement actuelles (hors `relay_cash`).
2. **`20260503140000_pickup_code_on_service_reception.sql`** — génération différée de **`pickup_code`** et élargissement **`PAYMENT_CONFIRMED_AWAITING_DROP`**.

L’ancienne mention centrée uniquement sur **`20260501120000_...`** est **obsolète** pour décrire le comportement runtime après application de toutes les migrations ultérieures.

La fonction SQL accepte **8** paramètres ; si un appel ne fournit que **7** arguments, le 8ᵉ — **`p_bypass_scanner_checks`** — prend la valeur par défaut **`false`**.

## Nettoyage historique `migrations`

La migration **`20260504120000_cleanup_phantom_migration_records.sql`** supprime les enregistrements dont le nom suit le motif des copies système (**`… 2.sql`**, etc.), sans modifier le schéma. À exécuter comme toute autre migration.

## ✅ Règle d'Or

**GARDEZ TOUTES LES MIGRATIONS AVEC TIMESTAMP** - Elles font partie de l'historique et sont nécessaires pour recréer la base de données.

## 🗑️ Migrations à Supprimer (Optionnel)

### Migrations de Fix Manuels Redondantes

Les fichiers suivants sont des **fix manuels** qui sont **redondants** car la fonction `generate_pickup_code()` est déjà créée dans:
- `20251103152000_add_shipment_workflow_fields.sql` (ligne 119)
- `20251103183000_create_generate_pickup_code_function.sql` (ligne 1)

**Fichiers redondants:**
- `fix_generate_pickup_code.sql` ❌ Peut être supprimé
- `fix_generate_pickup_code_manual.sql` ❌ Peut être supprimé

**Action recommandée:**
```bash
# Supprimer les migrations redondantes
rm database/migrations/fix_generate_pickup_code.sql
rm database/migrations/fix_generate_pickup_code_manual.sql
```

## 📊 État Actuel

- **Total migrations SQL avec timestamp** : **88** (mai 2026 ; voir `database/migrations/` dans le dépôt Git)
- Les anciennes mentions de « 63 / fix manuels » sont obsolètes : ne supprimer aucune migration déjà appliquée en production.

## ⚠️ Important

- **NE JAMAIS** supprimer de migrations exécutées en production
- **TOUJOURS** garder les migrations avec timestamp
- Les migrations de fix manuels peuvent être supprimées uniquement si leur contenu est déjà ailleurs

