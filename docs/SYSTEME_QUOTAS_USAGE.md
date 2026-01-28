# Système de Quotas et d'Usage - Documentation

## Vue d'ensemble

Ce document décrit l'implémentation du système de quotas et d'usage pour gérer automatiquement les limites des forfaits (Starter, Pro, Enterprise) et garantir que chaque client paie pour la valeur qu'il consomme.

## Architecture

### 1. Modèle de Données

#### Table `plans`
Stocke les définitions des offres avec leurs limites et fonctionnalités.

**Colonnes principales :**
- `id` : UUID
- `name` : Nom du plan (Starter, Pro, Enterprise)
- `max_students` : Limite d'étudiants actifs (NULL = illimité)
- `max_sessions_per_month` : Limite de sessions mensuelles (NULL = illimité)
- `features` : JSONB avec les fonctionnalités disponibles
- `stripe_price_id` : ID du prix Stripe pour l'automatisation

#### Table `subscriptions`
Relie une organisation à un plan et suit l'état du paiement.

**Colonnes principales :**
- `id` : UUID
- `organization_id` : Référence à l'organisation
- `plan_id` : Référence au plan
- `status` : 'active', 'past_due', 'canceled', 'trialing'
- `stripe_customer_id` : ID client Stripe
- `stripe_subscription_id` : ID souscription Stripe

#### Vue `organization_usage`
Vue SQL qui calcule l'usage actuel en temps réel comparé aux limites du plan.

**Colonnes calculées :**
- `current_student_count` : Nombre d'étudiants actifs
- `current_sessions_count` : Nombre de sessions créées ce mois
- `max_students` : Limite du plan
- `max_sessions_per_month` : Limite mensuelle du plan

### 2. Fonctions SQL

#### `can_add_student(org_id uuid)`
Vérifie si une organisation peut ajouter un étudiant.

#### `can_create_session(org_id uuid)`
Vérifie si une organisation peut créer une session.

#### `get_organization_usage(org_id uuid)`
Retourne l'usage complet d'une organisation.

### 3. Service Quota (`quota.service.ts`)

Service TypeScript qui encapsule la logique de vérification des quotas :

```typescript
// Vérifier si on peut ajouter un étudiant
const result = await quotaService.canAddStudent(organizationId)
if (!result.allowed) {
  // Afficher le paywall
}

// Récupérer l'usage
const usage = await quotaService.getUsage(organizationId)

// Vérifier une fonctionnalité
const hasFeature = await quotaService.hasFeature(organizationId, 'bpf_export')
```

### 4. Composants UI

#### `UsageIndicator`
Affiche une barre de progression discrète dans la sidebar :
- Usage étudiants : "45/50 étudiants"
- Usage sessions : "12/20 sessions (mois)"
- Plan actuel

#### `PaywallModal`
Modal premium qui s'affiche quand une limite est atteinte :
- Message clair sur la limite atteinte
- Avantages du plan supérieur
- Bouton "Voir les plans" vers `/pricing`

### 5. Intégration dans les Services

Les vérifications de quota sont intégrées directement dans les services :

```typescript
// student.service.ts
async create(student) {
  // Vérifier les quotas
  const quotaCheck = await quotaService.canAddStudent(organizationId)
  if (!quotaCheck.allowed) {
    throw new AppError(ErrorCode.QUOTA_EXCEEDED, quotaCheck.reason)
  }
  // ... créer l'étudiant
}
```

### 6. Page de Pricing (`/pricing`)

Page avec tableau comparatif des plans :
- **Starter** : 79€ HT/mois (39€ pour fondateurs)
- **Pro** : 169€ HT/mois (84€ pour fondateurs) ⭐
- **Enterprise** : 349€ HT/mois (sur devis)

Avec toggle mensuel/annuel et mise en avant de l'offre fondateur (-50%).

### 7. Webhooks Stripe (`/api/webhooks/stripe`)

Automatisation complète via webhooks :

**Événements gérés :**
- `customer.subscription.created` : Création d'une souscription
- `customer.subscription.updated` : Mise à jour (changement de plan)
- `customer.subscription.deleted` : Annulation
- `invoice.payment_succeeded` : Paiement réussi → status = 'active'
- `invoice.payment_failed` : Échec → status = 'past_due'

## Flux Utilisateur

### Scénario 1 : Limite atteinte lors de la création d'un étudiant

1. Utilisateur clique sur "Ajouter un étudiant"
2. Service vérifie le quota : `quotaService.canAddStudent()`
3. Si limite atteinte :
   - Exception `QUOTA_EXCEEDED` levée
   - UI intercepte l'erreur
   - `PaywallModal` s'affiche avec :
     - Message : "Vous avez atteint la limite de 20 étudiants"
     - Avantages du plan Pro
     - Bouton "Voir les plans"
4. Utilisateur clique → Redirection vers `/pricing`

### Scénario 2 : Affichage préventif de l'usage

1. Utilisateur consulte le dashboard
2. `UsageIndicator` dans la sidebar affiche :
   - "18/20 étudiants" (barre de progression à 90%)
   - "5/5 sessions" (barre rouge, limite atteinte)
3. Utilisateur voit qu'il approche de la limite

### Scénario 3 : Changement de plan via Stripe

1. Utilisateur souscrit sur `/pricing`
2. Redirection vers Stripe Checkout
3. Paiement réussi
4. Webhook Stripe reçu
5. `subscriptions` table mise à jour automatiquement
6. Limites augmentées immédiatement

## Configuration

### Variables d'Environnement

```env
# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optionnel : Pour les tests
STRIPE_PUBLISHABLE_KEY=pk_...
```

### Configuration Stripe

1. Créer les produits et prix dans Stripe Dashboard
2. Récupérer les `price_id` et les ajouter dans la table `plans`
3. Configurer le webhook endpoint : `https://votre-domaine.com/api/webhooks/stripe`
4. Sélectionner les événements à écouter :
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

## Migration SQL

Exécuter la migration :
```bash
supabase db push
# ou
psql -f supabase/migrations/20260123000001_create_plans_and_subscriptions.sql
```

La migration crée :
- Tables `plans` et `subscriptions`
- Vue `organization_usage`
- Fonctions SQL de vérification
- Plans par défaut (Starter, Pro, Enterprise)
- RLS policies

## Tests

### Tester les quotas

```typescript
// Test création étudiant avec limite atteinte
const result = await quotaService.canAddStudent(organizationId)
expect(result.allowed).toBe(false)
expect(result.reason).toContain('Limite atteinte')
```

### Tester les webhooks

Utiliser Stripe CLI pour tester localement :
```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
stripe trigger customer.subscription.created
```

## Prochaines Étapes

1. **Intégration Stripe Checkout** : Créer les boutons de souscription
2. **Gestion des périodes d'essai** : Ajouter un plan "Trial" avec limite
3. **Notifications** : Alertes email quand approche de la limite
4. **Analytics** : Dashboard d'usage pour les admins
5. **Upgrade automatique** : Suggérer l'upgrade avant d'atteindre la limite

## Notes Techniques

- Les vérifications de quota sont **non-bloquantes** en cas d'erreur (autoriser par défaut)
- La vue `organization_usage` est **optimisée** avec des index
- Les fonctions SQL utilisent `SECURITY DEFINER` pour bypasser RLS si nécessaire
- Les webhooks sont **idempotents** (peuvent être rejoués sans effet de bord)
