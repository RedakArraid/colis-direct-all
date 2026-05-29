# Résumé — scanner QR

## Où c’est dans l’app

- **Transporteur** : page **Ramassage à domicile** → `TransporterPickupPage.tsx` (bouton ouvrant le modal scanner + saisie manuelle).
- **Relais** : **Dashboard relais** → `RelayDashboard.tsx` (même principe ; enchaînement avec **`scanRelayIntake`** / **`scanRelayFinalIntake`** selon le statut).

## Backend utile à connaître

- **`POST /api/qr-codes/scan`** avec **`qr_code_hash`** (`qrCodes.ts`).
- **`POST /api/scan/extras/*`** pour les intentions métier relay / transporteur (`scan.ts`) — souvent avec **`tracking_number`** dans le corps JSON.

## Règles métier QR

Voir **`docs/RULES_QR_CODE_SYSTEM.md`** (génération à la réception relais, pas de QR obligatoire pour les flux purement domicile sans transit relais).

---

*Mai 2026.*
