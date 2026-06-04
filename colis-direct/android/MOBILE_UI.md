# UI mobile native (Android)

Application **Kotlin + Jetpack Compose** dans `colis-direct/android/`.  
Parité fonctionnelle avec le **web React** (`colis-direct/src/`) et la **maquette** (`docs/android-maquette/`).

## MCP Android (Cursor)

Config MCP à la racine du monorepo : **`colisdirect-all/.cursor/mcp.json`**

```bash
chmod +x colis-direct/scripts/android-mcp/install-mcp.sh
./colis-direct/scripts/android-mcp/install-mcp.sh
```

Guide : [`../../.cursor/MCP_ANDROID.md`](../../.cursor/MCP_ANDROID.md)

## Build & install

```bash
cd colis-direct/android
./scripts/build-dev.sh
```

Flavor **dev** → package **`ci.colisdirect.app.dev`**, nom **ColisDirect DEV**.

```bash
adb uninstall ci.colisdirect.app          # ancien Capacitor (si présent)
adb install -r app/build/outputs/apk/dev/debug/app-dev-debug.apk
adb shell am start -n ci.colisdirect.app.dev/ci.colisdirect.app.MainActivity
```

Depuis `colis-direct/` : `npm run android:build` · `npm run android:install`

## Émulateur / appareil

Voir [`MOBILE_UI.md` section build](MOBILE_UI.md) et [`../docs/guides/development/MOBILE_EMULATORS.md`](../docs/guides/development/MOBILE_EMULATORS.md).

Captures : [`verification-screenshots/`](verification-screenshots/)

Prérequis : Android Studio (JBR) + SDK (`~/Library/Android/sdk`).

Flavor **dev** → API **staging** par défaut : `https://staging-api.colisdirect.com/api/`

Surcharge locale : `dev.api.base.url` dans `local.properties` — ex. `http://10.0.2.2:3001/api/`

**Production** : [`PROD_READINESS.md`](PROD_READINESS.md) · `./scripts/build-prod.sh`

**Transporteur / livreur** : `CourierMainScreen` — même API que `TransporterSpace.tsx` web.

## Écrans

| Onglet | Composable | Équivalent web React |
|--------|------------|----------------------|
| Accueil | `MobileHomeScreen` | accueil client |
| Mes colis | `ShipmentsListScreen` | `MyShipmentsPage` |
| Suivre | `TrackingPublicScreen` | suivi public |
| Relais | `PublicRelayMapScreen` | carte relais |
| Profil | `LoginScreen` / `ClientProfileScreen` | profil |
| Création | `CreateShipmentScreen` | `CreateShipmentPage` |
| Détail colis | `ShipmentDetailScreen` | détail + paiement en ligne |
| Tarifs | `PricingScreen` | tarifs |
| Partenaire | `PartnerScreen` | partenaire |
| Notifications | `NotificationsScreen` | notifications |

Shell : `MainContainerScreen` (5 onglets + FAB).

## Vérification visuelle

```bash
./scripts/verify-screenshots.sh emulator-5554
bash scripts/verify-screenshots-connected.sh emulator-5554
```

Voir [`verification-screenshots/RAPPORT_VERIFICATION.md`](verification-screenshots/RAPPORT_VERIFICATION.md).
