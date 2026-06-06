#!/usr/bin/env bash
# Lance toutes les captures de vérification (invité, client, staff)
set -euo pipefail

DEVICE="${1:-emulator-5554}"
DIR="$(dirname "$0")"
chmod +x "$DIR"/verify-screenshots.sh \
  "$DIR"/verify-screenshots-connected.sh \
  "$DIR"/verify-screenshots-staff.sh \
  "$DIR"/verify-screenshots-payment.sh 2>/dev/null || true

"$DIR/verify-screenshots.sh" "$DEVICE"
bash "$DIR/verify-screenshots-connected.sh" "$DEVICE"
bash "$DIR/verify-screenshots-staff.sh" "$DEVICE"
bash "$DIR/verify-screenshots-payment.sh" "$DEVICE"

echo ""
echo "✓ Vérification complète terminée (device=$DEVICE)"
