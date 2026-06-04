# ColisDirect — Android native (Kotlin / Compose)

**Version :** `1.1.0-dev` (`versionCode` 2) · **Package dev :** `ci.colisdirect.app.dev`

## Build

```bash
cd colis-direct/android
cp local.properties.example local.properties
./scripts/build-dev.sh
```

Depuis `colis-direct/` :

```bash
npm run android:build
npm run android:install
npm run android:clean-emulator   # retire ci.colisdirect.app (Capacitor) et .staging
```

Les scripts exportent `adb` via `scripts/_android-env.sh` (`~/Library/Android/sdk/platform-tools`).

## Android Studio

Ouvrir **uniquement** ce dossier : `colis-direct/android`  
Run : module **app**, variante **`devDebug`**.

## Packages

| Package | Usage |
|---------|--------|
| **`ci.colisdirect.app.dev`** | **ColisDirect DEV** — développement & E2E |
| `ci.colisdirect.app.staging` | Staging |
| `ci.colisdirect.app` | Production (store) |
| ~~`ci.colisdirect.app`~~ (1.0 Capacitor) | **Désinstaller** sur l’émulateur |

APK dev : `app/build/outputs/apk/dev/debug/app-dev-debug.apk`

## Espaces par rôle

Après connexion, redirection automatique (splash ou Profil) :

| Rôle | Écran | Web |
|------|-------|-----|
| Client | `MainContainerScreen` | pages client |
| Transporteur | `CourierMainScreen` | `TransporterSpace.tsx` |
| Point relais | `RelayMainScreen` | `RelayDashboard.tsx` |
| Admin | `AdminMainScreen` | `AdminDashboard.tsx` |
| Support | `SupportMainScreen` | `CustomerSupportDashboard.tsx` |

### Connexion rapide (dev)

Sur l’écran Profil → section **Connexion rapide (dev)** — mot de passe : `admin123`

## API

| Flavor | URL par défaut |
|--------|----------------|
| dev | `https://staging-api.colisdirect.com/api/` (surcharge via `dev.api.base.url` dans `local.properties`) |
| staging | staging |
| prod | `https://api.colisdirect.com/api/` |

Backend local (émulateur) : `dev.api.base.url=http://10.0.2.2:3001/api/`

## Documentation

| Fichier | Sujet |
|---------|--------|
| [MOBILE_UI.md](MOBILE_UI.md) | Écrans client + staff, MCP |
| [MAQUETTE_ANDROID.md](MAQUETTE_ANDROID.md) | Écarts maquette zip ↔ natif |
| [PROD_READINESS.md](PROD_READINESS.md) | Checklist release prod |
| [../docs/guides/development/ANDROID_NATIVE.md](../docs/guides/development/ANDROID_NATIVE.md) | Guide complet |
| [../../.cursor/MCP_ANDROID.md](../../.cursor/MCP_ANDROID.md) | MCP Cursor (monorepo) |
