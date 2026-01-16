/**
 * Helper pour créer des mocks Supabase robustes avec gestion complète des chaînages
 * 
 * Usage:
 * ```typescript
 * import { createMockSupabase } from '@/tests/__mocks__/supabase-query-builder'
 * 
 * const mockSupabase = createMockSupabase()
 * 
 * // Mock une requête: from -> select -> eq -> single
 * mockSupabase.single.mockResolvedValueOnce({ data: {...}, error: null })
 * 
 * // Mock une requête: from -> select -> eq -> order -> range
 * mockSupabase.range.mockResolvedValueOnce({ data: [...], error: null, count: 10 })
 * ```
 */

import { vi } from 'vitest'

export interface MockSupabaseQueryBuilder {
  from: ReturnType<typeof vi.fn>
  select: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
    in: ReturnType<typeof vi.fn>
    is: ReturnType<typeof vi.fn>
    single: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  upsert: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
    limit: ReturnType<typeof vi.fn>
    range: ReturnType<typeof vi.fn>
    rpc: ReturnType<typeof vi.fn>
    storage: {
    from: ReturnType<typeof vi.fn>
  }
}

/**
 * Crée un mock Supabase avec gestion complète des chaînages
 * 
 * Toutes les méthodes sont chainables (retournent le mock lui-même)
 * sauf single(), maybeSingle(), et range() qui retournent des promesses
 */
export function createMockSupabase(): MockSupabaseQueryBuilder {
  const mock: any = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    is: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    range: vi.fn(),
    rpc: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  }

  // Toutes les méthodes chainables retournent le mock lui-même
  // Cela permet: mock.from('table').select('*').eq('id', '1')
  const chainableMethods = [
    'from',
    'select',
    'eq',
    'in',
    'is',
    'insert',
    'update',
    'upsert',
    'delete',
    'order',
    'limit',
    'rpc',
  ]

  // Utiliser mockImplementation pour que cela persiste même après mockClear()
  chainableMethods.forEach((method) => {
    mock[method].mockImplementation(() => mock)
  })

  // single(), maybeSingle(), et range() retournent des promesses
  // Elles seront mockées avec mockResolvedValueOnce dans les tests
  // Par défaut, elles retournent une promesse qui résout avec { data: null, error: null }
  mock.single.mockImplementation(() => Promise.resolve({ data: null, error: null }))
  mock.maybeSingle.mockImplementation(() => Promise.resolve({ data: null, error: null }))
  mock.range.mockImplementation(() => Promise.resolve({ data: [], error: null, count: 0 }))

  return mock as MockSupabaseQueryBuilder
}

/**
 * Réinitialise tous les mocks et rétablit le chaînage
 * À appeler dans beforeEach() après vi.clearAllMocks()
 */
export function resetMockSupabase(mock: MockSupabaseQueryBuilder): void {
  const chainableMethods = [
    'from',
    'select',
    'eq',
    'in',
    'is',
    'like',
    'insert',
    'update',
    'upsert',
    'delete',
    'order',
    'limit',
    'rpc',
  ]

  // Utiliser mockImplementation pour que cela persiste même après mockClear()
  chainableMethods.forEach((method) => {
    ;(mock as any)[method].mockImplementation(() => mock)
  })
  
  // Réinitialiser single(), maybeSingle(), et range()
  ;(mock as any).single.mockImplementation(() => Promise.resolve({ data: null, error: null }))
  ;(mock as any).maybeSingle.mockImplementation(() => Promise.resolve({ data: null, error: null }))
  ;(mock as any).range.mockImplementation(() => Promise.resolve({ data: [], error: null, count: 0 }))
}

/**
 * Crée un mock de storage bucket
 */
export function createMockStorageBucket() {
  return {
    upload: vi.fn(),
    remove: vi.fn(),
    getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'http://example.com/file.pdf' } })),
    download: vi.fn(),
    list: vi.fn(),
    move: vi.fn(),
    copy: vi.fn(),
    createSignedUrl: vi.fn(),
    createSignedUrls: vi.fn(),
  }
}
