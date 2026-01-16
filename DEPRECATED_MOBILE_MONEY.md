---
title: Mobile Money - Déprécié
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# Mobile Money - Déprécié

## ⚠️ Note Importante

Le module Mobile Money (MTN, Orange, Airtel, Wave) a été **déprécié** dans le cadre du repositionnement vers le marché français/européen.

## Fichiers à Supprimer (Optionnel)

Les fichiers suivants peuvent être supprimés si vous ne prévoyez pas de les réutiliser :

### Services
- `lib/services/mobile-money.service.ts`
- `lib/services/mobile-money/mtn.adapter.ts`
- `lib/services/mobile-money/orange.adapter.ts`
- `lib/services/mobile-money/airtel.adapter.ts`
- `lib/services/mobile-money/wave.adapter.ts`
- `lib/services/mobile-money/mobile-money.types.ts`

### Pages UI
- `app/(dashboard)/dashboard/settings/mobile-money/page.tsx`

### API Routes
- `app/api/mobile-money/initiate/route.ts`
- `app/api/mobile-money/webhook/route.ts`
- `app/api/mobile-money/status/[transactionId]/route.ts`

### Migrations SQL
- `supabase/migrations/20241202000015_create_mobile_money_integrations.sql`

## Remplacement

Les paiements Mobile Money sont remplacés par :
- **Stripe** : Paiements par carte bancaire
- **SEPA** : Virements bancaires européens et prélèvements

## Migration des Données

Si vous avez des données Mobile Money existantes :
1. Les transactions existantes restent dans la base de données
2. Les nouvelles transactions utiliseront Stripe/SEPA
3. Vous pouvez archiver les anciennes transactions Mobile Money

## Note

Ces fichiers sont conservés pour référence mais ne sont plus utilisés dans le nouveau positionnement.



## ⚠️ Note Importante

Le module Mobile Money (MTN, Orange, Airtel, Wave) a été **déprécié** dans le cadre du repositionnement vers le marché français/européen.

## Fichiers à Supprimer (Optionnel)

Les fichiers suivants peuvent être supprimés si vous ne prévoyez pas de les réutiliser :

### Services
- `lib/services/mobile-money.service.ts`
- `lib/services/mobile-money/mtn.adapter.ts`
- `lib/services/mobile-money/orange.adapter.ts`
- `lib/services/mobile-money/airtel.adapter.ts`
- `lib/services/mobile-money/wave.adapter.ts`
- `lib/services/mobile-money/mobile-money.types.ts`

### Pages UI
- `app/(dashboard)/dashboard/settings/mobile-money/page.tsx`

### API Routes
- `app/api/mobile-money/initiate/route.ts`
- `app/api/mobile-money/webhook/route.ts`
- `app/api/mobile-money/status/[transactionId]/route.ts`

### Migrations SQL
- `supabase/migrations/20241202000015_create_mobile_money_integrations.sql`

## Remplacement

Les paiements Mobile Money sont remplacés par :
- **Stripe** : Paiements par carte bancaire
- **SEPA** : Virements bancaires européens et prélèvements

## Migration des Données

Si vous avez des données Mobile Money existantes :
1. Les transactions existantes restent dans la base de données
2. Les nouvelles transactions utiliseront Stripe/SEPA
3. Vous pouvez archiver les anciennes transactions Mobile Money

## Note

Ces fichiers sont conservés pour référence mais ne sont plus utilisés dans le nouveau positionnement.



## ⚠️ Note Importante

Le module Mobile Money (MTN, Orange, Airtel, Wave) a été **déprécié** dans le cadre du repositionnement vers le marché français/européen.

## Fichiers à Supprimer (Optionnel)

Les fichiers suivants peuvent être supprimés si vous ne prévoyez pas de les réutiliser :

### Services
- `lib/services/mobile-money.service.ts`
- `lib/services/mobile-money/mtn.adapter.ts`
- `lib/services/mobile-money/orange.adapter.ts`
- `lib/services/mobile-money/airtel.adapter.ts`
- `lib/services/mobile-money/wave.adapter.ts`
- `lib/services/mobile-money/mobile-money.types.ts`

### Pages UI
- `app/(dashboard)/dashboard/settings/mobile-money/page.tsx`

### API Routes
- `app/api/mobile-money/initiate/route.ts`
- `app/api/mobile-money/webhook/route.ts`
- `app/api/mobile-money/status/[transactionId]/route.ts`

### Migrations SQL
- `supabase/migrations/20241202000015_create_mobile_money_integrations.sql`

## Remplacement

Les paiements Mobile Money sont remplacés par :
- **Stripe** : Paiements par carte bancaire
- **SEPA** : Virements bancaires européens et prélèvements

## Migration des Données

Si vous avez des données Mobile Money existantes :
1. Les transactions existantes restent dans la base de données
2. Les nouvelles transactions utiliseront Stripe/SEPA
3. Vous pouvez archiver les anciennes transactions Mobile Money

## Note

Ces fichiers sont conservés pour référence mais ne sont plus utilisés dans le nouveau positionnement.---

**Document EDUZEN** | [Retour à la documentation principale](README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.