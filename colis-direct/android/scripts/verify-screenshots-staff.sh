#!/usr/bin/env bash
# Vérification visuelle — rôles staff (transporteur, relais, admin)
set -euo pipefail

DEVICE="${1:-emulator-5554}"
PKG="ci.colisdirect.app.dev"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/verification-screenshots/staff"
PASS="${E2E_PASSWORD:-admin123}"

mkdir -p "$OUT_DIR"
# shellcheck source=_android-env.sh
source "$(dirname "$0")/_android-env.sh"

tap() { adb -s "$DEVICE" shell input tap "$1" "$2"; sleep 1.5; }
shot() { adb -s "$DEVICE" exec-out screencap -p > "$OUT_DIR/$1"; echo "✓ $1"; }

login_role() {
  local y_tap="$1"
  adb -s "$DEVICE" shell am force-stop "$PKG"
  adb -s "$DEVICE" shell am start -n "$PKG/ci.colisdirect.app.MainActivity"
  sleep 6
  tap 972 2220
  sleep 2
  tap 540 "$y_tap"
  sleep 7
}

echo "→ Transporteur"
login_role 1872
shot "01_transporter_home.png"
tap 380 2220
sleep 2
shot "02_transporter_courses.png"

echo "→ Point relais"
login_role 1725
shot "03_relay_dashboard.png"
tap 513 2220
sleep 2
shot "04_relay_colis.png"

echo "→ Admin"
login_role 2019
shot "05_admin_dashboard.png"
tap 278 2270
sleep 2
shot "06_admin_envois.png"

echo ""
echo "Captures staff : $OUT_DIR"
ls -la "$OUT_DIR"/*.png 2>/dev/null
