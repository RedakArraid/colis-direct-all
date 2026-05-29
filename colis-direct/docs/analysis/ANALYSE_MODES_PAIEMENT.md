# Analyse des Modes de Paiement - COLISDIRECT

## 📋 Vue d'ensemble

Le tunnel **client actuel** repose sur :

1. **Paystack** (`paystack`) — carte + Mobile Money agrégés par Paystack  
2. **CinetPay** (`cinetpay`) — alternative CI  
3. **Espèces au relais** (`relay_cash`)  

Les valeurs **`mobile_money`**, **`card`**, **`paypal`**, etc. peuvent encore apparaître en base (**historique**, contraintes SQL, anciens envois). La **déclaration manuelle** Mobile Money, la **validation support** et la table **`mobile_money_channels`** (numéros à créditer) **ne font plus partie du produit** (routes dédiées retirées ; table `mobile_money_channels` supprimée par migration `20260502120000_remove_mobile_money_support_gate.sql`).

---

## 💳 Modes de Paiement (état au produit)

### 1. **Paystack** (`paystack`) — principal

**Description** : Paiement en ligne (carte, Mobile Money opérateurs via Paystack).

**Caractéristiques** :

- `POST /api/payments/paystack/init`
- Webhook **`POST /api/payments/paystack/webhook`** (corps brut pour signature HMAC)
- Confirmation automatique → `payment_status = paid`

**Configuration** : `PAYSTACK_SECRET_KEY`, `FRONTEND_URL`, `BACKEND_URL`

---

### 2. **CinetPay** (`cinetpay`) — optionnel

**Description** : Paiement en ligne alternatif pour la Côte d’Ivoire.

**Caractéristiques** :

- `POST /api/payments/cinetpay/init`
- `POST /api/payments/cinetpay/notify`

**Configuration** : `CINETPAY_API_KEY`, `CINETPAY_SITE_ID`, etc.

---

### 3. **Paiement au Point Relais** (`relay_cash`)

**Description** : Espèces au relais lors du dépôt.

**Tables** : `relay_cash_payments`

**Endpoints** :

- `POST /api/payments/relay-cash/confirm`
- `GET /api/payments/relay-cash/dashboard` (rôles autorisés)

**Workflow** : création avec `relay_cash` → confirmation encaissement par le relais → `payment_status = paid`.

---

### 4. **Mobile Money legacy** (`mobile_money`)

**Statut** : ❌ **Plus proposé à la création** d’envoi (API renvoie une erreur explicite si tentative de création avec ce seul flux manuel).

**Historique** :

- Table **`mobile_money_payments`** : peut contenir d’anciennes lignes (`pending` / `approved` / `rejected`)
- Contrôle opérationnel : **`payment_status`** (ex. `paid`) aligné avec les parcours automatisés ; plus de blocage « validation support » sur `mobile_money_payments.status`
- Table **`mobile_money_channels`** : **supprimée** (plus de configuration de numéros de réception en admin)

---

### 5. **PayPal** (`paypal`)

**Statut** : ❌ Non implémenté (voir dette produit / contraintes DB).

---

### 6. **Code Promo** (`promo_code`)

**Statut** : ✅ Partiel (souvent frontend ; à valider sur la branche courante).

**Description** : Réduction ou gratuité via code (ex. logique métier dans `CreateShipmentPage` / `PaymentSummaryStep`).

---

### 7. **Compte Entreprise** (`business_account`)

**Statut** : ❌ Non implémenté.

---

## 📊 Structure de Base de Données (extrait)

### Table `shipments`

`payment_method` et `payment_status` selon migrations et contraintes du dépôt (inclure `paystack`, `cinetpay` si la contrainte a été étendue).

### Table `mobile_money_payments` (historique)

Schéma inchangé pour lecture d’anciens dossiers ; **pas** de workflow admin « valider / rejeter » exposé dans l’API actuelle.

### Table `relay_cash_payments`

Inchangée — espèces au relais.

### Table ~~`mobile_money_channels`~~

**Supprimée** en production après application de la migration `20260502120000_remove_mobile_money_support_gate.sql`.

---

## 🔄 Workflows (résumé)

### Paiement en ligne (Paystack / CinetPay)

1. Client choisit Paystack ou CinetPay  
2. `init` → redirection / flux prestataire  
3. Webhook / notify → `payment_status = paid`  
4. Parcours logistique : exiger `paid` pour les étapes concernées (sauf `relay_cash`)

### Relay Cash

1. `relay_cash` → enregistrement `relay_cash_payments`  
2. Relais confirme l’encaissement  
3. `paid` → réception / scans autorisés selon règles métier

### Ancien Mobile Money manuel

Conservé uniquement pour **données historiques** ; pas de création ni de validation support via l’app.

---

## 📈 Statistiques et suivi

- **`GET /api/payments/relay-cash/dashboard`** — tableau de bord relay cash (selon rôles)  
- Les endpoints du type **`/api/payments/mobile-money/*`** (déclarations, stats, canaux) **ne sont plus exposés**

---

## ⚠️ Limitations / dettes

1. PayPal / business_account : contraintes ou mentions résiduelles  
2. Code promo : renforcer validation backend si nécessaire  
3. Gestion fine échecs / remboursements Paystack & CinetPay  

---

## 📝 Notes techniques

### Validation

- **Paystack / CinetPay** : webhooks / signatures  
- **Relay cash** : confirmation partenaire relais  
- **Scans / handoffs** : pour tout sauf `relay_cash`, **`payment_status = paid`** requis là où la politique métier l’impose (fonction SQL `process_shipment_scan` mise à jour en ce sens)

### Fichiers clés

- `backend/src/routes/payments.ts`  
- `backend/src/routes/shipments.ts`  
- `database/migrations/20260502120000_remove_mobile_money_support_gate.sql`  
- `src/components/shipment/PaymentSummaryStep.tsx`  
- `src/pages/CartPage.tsx`, `CreateShipmentPage.tsx`  

---

**Dernière mise à jour** : 2026-05-01 — alignement documentation / OpenAPI / modal livraison (encaissement espèces uniquement).
