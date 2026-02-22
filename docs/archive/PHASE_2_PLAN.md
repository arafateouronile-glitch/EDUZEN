# Phase 2 : Tests & Qualité

## État actuel
- **114 services** dans `lib/services/`
- **9 fichiers de tests** dans `tests/services/`
- **Couverture actuelle** : ~8% (9/114)
- **Objectif** : 80%+ de couverture

## Priorités

### 1. Services critiques (à tester en priorité)
- [ ] `attendance.service.ts` - Gestion présence
- [ ] `program.service.ts` - Gestion programmes
- [ ] `session.service.ts` - Gestion sessions
- [ ] `evaluation.service.ts` - Évaluations
- [ ] `document.service.ts` - Documents (déjà testé)
- [ ] `email.service.ts` - Emails
- [ ] `payment.service.ts` - Paiements (déjà testé)

### 2. Vérifications TypeScript
- [ ] `npm run type-check` - Vérifier 0 erreurs
- [ ] Corriger les erreurs TypeScript si présentes

### 3. Tests E2E critiques
- [ ] Parcours inscription
- [ ] Parcours création étudiant
- [ ] Parcours paiement
- [ ] Parcours présence

## Actions immédiates
1. Corriger les 7 tests de workflow en échec
2. Augmenter couverture à 20% (23 services testés)
3. Vérifier TypeScript strict
