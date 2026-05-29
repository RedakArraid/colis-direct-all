# Flux statuts colis, scans et cohérence métier

Document de référence (mai 2026) pour **aligner produit, support et intégrations** sur le comportement réel du backend.

---

## Source de vérité côté base

La fonction PostgreSQL **`process_shipment_scan`** :

- applique les **transitions autorisées** entre valeurs de l'enum `shipment_status` ;
- applique les **contrôles de paiement** avant certaines étapes ;
- enregistre un événement dans `tracking_events` à chaque transition réussie ;
- accepte un 8ᵉ paramètre `p_bypass_scanner_checks` (réservé aux appels internes) ;
- génère `pickup_code` (code de retrait destinataire) à la **première réception par nos services** si la colonne est encore vide : soit `RELAY_ORIGIN_RECEIVED`, soit `CARRIER_COLLECTED` en ramassage à domicile.

---

## Statuts logistiques vs affichage paiement

`shipments.current_status` ne contient **que** des valeurs logistiques (enum `shipment_status`). Les états `PAYMENT_AWAITING_VALIDATION`, `PAYMENT_PENDING_AT_RELAY`, etc. sont calculés à la volée comme **`effective_status`** dans `tracking.ts`, les listes d'envois et `GET /api/v1/tracking/:number`.

---

## Chemins opérationnels principaux

| Chemin | Rôle | Mécanisme |
|--------|------|-----------|
| `POST /api/scan` | Relais, transporteur, admin | `process_shipment_scan` (8 args, bypass explicite) |
| `POST /api/handoffs/scan` | Relais ↔ transporteur | Raccourcis métier avec contrôle paiement ; `DELIVERED_TO_CUSTOMER` en livraison domicile |
| `PATCH /api/shipments/:id/status` | Admin, support, relais, transporteur | Transitions autorisées via `process_shipment_scan` (bypass admin/support) + `shipment_tracking` + webhooks |
| `POST /api/shipments/:trackingNumber/receive` | Transporteur, admin | Enlèvement : `CARRIER_COLLECTED` → `IN_TRANSIT`. Le transporteur doit fournir `shipment_code` |

---

## Flux de statuts par parcours

### Dépôt au relais → livraison au relais (flux principal)

```
READY_FOR_DROP_OFF
  └─ relay-intake (scan relais départ)         → RELAY_ORIGIN_RECEIVED
       └─ carrier-pickup (transporteur)         → CARRIER_COLLECTED
            └─ departure (transporteur)          → IN_TRANSIT
                 └─ relay-final-intake (relais dest.) → RELAY_FINAL_RECEIVED
                      └─ ops/make-available      → AVAILABLE_FOR_PICKUP
                           └─ complete-delivery  → PICKED_UP_BY_CUSTOMER
                              (avec pickup_code)
```

### Dépôt au relais → livraison à domicile

```
READY_FOR_DROP_OFF
  └─ relay-intake                              → RELAY_ORIGIN_RECEIVED
       └─ carrier-pickup                        → CARRIER_COLLECTED
            └─ IN_TRANSIT
                 └─ handoffs/scan (chez destinataire) → DELIVERED_TO_CUSTOMER
```

### Ramassage à domicile → livraison au relais

```
PICKUP_PENDING
  └─ confirm-home-pickup (transporter chez expéditeur) → CARRIER_COLLECTED
       └─ [interne]                             → IN_TRANSIT
            └─ relay-final-intake               → RELAY_FINAL_RECEIVED
                 └─ ops/make-available          → AVAILABLE_FOR_PICKUP
                      └─ complete-delivery      → PICKED_UP_BY_CUSTOMER
```

### Ramassage à domicile → livraison à domicile

```
PICKUP_PENDING
  └─ confirm-home-pickup                        → CARRIER_COLLECTED
       └─ [interne]                             → IN_TRANSIT
            └─ handoffs/scan (chez destinataire) → DELIVERED_TO_CUSTOMER
```

---

## Règle métier : relais de dépôt ≠ relais de livraison

Un colis **ne peut pas** avoir le même relais comme origine (`origin_relay_id`) et comme destination (`destination_relay_id`).

**Où c'est validé :**
- Frontend : `AssistClientForm` filtre le relais courant de la liste de livraison + guard à la soumission
- Backend `scan.ts` relay-intake : HTTP 400 si le relais connecté = `destination_relay_id`
- Backend `shipments.ts` création : HTTP 400 si `origin_relay_id === destination_relay_id`

### `origin_relay_id` : quand est-il défini ?

- **Flux client normal** : `NULL` à la création. Défini automatiquement lors du premier scan `relay-intake` (le relais qui reçoit le colis devient l'origine).
- **Flux assisté (gérant relais)** : défini à la création avec le relais du gérant (le client est physiquement là), puis `relay-intake` est appelé immédiatement après.

---

## `RELAY_FINAL_RECEIVED` vs `AVAILABLE_FOR_PICKUP`

| Statut | Signification | Pickup code affiché ? |
|--------|--------------|----------------------|
| `RELAY_FINAL_RECEIVED` | Colis arrivé au relais de destination, en cours de traitement | **Non** — le relais n'a pas encore confirmé la disponibilité |
| `AVAILABLE_FOR_PICKUP` | Relais a confirmé que le colis est disponible au retrait | **Oui** — affiché sur TrackingPage, ShipmentDetailsModal, invoice |

> **Règle absolue :** le `pickup_code` (code de retrait à 6 chiffres) n'est jamais affiché avant que le statut soit `AVAILABLE_FOR_PICKUP`, même si le code est déjà généré en base.

Depuis `RELAY_FINAL_RECEIVED`, le relais peut directement appeler `opsMakeAvailable` pour passer à `AVAILABLE_FOR_PICKUP`.

---

## Statuts terminaux pour le transporteur (`isTerminalForTransporter`)

Du point de vue de la **page transporteur** (`TransporterLoginPage`), un colis est considéré "terminé" (quitte les colonnes actives) dès qu'il atteint l'un de ces statuts :

| Statut | Raison |
|--------|--------|
| `DELIVERED` | Livré |
| `DELIVERED_TO_CUSTOMER` | Livré à domicile |
| `PICKED_UP_BY_CUSTOMER` | Retiré au relais par le client |
| `RELAY_FINAL_RECEIVED` | Déposé au relais de destination — **la tournée du transporteur est terminée** |
| `AVAILABLE_FOR_PICKUP` | Mis à disposition — **la tournée du transporteur est terminée** |
| `CANCELLED` | Annulé |
| `RETURN_TO_SENDER` | Retour à l'expéditeur |

> **Important :** `isShipmentDelivered()` (dans `shipmentStatus.ts`) ne couvre **pas** `RELAY_FINAL_RECEIVED` ni `AVAILABLE_FOR_PICKUP` — ces statuts sont "en cours" du point de vue client. La fonction locale `isTerminalForTransporter()` dans `TransporterLoginPage.tsx` ajoute ces deux statuts.

---

## `current_packages` du transporteur

Ce compteur sert au **scoring d'affectation** (plus un transporteur a de colis, moins il sera choisi).

- **Incrémenté** : lors de `assign_shipment_to_transporter()` (création colis ou scan relay-intake)
- **Décrémenté** : par le trigger PostgreSQL `trg_decrement_transporter_packages` lors de la transition vers un statut terminal (`DELIVERED`, `DELIVERED_TO_CUSTOMER`, `PICKED_UP_BY_CUSTOMER`, `CANCELLED`, `RETURN_TO_SENDER`)

> **Note :** le trigger décrémente à la transition vers le terminal, PAS à `RELAY_FINAL_RECEIVED` ni `AVAILABLE_FOR_PICKUP`. Ces deux statuts ne déclenchent pas la décrémentation.

---

## Rôle « scanner » vs bypass administrateur

Sans bypass, les transitions exigent un `p_scanner_type` cohérent (`relay`, `transporter`, `hub`).

Avec `p_bypass_scanner_checks = true` (réservé à `PATCH /api/shipments/:id/status` pour admin/support) :
- contraintes de type scanner levées
- statuts `CANCELLED` et `RETURN_TO_SENDER` autorisés
- vérifications de paiement maintenues

---

## Prêt à être enlevé (transporteur)

`GET /api/shipments/pickup/sender-phone/:phone` — conditions :

- **Ramassage domicile** (`origin_relay_id` null) : statut `READY_FOR_DROP_OFF` ou `PAYMENT_CONFIRMED_AWAITING_DROP` + paiement réglé ou `relay_cash`
- **Dépôt relais** (`origin_relay_id` renseigné) : statut `RELAY_ORIGIN_RECEIVED`

---

## Recherche par téléphone expéditeur (dashboard relais)

`GET /api/shipments/pickup/sender-phone/:phone` — utilisé dans `RelayDashboard` pour trouver les colis à déposer d'un expéditeur :

- Retourne tous les colis en attente de dépôt liés à ce numéro
- Le modal se ferme automatiquement quand tous les colis ont été réceptionnés (liste vide)

---

## Statuts de fin de parcours

| Statut | Signification |
|--------|---------------|
| `PICKED_UP_BY_CUSTOMER` | Retrait au relais de destination |
| `DELIVERED_TO_CUSTOMER` | Livraison à domicile (fin transporteur) |
| `DELIVERED` | Usage résiduel — préférer les deux précédents |

---

## Page de suivi TrackingPage — étapes affichées

Le routage des étapes dépend du mode de collecte (`pickup_method`) et du mode de livraison (`home_delivery`) :

### Dépôt relais → livraison relais
```
Commande créée → Déposé au relais → En transit → Au relais de livraison → Retiré
```

### Dépôt relais → livraison domicile
```
Commande créée → Déposé au relais → En transit → Livré à domicile
```

### Ramassage domicile → livraison relais
```
Commande créée → Ramassage → En transit → Au relais de livraison → Retiré
```

### Ramassage domicile → livraison domicile
```
Commande créée → Ramassage → En transit → Livré à domicile
```

> **`Ramassage`** = statut `CARRIER_COLLECTED` (le transporteur a physiquement collecté le colis chez l'expéditeur). Cette étape est distincte de "En transit" (`IN_TRANSIT`).

---

## Suivi public vs API partenaire

| Endpoint | Identifiants acceptés |
|----------|------------------------|
| `GET /api/tracking/:trackingNumber` | Numéro de suivi, `shipment_code` (4 chiffres + 2 lettres), `pickup_code` (6 chiffres) |
| `GET /api/v1/tracking/:number` (clé API) | Même logique. Réponse enrichie avec `effective_status`, `shipment_code` |

---

## Historiques

- **`tracking_events`** : alimenté par `process_shipment_scan` et les handoffs (traçabilité fine)
- **`shipment_tracking`** : mises à jour manuelles (`PATCH`), handoffs récap, pickup relais

---

## Codes colis et retrait

- **`shipment_code`** (ex. `1234AB`) : généré à la création pour étiquetage physique
- **`pickup_code`** (6 chiffres) : généré à la première réception par nos services (`RELAY_ORIGIN_RECEIVED` ou `CARRIER_COLLECTED` en domicile), jamais à la création. **Affiché uniquement à `AVAILABLE_FOR_PICKUP`.**

---

## Paiement Paystack batch — détection webhook

Le webhook Paystack détecte qu'un paiement est un batch via **`event.data.metadata.batch_ref`** (pas via `ref.startsWith('BATCH-')`). La référence Paystack réelle (`PS-xxx`) est différente du `batch_ref` interne.

Le champ `automated_payments.raw_response` contient les `tracking_numbers` du batch (préservé via merge `jsonb || jsonb`, pas remplacé lors de la mise à jour de la référence).

---

## Voir aussi

- [Conditions réception relais](../../specifications/CONDITIONS_RECEPTION_RELAIS.md)
- [Processus points relais](PROCESSUS_POINTS_RELAIS.md)
- [Variables d'environnement](../configuration/VARIABLES_ENVIRONNEMENT.md)
- [README principal](../../../README.md)

---

*Dernière révision : mai 2026.*
