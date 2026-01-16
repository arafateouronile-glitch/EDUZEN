---
title: Architecture  Décisions Techniques - EDUZEN
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🏗️ Architecture & Décisions Techniques - EDUZEN

Documentation des décisions architecturales et des patterns utilisés dans l'application EDUZEN.

## 📐 Vue d'ensemble

EDUZEN est une application Next.js 14+ (App Router) avec Supabase comme backend (BaaS), construite avec TypeScript et React.

### Stack Technique

- **Frontend** : Next.js 14+ (App Router), React 18, TypeScript
- **Backend** : Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Styling** : Tailwind CSS, Framer Motion
- **State Management** : TanStack Query (React Query)
- **Formulaires** : React Hook Form + Zod
- **UI Components** : Radix UI + composants personnalisés
- **Monitoring** : Sentry, Plausible Analytics, Google Analytics
- **Tests** : Vitest (unit), Playwright (E2E)

## 🎯 Principes Architecturaux

### 1. Separation of Concerns

- **Services** : Logique métier dans `lib/services/`
- **Hooks** : Logique réutilisable dans `lib/hooks/`
- **Components** : UI pure dans `components/`
- **Pages** : Orchestration dans `app/`

### 2. Type Safety

- TypeScript strict mode activé
- Types générés depuis Supabase (`types/database.types.ts`)
- Validation runtime avec Zod pour les formulaires

### 3. Performance First

- Server-side rendering (SSR) par défaut
- Lazy loading des composants lourds
- Pagination côté serveur
- Optimisation des images (Next.js Image)
- Compression automatique (gzip/brotli)

### 4. Security by Default

- RLS (Row Level Security) sur toutes les tables
- Rate limiting sur les endpoints critiques
- Validation des webhooks (HMAC)
- Headers de sécurité (CSP, HSTS, etc.)

## 📁 Structure du Projet

```
EDUZEN/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # Routes dashboard (layout partagé)
│   ├── (learner)/         # Routes apprenant (layout partagé)
│   ├── (portal)/         # Routes portail public
│   ├── api/               # API Routes
│   ├── auth/              # Routes d'authentification
│   └── layout.tsx         # Layout racine
├── components/            # Composants React réutilisables
│   ├── ui/               # Composants UI de base
│   ├── dashboard/        # Composants spécifiques dashboard
│   └── messaging/        # Composants de messagerie
├── lib/                  # Code partagé
│   ├── services/         # Services métier (classes)
│   ├── hooks/           # Hooks React personnalisés
│   ├── utils/           # Utilitaires
│   ├── errors/          # Gestion d'erreurs
│   ├── supabase/        # Configuration Supabase
│   └── types/           # Types TypeScript
├── supabase/            # Migrations et scripts Supabase
│   └── migrations/      # Migrations SQL
├── tests/               # Tests unitaires et intégration
├── e2e/                 # Tests E2E (Playwright)
└── docs/                # Documentation
```

## 🔧 Patterns Utilisés

### 1. Service Layer Pattern

Tous les services suivent le pattern de classe :

```typescript
export class StudentService {
  private supabase = createClient()

  async getAll(organizationId: string, filters?: {...}) {
    // Logique métier
  }

  async getById(id: string) {
    // Logique métier
  }

  async create(student: FlexibleInsert<'students'>) {
    // Validation + création
  }
}
```

**Avantages** :
- Encapsulation de la logique métier
- Réutilisabilité
- Testabilité
- Cohérence

### 2. React Query pour le State Management

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['students', organizationId],
  queryFn: () => studentService.getAll(organizationId),
  staleTime: 30000, // Cache 30 secondes
})
```

**Avantages** :
- Cache automatique
- Synchronisation serveur
- Gestion des états de chargement/erreur
- Optimistic updates

### 3. RLS (Row Level Security) pour l'Autorisation

Toutes les tables ont des politiques RLS qui vérifient :
- `organization_id` pour l'isolation multi-tenant
- `user_id` pour l'accès utilisateur
- Rôles pour les permissions

**Exemple** :
```sql
CREATE POLICY "Users can view their organization's students"
ON students FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));
```

### 4. Error Handling Centralisé

```typescript
import { errorHandler, ErrorCode } from '@/lib/errors'

try {
  // Opération
} catch (error) {
  throw errorHandler.handleError(error, {
    operation: 'create',
    context: {...}
  })
}
```

**Avantages** :
- Messages d'erreur cohérents
- Logging centralisé
- Types d'erreurs standardisés

### 5. Validation avec Zod

```typescript
const studentSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional(),
})

type StudentFormData = z.infer<typeof studentSchema>
```

**Avantages** :
- Validation côté client et serveur
- Type safety
- Messages d'erreur clairs

## 🔐 Sécurité

### 1. Authentification

- Supabase Auth avec JWT
- Sessions gérées via cookies HTTP-only
- Refresh tokens automatiques

### 2. Autorisation

- RLS policies sur toutes les tables
- Vérification des rôles dans le middleware
- Guards de composants (`RoleGuard`)

### 3. Rate Limiting

- Endpoints critiques protégés
- Limites configurables par endpoint
- Tracking par IP/user

### 4. Webhooks

- Validation HMAC des signatures
- Protection replay attack (timestamp + nonce)
- Whitelist IP pour CRON

## 📊 Performance

### 1. Optimisations Frontend

- **Lazy Loading** : Composants lourds chargés à la demande
- **Code Splitting** : Automatique avec Next.js
- **Image Optimization** : Formats modernes (AVIF, WebP)
- **Skeleton Loading** : États de chargement visuels

### 2. Optimisations Backend

- **Pagination** : Toutes les listes sont paginées
- **Batch Queries** : Requêtes groupées pour éviter N+1
- **Indexes** : Index sur colonnes fréquemment queryées
- **Caching** : React Query cache + stale time

### 3. Monitoring

- Performance Monitor : Tracking des temps d'exécution
- Sentry : Erreurs et performance
- Analytics : Plausible + Google Analytics

## 🗄️ Base de Données

### 1. Schéma Multi-Tenant

Toutes les tables ont `organization_id` pour l'isolation :

```sql
CREATE TABLE students (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  -- ...
);
```

### 2. Soft Deletes

Utilisation de `is_deleted` ou `deleted_at` plutôt que DELETE :

```sql
UPDATE students SET is_deleted = true WHERE id = ?
```

### 3. Timestamps Automatiques

```sql
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW()
```

### 4. Generated Columns

Pour les calculs automatiques :

```sql
percentage NUMERIC GENERATED ALWAYS AS (
  CASE WHEN max_score > 0 THEN (score::NUMERIC / max_score::NUMERIC) * 100
  ELSE NULL END
) STORED
```

## 🔄 Gestion d'État

### 1. Server State (React Query)

- Données serveur : `useQuery`, `useMutation`
- Cache automatique
- Synchronisation en arrière-plan

### 2. Client State (React)

- État local : `useState`
- État partagé : `useContext` (ex: `useAuth`)
- Persistence : `useLocalStorage`

## 🧪 Tests

### 1. Unit Tests (Vitest)

- Services
- Utilitaires
- Hooks

### 2. Integration Tests (Vitest)

- Workflows complets
- Interactions API

### 3. E2E Tests (Playwright)

- Parcours utilisateur
- Scénarios critiques

## 📝 Décisions Clés

### 1. Pourquoi Next.js App Router ?

- **SSR par défaut** : Meilleure performance et SEO
- **Server Components** : Réduction du bundle client
- **API Routes intégrées** : Pas besoin d'un backend séparé
- **Optimisations automatiques** : Images, fonts, etc.

### 2. Pourquoi Supabase ?

- **BaaS complet** : Auth, DB, Storage, Realtime
- **PostgreSQL** : Base de données robuste et flexible
- **RLS** : Sécurité au niveau de la base
- **TypeScript** : Types générés automatiquement

### 3. Pourquoi TanStack Query ?

- **Cache intelligent** : Réduit les requêtes inutiles
- **Optimistic updates** : Meilleure UX
- **DevTools** : Debugging facilité
- **Écosystème** : Intégration avec React

### 4. Pourquoi Classes pour les Services ?

- **Encapsulation** : Logique métier isolée
- **Réutilisabilité** : Facile à tester et réutiliser
- **Cohérence** : Pattern uniforme dans toute l'app

### 5. Pourquoi RLS plutôt que Middleware ?

- **Sécurité au niveau DB** : Impossible de bypasser
- **Multi-tenant natif** : Isolation garantie
- **Performance** : Filtrage côté DB

## 🚀 Évolutions Futures

### Court Terme

- [ ] Cache Redis pour les requêtes fréquentes
- [ ] CDN pour les assets statiques
- [ ] WebSockets pour notifications temps réel

### Moyen Terme

- [ ] Internationalisation (i18n)
- [ ] PWA complète
- [ ] Mobile app (React Native)

### Long Terme

- [ ] Microservices si nécessaire
- [ ] GraphQL API optionnelle
- [ ] Machine Learning pour recommandations

## 📚 Ressources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [TanStack Query Documentation](https://tanstack.com/query)
- [React Documentation](https://react.dev)

## 🤝 Contribution

Lors de l'ajout de nouvelles fonctionnalités :

1. Suivre les patterns existants
2. Documenter les décisions importantes
3. Ajouter des tests
4. Mettre à jour cette documentation si nécessaire---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.

