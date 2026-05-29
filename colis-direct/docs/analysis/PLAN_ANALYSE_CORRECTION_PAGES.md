# Plan d’analyse et corrections UX — pages utilisateurs

## Objet du document

Ce fichier décrivait un plan de normalisation (props `onNavigate`, `UserMenu`, erreurs, loading). **État relevé dans le dépôt en mai 2026** : une partie des actions est déjà réalisée ; le tableau ci‑dessous sert de **contrôle** pour les prochaines itérations, pas de bilan « terminé à 100 % » sans relecture du code.

---

## Inventaire rapide des zones concernées

| Zone | Fichiers typiques |
|------|-------------------|
| Pages client / pro | `src/pages/My*.tsx`, `CartPage.tsx`, `CreateShipmentPage.tsx` |
| Paiement retour Paystack | `PaymentSuccessPage.tsx`, `PaymentCancelPage.tsx` |
| Dashboards | `AdminDashboard.tsx`, `RelayDashboard.tsx`, `TransporterPickupPage.tsx`, etc. |
| Shell navigation | `src/App.tsx`, `src/components/UserMenu.tsx` |
| Types communs | `src/types/pages.ts` |
| Loading | `src/components/LoadingSpinner.tsx` |

---

## Vérifications effectuées (mai 2026)

| Sujet | Constat dans le dépôt |
|-------|------------------------|
| Types communs `BasePageProps` / `Address` | Présents dans `src/types/pages.ts`. |
| Composant `LoadingSpinner` | Présent dans `src/components/LoadingSpinner.tsx`. |
| `MyShipmentsPage` et `onNavigate` | Commentaire explicite indiquant que `onNavigate` a été retiré pour cohérence. |
| `MessageriesPage` et `UserMenu` | Aucun import direct de `UserMenu` dans cette page au moment de la revue : la navigation passe par le layout parent (à garder cohérent lors de nouvelles pages). |
| Paystack | Les pages succès / annulation paiement restent liées aux redirections Paystack (voir aussi guide variables d’environnement). |

---

## Pistes de travail restantes (à prioriser au cas par cas)

1. **Harmoniser l’affichage des erreurs** sur toutes les pages liste / achats si certaines ne font encore que `console.error`.
2. **Réutiliser `LoadingSpinner`** partout où un texte brut « Chargement… » suffit encore.
3. **Éviter les props mortes** sur les nouvelles pages : étendre `BasePageProps` plutôt que dupliquer des signatures inline.
4. **Revue accessibilité / mobile** sur les dashboards les plus longs (`RelayDashboard`, `AdminDashboard`).

---

## Comment utiliser ce document

- Avant une release : parcourir les pages modifiées dans la MR et cocher mentalement les points ci‑dessus.
- Ne pas considérer les cases du ancien plan comme automatiquement « toutes cochées » sans grep / lecture du fichier concerné.

---

*Dernière mise à jour : mai 2026.*
