#!/usr/bin/env bash
# Build APK dev (API staging par défaut ; voir local.properties → dev.api.base.url)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]; then
  export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
fi

if [ -d "$HOME/Library/Android/sdk" ]; then
  export ANDROID_HOME="$HOME/Library/Android/sdk"
fi

./gradlew assembleDevDebug "$@"
echo ""
echo "APK: app/build/outputs/apk/dev/debug/app-dev-debug.apk"
