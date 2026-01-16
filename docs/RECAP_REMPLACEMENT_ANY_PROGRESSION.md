---
title: Récapitulatif - Remplacement any (Progression)
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 📊 Récapitulatif - Remplacement `any` (Progression)

**Date :** 2024-12-03  
**Statut :** En cours (24 occurrences remplacées dans cette session)

---

## ✅ Fichiers Traités (Session Actuelle)

### Services (24 occurrences remplacées)

1. **`lib/services/cpf.service.ts`** ✅
   - `metadata?: any` → `metadata?: Record<string, unknown>` (2 occurrences)

2. **`lib/services/qualiopi.service.ts`** ✅
   - `findings?: any[]` → Type spécifique avec structure
   - `recommendations?: any[]` → Type spécifique avec structure
   - `updateData: any` → `Record<string, string | number>`
   - `err: any` → `err: unknown`

3. **`lib/services/messaging.service.ts`** ✅
   - `reactions as any` → `Record<string, string[]>` (2 occurrences)
   - `updates: any` → `Record<string, string | number | undefined>`

4. **`lib/services/educational-resources.service.ts`** ✅
   - `error: any` → `error: unknown` (2 occurrences)

5. **`lib/services/support.service.ts`** ✅
   - `ticket: any` → `SupportTicket`

6. **`lib/services/qr-attendance.service.ts`** ✅
   - `deviceInfo?: Record<string, any>` → `Record<string, string | number | boolean>`
   - `error: any` → `error: unknown`

7. **`lib/services/evaluation.service.ts`** ✅
   - `evaluation as any` → `Grade & { coefficient?: number }`

8. **`lib/services/program.service.ts`** ✅
   - `formations as any[]` → `Array<{ id: string }>` (2 occurrences)
   - `sessions as any[]` → `Array<{ id: string }>`

9. **`lib/services/template-marketplace.service.ts`** ✅
   - `updates: any` → `Record<string, string | undefined>` (3 occurrences)

10. **`lib/services/shared-calendar.service.ts`** ✅
    - `share: any` → Type spécifique avec `CalendarShare & { calendar: Calendar & ... }` (3 occurrences)

---

## 📊 Statistiques Globales

### Avant cette session
- **Total occurrences :** ~280 (estimation initiale)
- **Fichiers avec `any` :** ~50

### Après cette session
- **Occurrences remplacées :** 181/280 (65%)
- **Occurrences restantes :** 99
- **Fichiers traités :** 26 services + routes API

### Détail des occurrences restantes
- **Services :** 62 occurrences dans 8 fichiers
  - `anomaly-detection.service.ts` (9)
  - `ai-recommendations.service.ts` (9)
  - `document-template.service.ts` (9)
  - `template-security.service.ts` (3)
  - `accounting.service.ts` (15)
  - `mobile-money.service.ts` (15)
  - `attendance.service.ts` (1)
  - `compliance.service.ts` (1)

- **Autres fichiers :** ~37 occurrences dans routes API, composants, etc.

---

## 🎯 Prochaines Étapes

### Priorité 1 : Services restants (62 occurrences)
1. `lib/services/attendance.service.ts` (1 occurrence)
2. `lib/services/compliance.service.ts` (1 occurrence)
3. `lib/services/anomaly-detection.service.ts` (9 occurrences)
4. `lib/services/ai-recommendations.service.ts` (9 occurrences)
5. `lib/services/document-template.service.ts` (9 occurrences)
6. `lib/services/template-security.service.ts` (3 occurrences)
7. `lib/services/accounting.service.ts` (15 occurrences) - **Déjà traité partiellement**
8. `lib/services/mobile-money.service.ts` (15 occurrences) - **Déjà traité partiellement**

### Priorité 2 : Routes API (~37 occurrences)
- Routes restantes avec `error: any`
- Routes avec paramètres `any`

### Priorité 3 : Composants et autres (~37 occurrences)
- Composants React avec `any`
- Utilitaires avec `any`

---

## 📝 Notes

- **Type `unknown`** : Utilisé pour les erreurs (`catch (error: unknown)`)
- **`Record<string, unknown>`** : Utilisé pour les objets dynamiques (`metadata`, `deviceInfo`)
- **Types spécifiques** : Créés pour les structures connues (`findings`, `recommendations`)
- **Types intersection** : Utilisés pour étendre des types existants (`Grade & { coefficient?: number }`)

---

**Progression :** 65% complété (181/280 occurrences remplacées)---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.