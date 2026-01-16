---
title: Guide  Extraire la Logique Métier des Composants React
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🏗️ Guide : Extraire la Logique Métier des Composants React

Ce document explique comment extraire la logique métier des composants React pour améliorer la maintenabilité, la testabilité et la réutilisabilité du code.

## 🎯 Objectif

Séparer la logique métier (business logic) de la logique de présentation (UI logic) pour :
- **Réutilisabilité** : La logique peut être réutilisée dans plusieurs composants
- **Testabilité** : Plus facile de tester la logique indépendamment de l'UI
- **Maintenabilité** : Code plus clair et organisé
- **Performance** : Optimisations plus faciles

## 📋 Principes

### 1. Séparation des Responsabilités

**Avant** (logique mélangée) :
```tsx
function StudentForm() {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(false)
  
  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Logique métier complexe ici
      const guardian = await createGuardian(...)
      const student = await createStudent(...)
      await linkGuardianToStudent(...)
      router.push(`/students/${student.id}`)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }
  
  return <form onSubmit={handleSubmit}>...</form>
}
```

**Après** (logique extraite) :
```tsx
function StudentForm() {
  const createStudentMutation = useCreateStudent()
  
  const handleSubmit = (data) => {
    createStudentMutation.mutate(data)
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <Button disabled={createStudentMutation.isPending}>
        Créer
      </Button>
    </form>
  )
}
```

### 2. Hooks Personnalisés pour la Logique Métier

Créez des hooks personnalisés qui encapsulent la logique métier :

```typescript
// lib/hooks/use-create-student.ts
export function useCreateStudent() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const trackConversion = useConversionTracking()

  return useMutation({
    mutationFn: async (data: StudentFormData) => {
      // Toute la logique métier ici
      // 1. Créer le tuteur
      // 2. Générer le numéro étudiant
      // 3. Créer l'étudiant
      // 4. Lier le tuteur
      // 5. Créer l'inscription
      return student
    },
    onSuccess: (student) => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      trackConversion('student_created')
      addToast({ type: 'success', title: 'Étudiant créé' })
      router.push(`/dashboard/students/${student.id}`)
    },
    onError: (error) => {
      addToast({ type: 'error', title: 'Erreur', description: error.message })
    },
  })
}
```

### 3. Services pour les Opérations Complexes

Pour les opérations très complexes, utilisez des services :

```typescript
// lib/services/student-creation.service.ts
export class StudentCreationService {
  async createStudentWithGuardian(
    data: StudentFormData,
    organizationId: string
  ): Promise<Student> {
    // 1. Créer le tuteur
    const guardian = await this.createGuardian(data, organizationId)
    
    // 2. Générer le numéro étudiant
    const studentNumber = await this.generateStudentNumber(organizationId)
    
    // 3. Créer l'étudiant
    const student = await this.createStudent(data, studentNumber, organizationId)
    
    // 4. Lier le tuteur
    await this.linkGuardian(student.id, guardian.id)
    
    // 5. Créer l'inscription si nécessaire
    if (data.class_id) {
      await this.createEnrollment(student.id, data.class_id)
    }
    
    return student
  }
  
  private async createGuardian(...) { ... }
  private async generateStudentNumber(...) { ... }
  private async createStudent(...) { ... }
  private async linkGuardian(...) { ... }
  private async createEnrollment(...) { ... }
}
```

## 🔄 Processus de Refactoring

### Étape 1 : Identifier la Logique Métier

Cherchez dans vos composants :
- ✅ Appels API complexes
- ✅ Transformations de données
- ✅ Validations métier
- ✅ Gestion d'état complexe
- ✅ Logique conditionnelle complexe

### Étape 2 : Extraire vers un Hook

1. Créez un nouveau fichier `lib/hooks/use-[feature].ts`
2. Déplacez la logique métier dans le hook
3. Retournez les valeurs et fonctions nécessaires
4. Utilisez `useMutation` ou `useQuery` selon le cas

### Étape 3 : Simplifier le Composant

1. Remplacez la logique par l'appel au hook
2. Utilisez les valeurs retournées par le hook
3. Gardez uniquement la logique UI dans le composant

### Étape 4 : Tester

1. Testez le hook indépendamment
2. Testez le composant avec le hook mocké
3. Vérifiez que tout fonctionne

## 📝 Exemples Concrets

### Exemple 1 : Création d'Étudiant

**Fichier** : `lib/hooks/use-create-student.ts`

```typescript
export function useCreateStudent() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const trackConversion = useConversionTracking()

  return useMutation({
    mutationFn: async (data: StudentFormData) => {
      if (!user?.organization_id) {
        throw new Error('Organization ID manquant')
      }

      // 1. Créer le tuteur
      const guardian = await createGuardian(data, user.organization_id)
      
      // 2. Générer le numéro étudiant
      const studentNumber = await generateStudentNumber(user.organization_id)
      
      // 3. Créer l'étudiant
      const student = await createStudent(data, studentNumber, user.organization_id)
      
      // 4. Lier le tuteur
      await linkGuardianToStudent(student.id, guardian.id)
      
      // 5. Créer l'inscription si nécessaire
      if (data.class_id) {
        await createEnrollment(student.id, data.class_id, data.enrollment_date)
      }

      return student
    },
    onSuccess: (student) => {
      queryClient.invalidateQueries({ queryKey: ['students', user?.organization_id] })
      trackConversion('student_created', { student_id: student.id })
      addToast({
        type: 'success',
        title: 'Étudiant créé',
        description: `${student.first_name} ${student.last_name} a été créé avec succès.`,
      })
      router.push(`/dashboard/students/${student.id}`)
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la création de l\'élève.',
      })
    },
  })
}
```

**Utilisation dans le composant** :
```tsx
function NewStudentPage() {
  const createStudentMutation = useCreateStudent()
  
  const onSubmit = (data: StudentFormData) => {
    createStudentMutation.mutate(data)
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Formulaire */}
      <Button disabled={createStudentMutation.isPending}>
        {createStudentMutation.isPending ? 'Création...' : 'Créer'}
      </Button>
    </form>
  )
}
```

### Exemple 2 : Gestion des Paiements

**Fichier** : `lib/hooks/use-payment.ts`

```typescript
export function useCreatePayment() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const paymentService = new PaymentService()

  return useMutation({
    mutationFn: async (data: PaymentFormData) => {
      return await paymentService.create({
        ...data,
        organization_id: user?.organization_id,
      })
    },
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['invoices', payment.invoice_id] })
      addToast({
        type: 'success',
        title: 'Paiement enregistré',
      })
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message,
      })
    },
  })
}
```

### Exemple 3 : Recherche Globale

**Fichier** : `lib/hooks/use-global-search.ts`

```typescript
export function useGlobalSearch(query: string) {
  const { user } = useAuth()
  const searchService = new SearchService()

  return useQuery({
    queryKey: ['global-search', query, user?.organization_id],
    queryFn: () => searchService.globalSearch(query, user?.organization_id!),
    enabled: !!query && query.length >= 2 && !!user?.organization_id,
    staleTime: 30000, // 30 secondes
  })
}
```

## 🎨 Patterns Recommandés

### 1. Hooks pour Mutations

```typescript
export function use[Action][Entity]() {
  // Dépendances
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  
  return useMutation({
    mutationFn: async (data) => {
      // Logique métier
    },
    onSuccess: (result) => {
      // Invalidation
      // Toast
      // Navigation
      // Analytics
    },
    onError: (error) => {
      // Gestion d'erreur
    },
  })
}
```

### 2. Hooks pour Queries

```typescript
export function use[Entity]s(filters?: Filters) {
  const { user } = useAuth()
  const service = new EntityService()
  
  return useQuery({
    queryKey: ['entities', user?.organization_id, filters],
    queryFn: () => service.getAll(user?.organization_id!, filters),
    enabled: !!user?.organization_id,
  })
}
```

### 3. Services pour Logique Complexe

```typescript
export class ComplexOperationService {
  async performOperation(data: Input): Promise<Output> {
    // Étape 1
    const step1 = await this.step1(data)
    
    // Étape 2
    const step2 = await this.step2(step1)
    
    // Étape 3
    return await this.step3(step2)
  }
  
  private async step1(data: Input) { ... }
  private async step2(data: Step1Output) { ... }
  private async step3(data: Step2Output) { ... }
}
```

## ✅ Checklist de Refactoring

Avant de refactorer un composant, vérifiez :

- [ ] Le composant contient plus de 200 lignes
- [ ] Il y a de la logique métier complexe (plus de 3 opérations)
- [ ] La logique pourrait être réutilisée ailleurs
- [ ] La logique est difficile à tester
- [ ] Il y a beaucoup de `useState` et `useEffect`

## 🚀 Avantages

### Avant Refactoring
- ❌ Composant de 800+ lignes
- ❌ Logique métier mélangée avec UI
- ❌ Difficile à tester
- ❌ Difficile à réutiliser
- ❌ Difficile à maintenir

### Après Refactoring
- ✅ Composant de 100-200 lignes
- ✅ Logique métier séparée
- ✅ Facile à tester (hook testable indépendamment)
- ✅ Réutilisable (hook utilisable ailleurs)
- ✅ Facile à maintenir (changements isolés)

## 📚 Ressources

- [React Hooks Documentation](https://react.dev/reference/react)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Custom Hooks Guide](https://react.dev/learn/reusing-logic-with-custom-hooks)

## 🔄 Prochaines Étapes

1. Identifier les composants à refactorer
2. Créer les hooks personnalisés
3. Migrer progressivement les composants
4. Ajouter des tests pour les hooks
5. Documenter les hooks créés

---

**Note** : Le refactoring doit être fait progressivement, un composant à la fois, en s'assurant que tout fonctionne avant de passer au suivant.---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.

