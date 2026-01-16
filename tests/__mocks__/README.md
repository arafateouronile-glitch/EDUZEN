# Helper de Mock Supabase

Ce dossier contient des helpers réutilisables pour créer des mocks Supabase robustes dans les tests.

## Utilisation

### Helper Principal: `supabase-query-builder.ts`

```typescript
import { createMockSupabase, createMockStorageBucket, resetMockSupabase } from '@/tests/__mocks__/supabase-query-builder'

// Dans vi.hoisted()
const { mockSupabase, mockStorageBucket } = vi.hoisted(() => {
  const mockStorageBucket = createMockStorageBucket()
  const mockSupabase = createMockSupabase()
  mockSupabase.storage.from.mockReturnValue(mockStorageBucket as any)
  return { mockSupabase, mockStorageBucket }
})

// Dans beforeEach()
beforeEach(() => {
  vi.clearAllMocks()
  resetMockSupabase(mockSupabase)
  mockSupabase.storage.from.mockReturnValue(mockStorageBucket as any)
})
```

## Chaînages Supportés

Le helper gère automatiquement les chaînages Supabase suivants :

- ✅ `from().select().eq().single()`
- ✅ `from().select().eq().maybeSingle()`
- ✅ `from().select().eq().order().range()`
- ✅ `from().insert().select().single()`
- ✅ `from().delete().eq()`
- ✅ `from().update().eq()`

## Exemples d'Utilisation

### Exemple 1: Query avec single()

```typescript
// Mock: from('table').select('*').eq('id', '1').single()
const selectChain = mockSupabase.select()
selectChain.single.mockResolvedValueOnce({
  data: { id: '1', name: 'Test' },
  error: null,
})
```

### Exemple 2: Query avec range()

```typescript
// Mock: from('table').select('*').eq('org_id', 'org-1').order('created_at').range(0, 9)
const selectChain = mockSupabase.select()
selectChain.range.mockResolvedValueOnce({
  data: [...],
  error: null,
  count: 10,
})
```

### Exemple 3: Insert avec select().single()

```typescript
// Mock: from('table').insert(data).select().single()
const insertChain = mockSupabase.insert()
const selectResult = {
  single: vi.fn().mockResolvedValueOnce({
    data: { id: '1', ...data },
    error: null,
  }),
}
insertChain.select.mockReturnValueOnce(selectResult)
```

## Notes Importantes

1. **Nouvelle chaîne à chaque appel**: `select()` retourne une nouvelle chaîne à chaque appel pour éviter les conflits
2. **Réinitialisation**: Toujours appeler `resetMockSupabase()` dans `beforeEach()` après `vi.clearAllMocks()`
3. **Chaînages complexes**: Pour les chaînages avec plusieurs `eq()`, mocker le dernier maillon de la chaîne

## Problèmes Connus

- Les chaînages très complexes (ex: `select().eq().eq().order()`) nécessitent des mocks spécifiques
- Les tests de performance peuvent nécessiter des timeouts plus longs
