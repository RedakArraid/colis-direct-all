# Vérification scanner — synthèse

Ce document remplace l’ancienne « vérification finale » fondée sur des numéros de lignes.

## Références à jour

- **Implémentation** : `docs/implementation/scanner/SCANNER_IMPLEMENTATION.md`
- **Résumé** : `docs/implementation/scanner/RÉSUMÉ_SCANNER.md`
- **Check-list manuelle** : `docs/implementation/scanner/VÉRIFICATION_SCANNER.md`
- **Règles métier QR** : `docs/RULES_QR_CODE_SYSTEM.md`

## Statut technique

Les écrans **transporteur** et **relais** embarquent le composant **`QRScanner`** et dialoguent avec l’API **`/api/qr-codes/*`** et **`/api/scan/extras/*`** selon le flux. Valider par tests manuels sur un environnement de dev réel.

---

*Mai 2026.*
