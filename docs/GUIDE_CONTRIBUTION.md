---
title: Guide de Contribution EDUZEN
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🤝 Guide de Contribution EDUZEN

Bienvenue ! Ce guide vous aidera à contribuer efficacement au projet EDUZEN.

## 📋 Table des matières

1. [Configuration de l'environnement](#configuration-de-lenvironnement)
2. [Structure du projet](#structure-du-projet)
3. [Conventions de code](#conventions-de-code)
4. [Workflow de développement](#workflow-de-développement)
5. [Tests](#tests)
6. [Pull Requests](#pull-requests)

---

## ⚙️ Configuration de l'environnement

### Prérequis

- Node.js 18+
- npm ou yarn
- Git
- Compte Supabase (pour le développement local)

### Installation

```bash
# Cloner le repository
git clone https://github.com/votre-org/eduzen.git
cd eduzen

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec vos clés

# Lancer le serveur de développement
npm run dev
```

### VSCode Extensions recommandées

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Import Sorter
- GitLens

---

## 📁 Structure du projet

```
eduzen/
├── app/                          # Routes Next.js (App Router)
│   ├── (dashboard)/             # Routes admin authentifiées
│   │   └── dashboard/           # Pages du tableau de bord
│   ├── (learner)/               # Espace apprenant (sans auth)
│   ├── (parent)/                # Portail parents
│   ├── api/                     # API Routes
│   └── auth/                    # Authentification
├── components/                   # Composants React
│   ├── ui/                      # Composants UI (shadcn/ui)
│   ├── dashboard/               # Composants dashboard
│   └── [feature]/               # Composants par fonctionnalité
├── lib/                         # Logique métier
│   ├── services/                # Services Supabase (~90+)
│   ├── hooks/                   # Hooks React
│   ├── contexts/                # Contextes React
│   ├── utils/                   # Utilitaires
│   └── types/                   # Types TypeScript
├── supabase/                    # Configuration Supabase
│   └── migrations/              # Migrations SQL
└── tests/                       # Tests
```

---

## 📝 Conventions de code

### TypeScript

```typescript
// ✅ BON : Types explicites
interface StudentData {
  id: string
  firstName: string
  lastName: string
  email: string
}

async function getStudent(id: string): Promise<StudentData | null> {
  // ...
}

// ❌ MAUVAIS : any ou types implicites
async function getStudent(id) {
  // ...
}
```

### React Components

```tsx
// ✅ BON : Composant fonctionnel avec types
interface StudentCardProps {
  student: StudentData
  onEdit: (id: string) => void
}

export function StudentCard({ student, onEdit }: StudentCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{student.firstName} {student.lastName}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{student.email}</p>
        <Button onClick={() => onEdit(student.id)}>Modifier</Button>
      </CardContent>
    </Card>
  )
}

// ❌ MAUVAIS : Props non typées, class component
class StudentCard extends Component {
  render() {
    return <div>{this.props.student.name}</div>
  }
}
```

### Services

```typescript
// ✅ BON : Service avec gestion d'erreur
export class StudentService {
  private supabase = createClient()

  async getById(id: string): Promise<Student | null> {
    const { data, error } = await this.supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async create(data: CreateStudentInput): Promise<Student> {
    const { data: student, error } = await this.supabase
      .from('students')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return student
  }
}

export const studentService = new StudentService()
```

### Hooks avec React Query

```typescript
// ✅ BON : Hook avec React Query
export function useStudents(sessionId: string) {
  return useQuery({
    queryKey: ['students', sessionId],
    queryFn: () => studentService.getBySession(sessionId),
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useCreateStudent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: studentService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })
}
```

### Nommage

| Type | Convention | Exemple |
|------|------------|---------|
| Fichiers React | kebab-case | `student-card.tsx` |
| Composants | PascalCase | `StudentCard` |
| Services | camelCase | `studentService` |
| Types/Interfaces | PascalCase | `StudentData` |
| Constantes | UPPER_SNAKE | `MAX_FILE_SIZE` |
| CSS Classes | kebab-case | `student-card-header` |

---

## 🔄 Workflow de développement

### 1. Créer une branche

```bash
# Depuis main
git checkout main
git pull origin main

# Créer une branche feature
git checkout -b feature/ma-fonctionnalite

# Ou pour un bugfix
git checkout -b fix/description-du-bug
```

### 2. Développer

- Écrire le code
- Ajouter des tests si nécessaire
- Vérifier le lint : `npm run lint`
- Vérifier les types : `npm run type-check`

### 3. Commits

Format des messages de commit :

```
type(scope): description courte

[corps optionnel]

[footer optionnel]
```

Types :
- `feat` : Nouvelle fonctionnalité
- `fix` : Correction de bug
- `docs` : Documentation
- `style` : Formatage (pas de changement de logique)
- `refactor` : Refactoring
- `test` : Tests
- `chore` : Maintenance

Exemples :
```bash
git commit -m "feat(messaging): ajouter pièces jointes aux messages"
git commit -m "fix(auth): corriger la redirection après login"
git commit -m "docs(readme): mettre à jour les instructions d'installation"
```

### 4. Push et Pull Request

```bash
git push origin feature/ma-fonctionnalite
```

Puis créer une PR sur GitHub.

---

## 🧪 Tests

### Lancer les tests

```bash
# Tous les tests
npm run test

# Tests en mode watch
npm run test:watch

# Coverage
npm run test:coverage
```

### Écrire des tests

```typescript
// tests/services/student.service.test.ts
import { describe, it, expect, vi } from 'vitest'
import { studentService } from '@/lib/services/student.service'

describe('StudentService', () => {
  describe('getById', () => {
    it('should return a student when found', async () => {
      const student = await studentService.getById('valid-id')
      expect(student).toBeDefined()
      expect(student?.id).toBe('valid-id')
    })

    it('should return null when not found', async () => {
      const student = await studentService.getById('invalid-id')
      expect(student).toBeNull()
    })
  })
})
```

### Tests de composants

```typescript
// tests/components/student-card.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { StudentCard } from '@/components/students/student-card'

describe('StudentCard', () => {
  const mockStudent = {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com'
  }

  it('should display student name', () => {
    render(<StudentCard student={mockStudent} onEdit={() => {}} />)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('should call onEdit when button clicked', () => {
    const onEdit = vi.fn()
    render(<StudentCard student={mockStudent} onEdit={onEdit} />)
    
    fireEvent.click(screen.getByText('Modifier'))
    expect(onEdit).toHaveBeenCalledWith('1')
  })
})
```

---

## 📤 Pull Requests

### Checklist avant PR

- [ ] Le code compile sans erreur
- [ ] Le lint passe (`npm run lint`)
- [ ] Les tests passent (`npm run test`)
- [ ] Les nouvelles fonctionnalités sont testées
- [ ] La documentation est à jour si nécessaire
- [ ] Les console.log de debug sont supprimés

### Template de PR

```markdown
## Description

[Description courte des changements]

## Type de changement

- [ ] Nouvelle fonctionnalité
- [ ] Correction de bug
- [ ] Refactoring
- [ ] Documentation
- [ ] Autre : ___

## Comment tester

1. [Étape 1]
2. [Étape 2]
3. [Résultat attendu]

## Screenshots (si applicable)

[Captures d'écran]

## Checklist

- [ ] Le code suit les conventions du projet
- [ ] J'ai testé mes changements
- [ ] J'ai mis à jour la documentation si nécessaire
```

### Review

- Répondre aux commentaires de review
- Faire les modifications demandées
- Marquer les conversations comme résolues
- Demander une re-review si nécessaire

---

## 🔧 Scripts utiles

```bash
# Développement
npm run dev              # Lancer le serveur de dev
npm run build            # Build de production
npm run start            # Lancer le build

# Qualité
npm run lint             # Vérifier le lint
npm run lint:fix         # Corriger le lint auto
npm run type-check       # Vérifier les types

# Tests
npm run test             # Lancer les tests
npm run test:watch       # Tests en mode watch
npm run test:coverage    # Coverage

# Base de données
npx supabase db push     # Appliquer les migrations
npx supabase db diff     # Voir les différences
npx supabase gen types   # Générer les types
```

---

## 🆘 Besoin d'aide ?

- **Questions** : Ouvrir une issue avec le tag `question`
- **Bugs** : Ouvrir une issue avec le tag `bug`
- **Features** : Ouvrir une issue avec le tag `enhancement`
- **Discussions** : Utiliser les GitHub Discussions

---

**Merci de contribuer à EDUZEN ! 🎉**---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.