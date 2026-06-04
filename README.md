# ColisDirect — monorepo

| Dossier | Rôle |
|---------|------|
| **[colis-direct/](colis-direct/)** | Web React + API backend (Docker) |
| **[colis-direct-android/](colis-direct-android/)** | **App Android native** (Kotlin / Compose) ← mobile Android |
| **[colis-direct-ios/](colis-direct-ios/)** | iOS (Capacitor / natif selon branche) |

## Android (projet à utiliser)

```bash
cd colis-direct-android/android
./scripts/build-dev.sh
```

Depuis `colis-direct/` : `npm run android:build` ou `npm run android:open`

> `colis-direct/android/` (Capacitor) n’existe plus — ne pas le recréer.

## Docs

- [colis-direct-android/README.md](colis-direct-android/README.md)
- [.cursor/MCP_ANDROID.md](.cursor/MCP_ANDROID.md)
