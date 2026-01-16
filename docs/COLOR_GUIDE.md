---
title: Guide de Couleurs - Application SaaS Scolaire Africaine
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🎨 Guide de Couleurs - Application SaaS Scolaire Africaine

## 🚀 Utilisation Rapide

### Classes Tailwind disponibles

Toutes les couleurs sont disponibles avec les nuances 50-900 :

```tsx
// Primary (Bleu)
bg-primary-600        // #2563EB - Principal
text-primary-600
border-primary-600

// Secondary (Orange)
bg-secondary-600      // #EA580C - Secondaire
text-secondary-600

// Success (Bleu)
bg-success-600        // #335ACF - Succès (bleu)
text-success-600

// Danger (Rouge)
bg-danger-600         // #DC2626 - Danger
text-danger-600

// Warning (Cyan)
bg-warning-600        // #34B9EE - Avertissement (cyan)
text-warning-600

// Neutral (Gris)
bg-neutral-50         // Background global
text-neutral-900      // Texte principal

// Accent (Violet)
bg-accent-600         // #9333EA - Premium/Innovation
text-accent-600
```

### Exemples d'utilisation

#### Boutons

```tsx
// Bouton primaire (Actions principales)
<button className="bg-primary-600 hover:bg-primary-700 text-white">
  Enregistrer
</button>

// Bouton secondaire (CTA secondaires)
<button className="bg-secondary-600 hover:bg-secondary-700 text-white">
  Essayer gratuitement
</button>

// Bouton danger (Suppression)
<button className="bg-danger-600 hover:bg-danger-700 text-white">
  Supprimer
</button>

// Bouton ghost
<button className="border border-neutral-300 text-neutral-700 hover:bg-neutral-50">
  Annuler
</button>
```

#### Badges de statut

```tsx
// Statut payé
<span className="bg-success-100 text-success-700 px-3 py-1 rounded-full">
  ✓ Payé
</span>

// Statut en attente
<span className="bg-warning-100 text-warning-700 px-3 py-1 rounded-full">
  ⏳ En attente
</span>

// Statut impayé
<span className="bg-danger-100 text-danger-700 px-3 py-1 rounded-full">
  ⚠ Impayé
</span>

// Badge nouveau/premium
<span className="bg-accent-100 text-accent-700 px-3 py-1 rounded-full">
  ✨ Nouveau
</span>
```

#### Cards

```tsx
// Card standard
<div className="bg-white border border-neutral-200 rounded-xl p-6">

// Card avec accent primaire
<div className="bg-primary-50 border-l-4 border-primary-600 rounded-xl p-6">

// Card success
<div className="bg-success-50 border border-success-200 rounded-xl p-6">
```

#### Graphiques (Recharts)

```tsx
const chartColors = {
  revenus: '#16A34A',      // Vert (croissance)
  depenses: '#DC2626',     // Rouge (sorties)
  inscriptions: '#2563EB', // Bleu (principal)
  presences: '#EA580C',    // Orange (énergie)
}
```

## 📋 Palette Complète

| Couleur | Hex Principal | Usage Clé | Emotion |
|---------|--------------|-----------|---------|
| 🔵 Bleu | `#2563EB` | Actions principales, navigation | Confiance, Professionnalisme |
| 🟠 Orange | `#EA580C` | Accents, CTA secondaires | Énergie, Optimisme |
| 🟢 Vert | `#16A34A` | Succès, paiements validés | Croissance, Santé |
| 🔴 Rouge | `#DC2626` | Erreurs, impayés critiques | Urgence, Action |
| 🟡 Ambre | `#D97706` | Avertissements, en attente | Attention, Vigilance |
| ⚫ Gris | `#64748B` | Textes, backgrounds | Neutralité, Clarté |
| 🟣 Violet | `#9333EA` | Premium, innovation | Exclusivité, Modernité |

## 🎯 Règles d'Utilisation

### ✅ Do's

- Utiliser bleu pour 70% des actions principales
- Réserver rouge aux vraies urgences (impayés > 30j, erreurs)
- Ajouter orange pour dynamiser et différencier
- Tester contrastes WCAG AA minimum (4.5:1 texte, 3:1 UI)
- Limiter à 3 couleurs par écran maximum

### ❌ Don'ts

- Ne pas mélanger trop de couleurs simultanément
- Ne pas utiliser rouge/orange sur fond rouge/orange
- Éviter dégradés complexes (performance mobile)
- Ne pas surcharger d'accents colorés (fatigue visuelle)
- Éviter textes colorés sur backgrounds colorés (lisibilité)

## 🌍 Considérations Culturelles

✅ Vert : Prospérité, fertilité, croissance (très positif)
✅ Orange/Jaune : Richesse, chaleur, royauté (apprécié)
✅ Bleu : Paix, harmonie, ciel (neutre universel)
⚠️ Rouge : Danger mais aussi vitalité (utiliser avec parcimonie)

## 📱 Variables CSS disponibles

Toutes les couleurs sont aussi disponibles en variables CSS :

```css
--color-primary: #2563EB;
--color-secondary: #EA580C;
--color-success: #16A34A;
--color-danger: #DC2626;
--color-warning: #D97706;
--color-accent: #9333EA;
```

## 🔧 Dark Mode

Les couleurs s'ajustent automatiquement en dark mode pour une meilleure lisibilité.---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.