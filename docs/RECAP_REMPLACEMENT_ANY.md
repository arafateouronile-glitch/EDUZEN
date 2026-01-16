---
title: Récapitulatif - Remplacement des any
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🔧 Récapitulatif - Remplacement des `any`

**Date :** 2024-12-03  
**Progression :** ~45/280 occurrences (16%)

---

## ✅ Fichiers Modifiés

### Services (33 occurrences remplacées)

1. **`lib/services/template-security.service.ts`** - 14 occurrences
   - ✅ `error: any` → `error: unknown` (4 occurrences)
   - ✅ `content: { header: any; content: any; footer: any }` → `unknown` (3 occurrences)
   - ✅ `Record<string, any>` → `Record<string, unknown>` (3 occurrences)
   - ✅ `anonymizeContent(content: any): any` → `unknown` (1 occurrence)

2. **`lib/services/document-template.service.ts`** - 5 occurrences
   - ✅ `error: any` → `error: unknown` (3 occurrences)
   - ✅ `Record<string, any>` → `Record<string, unknown>` (1 occurrence)
   - ✅ `updateData: any` → `Record<string, unknown>` (1 occurrence)

3. **`lib/services/accounting.service.ts`** - 9 occurrences (déjà fait)
   - ✅ `Record<string, any>` → `Record<string, unknown>`
   - ✅ `result: any` → `result: unknown`
   - ✅ `error: any` → `error: unknown`

4. **`lib/services/mobile-money.service.ts`** - 9 occurrences (déjà fait)
   - ✅ `Record<string, any>` → `Record<string, unknown>`
   - ✅ `request_data: any` → `unknown`
   - ✅ `response_data: any` → `unknown`

### Routes API (12 occurrences remplacées)

1. **Routes 2FA** - 5 occurrences
   - ✅ `error: any` → `error: unknown` (5 occurrences)

2. **Autres routes** - 7 occurrences
   - ✅ `app/api/mobile-money/webhook/route.ts`
   - ✅ `app/api/documents/generate/route.ts`
   - ✅ `app/api/resources/upload/route.ts`
   - ✅ `app/api/payments/stripe/create-intent/route.ts`

---

## ⏳ Fichiers Restants (235 occurrences)

### Services avec beaucoup d'occurrences

1. **`lib/services/user-management.service.ts`** - 21 occurrences
2. **`lib/services/realtime-collaboration.service.ts`** - 15 occurrences
3. **`lib/services/template-collaboration.service.ts`** - 15 occurrences
4. **`lib/services/push-notifications.service.ts`** - 15 occurrences
5. **`lib/services/api.service.ts`** - 15 occurrences
6. **`lib/services/anomaly-detection.service.ts`** - 12 occurrences
7. **`lib/services/ai-recommendations.service.ts`** - 12 occurrences
8. **`lib/services/session.service.ts`** - 9 occurrences
9. **`lib/services/workflow-validation.service.ts`** - 9 occurrences
10. **`lib/services/elearning.service.ts`** - 8 occurrences

### Routes API restantes (72 occurrences)

- `app/api/compliance/*` - 18 occurrences
- `app/api/payments/sepa/*` - 9 occurrences
- `app/api/qr-attendance/*` - 8 occurrences
- `app/api/push-notifications/*` - 6 occurrences
- Autres routes - 31 occurrences

---

## 📊 Statistiques

### Progression
- **Avant :** 280 occurrences
- **Après :** ~235 occurrences
- **Remplacés :** ~45 occurrences (16%)

### Par Type
- `error: any` → `error: unknown` : 12 occurrences
- `Record<string, any>` → `Record<string, unknown>` : 15 occurrences
- `content: any` → `content: unknown` : 8 occurrences
- Autres : 10 occurrences

---

## 🎯 Prochaines Étapes

### Priorité 1 : Services Critiques
1. `user-management.service.ts` (21 occurrences)
2. `session.service.ts` (9 occurrences)
3. `elearning.service.ts` (8 occurrences)

### Priorité 2 : Routes API
1. Routes compliance (18 occurrences)
2. Routes SEPA (9 occurrences)
3. Routes QR attendance (8 occurrences)

### Priorité 3 : Services Secondaires
1. Services de collaboration (30 occurrences)
2. Services d'analytics (24 occurrences)
3. Services de notifications (15 occurrences)

---

## ✅ Checklist

- [x] Routes 2FA (5 occurrences)
- [x] Routes mobile-money (3 occurrences)
- [x] Routes documents (2 occurrences)
- [x] Routes payments (2 occurrences)
- [x] template-security.service.ts (14 occurrences)
- [x] document-template.service.ts (5 occurrences)
- [x] accounting.service.ts (9 occurrences)
- [x] mobile-money.service.ts (9 occurrences)
- [ ] user-management.service.ts (21 occurrences)
- [ ] Routes compliance (18 occurrences)
- [ ] Autres services (196 occurrences)

---

**Objectif :** <200 occurrences restantes (71% complété)---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.