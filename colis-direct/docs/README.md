# Documentation Colis Direct

## Structure

### Guides (`guides/`)

**`deployment/`**
- [`DEPLOYMENT.md`](guides/deployment/DEPLOYMENT.md) — Déploiement VPS Contabo : staging et production, commandes Docker, SSL Traefik, méthode rapide depuis `dev`

**`development/`**
- [`WORKFLOW_SOLO.md`](guides/development/WORKFLOW_SOLO.md) — **Référence** : workflow `dev → staging → main`, règles Git, boucle locale
- [`WORKFLOW_DEV_STAGING_PROD.md`](guides/development/WORKFLOW_DEV_STAGING_PROD.md) — Détail des commandes par étape
- [`MOBILE_EMULATORS.md`](guides/development/MOBILE_EMULATORS.md) — Android natif, iOS Capacitor, simulateur
- [`ANDROID_NATIVE.md`](guides/development/ANDROID_NATIVE.md) — **App Android Kotlin** : build, rôles, E2E, parité web

**`configuration/`**
- [`VARIABLES_ENVIRONNEMENT.md`](guides/configuration/VARIABLES_ENVIRONNEMENT.md) — Référence de toutes les variables d'environnement
- [`EMAIL_CONFIGURATION.md`](guides/configuration/EMAIL_CONFIGURATION.md) — Configuration SMTP / n8n

**`business/`**
- [`FLUX_STATUTS_ET_SCANS.md`](guides/business/FLUX_STATUTS_ET_SCANS.md) — **Principal** : statuts colis, `process_shipment_scan`, flux par parcours, règles métier, pickup_code, paiement Paystack batch
- [`PROCESSUS_POINTS_RELAIS.md`](guides/business/PROCESSUS_POINTS_RELAIS.md) — Candidature → approbation → exploitation partenaire relais

**`troubleshooting/`**
- [`TROUBLESHOOTING_401.md`](guides/troubleshooting/TROUBLESHOOTING_401.md) — Erreurs d'authentification 401

### Spécifications (`specifications/`)
- [`CONDITIONS_RECEPTION_RELAIS.md`](specifications/CONDITIONS_RECEPTION_RELAIS.md) — Endpoints `/api/scan/extras/*`, conditions de scan, règle dépôt ≠ livraison

### Règles transverses
- [`RULES_QR_CODE_SYSTEM.md`](RULES_QR_CODE_SYSTEM.md) — QR codes et workflows

### Analyses (`analysis/`)
- [`ANALYSE_PROJET_COMPLETE.md`](analysis/ANALYSE_PROJET_COMPLETE.md) — Analyse technique complète (mai 2026) — stack, DB, API, flux, déploiement

---

## Points clés à retenir (mai 2026)

- **`payment_method = 'paystack'`** est une valeur valide dans `shipments` (migration 20260520100000)
- **`transporters.current_packages`** est décrémenté par trigger PostgreSQL sur statut terminal (migration 20260520110000)
- **`RELAY_FINAL_RECEIVED` est terminal pour le transporteur** : le colis quitte les colonnes actives du dashboard transporteur dès qu'il est déposé au relais de destination
- **Pickup code** affiché uniquement à `AVAILABLE_FOR_PICKUP` — pas à `RELAY_FINAL_RECEIVED`
- **TrackingPage** : étape "Ramassage" (CARRIER_COLLECTED) distincte de "En transit" (IN_TRANSIT) pour les flux home_pickup
- **Webhook Paystack batch** : détection par `metadata.batch_ref`, pas par `ref.startsWith('BATCH-')`

---

## Pour commencer

1. [README principal](../README.md) — démarrage rapide
2. [WORKFLOW_SOLO.md](guides/development/WORKFLOW_SOLO.md) — comment on travaille
3. [DEPLOYMENT.md](guides/deployment/DEPLOYMENT.md) — déployer sur le VPS
4. [FLUX_STATUTS_ET_SCANS.md](guides/business/FLUX_STATUTS_ET_SCANS.md) — logique métier colis
5. [VARIABLES_ENVIRONNEMENT.md](guides/configuration/VARIABLES_ENVIRONNEMENT.md) — configuration

---

*Mise à jour : juin 2026 — Android natif dans `android/`, Capacitor Android retiré.*
