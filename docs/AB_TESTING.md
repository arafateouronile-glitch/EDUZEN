---
title: Guide AB Testing
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🧪 Guide A/B Testing

Ce document décrit comment utiliser le système de tests A/B dans l'application EDUZEN pour tester différentes variantes de fonctionnalités.

## 🎯 Objectif

Les tests A/B permettent de comparer différentes versions d'une fonctionnalité pour déterminer laquelle performe le mieux en termes de conversion, engagement, ou autres métriques.

## 🔧 Configuration

### Variables d'Environnement

Activez les tests A/B via les variables d'environnement :

```env
# Activer le test du nouveau layout du dashboard
NEXT_PUBLIC_AB_TEST_DASHBOARD=true

# Activer le test du nouveau formulaire étudiant
NEXT_PUBLIC_AB_TEST_STUDENT_FORM=true

# Activer le test du nouveau flux de paiement
NEXT_PUBLIC_AB_TEST_PAYMENT=true
```

### Configuration des Tests

Les tests sont configurés dans `lib/services/ab-testing.service.ts`. Chaque test a :

- **testId** : Identifiant unique du test
- **name** : Nom du test
- **description** : Description du test
- **variants** : Liste des variantes (ex: ['control', 'treatment'])
- **trafficSplit** : Répartition du trafic (ex: { control: 50, treatment: 50 })
- **isActive** : Si le test est actif
- **startDate** / **endDate** : Dates de début et fin (optionnel)

## 💻 Utilisation

### Dans un Composant React

```tsx
import { useABTest, useABTestConversion } from '@/lib/hooks/use-ab-test'

export default function DashboardPage() {
  const variant = useABTest({ testId: 'new-dashboard-layout' })
  const trackConversion = useABTestConversion('new-dashboard-layout', variant)

  // Afficher la variante appropriée
  if (variant === 'treatment') {
    return (
      <NewDashboardLayout 
        onActionComplete={() => {
          trackConversion('dashboard_action_completed')
        }}
      />
    )
  }

  return (
    <OldDashboardLayout 
      onActionComplete={() => {
        trackConversion('dashboard_action_completed')
      }}
    />
  )
}
```

### Tracking des Conversions

```tsx
function PaymentButton() {
  const variant = useABTest({ testId: 'payment-flow' })
  const trackConversion = useABTestConversion('payment-flow', variant)

  const handlePayment = async () => {
    try {
      // ... logique de paiement
      await processPayment()
      
      // Track la conversion
      trackConversion('payment_completed', {
        amount: 1000,
        currency: 'XOF',
      })
    } catch (error) {
      // Track l'échec aussi
      trackConversion('payment_failed', {
        error: error.message,
      })
    }
  }

  return (
    <button onClick={handlePayment}>
      {variant === 'treatment' ? 'Payer maintenant' : 'Effectuer le paiement'}
    </button>
  )
}
```

### Assignation Déterministe

L'assignation des variantes est **déterministe** : un utilisateur verra toujours la même variante pour un test donné. Cela garantit :

- **Cohérence** : L'utilisateur ne voit pas différentes variantes à chaque visite
- **Fiabilité** : Les résultats sont plus fiables
- **Expérience utilisateur** : Pas de confusion pour l'utilisateur

L'assignation est basée sur :
1. `userId` (si disponible)
2. `organizationId` (si userId non disponible)
3. Hash aléatoire (si aucun des deux n'est disponible)

## 📊 Tests Disponibles

### 1. Nouveau Layout Dashboard

**Test ID** : `new-dashboard-layout`

**Variantes** :
- `control` : Layout actuel
- `treatment` : Nouveau layout avec améliorations UX

**Métriques** :
- Taux de clic sur les actions principales
- Temps passé sur le dashboard
- Nombre d'actions effectuées

**Activation** :
```env
NEXT_PUBLIC_AB_TEST_DASHBOARD=true
```

### 2. Nouveau Formulaire Étudiant

**Test ID** : `new-student-form`

**Variantes** :
- `A` : Formulaire actuel (multi-étapes)
- `B` : Formulaire simplifié (une seule étape)

**Métriques** :
- Taux de complétion
- Temps de remplissage
- Nombre d'erreurs de validation

**Activation** :
```env
NEXT_PUBLIC_AB_TEST_STUDENT_FORM=true
```

### 3. Nouveau Flux de Paiement

**Test ID** : `payment-flow`

**Variantes** :
- `control` : Flux actuel
- `treatment` : Flux simplifié avec moins d'étapes

**Métriques** :
- Taux de conversion (paiement complété)
- Taux d'abandon
- Temps de traitement

**Activation** :
```env
NEXT_PUBLIC_AB_TEST_PAYMENT=true
```

## 📈 Analyse des Résultats

### Métriques Trackées

1. **Impressions** : Nombre de fois qu'une variante est affichée
2. **Conversions** : Nombre de fois qu'une action cible est effectuée
3. **Taux de conversion** : Conversions / Impressions

### Accéder aux Statistiques

```typescript
import { abTestingService } from '@/lib/services/ab-testing.service'

const stats = await abTestingService.getTestStats('new-dashboard-layout')
// Retourne : { impressions, conversions, conversionRates }
```

### Analytics

Les événements sont automatiquement trackés dans :
- **Plausible Analytics** (si configuré)
- **Google Analytics** (si configuré)

Événements trackés :
- `ab_test_assigned` : Assignation d'une variante
- `ab_test_impression` : Affichage d'une variante
- `ab_test_conversion` : Conversion dans une variante

## 🎛️ Gestion des Tests

### Activer/Désactiver un Test

Modifier `isActive` dans la configuration du test :

```typescript
'new-dashboard-layout': {
  // ...
  isActive: process.env.NEXT_PUBLIC_AB_TEST_DASHBOARD === 'true',
}
```

### Modifier le Split de Trafic

```typescript
trafficSplit: { 
  control: 70,  // 70% des utilisateurs
  treatment: 30 // 30% des utilisateurs
}
```

### Dates de Début/Fin

```typescript
startDate: '2024-01-01',
endDate: '2024-12-31',
```

## 🔍 Bonnes Pratiques

### 1. Tester une Seule Chose à la Fois

Évitez de tester plusieurs changements simultanément. Testez une seule modification par test.

### 2. Taille d'Échantillon Suffisante

- Minimum : 1000 impressions par variante
- Idéal : 5000+ impressions pour des résultats fiables

### 3. Durée du Test

- Minimum : 1 semaine
- Idéal : 2-4 semaines pour capturer les variations hebdomadaires

### 4. Métriques Claires

Définissez clairement ce que vous mesurez :
- **Métrique principale** : Objectif principal (ex: taux de conversion)
- **Métriques secondaires** : Autres indicateurs (ex: temps passé, satisfaction)

### 5. Significativité Statistique

Utilisez un test de significativité (ex: test du chi-deux) pour déterminer si les résultats sont statistiquement significatifs.

## 🚀 Créer un Nouveau Test

1. **Définir le test** dans `ab-testing.service.ts` :

```typescript
'my-new-test': {
  testId: 'my-new-test',
  name: 'Mon Nouveau Test',
  description: 'Test de ma nouvelle fonctionnalité',
  variants: ['control', 'treatment'],
  trafficSplit: { control: 50, treatment: 50 },
  isActive: process.env.NEXT_PUBLIC_AB_TEST_MY_TEST === 'true',
}
```

2. **Ajouter la variable d'environnement** :

```env
NEXT_PUBLIC_AB_TEST_MY_TEST=true
```

3. **Utiliser dans le composant** :

```tsx
const variant = useABTest({ testId: 'my-new-test' })
```

4. **Tracker les conversions** :

```tsx
const trackConversion = useABTestConversion('my-new-test', variant)
trackConversion('my_conversion_event')
```

## 📝 Exemple Complet

```tsx
'use client'

import { useABTest, useABTestConversion } from '@/lib/hooks/use-ab-test'

export default function StudentFormPage() {
  const variant = useABTest({ testId: 'new-student-form' })
  const trackConversion = useABTestConversion('new-student-form', variant)

  const handleSubmit = async (data: StudentFormData) => {
    const startTime = Date.now()
    
    try {
      await createStudent(data)
      const duration = Date.now() - startTime

      // Track succès
      trackConversion('form_completed', {
        duration,
        has_guardian: !!data.guardian_id,
      })
    } catch (error) {
      // Track échec
      trackConversion('form_failed', {
        error: error.message,
      })
    }
  }

  // Afficher la variante appropriée
  if (variant === 'B') {
    return <SimplifiedStudentForm onSubmit={handleSubmit} />
  }

  return <MultiStepStudentForm onSubmit={handleSubmit} />
}
```

## 🔒 Sécurité et Confidentialité

- Les tests A/B ne collectent que des données anonymisées
- Les utilisateurs ne sont pas identifiables individuellement dans les résultats
- Les données sont utilisées uniquement pour améliorer l'expérience utilisateur

## 📞 Support

Pour toute question sur les tests A/B :
1. Consultez la documentation analytics
2. Vérifiez les logs dans Sentry (si configuré)
3. Contactez l'équipe de développement---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.