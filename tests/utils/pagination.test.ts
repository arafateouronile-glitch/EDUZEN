/**
 * Tests unitaires pour les utilitaires de pagination
 */

import { describe, it, expect } from 'vitest'
import {
  calculatePaginationMeta,
  parsePaginationParams,
  calculateOffset,
  createPaginatedResponse,
  paginateQuery,
  type PaginationParams,
  type PaginatedResponse,
} from '@/lib/utils/pagination'

describe('calculatePaginationMeta', () => {
  it('devrait calculer les métadonnées de pagination correctement', () => {
    const meta = calculatePaginationMeta(1, 20, 100)

    expect(meta).toEqual({
      page: 1,
      pageSize: 20,
      total: 100,
      totalPages: 5,
      hasNextPage: true,
      hasPreviousPage: false,
    })
  })

  it('devrait indiquer hasNextPage: false sur la dernière page', () => {
    const meta = calculatePaginationMeta(5, 20, 100)

    expect(meta.hasNextPage).toBe(false)
    expect(meta.hasPreviousPage).toBe(true)
  })

  it('devrait gérer les totaux qui ne sont pas des multiples de pageSize', () => {
    const meta = calculatePaginationMeta(1, 20, 95)

    expect(meta.totalPages).toBe(5) // Math.ceil(95/20) = 5
    expect(meta.hasNextPage).toBe(true)
  })

  it('devrait gérer page = 1 correctement', () => {
    const meta = calculatePaginationMeta(1, 20, 50)

    expect(meta.hasPreviousPage).toBe(false)
    expect(meta.hasNextPage).toBe(true)
  })

  it('devrait gérer total = 0', () => {
    const meta = calculatePaginationMeta(1, 20, 0)

    expect(meta.totalPages).toBe(0)
    expect(meta.hasNextPage).toBe(false)
    expect(meta.hasPreviousPage).toBe(false)
  })
})

describe('parsePaginationParams', () => {
  it('devrait parser les paramètres depuis un objet PaginationParams', () => {
    const params: PaginationParams = { page: 2, pageSize: 30 }
    const result = parsePaginationParams(params)

    expect(result).toEqual({ page: 2, pageSize: 30 })
  })

  it('devrait parser les paramètres depuis URLSearchParams', () => {
    const params = new URLSearchParams('page=3&pageSize=25')
    const result = parsePaginationParams(params)

    expect(result).toEqual({ page: 3, pageSize: 25 })
  })

  it('devrait utiliser les valeurs par défaut si les paramètres sont manquants', () => {
    const params = new URLSearchParams()
    const result = parsePaginationParams(params)

    expect(result).toEqual({ page: 1, pageSize: 20 })
  })

  it('devrait convertir les chaînes en nombres', () => {
    const params = new URLSearchParams('page=5&pageSize=50')
    const result = parsePaginationParams(params)

    expect(result.page).toBe(5)
    expect(result.pageSize).toBe(50)
    expect(typeof result.page).toBe('number')
    expect(typeof result.pageSize).toBe('number')
  })

  it('devrait gérer les valeurs invalides en utilisant les défauts', () => {
    const params = new URLSearchParams('page=invalid&pageSize=abc')
    const result = parsePaginationParams(params)

    expect(result).toEqual({ page: 1, pageSize: 20 })
  })

  it('devrait parser depuis un objet Record', () => {
    const params: Record<string, string | number> = {
      page: '2',
      pageSize: 30,
    }
    const result = parsePaginationParams(params)

    expect(result).toEqual({ page: 2, pageSize: 30 })
  })

  it('devrait utiliser défauts pour page/pageSize 0 ou invalides (objet avec page et pageSize)', () => {
    expect(parsePaginationParams({ page: 0, pageSize: 20 })).toEqual({ page: 1, pageSize: 20 })
    expect(parsePaginationParams({ page: 1, pageSize: 0 })).toEqual({ page: 1, pageSize: 20 })
    expect(parsePaginationParams({ page: NaN, pageSize: 30 })).toEqual({ page: 1, pageSize: 30 })
  })

  it('devrait retourner les défauts si l\'objet n\'a ni page ni pageSize', () => {
    const result = parsePaginationParams({})
    expect(result).toEqual({ page: 1, pageSize: 20 })
  })

  it('devrait retourner les défauts pour un objet avec d\'autres clés uniquement', () => {
    const result = parsePaginationParams({ foo: 'bar', limit: 10 } as any)
    expect(result).toEqual({ page: 1, pageSize: 20 })
  })
})

describe('calculateOffset', () => {
  it('devrait calculer l\'offset correctement pour la page 1', () => {
    expect(calculateOffset(1, 20)).toBe(0)
  })

  it('devrait calculer l\'offset correctement pour la page 2', () => {
    expect(calculateOffset(2, 20)).toBe(20)
  })

  it('devrait calculer l\'offset correctement pour la page 3', () => {
    expect(calculateOffset(3, 20)).toBe(40)
  })

  it('devrait gérer différents pageSize', () => {
    expect(calculateOffset(2, 10)).toBe(10)
    expect(calculateOffset(2, 50)).toBe(50)
  })
})

describe('createPaginatedResponse', () => {
  it('devrait créer une réponse paginée correctement', () => {
    const data = ['item1', 'item2', 'item3']
    const result = createPaginatedResponse(data, 1, 20, 100)

    expect(result.data).toEqual(data)
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 100,
      totalPages: 5,
      hasNextPage: true,
      hasPreviousPage: false,
    })
  })

  it('devrait gérer une page vide', () => {
    const data: string[] = []
    const result = createPaginatedResponse(data, 1, 20, 0)

    expect(result.data).toEqual([])
    expect(result.pagination.total).toBe(0)
    expect(result.pagination.totalPages).toBe(0)
  })

  it('devrait calculer hasNextPage et hasPreviousPage correctement', () => {
    const data = ['item1', 'item2']
    const result = createPaginatedResponse(data, 2, 20, 50)

    expect(result.pagination.page).toBe(2)
    expect(result.pagination.hasNextPage).toBe(true)
    expect(result.pagination.hasPreviousPage).toBe(true)
  })
})

describe('paginateQuery', () => {
  it('devrait paginer une requête et retourner une réponse paginée', async () => {
    const items = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }]
    const orderChain = {
      order: () => ({
        range: () => Promise.resolve({ data: items, error: null }),
      }),
    }
    const queryBuilder = { order: () => orderChain.order() }
    const countQuery = async () => ({ count: 42, error: null })

    const result = await paginateQuery(
      queryBuilder as any,
      { page: 1, pageSize: 20 },
      countQuery
    )

    expect(result.data).toEqual(items)
    expect(result.pagination.page).toBe(1)
    expect(result.pagination.pageSize).toBe(20)
    expect(result.pagination.total).toBe(42)
    expect(result.pagination.totalPages).toBe(3)
  })

  it('devrait utiliser total 0 si countQuery non fourni', async () => {
    const items: any[] = []
    const queryBuilder = {
      order: () => ({
        range: () => Promise.resolve({ data: items, error: null }),
      }),
    }

    const result = await paginateQuery(queryBuilder as any, { page: 1, pageSize: 20 })

    expect(result.data).toEqual([])
    expect(result.pagination.total).toBe(0)
    expect(result.pagination.totalPages).toBe(0)
  })

  it('devrait utiliser total 0 si countQuery retourne count null ou 0', async () => {
    const queryBuilder = {
      order: () => ({
        range: () => Promise.resolve({ data: [], error: null }),
      }),
    }
    const countNull = async () => ({ count: null, error: null })
    const countZero = async () => ({ count: 0, error: null })

    const r1 = await paginateQuery(queryBuilder as any, { page: 1, pageSize: 20 }, countNull)
    expect(r1.pagination.total).toBe(0)

    const r2 = await paginateQuery(queryBuilder as any, { page: 1, pageSize: 20 }, countZero)
    expect(r2.pagination.total).toBe(0)
  })

  it('devrait utiliser data [] si range retourne data null', async () => {
    const queryBuilder = {
      order: () => ({
        range: () => Promise.resolve({ data: null, error: null }),
      }),
    }

    const result = await paginateQuery(queryBuilder as any, { page: 1, pageSize: 20 })

    expect(result.data).toEqual([])
    expect(result.pagination.total).toBe(0)
  })

  it('devrait propager l\'erreur du countQuery', async () => {
    const countError = new Error('Count failed')
    const countQuery = async () => ({ count: null, error: countError })
    const queryBuilder = {
      order: () => ({
        range: () => Promise.resolve({ data: [], error: null }),
      }),
    }

    await expect(
      paginateQuery(queryBuilder as any, { page: 1, pageSize: 20 }, countQuery)
    ).rejects.toThrow('Count failed')
  })

  it('devrait propager l\'erreur de la requête range', async () => {
    const rangeError = new Error('Range failed')
    const queryBuilder = {
      order: () => ({
        range: () => Promise.resolve({ data: null, error: rangeError }),
      }),
    }

    await expect(
      paginateQuery(queryBuilder as any, { page: 1, pageSize: 20 })
    ).rejects.toThrow('Range failed')
  })

  it('devrait calculer from/to correctement pour page 2', async () => {
    let rangeFrom: number | null = null
    let rangeTo: number | null = null
    const queryBuilder = {
      order: () => ({
        range: (from: number, to: number) => {
          rangeFrom = from
          rangeTo = to
          return Promise.resolve({ data: [], error: null })
        },
      }),
    }

    await paginateQuery(queryBuilder as any, { page: 2, pageSize: 10 })

    expect(rangeFrom).toBe(10)
    expect(rangeTo).toBe(19)
  })
})
