# Tests mobiles

## Android (application native — recommandé)

Projet Gradle : `colis-direct/android/` (Kotlin + Compose).

```bash
cd colis-direct/android
./scripts/build-dev.sh
```

Ou ouvrir `colis-direct/android` dans Android Studio, flavor **dev**, variante **debug**.

Voir `colis-direct/android/README.md` et `colis-direct/android/MOBILE_UI.md`.

API locale (émulateur) : `dev.api.base.url=http://10.0.2.2:3001/api/` dans `local.properties`.

> Android = projet **natif** dans `colis-direct/android/` (plus de shell Capacitor WebView).

## iOS

```bash
npm run cap:sync:staging
npm run cap:open:ios
```

Si CocoaPods n'est pas installé :

```bash
sudo gem install cocoapods
cd ios/App
pod install
```

Ouvrir ensuite `ios/App/App.xcworkspace`, choisir un simulateur, puis lancer le scheme `App`.

Pour tester contre le backend local de la machine :

```bash
npm run cap:sync:ios-local
```

iOS Simulator accède à l'hôte macOS via `http://localhost:3001`.

## Après chaque changement frontend

Relancer un `cap:sync:*` avant de relancer l'app native, par exemple :

```bash
npm run cap:sync:staging
```
