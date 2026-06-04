#!/usr/bin/env bash
# Capture d'écran page par page — émulateur Android ColisDirect DEV
set -euo pipefail

DEVICE="${1:-emulator-5554}"
PKG="ci.colisdirect.app.dev"
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/verification-screenshots"
mkdir -p "$OUT_DIR"

tap() { adb -s "$DEVICE" shell input tap "$1" "$2"; sleep 1.2; }
back() { adb -s "$DEVICE" shell input keyevent 4; sleep 1; }
shot() { adb -s "$DEVICE" exec-out screencap -p > "$OUT_DIR/$1"; echo "✓ $1"; }

adb -s "$DEVICE" shell am force-stop "$PKG"
sleep 1
adb -s "$DEVICE" shell am start -n "$PKG/ci.colisdirect.app.MainActivity"
sleep 4

# Onglets (centre icône ~ y=2220)
TAB_HOME=109
TAB_SHIPMENTS=324
TAB_TRACKING=541
TAB_RELAIS=756
TAB_PROFILE=972
TAB_Y=2220
FAB_X=540
FAB_Y=2100

shot "01_accueil.png"
tap "$TAB_SHIPMENTS" "$TAB_Y" && shot "02_mes_colis.png"
tap "$TAB_TRACKING" "$TAB_Y" && shot "03_suivre.png"
tap "$TAB_RELAIS" "$TAB_Y" && shot "04_relais.png"
tap "$TAB_PROFILE" "$TAB_Y" && shot "05_profil.png"

# Retour accueil — notifications (cloche ~ x=980 y=120)
tap "$TAB_HOME" "$TAB_Y"
sleep 1
tap 980 120 && sleep 1.5 && shot "06_notifications.png"
back

# Tarifs (scroll + bouton — zone CTA ~ y=1600)
tap "$TAB_HOME" "$TAB_Y"
adb -s "$DEVICE" shell input swipe 540 1800 540 800 400
sleep 0.8
tap 540 1750 && sleep 1.5 && shot "07_tarifs.png"
back

# Partenaire
tap "$TAB_HOME" "$TAB_Y"
adb -s "$DEVICE" shell input swipe 540 1800 540 800 400
sleep 0.8
tap 200 1550 && sleep 1.5 && shot "08_partenaire.png"
back

# Création colis (FAB)
tap "$TAB_HOME" "$TAB_Y"
tap "$FAB_X" "$FAB_Y" && sleep 1.5 && shot "09_creation_colis.png"
back

# Profil — carnet & paiements (scroll menu)
tap "$TAB_PROFILE" "$TAB_Y"
adb -s "$DEVICE" shell input swipe 540 1600 540 600 350
sleep 0.8
tap 540 900 && sleep 1.5 && shot "10_carnet_adresses.png" || true
back
tap "$TAB_PROFILE" "$TAB_Y"
adb -s "$DEVICE" shell input swipe 540 1600 540 600 350
tap 540 1000 && sleep 1.5 && shot "11_historique_paiements.png" || true
back

# Déconnexion si bouton visible
tap "$TAB_PROFILE" "$TAB_Y"
adb -s "$DEVICE" shell input swipe 540 2000 540 400 500
sleep 0.5
tap 540 2100 && sleep 0.5
tap 700 1400 && sleep 2

shot "12_profil_deconnecte.png"
tap "$TAB_HOME" "$TAB_Y" && shot "13_accueil_invite.png"

echo ""
echo "Captures dans: $OUT_DIR"
ls -la "$OUT_DIR"/*.png 2>/dev/null | tail -20
