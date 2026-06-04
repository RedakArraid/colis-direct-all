# UI mobile native — référence Capacitor

L’affichage suit **`colis-direct/www/app.js`** (app Capacitor dans l’APK), **pas** le site React `colis-direct/src/`.

**Maquette produit (zip)** : voir [`MAQUETTE_ANDROID.md`](MAQUETTE_ANDROID.md) — écarts UI/parcours vs implémentation actuelle (app client 7 écrans, paiement 4, livreur 8). Sources JSX : [`docs/maquette-reference/`](../docs/maquette-reference/).

## MCP Android (Cursor)

Config MCP à la racine du monorepo : **`colis-direct-all/.cursor/mcp.json`** (serveur **mobile-mcp**).

```bash
# Installer mcp-installer + mobile-mcp (1ère fois)
chmod +x colis-direct-android/scripts/install-mcp.sh
./colis-direct-android/scripts/install-mcp.sh

# Vérifier adb + config
chmod +x colis-direct-android/scripts/setup-mcp.sh
./colis-direct-android/scripts/setup-mcp.sh
```

Puis **redémarrer Cursor** → Réglages → **MCP** → `mobile-mcp` activé.

Guide complet : [`../../.cursor/MCP_ANDROID.md`](../../.cursor/MCP_ANDROID.md)

## Build

```bash
cd colis-direct-android/android
chmod +x scripts/build-dev.sh
./scripts/build-dev.sh
```

APK généré : `app/build/outputs/apk/dev/debug/app-dev-debug.apk`

Prérequis : Android Studio (JBR) + SDK (`~/Library/Android/sdk`).

Flavor **dev** → API **staging** par défaut : `https://staging-api.colisdirect.com/api/` (même BDD que les comptes `e2e+*@colisdirect.test`).

Surcharge locale : `dev.api.base.url` dans `android/local.properties` (voir `local.properties.example`) — ex. `http://10.0.2.2:3001/api/` pour un backend Docker sur la machine hôte.

**Production** : [`PROD_READINESS.md`](PROD_READINESS.md) + `./scripts/build-prod.sh` (flavor `prod` → `https://api.colisdirect.com/api/`).

**Transporteur / livreur** : `CourierMainScreen` (4 onglets) — même API que `TransporterSpace.tsx` web ; saisie manuelle conservée via « Saisir un n° de suivi ».

## Écrans

| Onglet | Composable | `www/app.js` |
|--------|------------|----------------|
| Accueil | `MobileHomeScreen` | `renderHome()` |
| Mes colis | `ShipmentsListScreen` | `renderShipments()` |
| Suivre | `TrackingPublicScreen` | `renderTracking()` |
| Relais | `PublicRelayMapScreen` | `renderMap()` |
| Profil | `LoginScreen` / `ClientProfileScreen` | login / profile |
| Création | `CreateShipmentScreen` | `renderCreateShipment()` (4 étapes + tarifs API) |
| Détail colis | `ShipmentDetailScreen` | `tracking-detail` (progression + historique) |
| Tarifs | `PricingScreen` | `renderPricing()` |
| Partenaire | `PartnerScreen` | section « Devenez partenaire » |
| Notifications | `NotificationsScreen` | cloche + liste |

Shell : `MainContainerScreen` (5 onglets + FAB).

**Par rôle (après connexion)** :

| Rôle | Accueil | Mes colis | FAB envoi |
|------|---------|-----------|-----------|
| `client` | `MobileHomeScreen` | `ShipmentsListScreen` | oui |
| `relay_partner` | `RelayMainScreen` (shell dédié) | — | non (hors shell client) |
| `admin` | `AdminMainScreen` (shell dédié) | — | non |
| `support` | `SupportMainScreen` (shell dédié) | — | non |
| `transporter` | `TransporterHomeScreen` | `TransporterDashboard` | non |
| `admin` / `support` | `MobileHomeScreen` (+ bandeau info) | `ShipmentsListScreen` | non |

Admin/support : pas d’app mobile dédiée (dashboard web) ; l’APK réutilise l’UI client.

Routes stack : `pricing`, `partner`, `address_book`, `payment_history`, `shipment_detail`, `create_shipment`, outils relais/transporteur.

## Implémenté (suite)

- **Tarification** : `GET /api/pricing-grids/calculate` + fallback local (`PricingHelper`)
- **Création colis** : courrier/colis, tailles petit/moyen/grand, options fragile/assuré, 4 cartes modes livraison avec prix, récap + paiement
- **Détail** : barre de progression (`ShipmentProgressBar`) + timeline événements tracking

## P1 livré

- **Création colis** : communes CI (`CiCommunes` + `CommuneDropdown`), repères expéditeur/destinataire, validation par étape, skip relais si domicile→domicile
- **Connexion** : `LoginScreen` avec bascule Connexion / Inscription (`signUp`)
- **Détail colis** : annulation (dialog), partage du n° de suivi, titre avec `shipment_code`
- **Profil** : liens Tarifs, Partenaire, CGU (`https://colisdirect.com/cgu`), support mailto
- **Navigation** : CTA accueil → `PricingScreen` / `PartnerScreen`

## P2 / polish livré

- **Carnet d'adresses** : `GET/POST/DELETE /recipient-addresses`, sélection création colis, case « Enregistrer ce destinataire »
- **Historique paiements** : colis `payment_status=paid` depuis l’API shipments
- **Partenaire** : formulaire relié à `POST /transporter-applications` et `POST /relay-applications` (public), deep link `partnerType=livreur|relais`

## Vérification visuelle (émulateur)

Captures page par page : [`verification-screenshots/`](verification-screenshots/)  
Rapport : [`verification-screenshots/RAPPORT_VERIFICATION.md`](verification-screenshots/RAPPORT_VERIFICATION.md)

```bash
./scripts/verify-screenshots.sh emulator-5554
bash scripts/verify-screenshots-connected.sh emulator-5554   # client E2E (bouton « Client » connexion rapide dev)

**Connexion rapide (dev)** — flavor `dev` + `DEBUG` uniquement, onglet Profil : Client, Point relais, Transporteur, Admin, Support (`e2e+*@colisdirect.test` / `admin123`, voir `tests/e2e/README.md`).
```

## P2 livré (carte & notifs)

- **Notifications** : `NotificationsScreen`, badge sur `AppHeader`, sync depuis les colis actifs
- **Carte relais** : `RelayMapView` (OSM / osmdroid), marqueurs cliquables, scroll liste
- **Nettoyage** : suppression `ClientDashboard`, `ClientHomeScreen`, `PublicHomeScreen` ; routes mortes retirées de `NavGraph`
