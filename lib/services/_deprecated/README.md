# Services dépréciés (non utilisés)

Ce dossier est **exclu du lint** (voir `ignorePatterns` dans `.eslintrc.json`).

Ces services ont été déplacés ici car ils n’étaient pas importés par l’application (code mort potentiel). Ils sont conservés pour référence ou réactivation future.

- **predictive-analytics.service.ts** – Prédictions (taux de réussite, abandon, alertes).
- **ai-recommendations.service.ts** – Recommandations IA (types, statuts, feedback).
- **videoconference.service.ts** – Stub visioconférence (non implémenté). L’appel a été retiré de `session.service.ts`.

Voir `docs/AUDIT_SERVICES_CODE_MORT.md` pour la méthode d’audit et la liste à jour.
