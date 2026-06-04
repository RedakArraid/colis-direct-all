# ColisDirect — application Android native

Application mobile **Kotlin + Jetpack Compose** (remplace l’ancien shell Capacitor dans `colis-direct/android/`).

## Emplacement du projet

```text
colis-direct-android/android/   ← projet Gradle (ouvrir dans Android Studio)
```

## Build & run

Depuis la racine du monorepo (`colisdirect-all`) :

```bash
cd colis-direct-android/android
cp local.properties.example local.properties
./scripts/build-dev.sh
```

Si ton terminal est **déjà** dans `.../colis-direct-android/android`, ne refais pas `cd colis-direct-android/android` (chemin invalide). Lance seulement :

```bash
./scripts/build-dev.sh
```

Le script configure `JAVA_HOME` via Android Studio (évite l’erreur « Unable to locate a Java Runtime »). Sans lui :

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
./gradlew :app:assembleDevDebug
```

APK dev : `app/build/outputs/apk/dev/debug/app-dev-debug.apk`

API dev par défaut : staging (`BuildConfig` flavor `dev`). Surcharge locale : `dev.api.base.url` dans `local.properties`.

## Documentation

| Fichier | Contenu |
|---------|---------|
| `android/MOBILE_UI.md` | UI, MCP, émulateur |
| `android/MAQUETTE_ANDROID.md` | Parité maquette / web |
| `android/PROD_READINESS.md` | Checklist prod |
| `scripts/` | Installation MCP Android |
| `../.cursor/MCP_ANDROID.md` | Guide Cursor MCP |

## Web / Capacitor

Le frontend React reste dans `colis-direct/`. Les commandes `cap:*` Android ne ciblent plus un dossier `android/` sous `colis-direct` — utiliser ce dépôt natif.
