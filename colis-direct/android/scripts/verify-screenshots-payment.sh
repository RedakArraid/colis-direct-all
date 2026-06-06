#!/usr/bin/env bash
# Vérification visuelle — parcours paiement (écrans Compose)
set -euo pipefail

DEVICE="${1:-emulator-5554}"
PKG="ci.colisdirect.app.dev"
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/verification-screenshots/payment"
DIR="$(dirname "$0")"

mkdir -p "$OUT_DIR"
# shellcheck source=_android-env.sh
source "$DIR/_android-env.sh"

tap() { adb -s "$DEVICE" shell input tap "$1" "$2"; sleep 1.5; }
shot() { adb -s "$DEVICE" exec-out screencap -p > "$OUT_DIR/$1"; echo "✓ $1"; }

adb -s "$DEVICE" shell am force-stop "$PKG"
adb -s "$DEVICE" shell am start -n "$PKG/ci.colisdirect.app.MainActivity"
sleep 8

# Connexion client E2E
tap 972 2220
sleep 2
tap 540 1410
sleep 6

# Profil → moyens de paiement
tap 972 2220
sleep 2
adb -s "$DEVICE" shell input swipe 540 1600 540 700 500
sleep 1
tap 540 980
sleep 2
shot "01_moyens_paiement.png"
adb -s "$DEVICE" shell input keyevent 4
sleep 1

# Création colis → étape récap (FAB)
tap 540 1900
sleep 2
shot "02_creation_debut.png"
# Avancer jusqu'au récap si possible (taps « Suivant » zone basse)
for _ in 1 2 3; do
  tap 540 2100
  sleep 1.5
done
shot "03_creation_avance.png"

echo ""
echo "Captures paiement : $OUT_DIR"
ls -la "$OUT_DIR"/*.png 2>/dev/null || true
