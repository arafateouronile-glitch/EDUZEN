---
title: Configuration de lInternationalisation (i18n)
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🌍 Configuration de l'Internationalisation (i18n)

## ✅ Ce qui a été fait

### 1. Installation et Configuration
- ✅ Package `next-intl` installé
- ✅ Configuration de base créée (`i18n/request.ts`)
- ✅ Middleware intégré avec authentification Supabase
- ✅ Layout racine mis à jour avec `NextIntlClientProvider`

### 2. Fichiers de Traduction
- ✅ `messages/fr.json` - Traductions françaises (base)
- ✅ `messages/en.json` - Traductions anglaises (base)

### 3. Composants
- ✅ `LanguageSwitcher` - Composant de sélection de langue
- ✅ Intégré dans le header du dashboard
- ✅ Hook personnalisé `useTranslations` créé

### 4. Utilitaires
- ✅ Fonctions de gestion des cookies (`lib/utils/cookies.ts`)

## 📋 Structure des Fichiers

```
├── i18n/
│   └── request.ts              # Configuration next-intl
├── messages/
│   ├── fr.json                 # Traductions françaises
│   └── en.json                 # Traductions anglaises
├── components/
│   └── i18n/
│       └── language-switcher.tsx
├── lib/
│   ├── hooks/
│   │   └── use-translations.ts
│   └── utils/
│       └── cookies.ts
└── middleware.ts                # Middleware combiné (auth + i18n)
```

## 🚀 Utilisation

### Dans un composant React

```tsx
'use client'

import { useTranslations } from 'next-intl'

export function MyComponent() {
  const t = useTranslations('common')
  
  return (
    <div>
      <h1>{t('welcome')}</h1>
      <button>{t('save')}</button>
    </div>
  )
}
```

### Dans un composant serveur

```tsx
import { useTranslations } from 'next-intl/server'

export async function ServerComponent() {
  const t = await useTranslations('common')
  
  return <h1>{t('welcome')}</h1>
}
```

## ⏳ Tâches Restantes

### 1. Traductions Complètes
- ⏳ Traduire toutes les pages et composants
- ⏳ Ajouter les traductions pour :
  - Dashboard
  - Étudiants
  - Programmes
  - Sessions
  - Formations
  - Paiements
  - Présence
  - Messages
  - Paramètres

### 2. Formats Locale
- ⏳ Gérer les formats de date par locale
- ⏳ Gérer les formats de devise par locale
- ⏳ Utiliser `date-fns` avec locales

### 3. Multi-Devises
- ⏳ Support XOF, EUR, USD, etc.
- ⏳ Conversion automatique des devises
- ⏳ Affichage selon la locale

## 🔧 Configuration

### Locales Supportées
- `fr` (Français) - Par défaut
- `en` (English)

### Ajouter une Nouvelle Locale

1. Créer `messages/[locale].json`
2. Ajouter la locale dans `middleware.ts` :
   ```typescript
   export const locales = ['fr', 'en', 'es'] as const
   ```
3. Ajouter dans `LanguageSwitcher`

## 📝 Notes

- La locale est stockée dans un cookie (`locale`)
- Le middleware détecte automatiquement la locale
- Le sélecteur de langue est disponible dans le header
- Les traductions sont chargées côté serveur pour de meilleures performances---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.

