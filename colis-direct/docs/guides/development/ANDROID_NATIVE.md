# Android natif (Kotlin / Compose)

Application mobile de référence pour **Android**. Parité métier avec le web React (`src/pages/`).

## Emplacement

```
colis-direct/android/
├── app/src/main/java/ci/colisdirect/app/
│   ├── ui/screens/          # Composables
│   ├── ui/navigation/       # NavGraph
│   ├── viewmodel/
│   ├── data/repository/
│   └── domain/ProfileVisibility.kt   # règles rôles (aligné App.tsx)
├── scripts/                 # build-dev, install-dev, clean-emulator
└── README.md
```

**Ne pas ouvrir** d’anciens chemins : `colis-direct-android/`, shell `www/`, projet Capacitor Java.

## Build & installation

```bash
cd colis-direct
cp android/local.properties.example android/local.properties   # une fois
npm run android:build
npm run android:install
```

APK : `android/app/build/outputs/apk/dev/debug/app-dev-debug.apk`

## Flavors & API

| Flavor | Package | API par défaut |
|--------|---------|----------------|
| dev | `ci.colisdirect.app.dev` | staging (`staging-api.colisdirect.com`) |
| staging | `ci.colisdirect.app.staging` | staging |
| prod | `ci.colisdirect.app` | `api.colisdirect.com` |

Surcharge dev : `dev.api.base.url=http://10.0.2.2:3001/api/` dans `android/local.properties` (backend Docker sur la machine hôte).

## Navigation & rôles

1. **Splash** → si session valide, redirection selon `user.role`.
2. **Staff** (`transporter`, `relay_partner`, `admin`, `support`) → shell dédié (pas l’accueil client).
3. **Client** / invité → `MainContainerScreen` (Accueil, Mes colis, Suivre, Relais, Profil).

Connexion depuis **Profil** (boutons *Connexion rapide (dev)*) déclenche la même redirection que le splash.

### Comptes E2E (dev + DEBUG)

Mot de passe : **`admin123`**

| Bouton | Email | Shell |
|--------|-------|-------|
| Client | `e2e+client@colisdirect.test` | Accueil client |
| Point relais | `e2e+relay@colisdirect.test` | `RelayMainScreen` |
| Transporteur | `e2e+transporter@colisdirect.test` | `CourierMainScreen` |
| Admin | `e2e+admin@colisdirect.test` | `AdminMainScreen` |
| Support | `e2e+support@colisdirect.test` | `SupportMainScreen` |

## Parité web

| Web | Android |
|-----|---------|
| `AdminDashboard.tsx` | `AdminMainScreen.kt` |
| `RelayDashboard.tsx` | `RelayMainScreen.kt` |
| `transporter/TransporterSpace.tsx` | `CourierMainScreen.kt` |
| `support/CustomerSupportDashboard.tsx` | `SupportMainScreen.kt` |
| `MyShipmentsPage.tsx` | `ShipmentsListScreen.kt` |
| `CreateShipmentPage.tsx` | `CreateShipmentScreen.kt` |

Écrans **non branchés** (legacy, à supprimer) : `TransporterHomeScreen`, `TransporterDashboard`, `RelayHomeScreen`, `RelayDashboard`.

## Contraintes produit

- **Pas de scan caméra** relais/transporteur : saisie clavier (`RelayIntakeScreen`, `PickupScanScreen`).
- Paiement : stack 4 écrans (`PaymentFlowScreens.kt`) + Paystack.

## Vérification

```bash
cd colis-direct/android
./scripts/verify-screenshots.sh emulator-5554
```

MCP Cursor : voir [MCP_ANDROID.md](../../../../.cursor/MCP_ANDROID.md) à la racine du monorepo.

## Docs associées

- [android/README.md](../../../android/README.md)
- [android/MOBILE_UI.md](../../../android/MOBILE_UI.md)
- [android/MAQUETTE_ANDROID.md](../../../android/MAQUETTE_ANDROID.md)
- [MOBILE_EMULATORS.md](MOBILE_EMULATORS.md)
