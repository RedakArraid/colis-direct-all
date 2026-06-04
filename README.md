# ColisDirect — monorepo (`colisdirect-all`)

Dépôt racine : **web + API + applications mobiles** ColisDirect.  
Remote : `https://github.com/RedakArraid/colis-direct-all`

## Contenu

| Chemin | Rôle |
|--------|------|
| **[colis-direct/](colis-direct/)** | Projet principal (clone miroir : [colis-direct](https://github.com/RedakArraid/colis-direct)) |
| **[.cursor/MCP_ANDROID.md](.cursor/MCP_ANDROID.md)** | MCP Cursor + émulateur Android |
| **colisdirect-maquette/** · **colisdirect.zip** | Maquette design JSX (référence UI, non exécutable) — ignorés par Git |

### Dans `colis-direct/`

| Chemin | Stack | Usage |
|--------|-------|--------|
| `src/` | React 18 + Vite + TypeScript | Site & logique métier de référence |
| `backend/` | Express + PostgreSQL | API REST |
| **`android/`** | **Kotlin + Jetpack Compose** | **App Android native** (production mobile Android) |
| `ios/` | Capacitor 7 | Shell iOS embarquant le build web `dist/` |
| `ios-native/` | SwiftUI | App iOS native (partielle : client, relais, transporteur) |
| `docs/` | Markdown | Guides déploiement, métier, mobile |
| `database/` | SQL | Migrations PostgreSQL |

## Android (natif — seule app Android)

```bash
cd colis-direct
npm run android:build      # assembleDevDebug
npm run android:install    # adb install + lance ColisDirect DEV
npm run android:clean-emulator   # désinstalle anciens packages Capacitor
```

- **Ouvrir dans Android Studio :** `colis-direct/android` (pas `colis-direct-android/`)
- **Package dev :** `ci.colisdirect.app.dev` — libellé **ColisDirect DEV**
- **Version :** `1.1.0-dev` (flavors `dev` / `staging` / `prod`)
- **Doc :** [colis-direct/android/README.md](colis-direct/android/README.md) · [MOBILE_UI.md](colis-direct/android/MOBILE_UI.md)

### Espaces par rôle (après connexion)

| Rôle | Écran Android | Équivalent web |
|------|---------------|----------------|
| `client` | `MainContainerScreen` (5 onglets) | pages client |
| `transporter` | `CourierMainScreen` | `TransporterSpace.tsx` |
| `relay_partner` | `RelayMainScreen` | `RelayDashboard.tsx` |
| `admin` | `AdminMainScreen` | `AdminDashboard.tsx` |
| `support` | `SupportMainScreen` | `CustomerSupportDashboard.tsx` |

**Connexion rapide (flavor dev, debug) :** Profil → boutons E2E, mot de passe `admin123`  
(`e2e+admin@`, `e2e+relay@`, `e2e+transporter@`, `e2e+client@`, `e2e+support@colisdirect.test`)

## iOS

| Stack | Commande |
|-------|----------|
| Capacitor (web) | `npm run cap:sync:staging` puis `npm run cap:open:ios` |
| SwiftUI natif | Ouvrir `colis-direct/ios-native/ColisDirectApp.xcodeproj` |

Voir [colis-direct/docs/guides/development/MOBILE_EMULATORS.md](colis-direct/docs/guides/development/MOBILE_EMULATORS.md).

## Web & API (développement local)

```bash
cd colis-direct
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
# Frontend http://localhost:5173 — API http://localhost:3001
```

Guide complet : [colis-direct/README.md](colis-direct/README.md).

## Obsolète (ne plus utiliser)

| Élément | Raison |
|---------|--------|
| `colis-direct-android/` (ancien chemin) | Fusionné dans `colis-direct/android/` |
| `colis-direct/www/` + `@capacitor/android` | Shell Capacitor Android retiré |
| Package `ci.colisdirect.app` sans suffixe | Ancien APK Capacitor 1.0 |
| `colis-direct-ios/` à la racine | Stub HTML supprimé |

## Workflow Git (monorepo)

- Branche courante : **`main`**
- Le sous-dossier `colis-direct/` a aussi son dépôt Git (`origin` → `colis-direct.git`, branche **`dev`**)
- Après des changements dans `colis-direct/`, committer/pousser **les deux** dépôts si vous travaillez sur les deux remotes

## MCP Android (Cursor)

```bash
chmod +x colis-direct/scripts/android-mcp/install-mcp.sh
./colis-direct/scripts/android-mcp/install-mcp.sh
```

Détails : [.cursor/MCP_ANDROID.md](.cursor/MCP_ANDROID.md)
