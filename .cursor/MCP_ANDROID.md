# MCP Android — ColisDirect

Configuration MCP pour piloter l’émulateur / appareil Android depuis Cursor (build, install APK, captures, navigation UI).

## Serveur configuré

| Nom | Package | Rôle |
|-----|---------|------|
| **mobile-mcp** | `@mobilenext/mobile-mcp` | Émulateur & appareil Android/iOS : liste devices, install APK, lance app, screenshots, tap, swipe, logs UI |

Fichier : [`.cursor/mcp.json`](mcp.json) (racine du monorepo).

## Installation (une fois)

```bash
# Installateur MCP global + cache mobile-mcp + vérif adb
chmod +x colis-direct/scripts/android-mcp/install-mcp.sh
./colis-direct/scripts/android-mcp/install-mcp.sh
```

Installe :

| Composant | Commande | Rôle |
|-----------|----------|------|
| **mcp-installer** | `npm install -g @mcp-installer/cli` | CLI pour ajouter d'autres serveurs MCP à Cursor (`mcp-installer install …`) |
| **mobile-mcp** | `npx -y @mobilenext/mobile-mcp@latest` | Serveur Android/iOS (pré-téléchargé pour un démarrage rapide) |

Vérifier l'installateur :

```bash
mcp-installer --version
mcp-installer doctor
mcp-installer list --available
```

> **Note :** `mobile-mcp` n'est pas dans le catalogue [mcp-installer](https://github.com/joobisb/mcp-installer) ; il est configuré manuellement dans [`.cursor/mcp.json`](mcp.json).

## Activer dans Cursor

1. **Redémarrer Cursor** ou recharger la fenêtre (`Cmd+Shift+P` → *Developer: Reload Window*).
2. **Réglages** → **Features** → **MCP** : vérifier que `mobile-mcp` est **vert** (connecté).
3. En mode **Agent**, activer les outils MCP (ou *Auto-run* pour les outils approuvés).

## Prérequis (macOS)

```bash
# Vérifier
adb devices
emulator -list-avds

# Flavor dev : API staging par défaut (comptes e2e+*@colisdirect.test).
# Backend local optionnel : dev.api.base.url=http://10.0.2.2:3001/api/ dans colis-direct/android/local.properties
#   puis : cd colis-direct && docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Build APK natif
cd colis-direct/android
./scripts/build-dev.sh
```

## Exemples de prompts Agent

- « Liste les appareils Android connectés »
- « Lance l’émulateur Pixel_API_34 et attends qu’il soit prêt »
- « Installe l’APK dev ColisDirect : `colis-direct/android/app/build/outputs/apk/dev/debug/app-dev-debug.apk` »
- « Ouvre l’app `ci.colisdirect.app.dev` (ColisDirect DEV) et prends une capture de l’écran d’accueil »
- « Compare avec les captures dans `colis-direct/android/verification-screenshots/` »

## Package ColisDirect

- **ID application (flavor dev) :** `ci.colisdirect.app.dev` — ne pas confondre avec l’ancienne app Capacitor `ci.colisdirect.app` (1.0)
- **APK dev :** `colis-direct/android/app/build/outputs/apk/dev/debug/app-dev-debug.apk`

## Tester les rôles (MCP / manuel)

1. `npm run android:install` depuis `colis-direct/`
2. Profil → **Connexion rapide (dev)** → Admin / Point relais / Transporteur (`admin123`)
3. Vérifier les shells : dashboard admin, relais Cocody, livreur (toggle En ligne)

Si l’accueil client affiche « Reconnectez-vous… » pour un staff : réinstaller l’APK dev récent ou se déconnecter puis reconnecter via E2E.

## Dépannage

| Problème | Action |
|----------|--------|
| **MCP pas vert** | Voir ci-dessous — souvent `type: "stdio"` manquant ou `npx` absent du PATH de Cursor |
| MCP gris / erreur | Vérifier Node 22+ (`node -v`), relancer Cursor |
| `adb` introuvable | Installer Android SDK Platform-Tools, vérifier `ANDROID_HOME` dans `mcp.json` |
| Aucun device | Démarrer un AVD dans Android Studio ou brancher un téléphone (USB debug) |

### MCP pas vert (Cursor)

1. **Logs** : `Cmd+Shift+U` → sortie **MCP Logs** (erreur `spawn npx ENOENT` = PATH).
2. **Config actuelle** : binaire global + `type: "stdio"` (requis par Cursor récent) :

```bash
npm install -g @mobilenext/mobile-mcp@latest
which mcp-server-mobile   # doit afficher ~/.local/bin/mcp-server-mobile
```

3. **Recharger** : `Cmd+Shift+P` → *Developer: Reload Window*.
4. **Réglages → MCP** : activer le toggle à côté de `mobile-mcp`.

Si `mcp-server-mobile` n’est pas au même chemin, adaptez `command` dans `.cursor/mcp.json`.

## Serveur optionnel (émulateur avancé)

Le dépôt [android_emulator_mcp](https://github.com/Amm-ar/android_emulator_mcp) (Python 3.9+, `pip install -r requirements.txt`) offre `install_apk`, `get_ui_hierarchy`, `read_logs`. Non ajouté par défaut (Python système macOS trop ancien). Pour l’ajouter manuellement, clonez-le et pointez Cursor vers `main.py` (voir README du projet).
