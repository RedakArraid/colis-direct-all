# ColisDirect — Android native (Kotlin / Compose)

Projet Gradle à ouvrir dans **Android Studio** (`colis-direct/android/`).

## Build

```bash
cd colis-direct/android
cp local.properties.example local.properties
./scripts/build-dev.sh
```

Depuis `colis-direct/` : `npm run android:build`

APK dev : `app/build/outputs/apk/dev/debug/app-dev-debug.apk`

## Docs

- [MOBILE_UI.md](MOBILE_UI.md) — UI, MCP, émulateur
- [MAQUETTE_ANDROID.md](MAQUETTE_ANDROID.md) — parité web
- [PROD_READINESS.md](PROD_READINESS.md) — checklist prod
- MCP : `../../.cursor/MCP_ANDROID.md` (racine monorepo)
