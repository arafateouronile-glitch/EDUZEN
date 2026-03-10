/**
 * Tests unitaires pour APIService
 * Couverture : génération/vérification clés API, création clé (audit P1-10)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIService } from '@/lib/services/api.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

function createMockSupabase(chainResult: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(chainResult),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(chainResult),
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>
}

describe('APIService', () => {
  let service: APIService
  let mockSupabase: SupabaseClient<Database>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('devrait lever si le client Supabase est absent', () => {
      expect(() => new APIService(null as unknown as SupabaseClient<Database>)).toThrow(/requires a Supabase client/)
    })
  })

  describe('generateAPIKey', () => {
    it('devrait retourner une clé avec préfixe eduz_, hash et prefix', () => {
      mockSupabase = createMockSupabase({ data: null, error: null })
      service = new APIService(mockSupabase)
      const result = service.generateAPIKey()
      expect(result.key).toMatch(/^eduz_[a-f0-9]+$/)
      expect(result.key.length).toBeGreaterThan(50)
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/)
      expect(result.prefix).toMatch(/^eduz_[a-f0-9]+\.\.\.$/)
    })

    it('devrait produire des clés différentes à chaque appel', () => {
      mockSupabase = createMockSupabase({ data: null, error: null })
      service = new APIService(mockSupabase)
      const a = service.generateAPIKey()
      const b = service.generateAPIKey()
      expect(a.key).not.toBe(b.key)
      expect(a.hash).not.toBe(b.hash)
    })
  })

  describe('verifyAPIKey', () => {
    it('devrait retourner null si aucune clé ne correspond', async () => {
      mockSupabase = createMockSupabase({ data: null, error: null })
      service = new APIService(mockSupabase)
      const result = await service.verifyAPIKey('eduz_abcdef1234567890')
      expect(result).toBeNull()
      expect(mockSupabase.from).toHaveBeenCalledWith('api_keys')
    })

    it('devrait retourner la clé si hash et is_active correspondent', async () => {
      const mockKey = { id: 'key-1', key_hash: 'abc', organization_id: 'org-1', is_active: true }
      mockSupabase = createMockSupabase({ data: mockKey, error: null })
      service = new APIService(mockSupabase)
      const result = await service.verifyAPIKey('eduz_abcdef1234567890')
      expect(result).toEqual(mockKey)
    })

    it('devrait propager l’erreur Supabase', async () => {
      mockSupabase = createMockSupabase({ data: null, error: { message: 'DB error', code: '500' } })
      service = new APIService(mockSupabase)
      await expect(service.verifyAPIKey('eduz_abc')).rejects.toEqual({ message: 'DB error', code: '500' })
    })
  })
})
