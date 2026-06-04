# ColisDirect — Android native (Kotlin / Compose)

## Build

```bash
cd colis-direct/android
cp local.properties.example local.properties
./scripts/build-dev.sh
```

Depuis `colis-direct/` : `npm run android:build` · `npm run android:install`

## App sur l’émulateur

| Package | Usage |
|---------|--------|
| **`ci.colisdirect.app.dev`** | **ColisDirect DEV** — app native actuelle |
| ~~`ci.colisdirect.app`~~ | Ancien Capacitor — **désinstaller** |

```bash
npm run android:clean-emulator
npm run android:install
```

APK : `app/build/outputs/apk/dev/debug/app-dev-debug.apk`
