# Phase 3 - Performance & Optimisation

**Date**: 2026-01-12
**Durée estimée**: 2-3 semaines
**Status**: 🟡 En cours

---

## 🎯 Objectifs

1. **Optimiser dashboard** - Requêtes parallèles avec Promise.all
2. **Pagination** - Listes longues avec lazy loading
3. **Skeletons** - UX loading partout
4. **Virtualisation** - react-window pour 1000+ éléments
5. **Images** - Next.js Image, WebP/AVIF (40-60% réduction)

---

## 📊 Audit Initial - Dashboard Performance

### Fichier principal
- **Localisation**: `/app/(dashboard)/dashboard/page.tsx`
- **Taille**: 1861 lignes
- **Requêtes identifiées**: ~30 useQuery
- **Problème**: Requêtes séquentielles dans plusieurs composants

### Requêtes séquentielles détectées

#### AdminDashboard - Stats Query (ligne 506)
```typescript
// ❌ AVANT - Séquentiel (~5-8 secondes)
const stats = await supabase.from('students').select('*', { count: 'exact' })
const payments = await supabase.from('payments').select('*')
const overdueInvoices = await supabase.from('invoices').select('*')
const attendance = await supabase.from('attendance_records').select('*')
const teachersCount = await supabase.from('users').select('*', { count: 'exact' })
const activeSessionsCount = await supabase.from('sessions').select('*', { count: 'exact' })
// ... 8-12 requêtes séquentielles

// ✅ APRÈS - Parallèle (~1-2 secondes)
const [students, payments, overdueInvoices, attendance, teachers] = await Promise.all([
  supabase.from('students').select('*', { count: 'exact' }),
  supabase.from('payments').select('*'),
  supabase.from('invoices').select('*'),
  supabase.from('attendance_records').select('*'),
  supabase.from('users').select('*', { count: 'exact' }),
])
```

**Gain attendu**: 60-75% réduction temps chargement dashboard

---

## 🚀 Plan d'Action

### 1. Optimisation Dashboard (Semaine 1)

#### 1.1 AdminDashboard - Stats Query
**Fichier**: `app/(dashboard)/dashboard/page.tsx:506-676`

**Actions**:
- [ ] Identifier toutes les requêtes dans `stats` query
- [ ] Regrouper en Promise.all
- [ ] Mesurer performance avant/après
- [ ] Ajouter error handling avec Promise.allSettled si nécessaire

**Code cible**:
```typescript
const { data: stats, isLoading } = useQuery({
  queryKey: ['admin-dashboard-stats', organizationId],
  queryFn: async () => {
    const [
      studentsResult,
      paymentsResult,
      invoicesResult,
      attendanceResult,
      teachersResult,
      sessionsResult,
      formationsResult,
      programsResult
    ] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact' }),
      supabase.from('payments').select('*'),
      supabase.from('invoices').select('*').eq('status', 'overdue'),
      supabase.from('attendance_records').select('*'),
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('sessions').select('*', { count: 'exact', head: true }),
      supabase.from('formations').select('*', { count: 'exact, head: true }),
      supabase.from('programs').select('*', { count: 'exact', head: true })
    ])

    return {
      studentsCount: studentsResult.count || 0,
      totalRevenue: paymentsResult.data?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0,
      // ... processings
    }
  }
})
```

**Métriques**:
- Temps avant: ~5-8s
- Temps après: ~1-2s
- Gain: 60-75%

#### 1.2 RevenueData Query
**Fichier**: `app/(dashboard)/dashboard/page.tsx:676-765`

**Optimisation**:
```typescript
// ❌ AVANT
const { data: paymentsWithPaidAt } = await supabase...
const { data: paymentsWithoutPaidAt } = await supabase...

// ✅ APRÈS
const [paymentsWithPaidAt, paymentsWithoutPaidAt] = await Promise.all([
  supabase.from('payments').select('*').not('paid_at', 'is', null),
  supabase.from('payments').select('*').is('paid_at', null)
])
```

#### 1.3 TeacherDashboard
**Fichier**: `app/(dashboard)/dashboard/page.tsx:51-200`

**Actions**:
- [ ] Paralléliser sessions + students + attendance queries
- [ ] Utiliser useSuspenseQueries pour loading state

---

### 2. Pagination (Semaine 1-2)

#### 2.1 Identifier listes longues

**Fichiers à paginer**:
- `/app/(dashboard)/dashboard/students/page.tsx` - Liste étudiants
- `/app/(dashboard)/dashboard/sessions/page.tsx` - Liste sessions
- `/app/(dashboard)/dashboard/payments/page.tsx` - Liste paiements
- `/app/(dashboard)/dashboard/invoices/page.tsx` - Liste factures

**Pattern à implémenter**:
```typescript
// Utiliser Supabase pagination
const PAGE_SIZE = 50

const { data, count } = await supabase
  .from('students')
  .select('*', { count: 'exact' })
  .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
  .order('created_at', { ascending: false })

// UI avec shadcn/ui Pagination
<Pagination>
  <PaginationContent>
    <PaginationPrevious />
    <PaginationItem active={page === 1}>1</PaginationItem>
    <PaginationNext />
  </PaginationContent>
</Pagination>
```

#### 2.2 Infinite Scroll (optionnel)
Pour certaines listes (feed activités), utiliser `@tanstack/react-query` `useInfiniteQuery`:

```typescript
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['activities'],
  queryFn: ({ pageParam = 0 }) => fetchActivities(pageParam),
  getNextPageParam: (lastPage) => lastPage.nextCursor
})
```

---

### 3. Skeletons Loading (Semaine 2)

#### 3.1 Audit - Skeletons existants
**Fichiers existants**:
- `components/ui/skeleton.tsx` ✅ Déjà présent
- `StatsCardSkeleton` ✅ Utilisé
- `ChartSkeleton` ✅ Utilisé

#### 3.2 Créer skeletons manquants

**À créer**:
```typescript
// components/ui/skeleton.tsx
export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-12 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardGridSkeleton({ cards = 4 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: cards }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function ListSkeleton({ items = 10 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}
```

#### 3.3 Implémenter partout
```typescript
// Pattern avec React Query
const { data, isLoading } = useQuery(...)

if (isLoading) {
  return <TableSkeleton rows={10} columns={5} />
}

return <ActualTable data={data} />
```

---

### 4. Virtualisation (Semaine 2-3)

#### 4.1 Installer react-window
```bash
npm install react-window @types/react-window
```

#### 4.2 Créer composant virtualisé
```typescript
// components/virtualized-list.tsx
import { FixedSizeList } from 'react-window'

interface VirtualizedListProps<T> {
  items: T[]
  itemHeight: number
  height: number
  renderItem: (item: T, index: number) => React.ReactNode
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  height,
  renderItem
}: VirtualizedListProps<T>) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      {renderItem(items[index], index)}
    </div>
  )

  return (
    <FixedSizeList
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  )
}
```

#### 4.3 Appliquer sur listes longues
**Cibles**:
- Liste étudiants (1000+)
- Liste paiements
- Feed notifications
- Historique activités

**Seuil**: Activer virtualisation si >100 éléments

```typescript
// Usage
{students.length > 100 ? (
  <VirtualizedList
    items={students}
    itemHeight={72}
    height={600}
    renderItem={(student) => <StudentRow student={student} />}
  />
) : (
  students.map(student => <StudentRow key={student.id} student={student} />)
)}
```

---

### 5. Optimisation Images (Semaine 3)

#### 5.1 Next.js Image Component
**Remplacer tous les `<img>` par `<Image>`**:

```typescript
// ❌ AVANT
<img src="/logo.png" alt="Logo" width={200} height={100} />

// ✅ APRÈS
import Image from 'next/image'

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={100}
  priority // Pour images above-the-fold
  quality={90}
  placeholder="blur" // Optionnel avec blurDataURL
/>
```

**Bénéfices**:
- Lazy loading automatique
- Responsive automatique
- Optimisation format (WebP/AVIF) automatique
- Réduction 40-60% taille

#### 5.2 Optimiser images existantes
```bash
# Trouver toutes les images
find public -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \)

# Convertir en WebP avec Sharp (via Next.js Image)
# Automatique si next.config.js configuré
```

#### 5.3 Configuration Next.js
```javascript
// next.config.js
module.exports = {
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 an
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
}
```

#### 5.4 Audit images
**Fichiers à vérifier**:
```bash
grep -r "<img" app/ components/ --include="*.tsx" --include="*.jsx"
```

**Pattern de migration**:
- Avatar users: utiliser Next/Image avec `fill` + `object-fit: cover`
- Logos: utiliser `priority` + tailles fixes
- Images produits: lazy loading + placeholder blur
- Backgrounds: CSS avec `background-image` optimisé

---

## 📈 Métriques Cibles

### Performance

| Métrique | Avant | Après | Objectif |
|----------|-------|-------|----------|
| Dashboard load time | 5-8s | 1-2s | -60-75% |
| First Contentful Paint | 2.5s | <1s | -60% |
| Largest Contentful Paint | 4s | <2.5s | -37% |
| Time to Interactive | 6s | <3s | -50% |
| Total Blocking Time | 800ms | <300ms | -62% |
| Cumulative Layout Shift | 0.15 | <0.1 | -33% |

### Bundle Size

| Asset | Avant | Après | Gain |
|-------|-------|-------|------|
| Images PNG/JPG | 2.5 MB | 1 MB | -60% |
| JS Bundle | 850 KB | 750 KB | -12% |
| First Load JS | 350 KB | 300 KB | -14% |

### UX

| Indicateur | Avant | Après |
|------------|-------|-------|
| Skeletons coverage | 30% | 100% |
| Lists avec pagination | 20% | 100% |
| Images optimisées | 0% | 100% |
| Virtualisation >1000 items | Non | Oui |

---

## 🧪 Testing Performance

### Lighthouse CI
```bash
# Installer Lighthouse CI
npm install -D @lhci/cli

# Configurer
# lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/dashboard'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'first-contentful-paint': ['error', { maxNumericValue: 1000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
  },
}

# Lancer
npm run lhci autorun
```

### Bundle Analyzer
```bash
npm install -D @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  // config
})

# Analyser
ANALYZE=true npm run build
```

### Performance API
```typescript
// Mesurer temps de chargement
const startTime = performance.now()
const data = await fetchData()
const endTime = performance.now()
console.log(`Load time: ${endTime - startTime}ms`)

// Utiliser PerformanceObserver
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(entry.name, entry.duration)
  }
})
observer.observe({ entryTypes: ['measure'] })
```

---

## ✅ Checklist Phase 3

### Semaine 1
- [ ] Audit complet dashboard (requêtes, temps chargement)
- [ ] Implémenter Promise.all dans AdminDashboard stats
- [ ] Implémenter Promise.all dans RevenueData
- [ ] Implémenter Promise.all dans TeacherDashboard
- [ ] Mesurer gains performance (Lighthouse)
- [ ] Identifier toutes listes à paginer
- [ ] Implémenter pagination sur 3 listes principales

### Semaine 2
- [ ] Créer skeletons manquants (Table, CardGrid, List)
- [ ] Appliquer skeletons sur tous useQuery
- [ ] Installer react-window
- [ ] Créer composant VirtualizedList
- [ ] Appliquer sur liste étudiants
- [ ] Appliquer sur liste paiements
- [ ] Tests avec 1000+ items

### Semaine 3
- [ ] Audit tous `<img>` dans le projet
- [ ] Remplacer par Next/Image partout
- [ ] Configurer next.config.js pour images
- [ ] Optimiser images publiques
- [ ] Tests Lighthouse final
- [ ] Documentation optimisations
- [ ] PR + Review

---

## 📊 Monitoring Post-Déploiement

### Metrics à suivre
- **Core Web Vitals** (Real User Monitoring)
- **Bundle size** (CI/CD)
- **API response times** (Supabase metrics)
- **Client-side performance** (Sentry/Datadog)

### Alertes
- LCP > 2.5s → Alert
- FCP > 1.8s → Warning
- Bundle JS > 400 KB → Warning

---

**Dernière mise à jour**: 2026-01-12
**Responsable**: Équipe Dev EDUZEN
**Status**: 🟡 En cours
