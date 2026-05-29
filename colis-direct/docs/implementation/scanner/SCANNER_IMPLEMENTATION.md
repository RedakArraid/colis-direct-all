# Implémentation du scanner (transporteurs et relais)

## Composants UI

| Écran | Fichier | Rôle |
|-------|---------|------|
| Ramassage transporteur | `src/pages/TransporterPickupPage.tsx` | Recherche par téléphone / code, modal **`QRScanner`**, saisie manuelle |
| Dashboard relais | `src/pages/RelayDashboard.tsx` | Zone « Scanner / Saisie », modal **`QRScanner`**, réceptions (**`handleReceiveShipment`**) |

Le composant partagé est **`src/components/QRScanner.tsx`** (ZXing / APIs natives selon navigateur).

## Backend QR « officiel »

| Méthode | Route | Rôle |
|---------|-------|------|
| POST | `/api/qr-codes/generate` | Appelle **`generate_shipment_qr_code(shipment_id, stage)`** ; réponses avec **`qr_code_data`** et **`qr_code_hash`** (`backend/src/routes/qrCodes.ts`) |
| POST | `/api/qr-codes/scan` | Corps : **`qr_code_hash`** (+ lieu optionnel) → fonction SQL **`scan_shipment_qr_code`** |

Les scans métier relay (**réception origine / finale**, mise à disposition) passent surtout par **`/api/scan/extras/...`** et **`tracking_number`** (voir `backend/src/routes/scan.ts`). Les flux peuvent combiner les deux selon ce que le QR encode (hash versus payload JSON lisible par le front).

## Contenu typique des QR après passage relais

La migration **`20251126230000_fix_qr_code_generation_rules.sql`** décrit la génération à la réception relais : données incluant **`shipment_code`** (6 chiffres) et **`qr_code_hash** dérivé en base.

## Développement Docker

Pour éviter les instabilités de watcher sous macOS, **`docker-compose.dev.yml`** monte uniquement les répertoires nécessaires au frontend ; **`vite.config.ts`** configure le polling et les dossiers ignorés.

---

*Dernière révision : mai 2026.*
