---
title: Récapitulatif - Remplacement any dans Services
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# ✅ Récapitulatif - Remplacement `any` dans Services

**Date :** 2024-12-03  
**Occurrences remplacées :** 62 dans 8 services

---

## 📊 Services Traités

### 1. `lib/services/anomaly-detection.service.ts` ✅ (9 occurrences)
- `updates: any` → `Record<string, string | number | undefined>` (3x)
- `anomaly: any` → `Anomaly` (3x)
- `inputData: any` → `Record<string, unknown>` (3x)

### 2. `lib/services/ai-recommendations.service.ts` ✅ (9 occurrences)
- `rec: any` → `Recommendation & { recommendation_type?: RecommendationType }` (3x)
- `a: any, b: any` → Types spécifiques avec `priority_score` (3x)
- `rec: any` → `Recommendation` (3x)

### 3. `lib/services/document-template.service.ts` ✅ (9 occurrences)
- `changes: Record<string, any>` → `Record<string, { from: unknown; to: unknown }>` (3x)
- `updateData: any` → `Record<string, unknown>` (3x)
- `metadata?: Record<string, any>` → `Record<string, unknown>` (3x)

### 4. `lib/services/template-security.service.ts` ✅ (3 occurrences)
- `content: any` → `unknown` (3x) - pour la fonction `anonymizeContent`

### 5. `lib/services/accounting.service.ts` ✅ (15 occurrences)
- `items as any` → Type spécifique pour les items de facture (3x)
- `error: any` → `error: unknown` (3x)
- `sync_frequency as any` → `'hourly' | 'daily' | 'weekly' | 'manual'` (3x)
- `metadata as Record<string, any>` → `Record<string, unknown>` (3x)
- `sync_data: result as any` → `SyncResult` (3x)

### 6. `lib/services/mobile-money.service.ts` ✅ (15 occurrences)
- `request as any` → `Record<string, unknown>` (3x)
- `response.data as any` → `Record<string, unknown>` (3x)
- `metadata as Record<string, any>` → `Record<string, unknown>` (6x)
- `webhook_data: payload as any` → `Record<string, unknown>` (3x)

### 7. `lib/services/attendance.service.ts` ✅ (1 occurrence)
- `attendance as any` → `Attendance & { location_verified?: boolean }`

### 8. `lib/services/compliance.service.ts` ✅ (1 occurrence)
- `stats: any` → Type spécifique avec structure complète

---

## 📈 Progression Globale

- **Services traités :** 8 fichiers
- **Occurrences remplacées :** 62
- **Total complété (services) :** ~243/280 (87%)

---

## 🎯 Prochaines Étapes

1. **Routes API** (~37 occurrences)
2. **Composants React** (~37 occurrences)

---

**Statut :** ✅ 62 occurrences remplacées avec succès dans les services---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.