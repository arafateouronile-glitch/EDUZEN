---
title: Guide des Reviewers
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 👥 Guide des Reviewers

Ce document liste les reviewers recommandés pour différents types de changements.

## 🎯 Règles Générales

- **Minimum** : 1 reviewer requis pour chaque PR
- **Idéal** : 2 reviewers pour les PRs importantes
- **Critique** : 3+ reviewers pour les changements de sécurité ou architecture

## 📋 Reviewers par Domaine

### 🔒 Sécurité
**Quand** : Changements liés à l'authentification, autorisation, validation, secrets

**Reviewers recommandés** :
- Lead Developer
- Security Team (si disponible)

**Points à vérifier** :
- Validation des entrées
- Gestion des secrets
- Permissions et RLS
- Protection contre les injections

### 🗄️ Base de Données
**Quand** : Migrations, changements de schéma, requêtes complexes

**Reviewers recommandés** :
- Backend Lead
- Database Admin (si disponible)

**Points à vérifier** :
- Correctitude des migrations
- Performance des requêtes
- Index appropriés
- Réversibilité

### 🎨 Frontend / UI
**Quand** : Changements d'interface, composants React, styles

**Reviewers recommandés** :
- Frontend Lead
- UX Designer (si disponible)

**Points à vérifier** :
- Responsive design
- Accessibilité
- Performance client
- Expérience utilisateur

### ⚡ Performance
**Quand** : Optimisations, cache, requêtes lentes

**Reviewers recommandés** :
- Backend Lead
- DevOps (si disponible)

**Points à vérifier** :
- Impact sur les performances
- Utilisation du cache
- Optimisation des requêtes
- Métriques

### 🧪 Tests
**Quand** : Ajout/modification de tests, configuration CI/CD

**Reviewers recommandés** :
- QA Lead
- DevOps

**Points à vérifier** :
- Couverture de tests
- Qualité des tests
- Configuration CI/CD

### 📚 Documentation
**Quand** : Changements dans la documentation, guides

**Reviewers recommandés** :
- Technical Writer (si disponible)
- Lead Developer

**Points à vérifier** :
- Clarté
- Complétude
- Exactitude

## 🔄 Rotation des Reviewers

Pour éviter la surcharge et partager les connaissances :

1. **Rotation hebdomadaire** : Changer les reviewers assignés par défaut chaque semaine
2. **Distribution équitable** : S'assurer que tous les développeurs participent aux reviews
3. **Pairing** : Faire des reviews en pair pour apprendre

## 📊 Assignation Automatique

### Par Type de Fichier
- `**/*.sql` → Backend Lead
- `**/*.tsx`, `**/*.ts` (frontend) → Frontend Lead
- `**/api/**` → Backend Lead
- `**/lib/services/**` → Backend Lead
- `**/components/**` → Frontend Lead

### Par Taille de PR
- **< 100 lignes** : 1 reviewer
- **100-300 lignes** : 1-2 reviewers
- **> 300 lignes** : 2+ reviewers

## 🚨 Reviews Urgentes

Pour les PRs critiques (hotfixes, sécurité) :
- **Réponse attendue** : < 2 heures
- **Reviewers** : Lead Developer + Domain Expert
- **Processus** : Tag `urgent` dans le titre de la PR

## 📝 Template de Mention

Lors de la création d'une PR, mentionnez les reviewers appropriés :

```markdown
## Reviewers
- @backend-lead pour les changements API
- @frontend-lead pour les changements UI
- @security-team pour les changements de sécurité
```

## 🎓 Formation des Reviewers

Nouveaux reviewers :
1. **Shadowing** : Observer des reviews expérimentées
2. **Petites PRs** : Commencer par des PRs simples
3. **Feedback** : Recevoir du feedback sur leurs reviews
4. **Documentation** : Lire ce guide et les ressources

---

**Note** : Cette liste peut être adaptée selon l'équipe et les besoins du projet.---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.

