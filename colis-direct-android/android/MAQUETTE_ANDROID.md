# Maquette `colisdirect.zip` — périmètre Android

Source : archive à la racine du monorepo (`colisdirect.zip`).  
Fichiers utiles (sans les `uploads/` lourds) : `app.jsx`, `mobile-screens.jsx`, `courier-screens.jsx`, `payment-screens.jsx`, `android-frame.jsx`, `ColisDirect - Toutes les pages.html`.

Pour prévisualiser la maquette en local :

```bash
cd /tmp && mkdir -p colis-maquette && cd colis-maquette
unzip -o /chemin/vers/colisdirect.zip '*.jsx' '*.html' '*.js' -x 'uploads/*'
open "ColisDirect - Toutes les pages.html"
```

---

## Vue d’ensemble Android dans la maquette

La maquette définit **3 blocs** pour mobile Android (Material 3) :

| Section | Écrans | Fichier |
|---------|--------|---------|
| **App client** | 7 | `mobile-screens.jsx` |
| **Paiement** | 4 | `payment-screens.jsx` |
| **App livreur** | 8 | `courier-screens.jsx` |

Il n’y a **pas** de section dédiée **point relais** (guichet, réception, remise client) dans la maquette — seulement l’app client + livreur.

---

## 1. App client Android (7 écrans)

### Navigation maquette vs app native actuelle

| Maquette (4 onglets) | Native actuel (5 onglets + FAB) |
|----------------------|----------------------------------|
| Accueil | Accueil |
| Envois | **Mes colis** (+ FAB création) |
| Points relais | Relais (+ onglet **Suivre** en plus) |
| Profil | Profil |

La maquette regroupe création / suivi sous **Envois** ; le natif suit plutôt **`www/app.js`** (Capacitor) avec onglet Suivre séparé.

### Écran par écran

| # | Maquette | Natif Kotlin | Écart principal |
|---|----------|--------------|-----------------|
| 1 | **Accueil** — hero « Envoyez et recevez… », image livreur, 2 CTA, grille 6 raccourcis, carte « Dernier envoi » | `MobileHomeScreen` — hero orange Capacitor, suivi rapide, services, partenaire, tarifs | **UI différente** : pas de hero gradient + image ; pas de grille 3×2 ; pas de carte dernier envoi dédiée en bas |
| 2 | **Créer un envoi** — 4 modes, tailles, **catégorie**, villes départ/arrivée, destinataire (1 écran) | `CreateShipmentScreen` — **4 étapes** (infos, mode, relais, récap) | Fonctionnel proche ; maquette = 1 page ; **catégorie colis** absente du flux natif |
| 3 | **Récapitulatif & prix** — trajet, lignes, **code promo**, total | Dernière étape de `CreateShipmentScreen` | Récap OK ; **code promo** non implémenté |
| 4 | **Suivi** — timeline verticale, statuts datés | `TrackingPublicScreen` + `ShipmentDetailScreen` | Proche ; polish timeline / détail à rapprocher de la maquette |
| 5 | **Points relais** — carte + liste + fiche relais sélectionnée | `PublicRelayMapScreen` (OSM) | Proche fonctionnellement |
| 6 | **Profil** — header **orange plein**, menu (infos, adresses, envois, **moyens de paiement**, notifs, **paramètres**) | `ClientProfileScreen` — header **navy**, cartes compte + menu (carnet, historique, tarifs, partenaire, CGU, support) | **Design profil différent** ; pas d’écrans **édition profil**, **moyens de paiement**, **paramètres** |
| 7 | **Espace livreur agréé** (aperçu) — toggle dispo, stats jour, liste courses/gains | Non : le livreur a une **app séparée** dans la maquette (voir §3) | Écran m7 = entrée marketing, pas l’implémentation métier actuelle |

---

## 2. Paiement Android (4 écrans)

| # | Maquette | Natif actuel | Écart |
|---|----------|--------------|-------|
| 1 | Choix moyen — **OM, MTN, Wave, Moov**, carte, **espèces à la livraison** | `CreateShipmentScreen` — chips Paystack / Mobile Money / espèces | Pas d’écran dédié ; **opérateurs OM/MTN/Wave/Moov** non choisis individuellement |
| 2 | Mobile Money — numéro + instructions opérateur | Init Paystack + WebView / redirect | Parcours technique, pas l’UI maquette |
| 3 | Carte bancaire — formulaire carte | Via Paystack | Idem |
| 4 | Confirmation succès — check + récap | Retour app après callback Paystack | **Écran succès dédié** manquant |

À faire pour coller à la maquette : stack `PayMethodScreen` → `PayMobileMoneyScreen` / `PayCardScreen` → `PaySuccessScreen` (Compose), branchée après récap colis.

---

## 3. App livreur Android (8 écrans)

La maquette décrit une **app livreur « courses »** (type gig) :

- Onglets : **Accueil · Courses · Gains · Profil**
- Carte / itinéraire, courses disponibles, course en cours, **preuve de livraison** (photo), **gains**, historique

### Comparaison avec le natif `transporter` actuel

| Maquette livreur | Natif `transporter` | Aligné ? |
|------------------|---------------------|----------|
| Tableau de bord + toggle disponibilité | `TransporterHomeScreen` (stats assignés / livrés) | Partiel |
| Courses disponibles + carte | — | **Non** |
| Détail course (prix, distance, accepter) | — | **Non** |
| Course en cours + navigation | — | **Non** |
| Preuve de livraison (photo) | — | **Non** |
| Mes gains | — | **Non** |
| Historique courses | `TransporterDashboard` (liste assignations) | Partiel |
| Profil livreur | `ClientProfileScreen` + outils scan | **Non** (profil client réutilisé) |

Le natif actuel est aligné sur **logistique ColisDirect** (scan ramassage, enlèvement domicile, API handoffs) — **pas** sur le parcours « course » de la maquette.

### Point relais (spec web, UI type livreur)

Le rôle **`relay_partner`** ouvre **`RelayMainScreen`** (`RELAY_MAIN`) — même logique que le livreur : shell dédié, header sombre, stats API (`/relay-points/me`, `/{id}/stats`, `/{id}/active-shipments`, `shipments?relay_id=`), saisie clavier (`RelayIntakeScreen`, `DeliveryConfirmScreen`). Référence métier : `RelayDashboard.tsx` (pas de maquette zip dédiée).

---

## 4. État d’implémentation (juin 2026)

| Bloc | Statut | Fichiers / notes |
|------|--------|------------------|
| **Saisie manuelle** (relais / transporteur) | ✅ | `RelayIntakeScreen`, `PickupScanScreen` — plus de `QrScannerView` ; libellés « Saisir » |
| **Paiement 4 écrans** | ✅ | `PaymentFlowScreens.kt` + routes `NavGraph` ; branché après `CreateShipmentScreen` (hors espèces relais) |
| **App livreur** | ✅ | `CourierMainScreen` — UI maquette + données web (`offers`, `assignments`, wallet, profil) |
| **Accueil client** | Partiel | `MobileHomeScreen` — grille 6 raccourcis ; hero Capacitor conservé |
| **Profil client** | Partiel | Header **orange** si rôle `client` ; écrans édition / moyens paiement / paramètres **à faire** |
| **Point relais** | ✅ | `RelayMainScreen` — APIs web + saisie texte |
| **Admin** | ✅ | `AdminMainScreen` — `/stats`, envois, réseau, support, modules |
| **Support** | ✅ | `SupportMainScreen` — `/support/dashboard`, tickets |

Contrainte produit : **aucun scan caméra** pour relais et transporteur — saisie clavier uniquement.

## 5. Synthèse : écarts restants

1. **Coque client** : 5 onglets Capacitor vs 4 onglets maquette (décision produit).
2. **Hero accueil** maquette (image livreur, gradient pêche) non encore reproduit.
3. **Profil** : entrées maquette (adresses, moyens paiement, paramètres) sans écrans dédiés.
4. **Livreur** : pas de backend « courses gig » séparé — parcours UI maquette sur API logistique existante.
5. **Code promo** récap colis : non implémenté.

---

## 6. Priorités suggérées (Android)

### P0 — Parité visuelle client (maquette §1)

1. Accueil : hero + grille raccourcis + dernier envoi (ou variante hybride Capacitor + maquette).
2. Profil : header orange + entrées manquantes (édition, moyens de paiement, paramètres).
3. Onglets : décider **4 onglets maquette** vs **5 onglets Capacitor** (produit).

### P1 — Paiement (maquette §2)

4. Stack navigation paiement dédiée (4 écrans) avant/après Paystack.

### P2 — App livreur (maquette §3)

5. Nouveau shell `CourierMainContainer` (4 onglets) + 8 écrans — **gros chantier**, à valider avec le backend (courses vs handoffs).

### P3 — Point relais

6. Spec UI relais (non dans zip) — garder `RelayHomeScreen` / outils scan ou faire une section maquette dédiée.

---

## 7. Fichiers natifs (référence)

| Maquette | Composable cible suggéré |
|----------|-------------------------|
| MobileHome (design zip) | `MobileHomeScreenV2` ou refonte `MobileHomeScreen` |
| MobileProfile (orange) | refonte `ClientProfileScreen` |
| PayMethod…PaySuccess | `payment/PaymentMethodScreen.kt` … |
| CourierDashboard…Profile | `courier/` package + `CourierNavGraph` |
| Relay (absent) | conserver `relay/*` actuel |

---

*Dernière analyse : juin 2026 — zip `colisdirect.zip` + état repo `colis-direct-android/android`.*
