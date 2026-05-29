# Conditions pour la réception de colis au point relais

Référence technique alignée sur **`backend/src/routes/scan.ts`** (routeur `scanExtrasRouter`, préfixe **`/api/scan/extras`**) et sur le comportement du **`RelayDashboard`** (`src/pages/RelayDashboard.tsx`).

---

## Vue d'ensemble

Deux grands cas côté interface relais :

1. **Réception à l'origine** : passage vers **`RELAY_ORIGIN_RECEIVED`** (`relay-intake`).
2. **Réception au relais de destination** : **`RELAY_FINAL_RECEIVED`** puis mise à disposition **`AVAILABLE_FOR_PICKUP`** (`relay-final-intake` + `ops/make-available`).

La fonction PostgreSQL **`process_shipment_scan`** impose les transitions autorisées et les vérifications de paiement. Les endpoints Express vérifient des règles supplémentaires (relais, identité, etc.).

---

## Statuts affichés vs statut en base

Les réponses tracking/listes peuvent exposer des libellés dérivés (`PAYMENT_CONFIRMED_AWAITING_DROP`, `PAYMENT_PENDING_AT_RELAY`) alors que `shipments.current_status` reste souvent **`READY_FOR_DROP_OFF`**.

**Important** : `POST /api/scan/extras/relay-intake` lit `current_status` **en base**. Il n'appelle `process_shipment_scan(..., 'RELAY_ORIGIN_RECEIVED', ...)` que si ce statut vaut `READY_FOR_DROP_OFF`.

---

## Conditions générales

- Utilisateur authentifié, rôle **`relay_partner`**, `relay_point_id` renseigné dans `users`.
- `tracking_number` présent dans le corps des requêtes POST.

---

## Réception initiale (`relay-intake`)

**Endpoint** : `POST /api/scan/extras/relay-intake`  
**Corps** : `{ "tracking_number": "..." }`

### Comportement backend (dans l'ordre)

1. **Garde dépôt ≠ livraison** : si le relais connecté est le `destination_relay_id` du colis → **400** *"Ce relais est le point de livraison de ce colis. Le dépôt doit être effectué dans un autre point relais."* — un relais ne peut pas être à la fois le relais de dépôt et le relais de livraison.

2. Si `current_status === 'RELAY_ORIGIN_RECEIVED'` → succès idempotent (*déjà réceptionné*).

3. Si `origin_relay_id` est `NULL` et `current_status === 'READY_FOR_DROP_OFF'` → mise à jour de `origin_relay_id` avec le relais connecté, puis assignation automatique transporteur.

4. Sinon, le colis doit être lié au relais (`origin_relay_id` ou `destination_relay_id` = relais connecté).

5. `current_status` doit être `READY_FOR_DROP_OFF` pour déclencher le scan SQL → **`RELAY_ORIGIN_RECEIVED`**.

### `origin_relay_id` à la création

- **Flux client normal** : `origin_relay_id` est `NULL` à la création — déterminé dynamiquement lors du premier scan d'intake.
- **Flux assisté (gérant relais)** : `origin_relay_id` est défini à la création avec le relais du gérant (le client est physiquement là), et `relay-intake` est appelé immédiatement après la création.

### Côté UI (`handleReceiveShipment`)

Le dashboard propose la réception pour les statuts normalisés : `READY_FOR_DROP_OFF`, `PAYMENT_CONFIRMED_AWAITING_DROP`, `PAYMENT_PENDING_AT_RELAY`, `PAYMENT_RECEIVED_AT_RELAY`. La réussite dépend du `current_status` réel en base.

---

## Réception finale et mise à disposition

### `RELAY_FINAL_RECEIVED`

Le statut `RELAY_FINAL_RECEIVED` est positionné par `relay-final-intake` quand un colis en `IN_TRANSIT` arrive au relais de destination. Depuis ce statut, le relais peut directement appeler `opsMakeAvailable` (bouton "Mettre à disposition" dans le dashboard).

### Étape 1 — `relay-final-intake`

**Endpoint** : `POST /api/scan/extras/relay-final-intake`

- Vérifie paiement Mobile Money si applicable.
- Appelle `process_shipment_scan(..., 'RELAY_FINAL_RECEIVED', ...)`.

### Étape 2 — `ops/make-available`

**Endpoint** : `POST /api/scan/extras/ops/make-available`

- Même garde-fou Mobile Money.
- Appelle `process_shipment_scan(..., 'AVAILABLE_FOR_PICKUP', ...)`.

Sur le `RelayDashboard`, pour `IN_TRANSIT` / `CARRIER_COLLECTED`, les deux appels sont enchaînés. Pour `RELAY_FINAL_RECEIVED` (colis bloqué), seul `opsMakeAvailable` est appelé.

---

## Retrait au relais (après mise à disposition)

**Endpoint** : `POST /api/scan/extras/relay/complete-delivery`  
**Corps** : `tracking_number`, `pickup_code` (obligatoire), `recipient_identifier` (optionnel).

- Refus si `home_delivery` est vrai.
- Exige `AVAILABLE_FOR_PICKUP`.
- Vérifie `pickup_code`.

---

## Règle métier : dépôt ≠ livraison

Un colis **ne peut pas** avoir le même relais comme relais de dépôt (`origin_relay_id`) et relais de livraison (`destination_relay_id`).

**Validations en place :**

| Niveau | Où | Ce qui est bloqué |
|--------|----|-------------------|
| Frontend | `AssistClientForm.tsx` — filtre chargement | Le relais du gérant est exclu de la liste des relais de livraison |
| Frontend | `AssistClientForm.tsx` — soumission | Alerte si `selectedDeliveryRelay === relayId` |
| Backend | `scan.ts` `relay-intake` | HTTP 400 si le relais connecté = `destination_relay_id` |
| Backend | `shipments.ts` création | HTTP 400 si `origin_relay_id === destination_relay_id` dans le payload |

---

## Messages d'erreur backend

| Situation | Réponse |
|-----------|---------|
| `tracking_number` manquant | 400 — *tracking_number est requis* |
| Relais = destination (intake) | 400 — *Ce relais est le point de livraison de ce colis…* |
| Pas de relais associé au compte | 403 — *associé à un point relais* |
| Colis inconnu | 404 |
| Colis pas lié au relais | 403 — *pas lié à votre point relais* |
| Mauvais statut pour `relay-intake` | 400 — *Transition impossible : …* |
| Mobile Money non validé | 400 — messages dédiés |
| Retrait : mauvais code | 400 — *Code de retrait invalide* |

---

## Fichiers concernés

- **Frontend** : `src/pages/RelayDashboard.tsx`, `src/components/relay/AssistClientForm.tsx`
- **Backend** : `backend/src/routes/scan.ts`, `backend/src/routes/shipments.ts`
- **Client API** : `src/lib/api.ts` (`scanRelayIntake`, `scanRelayFinalIntake`, `opsMakeAvailable`, `relayCompleteDelivery`)

---

## Voir aussi

- [Flux statuts et scans](../guides/business/FLUX_STATUTS_ET_SCANS.md)
- [Processus points relais](../guides/business/PROCESSUS_POINTS_RELAIS.md)

---

*Dernière révision : mai 2026.*
