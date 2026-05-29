# Validation — pages utilisateurs (historique)

## Contexte

Ce fichier reprenait un bilan très affirmatif (« phases complétées à 100 % », métriques « avant / après »). **Il ne doit plus être lu comme un certificat de conformité automatique** : il reflète une vague de corrections passées ; la réalité du dépôt évolue à chaque commit.

Utiliser plutôt :

- `docs/analysis/PLAN_ANALYSE_CORRECTION_PAGES.md` pour l’état **mai 2026** et les vérifications ponctuelles ;
- les scripts CI / `npm run build` / linters pour une validation objective.

---

## Contrôle minimal recommandé avant mise en production

| Contrôle | Commande ou action |
|----------|-------------------|
| Build frontend | `npm run build` à la racine |
| Types backend | `cd backend && npm run build` (si défini) ou équivalent |
| Lint | selon configuration projet |
| Parcours critiques manuels | connexion client, création envoi, paiement test, dashboard relais |

---

## Fichiers souvent touchés par les corrections UX

- `src/types/pages.ts`
- `src/components/LoadingSpinner.tsx`
- `src/App.tsx`
- Pages sous `src/pages/`

Les listes détaillées « fichiers créés / modifiés » de l’ancienne version ne sont plus reproduites ici pour éviter la divergence avec Git ; utiliser `git log --follow -- <fichier>`.

---

*Document réorienté en mai 2026 — bilan historique, pas rapport de test automatisé.*
