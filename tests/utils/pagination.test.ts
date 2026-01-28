/**
 * Tests unitaires pour les utilitaires de pagination
 */

import { describe, it, expect } from 'vitest'
import {
  calculatePaginationMeta,
  parsePaginationParams,
  calculateOffset,
  createPaginatedResponse,
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
