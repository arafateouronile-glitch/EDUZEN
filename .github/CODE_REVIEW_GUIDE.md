---
title: Guide de Code Review
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 📖 Guide de Code Review

Ce guide définit les standards et processus pour les code reviews dans le projet EDUZEN.

## 🎯 Objectif

Les code reviews ont pour but de :
- ✅ Assurer la qualité du code
- ✅ Partager les connaissances
- ✅ Détecter les bugs avant la production
- ✅ Maintenir la cohérence du codebase
- ✅ Améliorer la sécurité

## 📋 Processus

### 1. Avant de Soumettre une PR

**Auteur de la PR** :
- [ ] Vérifier que le code suit les conventions du projet
- [ ] Exécuter les linters et tests localement
- [ ] Vérifier que les tests passent
- [ ] Mettre à jour la documentation si nécessaire
- [ ] Remplir le template de PR
- [ ] Demander des reviewers appropriés

### 2. Pendant la Review

**Reviewer** :
- [ ] Lire le code attentivement
- [ ] Vérifier la logique métier
- [ ] Tester localement si nécessaire
- [ ] Vérifier la sécurité
- [ ] Vérifier les performances
- [ ] Donner des commentaires constructifs
- [ ] Approuver ou demander des changements

### 3. Après la Review

**Auteur de la PR** :
- [ ] Répondre aux commentaires
- [ ] Apporter les corrections demandées
- [ ] Marquer les commentaires comme résolus
- [ ] Demander une re-review si nécessaire

## ✅ Checklist de Review

### Fonctionnalité
- [ ] Le code fait ce qu'il est censé faire
- [ ] Les cas limites sont gérés
- [ ] Les erreurs sont gérées correctement
- [ ] Les validations sont présentes
- [ ] Les tests couvrent les nouveaux cas

### Code Quality
- [ ] Le code est lisible et bien structuré
- [ ] Les noms de variables/fonctions sont clairs
- [ ] Pas de code dupliqué
- [ ] Les fonctions sont de taille raisonnable (< 50 lignes idéalement)
- [ ] Les commentaires expliquent le "pourquoi", pas le "quoi"

### Architecture
- [ ] Le code suit les patterns du projet
- [ ] La séparation des responsabilités est respectée
- [ ] Les dépendances sont correctes
- [ ] Pas de couplage fort

### Sécurité
- [ ] Pas d'injection SQL possible
- [ ] Les entrées utilisateur sont validées
- [ ] Les secrets ne sont pas exposés
- [ ] Les permissions sont vérifiées
- [ ] Pas de vulnérabilités connues

### Performance
- [ ] Pas de requêtes N+1
- [ ] La pagination est utilisée pour les grandes listes
- [ ] Les requêtes sont optimisées
- [ ] Le cache est utilisé quand approprié
- [ ] Pas de boucles inefficaces

### Tests
- [ ] Les tests unitaires sont présents
- [ ] Les tests d'intégration sont présents si nécessaire
- [ ] Les tests passent
- [ ] La couverture de tests est maintenue

### Documentation
- [ ] Le code est commenté si nécessaire
- [ ] La documentation est mise à jour
- [ ] Les changements sont documentés dans le CHANGELOG
- [ ] Les nouvelles fonctionnalités sont documentées

### Base de données
- [ ] Les migrations sont correctes
- [ ] Les migrations sont réversibles
- [ ] Les index sont ajoutés si nécessaire
- [ ] Les contraintes sont appropriées

### UI/UX
- [ ] L'interface est responsive
- [ ] Les états de chargement sont gérés
- [ ] Les erreurs sont affichées clairement
- [ ] L'accessibilité est respectée

## 🚫 À Éviter

### Commentaires Non Constructifs
❌ "Ce code est mauvais"
✅ "Cette fonction est complexe. Pourrait-on la diviser en fonctions plus petites ?"

❌ "Pourquoi as-tu fait ça ?"
✅ "Je me demande si cette approche est la meilleure. Qu'en penses-tu de [alternative] ?"

❌ "Change ça"
✅ "Pourrait-on utiliser [approche] à la place ? Cela améliorerait [bénéfice]."

### Review Trop Longue
- ⏱️ Répondre dans les 24-48 heures
- 🔄 Si occupé, assigner un autre reviewer
- 💬 Communiquer les délais si nécessaire

### Micro-management
- 🎯 Se concentrer sur les aspects importants
- 🔍 Laisser les détails de style au linter
- 🤝 Faire confiance aux développeurs

## 💬 Types de Commentaires

### 1. Must Fix (Bloquant)
- Bugs critiques
- Problèmes de sécurité
- Breaking changes non documentés
- Violations des standards critiques

**Format** : `🔴 Must Fix: [description]`

### 2. Should Fix (Important)
- Améliorations significatives
- Problèmes de performance
- Code smell important

**Format** : `🟡 Should Fix: [description]`

### 3. Nice to Have (Suggestion)
- Améliorations mineures
- Optimisations optionnelles
- Refactoring futur

**Format** : `💡 Suggestion: [description]`

### 4. Question
- Clarifications nécessaires
- Compréhension du code

**Format** : `❓ Question: [description]`

## 📊 Métriques de Review

### Taille de PR
- ✅ **Petite** (< 200 lignes) : Review rapide, facile à comprendre
- ⚠️ **Moyenne** (200-500 lignes) : Review normale
- 🔴 **Grande** (> 500 lignes) : Considérer diviser en plusieurs PRs

### Temps de Review
- ⏱️ **Objectif** : Répondre dans les 24 heures
- 🔄 **Maximum** : 48 heures pour les PRs non critiques

## 🎓 Bonnes Pratiques

### Pour les Auteurs
1. **Petites PRs** : Plus faciles à reviewer
2. **Descriptions claires** : Expliquer le contexte
3. **Tests** : Inclure des tests pour les nouvelles fonctionnalités
4. **Réactivité** : Répondre rapidement aux commentaires

### Pour les Reviewers
1. **Bienveillance** : Être constructif et respectueux
2. **Rapidité** : Répondre rapidement
3. **Approche** : Se concentrer sur l'important
4. **Apprentissage** : Utiliser les reviews pour apprendre

## 🔄 Workflow GitHub

### États de Review
- **Approve** ✅ : Le code est prêt à être mergé
- **Request Changes** 🔴 : Des changements sont nécessaires
- **Comment** 💬 : Commentaire sans bloquer

### Règles de Merge
- ✅ Au moins 1 approbation requise
- ✅ Tous les checks CI doivent passer
- ✅ Pas de conflits
- ✅ PR à jour avec la branche cible

## 📚 Ressources

- [Google's Code Review Guide](https://google.github.io/eng-practices/review/)
- [Atlassian's Code Review Best Practices](https://www.atlassian.com/agile/software-development/code-reviews)
- [Microsoft's Code Review Checklist](https://docs.microsoft.com/en-us/azure/devops/repos/git/pull-requests)

## 🎯 Objectifs

- **Qualité** : Maintenir un code de haute qualité
- **Apprentissage** : Partager les connaissances
- **Sécurité** : Prévenir les vulnérabilités
- **Performance** : Optimiser le code
- **Cohérence** : Maintenir les standards du projet

---

**Note** : Ce guide est vivant et peut être amélioré. N'hésitez pas à proposer des améliorations !---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.

