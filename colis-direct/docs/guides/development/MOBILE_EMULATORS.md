# Tests mobiles

## Android (application native — recommandé)

Projet Gradle : **`colis-direct/android/`** (Kotlin + Jetpack Compose).

```bash
cd colis-direct
npm run android:build
npm run android:install
npm run android:clean-emulator   # supprime anciens APK Capacitor
```

Ou dans Android Studio : ouvrir `colis-direct/android`, flavor **dev**, variante **devDebug**.

| Doc | Contenu |
|-----|---------|
| [android/README.md](../../../android/README.md) | Build, packages, rôles |
| [ANDROID_NATIVE.md](ANDROID_NATIVE.md) | Guide complet natif |
| [android/MOBILE_UI.md](../../../android/MOBILE_UI.md) | Liste des écrans |

**Package dev :** `ci.colisdirect.app.dev` (ColisDirect DEV)  
**Ne pas utiliser :** `ci.colisdirect.app` (ancien Capacitor 1.0)

### API

- Par défaut (flavor dev) : **staging** — `https://staging-api.colisdirect.com/api/`
- Backend local : dans `android/local.properties` :

  ```properties
  dev.api.base.url=http://10.0.2.2:3001/api/
  ```

  Puis `docker compose -f docker-compose.yml -f docker-compose.dev.yml up` sur la machine hôte.

### Comptes E2E (écran Profil, build DEBUG + flavor dev)

Mot de passe : **`admin123`** — emails `e2e+*@colisdirect.test` (client, relais, transporteur, admin, support).

Chaque rôle ouvre son **shell dédié** (pas l’accueil client orange).

### MCP Cursor

Monorepo parent : [`.cursor/MCP_ANDROID.md`](../../../../.cursor/MCP_ANDROID.md)  
Install : `colis-direct/scripts/android-mcp/install-mcp.sh`

---

## iOS (Capacitor — web dans WebView)

```bash
cd colis-direct
npm run build:mobile:staging
npm run cap:sync:staging
npm run cap:open:ios
```

Si CocoaPods manque :

```bash
sudo gem install cocoapods
cd ios/App && pod install
```

Ouvrir `ios/App/App.xcworkspace`, scheme **App**.

Backend local :

```bash
npm run cap:sync:ios-local
```

Le simulateur accède à l’API via `http://localhost:3001`.

---

## iOS natif (SwiftUI — expérimental)

Dossier : `colis-direct/ios-native/`  
Projet Xcode : `ColisDirectApp.xcodeproj`

Couverture actuelle : client, relais, transporteur — **pas d’écran admin complet**.

---

## Après changement frontend (iOS Capacitor uniquement)

```bash
npm run cap:sync:staging
```

Android natif **ne dépend pas** du build Vite : il appelle l’API directement.
