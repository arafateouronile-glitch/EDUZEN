---
title: Système de Couleurs - Application SaaS Scolaire (Version Finale)
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🎨 Système de Couleurs - Application SaaS Scolaire (Version Finale)

## 🎯 Palette Principale - Dominance Bleu

### Couleurs de Marque (Dominance 60-70% de l'interface)

#### 1️⃣ Bleu Principal - Royal Blue #335ACF

```css
/* Bleu Principal - Dominance de l'interface */
--brand-blue-primary: #335ACF;
--brand-blue-dark: #2847A3;     /* Hover, focus states */
--brand-blue-darker: #1E3578;    /* Active states, textes sur fond clair */
--brand-blue-light: #5C7DD9;     /* Variants légers */
--brand-blue-lighter: #8FA9E8;   /* Backgrounds subtils */
--brand-blue-pale: #C7D5F5;      /* Backgrounds très légers */
--brand-blue-ghost: #E8EEF9;     /* Hover backgrounds, cards */
```

**Utilisations (40% de l'interface) :**
- 🎨 Sidebar navigation (background ou accents)
- 🔘 Tous les boutons principaux
- 📊 Headers de tables et cards
- 🔗 Tous les liens cliquables
- 📌 Navigation active
- 🎯 Icônes principales
- 📈 Graphiques primaires
- 🏷️ Badges "Actif", "En cours"

#### 2️⃣ Cyan Vibrant - Sky Blue #34B9EE

```css
/* Cyan Secondaire - Complémentaire énergique */
--brand-cyan-primary: #34B9EE;
--brand-cyan-dark: #2A95BF;      /* Hover states */
--brand-cyan-darker: #1F7190;    /* Active, emphasis */
--brand-cyan-light: #5CCBF3;     /* Highlights */
--brand-cyan-lighter: #8DDBF7;   /* Soft accents */
--brand-cyan-pale: #BFEAFB;      /* Info backgrounds */
--brand-cyan-ghost: #E5F6FD;     /* Subtle backgrounds */
```

**Utilisations (20-30% de l'interface) :**
- 🎨 Accents visuels et highlights
- 🔘 Boutons secondaires importants
- 📊 Graphiques secondaires
- 💬 Notifications et messages info
- ✨ Éléments interactifs (hover effects)
- 🎯 Badges "Nouveau", "Info"
- 📱 Call-to-actions secondaires
- 🌟 Éléments de gamification

#### 3️⃣ Dégradés de Marque

```css
/* Dégradés Bleu → Cyan */
--gradient-primary: linear-gradient(135deg, #335ACF 0%, #34B9EE 100%);
--gradient-primary-soft: linear-gradient(135deg, #5C7DD9 0%, #5CCBF3 100%);
--gradient-vertical: linear-gradient(180deg, #335ACF 0%, #34B9EE 100%);
--gradient-diagonal-r: linear-gradient(45deg, #335ACF 0%, #34B9EE 100%);
--gradient-radial: radial-gradient(circle, #335ACF 0%, #34B9EE 100%);

/* Dégradés avec opacité (pour overlays) */
--gradient-overlay: linear-gradient(135deg, rgba(51,90,207,0.95) 0%, rgba(52,185,238,0.95) 100%);
--gradient-subtle: linear-gradient(135deg, rgba(51,90,207,0.1) 0%, rgba(52,185,238,0.1) 100%);
```

**Utilisations des dégradés :**
- 🎨 Headers de pages importantes
- 📊 Cards premium ou highlights
- 🔘 Boutons CTA principaux (essai gratuit, s'inscrire)
- 📱 Splash screens mobile
- 🌟 Bannières promotionnelles
- 🎯 Sections hero de landing page
- 📈 Graphiques de croissance (fill gradient)

---

## ⚫ Couleurs de Texte - Noir Uniquement

```css
/* Textes - Variations de noir uniquement */
--text-primary: #000000;         /* Texte principal - BOLD */
--text-secondary: #1A1A1A;       /* Texte standard - Regular */
--text-tertiary: #4D4D4D;        /* Texte secondaire, labels */
--text-disabled: #999999;        /* Texte désactivé */
--text-placeholder: #B3B3B3;     /* Placeholders inputs */

/* Sur fonds colorés */
--text-on-blue: #FFFFFF;         /* Texte sur #335ACF ou #34B9EE */
--text-on-gradient: #FFFFFF;     /* Texte sur dégradés */
```

**Règles typographiques :**
- ✅ Titres (H1-H3) : Noir #000000 en Bold (font-weight: 700)
- ✅ Texte principal : Noir #1A1A1A en Bold (font-weight: 600)
- ✅ Texte corps : Noir #1A1A1A en Regular (font-weight: 400)
- ✅ Labels, légendes : Gris foncé #4D4D4D en Medium (font-weight: 500)
- ❌ Pas de couleurs pour textes (sauf blanc sur fond bleu/cyan)

---

## ⚪ Arrière-plans - Gris Clair et Blanc

```css
/* Backgrounds - Dominance clair */
--bg-white: #FFFFFF;             /* Cards, modals, inputs */
--bg-gray-50: #F9FAFB;          /* Background global de l'app */
--bg-gray-100: #F3F4F6;         /* Backgrounds alternés (tables) */
--bg-gray-200: #E5E7EB;         /* Dividers, bordures légères */
--bg-gray-300: #D1D5DB;         /* Bordures inputs, disabled */
```

**Hiérarchie des backgrounds :**
- Background app global : #F9FAFB (gris très clair)
- Cards, panels : #FFFFFF (blanc pur)
- Sections alternées : #F3F4F6 (gris léger)
- Hover states : #E5E7EB (gris moyen)

---

## 🎨 Couleurs Fonctionnelles (Statuts uniquement)

### Succès - Bleu

```css
--success-primary: #335ACF;      /* Bleu royal moderne */
--success-bg: #E0E7FF;           /* Background léger bleu */
--success-border: #A5B4FC;       /* Bordure bleu moyen */
```

**Usage strict :** Paiements validés, actions réussies, badges "Payé"

### Danger - Rouge

```css
--danger-primary: #EF4444;       /* Rouge vif */
--danger-bg: #FEE2E2;            /* Background léger */
--danger-border: #FCA5A5;        /* Bordure */
```

**Usage strict :** Impayés critiques, erreurs, suppressions

### Avertissement - Cyan

```css
--warning-primary: #34B9EE;      /* Cyan vibrant */
--warning-bg: #E0F2FE;           /* Background léger cyan */
--warning-border: #BAE6FD;       /* Bordure cyan moyen */
```

**Usage strict :** Retards de paiement, actions en attente

⚠️ **Règle importante :** Ces couleurs sont UNIQUEMENT pour badges et alertes, pas pour navigation ou UI principale.

---

## 📊 Répartition Visuelle de l'Interface

### Distribution des Couleurs (objectif)

```
┌─────────────────────────────────────────────────┐
│ HEADER: Dégradé Bleu #335ACF → Cyan #34B9EE    │ ← 10%
├──────────┬──────────────────────────────────────┤
│ SIDEBAR  │ MAIN CONTENT                         │
│ Bleu     │ Background: Gris clair #F9FAFB      │
│ #335ACF  │                                      │
│          │ ┌────────────────┐ ┌──────────────┐ │
│ 25%      │ │ Card (Blanc)   │ │ Card (Blanc) │ │
│          │ │ Header: Cyan   │ │ Header: Bleu │ │
│          │ └────────────────┘ └──────────────┘ │
│          │                                      │
│          │ [Bouton Bleu] [Bouton Cyan]         │
└──────────┴──────────────────────────────────────┘
```

**Répartition couleurs dominantes:**
- Bleu #335ACF: ~35-40%
- Cyan #34B9EE: ~25-30%
- Dégradés: ~5-10%
- Blanc/Gris clair: ~20-30%
- Autres (vert, rouge): ~5%

---

## 🖼️ Exemples d'Application Concrète

### 1. Dashboard Principal

```html
<!-- Header avec dégradé -->
<header class="bg-gradient-brand text-white">
  <h1 class="font-bold text-2xl">École Moderne</h1>
</header>

<!-- Sidebar bleu -->
<aside class="bg-brand-blue text-white">
  <nav>
    <a class="font-semibold hover:bg-brand-blue-dark">👥 Élèves</a>
    <a class="font-medium opacity-80">📚 Cours</a>
  </nav>
</aside>

<!-- Content area -->
<main class="bg-bg-gray-50">
  <!-- Card avec header cyan -->
  <div class="bg-white rounded-lg shadow">
    <div class="bg-brand-cyan text-white p-4">
      <h2 class="font-bold">Statistiques</h2>
    </div>
    <div class="p-6">
      <p class="text-text-primary font-semibold">548 Élèves</p>
      <p class="text-text-tertiary">Inscrits cette année</p>
    </div>
  </div>
</main>
```

### 2. Boutons

```html
<!-- Bouton primaire - Bleu -->
<button class="bg-brand-blue hover:bg-brand-blue-dark text-white font-bold px-6 py-3 rounded-lg">
  Enregistrer
</button>

<!-- Bouton secondaire - Cyan -->
<button class="bg-brand-cyan hover:bg-brand-cyan-dark text-white font-bold px-6 py-3 rounded-lg">
  Essai gratuit
</button>

<!-- Bouton avec dégradé - CTA principal -->
<button class="bg-gradient-brand text-white font-bold px-8 py-4 rounded-lg shadow-lg">
  S'inscrire maintenant
</button>

<!-- Bouton outline - Neutre -->
<button class="border-2 border-bg-gray-200 text-text-secondary font-semibold px-6 py-3 rounded-lg hover:bg-bg-gray-100">
  Annuler
</button>
```

### 3. Cards Statistiques

```html
<div class="grid grid-cols-3 gap-6">
  <!-- Card Bleu -->
  <div class="bg-white rounded-xl shadow-lg overflow-hidden">
    <div class="bg-brand-blue h-2"></div>
    <div class="p-6">
      <p class="text-text-tertiary text-sm font-medium">Total Élèves</p>
      <p class="text-text-primary text-3xl font-bold mt-2">548</p>
      <p class="text-brand-cyan text-sm font-semibold mt-2">+12% ce mois</p>
    </div>
  </div>

  <!-- Card Cyan -->
  <div class="bg-white rounded-xl shadow-lg overflow-hidden">
    <div class="bg-brand-cyan h-2"></div>
    <div class="p-6">
      <p class="text-text-tertiary text-sm font-medium">Revenus</p>
      <p class="text-text-primary text-3xl font-bold mt-2">2.5M XOF</p>
      <span class="inline-block bg-success-bg text-success-primary text-xs font-bold px-3 py-1 rounded-full mt-2">
        Payé
      </span>
    </div>
  </div>

  <!-- Card Dégradé -->
  <div class="bg-gradient-brand rounded-xl shadow-lg p-6">
    <p class="text-white text-sm font-medium">Taux Présence</p>
    <p class="text-white text-3xl font-bold mt-2">94%</p>
    <p class="text-white text-sm font-semibold mt-2 opacity-90">Excellent</p>
  </div>
</div>
```

### 4. Badges de Statut

```html
<!-- Statut payé -->
<span class="inline-flex items-center gap-1 bg-success-bg text-success-primary text-xs font-bold px-3 py-1 rounded-full">
  ✓ Payé
</span>

<!-- Statut impayé -->
<span class="inline-flex items-center gap-1 bg-danger-bg text-danger-primary text-xs font-bold px-3 py-1 rounded-full">
  ⚠ Impayé
</span>

<!-- Statut en attente -->
<span class="inline-flex items-center gap-1 bg-warning-bg text-warning-primary text-xs font-bold px-3 py-1 rounded-full">
  ⏳ En attente
</span>

<!-- Badge info (Cyan) -->
<span class="inline-flex items-center gap-1 bg-brand-cyan-ghost text-brand-cyan-primary text-xs font-bold px-3 py-1 rounded-full">
  ℹ️ Nouveau
</span>

<!-- Badge actif (Bleu) -->
<span class="inline-flex items-center gap-1 bg-brand-blue-ghost text-brand-blue-primary text-xs font-bold px-3 py-1 rounded-full">
  ✓ Actif
</span>
```

---

## ⚙️ Configuration Tailwind

Les couleurs sont configurées dans `tailwind.config.js` :

- `brand-blue` : Bleu principal avec variantes (dark, lighter, etc.)
- `brand-cyan` : Cyan secondaire avec variantes
- `text.*` : Variations de noir
- `bg.*` : Backgrounds blancs et gris
- `success.*`, `danger.*`, `warning.*` : Statuts uniquement
- Classes de dégradés : `bg-gradient-brand`, `bg-gradient-brand-vertical`, etc.

---

## ✅ Checklist d'Implémentation

- [x] ✅ Importer les couleurs dans Tailwind config
- [x] ✅ Créer les classes utilitaires personnalisées
- [x] ✅ Définir les dégradés comme classes réutilisables
- [ ] ⏳ Appliquer sidebar bleu sur toutes les pages
- [ ] ⏳ Utiliser dégradé sur headers importants (dashboard, landing)
- [ ] ⏳ Cards avec accents bleu/cyan (headers ou bordures)
- [ ] ⏳ Tous boutons primaires en bleu ou dégradé
- [ ] ⏳ Textes uniquement en noir (variations)
- [ ] ⏳ Backgrounds en gris clair (#F9FAFB) ou blanc
- [ ] ⏳ Tester contrastes WCAG (noir sur bleu/cyan = OK)

---

## 🎯 Règles d'Or

✅ **60-70% dominance bleu + cyan** (sidebar, headers, boutons, accents)  
✅ **Dégradés pour CTA et éléments premium** (10% interface)  
✅ **Textes UNIQUEMENT noirs** (avec variations de gras)  
✅ **Backgrounds gris clair ou blanc** (jamais colorés sauf headers)  
✅ **Vert/Rouge/Ambre = statuts uniquement** (badges, alertes)  

❌ **Pas de textes colorés** (sauf blanc sur fond bleu/cyan)  
❌ **Pas d'autres couleurs dominantes** (orange, violet, etc.)---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.