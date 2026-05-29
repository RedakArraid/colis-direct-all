# Vérification manuelle du scanner

Check-list courte pour valider l’intégration **sans dépendre de numéros de lignes** (le code bouge).

## Transporteur (`TransporterPickupPage.tsx`)

1. Se connecter avec un compte **transporteur**.
2. Ouvrir **Ramassage à domicile**.
3. Vérifier la présence du bouton ouvrant le **scanner** et du champ de **saisie manuelle** (téléphone / code).
4. Autoriser la **caméra** ; scanner un QR de test ou saisir un identifiant connu.

## Relais (`RelayDashboard.tsx`)

1. Se connecter avec un compte **relay_partner**.
2. Repérer la zone **Scanner / Saisie** et ouvrir le modal scanner.
3. Après scan ou saisie, contrôler que le colis remonte et que les actions (**réception**, etc.) correspondent au statut affiché.

## Si ça échoue

- Console navigateur (F12) pour erreurs JavaScript ou HTTPS / caméra.
- Redémarrer le service frontend dev (`docker compose ... restart frontend`) après changement de dépendances.
- Voir aussi **`docs/analysis/ANALYSE_CRASH_FRONTEND.md`** (watch Docker / macOS).

---

*Mai 2026.*
