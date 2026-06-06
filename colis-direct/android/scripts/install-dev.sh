#!/usr/bin/env bash
# Installe l'APK dev sur l'émulateur/appareil et lance ColisDirect DEV.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=_android-env.sh
source "$(dirname "$0")/_android-env.sh"

APK="app/build/outputs/apk/dev/debug/app-dev-debug.apk"

if ! command -v adb >/dev/null 2>&1; then
  echo "❌ adb introuvable. Installez Android SDK Platform-Tools (Android Studio) ou définissez ANDROID_HOME."
  exit 1
fi

if [ ! -f "$APK" ]; then
  echo "→ APK absent, build en cours…"
  "$(dirname "$0")/build-dev.sh"
fi

if ! adb devices | grep -qE '^\S+\s+device$'; then
  echo "❌ Aucun appareil/émulateur connecté (adb devices vide)."
  echo ""
  echo "   1. Android Studio → Device Manager → lancer un AVD (ex. ColisDirect_Pixel_API35)"
  echo "   2. Ou terminal :"
  echo "      export ANDROID_HOME=\"\$HOME/Library/Android/sdk\""
  echo "      \$ANDROID_HOME/emulator/emulator -avd ColisDirect_Pixel_API35 &"
  echo "      adb wait-for-device && adb devices"
  echo ""
  echo "   Puis relancer : ./scripts/install-dev.sh"
  echo "   Depuis colis-direct/ : npm run android:install"
  exit 1
fi

echo "→ Installation sur appareil…"
adb install -r "$APK"
echo "→ Lancement ci.colisdirect.app.dev …"
adb shell am start -n ci.colisdirect.app.dev/ci.colisdirect.app.MainActivity
echo "✓ ColisDirect DEV"
