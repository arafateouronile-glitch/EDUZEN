---
title: Changelog
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# Changelog

Tous les changements notables de ce projet seront documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère à [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 📄 Documents - Style Premium

#### Ajouté
- **Système de layout premium pour les documents** :
  - Nouveau module `premium-layout.ts` avec composants réutilisables
  - Style inspiré des documents professionnels INSSI FORMATION
  - En-tête professionnel : logo à droite, informations de l'organisme à gauche, ligne de séparation
  - Pied de page professionnel : SIRET, numéro de déclaration d'activité, mention légale, pagination
  - Fonctions utilitaires : `generatePremiumHeader`, `generatePremiumFooter`, `wrapWithPremiumLayout`

#### Modifié
- **Tous les templates de documents mis à jour** :
  - Convention de formation professionnelle (contrat)
  - Facture
  - Devis
  - Convocation
  - Contrat de scolarité
  - Attestation de réussite
  - Certificat de scolarité
  - Relevé de notes
  - Attestation d'entrée en formation
  - Règlement intérieur
  - Conditions générales de vente (CGV)
  - Programme de formation
  - Attestation d'assiduité
- **Générateur HTML amélioré** :
  - En-têtes et pieds de page automatiquement générés si non définis
  - Pagination dynamique avec placeholders `{numero_page}` et `{total_pages}`
  - Support des variables organisation (SIRET, déclaration, région)

### 🌐 Internationalisation (i18n)

#### Corrigé
- **Configuration next-intl permanente** : 
  - Configuration stable avec `localePrefix: 'never'` pour éviter les conflits de routage
  - Gestion des routes préfixées (`/en/*`, `/fr/*`) avec redirection automatique vers les routes sans préfixe
  - Support du cookie `NEXT_LOCALE` pour la persistance de la langue choisie
  - Gestion gracieuse des erreurs dans le middleware pour éviter les 404
  - Exclusion explicite des fichiers statiques dans le middleware
- **Correction du LanguageSwitcher** : 
  - Ajout de l'état `isChanging` pour éviter les changements multiples simultanés
  - Prévention des erreurs de référence non définie

### 🐛 Corrections de bugs

#### Corrigé
- **Erreur d'hydratation React** : 
  - Remplacement des balises `<p>` par `<div>` dans `health/page.tsx` pour corriger l'erreur "div cannot be descendant of p"
- **Erreurs de syntaxe Supabase** : 
  - Correction de la syntaxe des jointures dans `educational-resources.service.ts` (utilisation de `author:users!author_id(...)`)
  - Correction du bloc `try-catch` non fermé dans `export-history.service.ts`
- **Gestion gracieuse des tables manquantes** : 
  - Ajout d'une gestion d'erreur robuste pour les tables `educational_resources` et `export_history`
  - Retour de résultats vides au lieu d'erreurs si les tables n'existent pas encore
  - Support des codes d'erreur Supabase (PGRST116, PGRST200, 42P01, etc.)

### 🔒 Sécurité

#### Ajouté
- **Rate Limiting** : Implémentation du rate limiting sur tous les endpoints critiques (auth, paiements, documents)
  - Rate limiter général : 100 requêtes/minute
  - Rate limiter pour l'authentification : 5 tentatives/15 minutes
  - Rate limiter pour les mutations : 50 requêtes/minute
  - Rate limiter pour les uploads : 10 uploads/minute
- **Validation des signatures webhooks** : Validation HMAC pour les webhooks Mobile Money et e-signature
  - Protection contre les replay attacks (timestamp + nonce)
  - Support de plusieurs providers (MTN, Orange, Airtel)
- **Sécurisation des endpoints CRON** : 
  - Vérification du secret header
  - Support IP whitelist (via `CRON_ALLOWED_IPS`)
  - Logging de toutes les exécutions CRON
- **Headers de sécurité** : 
  - Content Security Policy (CSP)
  - Strict Transport Security (HSTS)
  - X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
  - Referrer-Policy, Permissions-Policy

### ⚡ Performance

#### Ajouté
- **Optimisation du dashboard** : Parallélisation des requêtes avec `Promise.all()` pour réduire le temps de chargement
- **Pagination côté serveur** : 
  - Pagination implémentée pour les listes d'étudiants
  - Pagination implémentée pour les listes de documents
  - Support des filtres avec pagination
- **Composants Skeleton** : 
  - Composants Skeleton réutilisables (SkeletonCard, SkeletonList, SkeletonTable, SkeletonBentoGrid)
  - Remplacement des loaders basiques par des composants Skeleton

### 📈 Monitoring

#### Ajouté
- **Dashboard de santé** : Page `/dashboard/admin/health` pour surveiller l'état de l'application
  - Vérification de la connexion base de données
  - Statistiques générales (organisations, utilisateurs, étudiants, documents, paiements)
  - Performances des requêtes par table
  - Rafraîchissement automatique
- **Intégration Sentry** : Configuration pour le monitoring d'erreurs et de performance
  - Configuration client et serveur
  - Filtrage des données sensibles
  - Session Replay (10% des sessions, 100% des sessions avec erreurs)
- **Métriques de performance** : 
  - Moniteur de performance (`performance-monitor.ts`)
  - Hook React `usePerformance` pour mesurer les composants
  - Statistiques (moyenne, médiane, P95, P99) dans le dashboard de santé
- **Logging amélioré** : 
  - Logger centralisé avec support Sentry
  - Logging des erreurs critiques et actions sensibles
  - Logging des exécutions CRON

### 🏗️ Refactoring

#### Ajouté
- **Hooks personnalisés réutilisables** :
  - `useLocalStorage` : Gestion sûre du localStorage avec synchronisation entre onglets
  - `useDebouncedValue` : Débounce de valeurs (utile pour les recherches)
  - `useClickOutside` : Détection des clics en dehors d'un élément
  - `useMediaQuery` : Détection des media queries (avec hooks prédéfinis : `useIsMobile`, `useIsTablet`, `useIsDesktop`)
  - `usePerformance` : Mesure des performances des composants React
  - `useApiPerformance` : Mesure des performances des requêtes API

### ✨ Features

#### Ajouté
- **Thème sombre** : 
  - Hook `useTheme` amélioré avec sauvegarde de la préférence utilisateur
  - Sauvegarde dans la base de données pour persistance entre sessions
  - Support du thème système (auto-détection)
  - Toggle entre thème clair et sombre
- **PWA (Progressive Web App)** :
  - Service Worker pour le cache et le mode offline
  - Manifest.json configuré pour l'installation sur mobile et desktop
  - Page offline dédiée (`/offline`)
  - Prompt d'installation automatique
  - Badge de statut en ligne/hors ligne
  - Support de l'installation sur Android, iOS et Desktop
  - Cache intelligent (Network First pour les pages, Cache First pour les assets)

### 📝 Documentation

#### Ajouté
- **CHANGELOG.md** : Ce fichier pour documenter tous les changements
- **docs/SETUP_SENTRY.md** : Guide de configuration de Sentry
- **docs/ROADMAP_RECOMMANDATIONS.md** : Roadmap des recommandations futures
- **docs/PWA.md** : Guide complet pour la PWA (installation, configuration, développement)

### 🔧 Configuration

#### Modifié
- **next.config.js** : Ajout des headers de sécurité supplémentaires
- **middleware.ts** : Headers de sécurité déjà présents (CSP, HSTS, etc.)

---

## [1.0.0] - 2024-12-26

### Initial Release

- Système de gestion scolaire complet
- Authentification et autorisation
- Gestion des étudiants, sessions, formations
- Système de paiements (Stripe, SEPA, Mobile Money)
- Génération de documents
- Système de messagerie
- Portail apprenant
- Dashboard administratif

---

## Format des versions

- **MAJOR** : Changements incompatibles avec les versions précédentes
- **MINOR** : Nouvelles fonctionnalités rétro-compatibles
- **PATCH** : Corrections de bugs rétro-compatibles

## Types de changements

- **Ajouté** : Nouvelles fonctionnalités
- **Modifié** : Changements dans les fonctionnalités existantes
- **Déprécié** : Fonctionnalités qui seront supprimées dans une future version
- **Supprimé** : Fonctionnalités supprimées
- **Corrigé** : Corrections de bugs
- **Sécurité** : Corrections de vulnérabilités---

**Document EDUZEN** | [Retour à la documentation principale](README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.