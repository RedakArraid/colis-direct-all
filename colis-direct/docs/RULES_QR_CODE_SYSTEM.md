# Règles officielles — QR code et workflows

Document métier aligné sur le comportement visé et sur les **migrations PostgreSQL** du dépôt (notamment `database/migrations/20251126230000_fix_qr_code_generation_rules.sql`).

## I. Règle QR code

### Aucun QR code pour

- Ramassage à domicile (`origin_relay_id` typiquement `NULL`, flux transporteur sans passage relais pour la collecte).
- Livraison à domicile jusqu’au destinataire : identification par **`shipment_code`** (6 chiffres) et/ou **`pickup_code`**, pas par scan relais.

Identification côté transporteur : souvent **téléphone expéditeur** + liste d’envois, ou saisie **`shipment_code`**.

### QR code obligatoire lorsque le colis transite par relais

- Entrée en point relais d’origine (réception → `RELAY_ORIGIN_RECEIVED`).
- Passages suivants selon étapes en base (`shipment_qr_codes`, fonction `generate_shipment_qr_code`).

Le relais imprime un **bordereau avec QR code** après réception à l’origine. Le QR sert au transporteur (collecte) et au relais final (réception / mise à disposition), et réduit les erreurs de saisie.

---

## II. Ramassage à domicile (sans QR relais)

1. Le transporteur saisit le **téléphone de l’expéditeur** (ou utilise les flux existants sur `TransporterPickupPage`).
2. Selon le statut et le paiement : actions **Réceptionner**, **Confirmer paiement**, **Rejeter** (voir UI transporteur).
3. Prise en charge du colis : **`shipment_code`** (6 chiffres), sans obligation de QR relais.

---

## III. Livraison à domicile (sans scan relais)

1. Si paiement à la livraison : confirmation du paiement côté transporteur quand le flux l’exige.
2. **Code secret** `pickup_code` saisi pour clôturer la livraison (routes transporteur / `process_shipment_scan` selon cas).

---

## IV. Dépôt en point relais (génération QR)

### Client a déjà créé l’envoi

1. Le relais saisit le **téléphone expéditeur**, voit les envois éligibles.
2. **Réceptionner** → passage à **`RELAY_ORIGIN_RECEIVED`** via `POST /api/scan/extras/relay-intake` (voir aussi doc réception relais).
3. À partir du passage en relais : trigger DB **`trigger_generate_qr_code_on_relay_reception`** peut créer / mettre à jour une ligne dans **`shipment_qr_codes`** avec données incluant le **`shipment_code`** (plus le hash dans la colonne dédiée).

### Client crée l’envoi au relais

Flux équivalent après paiement et réception : même trigger lors du statut **`RELAY_ORIGIN_RECEIVED`**.

---

## V. Transporteur au relais (scan ou saisie)

Le transporteur identifie sa session (UID / profil transporteur dans l’app).

- **Scanner le QR** (hash ou payload attendu par `RelayDashboard` / `TransporterPickupPage`).
- Ou **saisir le `shipment_code`** si le QR est illisible.

Transitions typiques : **`RELAY_ORIGIN_RECEIVED` → `CARRIER_COLLECTED` → `IN_TRANSIT`** (voir `POST /api/scan/extras/carrier-pickup`).

---

## VI. Relais final

1. Saisie identifiant transporteur / liste des colis à destination du relais.
2. Scan QR ou saisie **`shipment_code`**.
3. **`relay-final-intake`** puis **`ops/make-available`** (voir doc réception) pour arriver à **`AVAILABLE_FOR_PICKUP`**.

---

## VII. Retrait sans scan

Le destinataire peut être contrôlé par **téléphone / email** et **`pickup_code`** selon l’écran relais (`relayCompleteDelivery` côté API).

---

## Résumé des identifiants

| Identifiant       | Usage principal                                      |
|-------------------|------------------------------------------------------|
| `shipment_code`   | Code court affiché / saisi ; contenu prioritaire QR  |
| `pickup_code`     | Retrait / livraison avec vérification                |
| `tracking_number` | Identifiant de suivi technique (API, URLs)           |
| `qr_code_hash`    | Résolution scan côté backend (`shipment_qr_codes`)   |

---

## Implémentation dans le dépôt (état actuel)

1. **Plus de trigger global à la création** : `trigger_auto_generate_qr_codes` est retiré dans la migration `20251126230000_fix_qr_code_generation_rules.sql`.
2. **Génération à la réception relais** : fonction `generate_qr_code_on_relay_reception()` + trigger sur **`shipments`** lors des passages à **`RELAY_ORIGIN_RECEIVED`** ou **`RELAY_FINAL_RECEIVED`** (voir même migration).
3. **`generate_shipment_qr_code`** construit un JSON incluant **`shipment_code`** et met à jour hash / données dans **`shipment_qr_codes`**.

Les anciennes sections « modifications nécessaires » du présent document sont **réalisées côté schéma** pour ce périmètre ; il reste à tester systématiquement les parcours UI (transporteur / relais) après chaque évolution.

---

*Dernière révision : mai 2026 — à valider avec les fichiers `database/migrations/20251126230000_fix_qr_code_generation_rules.sql` et `backend/src/routes/scan.ts`.*
