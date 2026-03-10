/**
 * Tests unitaires pour ImportService (audit P2 - priorité MOYENNE)
 * Couverture : detectColumnMapping (vide, colonnes reconnues)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ImportService } from '@/lib/services/import.service'
import type { SupabaseClient } from '@supabase/supabase-js'

function createMockSupabase() {
  return { from: vi.fn() } as unknown as SupabaseClient
}

describe('ImportService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('detectColumnMapping', () => {
    it('retourne un tableau vide quand aucun header', () => {
      const service = new ImportService(createMockSupabase())
      const result = service.detectColumnMapping([])
      expect(result).toEqual([])
    })

    it('retourne un tableau vide pour des headers non reconnus', () => {
      const service = new ImportService(createMockSupabase())
      const result = service.detectColumnMapping(['ColonneX', 'XYZ'])
      expect(result).toEqual([])
    })

    it('detecte le mapping pour email', () => {
      const service = new ImportService(createMockSupabase())
      const result = service.detectColumnMapping(['email'])
      expect(result).toHaveLength(1)
      expect(result[0].sourceColumn).toBe('email')
      expect(result[0].targetField).toBe('email')
      expect(result[0].confidence).toBeGreaterThan(0.7)
    })

    it('detecte le mapping pour plusieurs champs (email, prenom)', () => {
      const service = new ImportService(createMockSupabase())
      const result = service.detectColumnMapping(['email', 'prenom'])
      expect(result).toHaveLength(2)
      const byTarget = Object.fromEntries(result.map((r) => [r.targetField, r.sourceColumn]))
      expect(byTarget.email).toBe('email')
      expect(byTarget.first_name).toBe('prenom')
    })
  })
})
