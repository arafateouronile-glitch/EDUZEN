# Sécurité & Rétention - Documentation

## Vue d'ensemble

Ce document décrit l'implémentation des mécanismes de sécurité anti-impayés et des fonctionnalités de rétention pour éviter le churn.

## 1. Sécurité RLS Anti-Impayés

### Principe

Les politiques RLS (Row Level Security) bloquent automatiquement toutes les opérations d'écriture (INSERT, UPDATE) si l'abonnement Stripe n'est pas actif.

### Fonctions SQL

#### `is_subscription_active(org_id uuid)`
Vérifie si l'abonnement d'une organisation est actif.

**Logique :**
- Retourne `true` si `status = 'active'`
- Retourne `true` si pas d'abonnement (période d'essai ou plan free)
- Retourne `false` si `status = 'past_due'` ou `'canceled'`

#### `get_user_organization_id()`
Récupère l'organization_id de l'utilisateur actuellement authentifié.

### Tables Protégées

Les politiques RLS sont appliquées sur :
- `students` : Bloque la création/modification d'étudiants
- `sessions` : Bloque la création/modification de sessions
- `programs` : Bloque la création/modification de programmes
- `formations` : Bloque la création/modification de formations
- `documents` : Bloque la création/modification de documents
- `invoices` : Bloque la création/modification de factures
- `enrollments` : Bloque la création/modification d'inscriptions

### Message d'Erreur

Quand une écriture est bloquée, l'utilisateur reçoit :
```
"Votre abonnement n'est pas actif. Veuillez régulariser votre paiement pour continuer à utiliser EDUZEN."
```

### Migration

Exécuter la migration :
```bash
supabase db push
# ou
psql -f supabase/migrations/20260123000002_rls_anti_impayes.sql
```

## 2. Score de Conformité Qualiopi

### Composant `QualiopiComplianceScore`

Affiche en permanence le score de conformité Qualiopi sur le dashboard pour renforcer la valeur perçue.

**Fonctionnalités :**
- Score en temps réel (0-100%)
- Barre de progression visuelle
- Statut : Excellent (≥90%), Bon (≥70%), À améliorer (≥50%), Action requise (<50%)
- Détails des indicateurs (expandable)
- Messages motivationnels selon le score
- Lien vers le dashboard Qualiopi complet

**Emplacement :**
- Dashboard principal (`/dashboard`)
- Toujours visible (sauf pour les enseignants)

**Calcul du Score :**
```typescript
const compliantCount = indicators.filter(
  ind => ind.status === 'compliant' || ind.status === 'in_progress'
).length
const score = (compliantCount / indicators.length) * 100
```

### Impact sur la Rétention

Un score élevé (≥90%) montre à l'utilisateur que :
1. EDUZEN l'aide à maintenir sa conformité Qualiopi
2. Il est proche de la certification
3. La plateforme apporte une valeur réelle

**Message pour score ≥90% :**
> 🎉 Excellent ! Votre organisme est en parfaite conformité Qualiopi.

## 3. Base de Connaissances Contextuelle

### Service `KnowledgeBaseService`

Service pour gérer les articles de la base de connaissances.

**Fonctionnalités :**
- `getArticlesForPage(pagePath)` : Récupère les articles liés à une page
- `searchArticles(query)` : Recherche par mots-clés
- `getCategories()` : Liste des catégories

### Composant `ContextualFAQ`

Affiche automatiquement les articles pertinents selon la page visitée.

**Fonctionnalités :**
- Détection automatique de la page actuelle
- Affichage des 3 articles les plus pertinents
- Expansion pour voir tous les articles
- Liens vers les articles complets
- Design discret et non-intrusif

**Exemples d'articles par page :**

| Page | Articles |
|------|----------|
| `/dashboard/documents/generate` | "Comment déclarer mes heures stagiaires dans le BPF ?"<br>"Quelles sont les informations obligatoires dans un BPF ?" |
| `/dashboard/qualiopi` | "Comment améliorer mon score Qualiopi ?" |
| `/dashboard/students/new` | "Comment importer mes stagiaires en masse ?" |

### Composant `ContextualFAQLink`

Lien compact affichant le nombre d'articles disponibles pour une page.

**Usage :**
```tsx
<ContextualFAQLink pagePath="/dashboard/documents/generate" />
// Affiche : "2 articles disponibles"
```

### Structure de la Base de Données

#### Table `knowledge_base_categories`
- `id` : UUID
- `name` : Nom de la catégorie
- `description` : Description
- `icon` : Icône (optionnel)

#### Table `knowledge_base_articles`
- `id` : UUID
- `title` : Titre de l'article
- `content` : Contenu (markdown ou HTML)
- `excerpt` : Résumé
- `category_id` : Référence à la catégorie
- `tags` : Tableau de tags
- `related_pages` : Tableau de routes liées (ex: `['/dashboard/documents/generate']`)
- `is_published` : Boolean

**Index pour performances :**
- Index GIN sur `related_pages` pour recherche rapide
- Index GIN sur `tags` pour recherche par tags
- Index full-text search sur `title` et `content`

### Migration

Exécuter la migration :
```bash
supabase db push
# ou
psql -f supabase/migrations/20260123000003_knowledge_base.sql
```

La migration crée :
- Tables `knowledge_base_categories` et `knowledge_base_articles`
- Catégories par défaut (Documents, Qualiopi, Stagiaires, etc.)
- Articles d'exemple
- RLS policies (lecture publique, écriture admin uniquement)

## 4. Intégration dans les Pages

### Dashboard Principal

Le score Qualiopi est affiché en permanence :
```tsx
<QualiopiComplianceScore />
```

### Pages avec FAQ Contextuelle

Les pages suivantes affichent automatiquement les FAQ pertinentes :
- `/dashboard/documents/generate` : Articles sur le BPF
- `/dashboard/qualiopi` : Articles sur Qualiopi
- `/dashboard/students/new` : Articles sur l'import

```tsx
<ContextualFAQ />
```

## 5. Stratégie de Rétention

### 1. Score Qualiopi Visible
- **Objectif** : Montrer la valeur ajoutée
- **Impact** : Client voit qu'il est à 100% grâce à EDUZEN
- **Résultat** : Ne partira jamais car dépendant de la plateforme

### 2. Support Contextuel
- **Objectif** : Réduire la frustration
- **Impact** : Réponses immédiates aux questions
- **Résultat** : Moins de tickets support, meilleure expérience

### 3. Blocage Anti-Impayés
- **Objectif** : Protéger les revenus
- **Impact** : Incite au paiement sans bloquer la lecture
- **Résultat** : Récupération automatique des impayés

## 6. Configuration

### Variables d'Environnement

Aucune variable supplémentaire requise. Les politiques RLS utilisent les données existantes de `subscriptions`.

### Permissions

Les politiques RLS sont automatiquement appliquées. Aucune configuration supplémentaire nécessaire.

## 7. Tests

### Tester les RLS Anti-Impayés

1. Créer une souscription avec `status = 'past_due'`
2. Essayer de créer un étudiant
3. Vérifier que l'erreur est levée

### Tester le Score Qualiopi

```typescript
const score = await qualiopiService.calculateComplianceRate(organizationId)
expect(score).toBeGreaterThanOrEqual(0)
expect(score).toBeLessThanOrEqual(100)
```

### Tester la Base de Connaissances

```typescript
const articles = await knowledgeBaseService.getArticlesForPage('/dashboard/documents/generate')
expect(articles.length).toBeGreaterThan(0)
```

## 8. Prochaines Étapes

1. **Analytics de Rétention** : Suivre le taux de churn par score Qualiopi
2. **Notifications Proactives** : Alertes quand le score baisse
3. **Gamification** : Badges pour score élevé
4. **Articles Dynamiques** : Génération automatique d'articles depuis les données
5. **Recherche Avancée** : Recherche full-text dans la base de connaissances

## Notes Techniques

- Les politiques RLS sont **non-bloquantes pour la lecture** (SELECT toujours autorisé)
- Le score Qualiopi est **mis en cache** et rafraîchi toutes les minutes
- La base de connaissances utilise des **index GIN** pour performances optimales
- Les articles sont **cachés par défaut** si pas de correspondance (pas de pollution UI)
