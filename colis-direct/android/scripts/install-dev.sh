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

echo "→ Installation sur appareil…"
adb install -r "$APK"
echo "→ Lancement ci.colisdirect.app.dev …"
adb shell am start -n ci.colisdirect.app.dev/ci.colisdirect.app.MainActivity
echo "✓ ColisDirect DEV"
