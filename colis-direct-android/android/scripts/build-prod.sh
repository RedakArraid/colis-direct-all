#!/usr/bin/env bash
# Build APK/AAB prod (API https://api.colisdirect.com/api/)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]; then
  export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
fi

if [ -d "$HOME/Library/Android/sdk" ]; then
  export ANDROID_HOME="$HOME/Library/Android/sdk"
fi

if ! grep -q '^storeFile=' local.properties 2>/dev/null; then
  echo "⚠️  Keystore manquant dans local.properties (storeFile, storePassword, keyAlias, keyPassword)."
  echo "    Build debug prod uniquement : assembleProdDebug"
  ./gradlew assembleProdDebug "$@"
  echo ""
  echo "APK debug prod : app/build/outputs/apk/prod/debug/app-prod-debug.apk"
  exit 0
fi

./gradlew assembleProdRelease "$@"
echo ""
echo "APK release : app/build/outputs/apk/prod/release/app-prod-release.apk"
echo "Pour Play Store : ./gradlew bundleProdRelease"
