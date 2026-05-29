# Plan d’implémentation — système de livraisons

> **Mai 2026** — Ce document est un **plan / backlog historique**. Une grande partie des endpoints et écrans mentionnés **existent déjà** dans le dépôt ; croiser systématiquement avec `backend/src/routes/` et `src/pages/` avant de créer une nouvelle route.

## Objectif (rappel)

Couvrir les livraisons avec deux grands types :
1. **Livraison à domicile**
2. **Livraison en point relais**

Avec 2 modes de collecte pour chaque type :
- **Ramassage à domicile**
- **Dépôt au point relais**

---

## 📝 Phase 1 : Interface Transporteur - Ramassage à Domicile

### 1.1 Page **`TransporterPickupPage.tsx`** (existe dans le dépôt)

**Fonctionnalités prévues / observées** :
- Champ de recherche par téléphone expéditeur
- Affichage de la liste des envois en cours
- Icônes de statut paiement
- Boutons conditionnels
- Zone d'information détaillée (+/-)
- Écran d'impression bordereau

### 1.2 Backend - Endpoint de recherche

**Endpoint** : `GET /api/shipments/pickup/sender-phone/:phone` (**implémenté** dans `backend/src/routes/shipments.ts`).

### 1.3 Icônes de statut paiement

**Logique** :
- ✅ **Check vert** : `payment_status = 'paid'` ET `payment_method != 'relay_cash'`
- 🔵 **Check bleu** : `payment_method = 'relay_cash'` OU paiement à la livraison
- ❌ **Croix rouge** : `payment_status = 'pending'` ET `payment_method != 'relay_cash'`

### 1.4 Boutons conditionnels

**Backend - Endpoint** : `POST /api/shipments/:trackingNumber/confirm-payment`
- Met à jour `payment_status` à `'paid'`
- Retourne le colis mis à jour

**Backend - Endpoint** : `POST /api/shipments/:trackingNumber/reject`
- Met à jour le statut à `'CANCELLED'`
- Enregistre la raison du rejet

**Backend - Endpoint** : `POST /api/shipments/:trackingNumber/receive`
- Appelle `scanRelayIntake` ou `carrierPickup` selon le contexte
- Retourne le bordereau à imprimer

### 1.5 Écran d'impression bordereau

**Composant** : `PickupWaybillModal.tsx`
- Affiche les informations du bordereau
- Génère le QR code unique
- Bouton d'impression
- Contenu :
  - Nom et prénom du destinataire
  - Numéro de téléphone du destinataire
  - Numéro d'envoi (tracking_number)
  - Statut de paiement
  - QR Code unique
  - Type de livraison

---

## 📝 Phase 2 : Workflow Livraison

### 2.1 Scan QR et transitions métier

- **`POST /api/qr-codes/scan`** : validation par **`qr_code_hash`** (`backend/src/routes/qrCodes.ts`).
- **`POST /api/scan/extras/*`** : flux relay / transporteur avec **`tracking_number`** (`relay-intake`, `carrier-pickup`, `relay-final-intake`, `ops/make-available`, etc.).  
  Voir **`docs/specifications/CONDITIONS_RECEPTION_RELAIS.md`** et **`docs/RULES_QR_CODE_SYSTEM.md`** pour le comportement réel.

### 2.2 Livraison transporteur / confirmation codes

Les endpoints **`POST /api/shipments/:trackingNumber/deliver`**, **`collect-payment`**, etc. sont à **vérifier dans `shipments.ts`** : une partie du plan peut être couverte par **`process_shipment_scan`** dans **`scan.ts`** / **`handoffs.ts`** selon les évolutions récentes. Toujours se fier au routeur monté dans **`backend/src/index.ts`**. **Référence métier à jour** : [Flux statuts et scans](../../guides/business/FLUX_STATUTS_ET_SCANS.md).

---

## 📝 Phase 3 : Interface Point Relais - Réception Transporteur

### 3.1 Amélioration `RelayDashboard.tsx`

**Nouvelle section** : "Réception de colis transporteur"
- Champ pour saisir l'UID du transporteur
- Affichage des colis à recevoir
- Scan QR code ou saisie numéro de suivi
- Validation et mise à jour du statut

**Backend - Endpoint** : `GET /api/handoffs/transporter/:transporterId/relay/:relayId/shipments`
- Existe déjà, à vérifier

---

## 📝 Phase 4 : Notifications

### 4.1 SMS/WhatsApp

**À implémenter** :
- Notification destinataire : "Votre colis est arrivé au point relais X"
- Notification expéditeur : "Votre colis a été livré avec succès"
- Notification code secret de retrait (lors de la création)

---

## 🔧 Modifications Base de Données

### Nouveaux champs (si nécessaire)

- `pickup_at_home` : Boolean - Indique si c'est un ramassage à domicile
- `delivery_payment_collected` : Boolean - Paiement collecté à la livraison
- `delivery_payment_method` : TEXT - Méthode de paiement à la livraison
- `delivery_payment_amount` : NUMERIC - Montant collecté

---

## 📊 Statuts à gérer

### Statuts système existants (à utiliser)

- `READY_FOR_DROP_OFF` → "En attente de dépôt / En attente de ramassage"
- `RELAY_ORIGIN_RECEIVED` → "Réceptionné par le relais de dépôt"
- `CARRIER_COLLECTED` → "En transit" (après ramassage)
- `IN_TRANSIT` → "En transit"
- `RELAY_FINAL_RECEIVED` → "Disponible pour retrait" (si point relais)
- `AVAILABLE_FOR_PICKUP` → "Disponible pour retrait"
- `PICKED_UP_BY_CUSTOMER` → "Retiré au relais par le destinataire" (statut SQL canonique après retrait)
- `DELIVERED_TO_CUSTOMER` → "Livré à domicile" (fin de parcours transporteur)
- `DELIVERED` → statut résiduel / anciens flux ; les nouveaux développements doivent préférer `DELIVERED_TO_CUSTOMER` ou `PICKED_UP_BY_CUSTOMER`
- `RETURN_TO_SENDER` → "Retourné / Échec livraison"
- `CANCELLED` → "Annulé"

---

## Composants et pages

Plusieurs éléments listés ci‑dessous **existent déjà** (`TransporterPickupPage`, modales d’impression, etc.). Avant d’en créer de nouveaux, parcourir `src/pages/` et `src/components/`.

1. ~~`TransporterPickupPage.tsx`~~ — présent
2. `PickupShipmentList.tsx` — à confirmer / peut être intégré dans la page
3. Idem pour les autres lignes : **valider par recherche dans le repo**

---

## Ordre d’implémentation recommandé

Les étapes ci‑dessous sont un **guide historique**. Pour un chantier neuf, partir de l’état **`main`** et ne traiter que les cases encore ouvertes (notifications n8n / SMS, finesse UX, etc.).

---

## Notes importantes

- Code secret de retrait : **`pickup_code`** (voir usages dans `backend/src/routes/scan.ts`, `shipments.ts`).
- Contenu des QR après passage relais : **`shipment_code`** + données JSON / hash — **`docs/RULES_QR_CODE_SYSTEM.md`**.
- Notifications automatisées : variables **`N8N_*`** ou SMTP selon **`docs/guides/configuration/VARIABLES_ENVIRONNEMENT.md`**.

