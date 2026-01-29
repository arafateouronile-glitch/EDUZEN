/**
 * Tests unitaires pour lib/utils/supabase-helpers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAllByOrganization, getById } from '@/lib/utils/supabase-helpers'
import { AppError, ErrorCode } from '@/lib/errors'

vi.mock('@/lib/errors', () => ({
  errorHandler: {
    handleError: vi.fn((err: Error & { code?: string }, ctx: unknown) => {
      if (ctx && typeof ctx === 'object' && 'code' in ctx && (ctx as { code: string }).code === ErrorCode.DB_NOT_FOUND) {
        return new AppError('Not found', (ctx as { code: ErrorCode }).code, 'low' as any, ctx)
      }
      return new AppError(err.message || 'Database error', 'SYS_6001' as any, 'high' as any, ctx)
    }),
    createDatabaseError: vi.fn((msg: string, ctx: unknown) =>
      new AppError(msg, ErrorCode.DB_NOT_FOUND, 'medium' as any, ctx)
    ),
  },
  AppError: class AppError extends Error {
    code: string
    constructor(message: string, code: string, _severity: unknown, _ctx?: unknown) {
      super(message)
      this.name = 'AppError'
      this.code = code
    }
  },
  ErrorCode: { DB_NOT_FOUND: 'DB_NOT_FOUND' },
}))

describe('supabase-helpers', () => {
  const createMockSupabase = () => {
    const chain: any = {
      from: vi.fn(),
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      ilike: vi.fn(),
      single: vi.fn(),
    }
    chain.from.mockReturnValue(chain)
    chain.select.mockReturnValue(chain)
    chain.eq.mockReturnValue(chain)
    chain.order.mockReturnValue(chain)
    chain.ilike.mockReturnValue(chain)
    chain.single.mockReturnValue(chain)
    return chain
  }

  describe('getAllByOrganization', () => {
    it('devrait retourner les enregistrements sans options', async () => {
      const mockSupabase = createMockSupabase()
      const data = [{ id: '1', organization_id: 'org-1', name: 'Item' }]
      mockSupabase.order.mockResolvedValueOnce({ data, error: null })

      const result = await getAllByOrganization(mockSupabase, 'items', 'org-1')

      expect(result).toEqual(data)
      expect(mockSupabase.from).toHaveBeenCalledWith('items')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', 'org-1')
    })

    it('devrait appliquer select, filters, search et orderBy', async () => {
      const mockSupabase = createMockSupabase()
      const data = [{ id: '1', name: 'Test' }]
      mockSupabase.order.mockResolvedValueOnce({ data, error: null })

      await getAllByOrganization(mockSupabase, 'items', 'org-1', {
        select: 'id, name',
        filters: { status: 'active' },
        search: { field: 'name', value: 'test' },
        orderBy: { column: 'name', ascending: true },
      })

      expect(mockSupabase.select).toHaveBeenCalledWith('id, name')
      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', 'org-1')
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'active')
      expect(mockSupabase.ilike).toHaveBeenCalledWith('name', '%test%')
      expect(mockSupabase.order).toHaveBeenCalledWith('name', { ascending: true })
    })

    it('devrait lever en cas d\'erreur Supabase', async () => {
      const mockSupabase = createMockSupabase()
      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: { message: 'Connection failed' },
      })

      await expect(getAllByOrganization(mockSupabase, 'items', 'org-1')).rejects.toThrow()
    })

    it('devrait retourner un tableau vide si data est null', async () => {
      const mockSupabase = createMockSupabase()
      mockSupabase.order.mockResolvedValueOnce({ data: null, error: null })

      const result = await getAllByOrganization(mockSupabase, 'items', 'org-1')

      expect(result).toEqual([])
    })
  })

  describe('getById', () => {
    it('devrait retourner l\'enregistrement par ID', async () => {
      const mockSupabase = createMockSupabase()
      const row = { id: 'id-1', organization_id: 'org-1', name: 'Item' }
      mockSupabase.single.mockResolvedValueOnce({ data: row, error: null })

      const result = await getById(mockSupabase, 'items', 'id-1')

      expect(result).toEqual(row)
      expect(mockSupabase.from).toHaveBeenCalledWith('items')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'id-1')
    })

    it('devrait accepter un select personnalisé', async () => {
      const mockSupabase = createMockSupabase()
      const row = { id: 'id-1', name: 'Item' }
      mockSupabase.single.mockResolvedValueOnce({ data: row, error: null })

      await getById(mockSupabase, 'items', 'id-1', 'id, name')

      expect(mockSupabase.select).toHaveBeenCalledWith('id, name')
    })

    it('devrait lever AppError si PGRST116 (not found)', async () => {
      const mockSupabase = createMockSupabase()
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows' },
      })

      await expect(getById(mockSupabase, 'items', 'missing')).rejects.toThrow(AppError)
    })

    it('devrait lever si data est null sans code not found', async () => {
      const mockSupabase = createMockSupabase()
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      await expect(getById(mockSupabase, 'items', 'id-1')).rejects.toThrow()
    })
  })
})
