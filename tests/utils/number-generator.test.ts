/**
 * Tests unitaires pour number-generator
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateUniqueNumber } from '@/lib/utils/number-generator'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('generateUniqueNumber', () => {
  let mockSupabaseClient: SupabaseClient

  beforeEach(() => {
    mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as unknown as SupabaseClient
  })

  it('devrait générer un numéro unique avec le format correct', async () => {
    const result = await generateUniqueNumber(
      mockSupabaseClient,
      'invoices',
      'org-1',
      {
        prefix: 'INV',
        orgCode: 'ORG',
      }
    )

    expect(result).toMatch(/^INV-ORG-\d{2}-\d{6}$/)
  })

  it('devrait utiliser l\'année actuelle par défaut', async () => {
    const currentYear = new Date().getFullYear().toString().slice(-2)
    const result = await generateUniqueNumber(
      mockSupabaseClient,
      'invoices',
      'org-1',
      {
        prefix: 'INV',
        orgCode: 'ORG',
      }
    )

    expect(result).toContain(`-${currentYear}-`)
  })

  it('devrait utiliser l\'année fournie si spécifiée', async () => {
    const result = await generateUniqueNumber(
      mockSupabaseClient,
      'invoices',
      'org-1',
      {
        prefix: 'INV',
        orgCode: 'ORG',
        year: '24',
      }
    )

    expect(result).toContain('-24-')
  })

  it('devrait incrémenter la séquence si un enregistrement existe', async () => {
    ;(mockSupabaseClient.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { number: 'INV-ORG-24-000001' },
        error: null,
      }),
    })

    const result = await generateUniqueNumber(
      mockSupabaseClient,
      'invoices',
      'org-1',
      {
        prefix: 'INV',
        orgCode: 'ORG',
        year: '24',
      }
    )

    expect(result).toBe('INV-ORG-24-000002')
  })

  it('devrait commencer à 1 si aucun enregistrement n\'existe', async () => {
    const result = await generateUniqueNumber(
      mockSupabaseClient,
      'invoices',
      'org-1',
      {
        prefix: 'INV',
        orgCode: 'ORG',
        year: '24',
      }
    )

    expect(result).toBe('INV-ORG-24-000001')
  })

  it('devrait utiliser un padding personnalisé', async () => {
    const result = await generateUniqueNumber(
      mockSupabaseClient,
      'invoices',
      'org-1',
      {
        prefix: 'INV',
        orgCode: 'ORG',
        padding: 4,
      }
    )

    expect(result).toMatch(/-\d{4}$/)
  })

  it('devrait utiliser un nom de champ personnalisé', async () => {
    await generateUniqueNumber(
      mockSupabaseClient,
      'students',
      'org-1',
      {
        prefix: 'STU',
        orgCode: 'ORG',
        fieldName: 'student_number',
      }
    )

    expect((mockSupabaseClient.from as any).mock.calls[0][0]).toBe('students')
  })

  it('devrait gérer les erreurs de table inexistante', async () => {
    ;(mockSupabaseClient.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Table does not exist' },
      }),
    })

    // Devrait quand même générer un numéro
    const result = await generateUniqueNumber(
      mockSupabaseClient,
      'invoices',
      'org-1',
      {
        prefix: 'INV',
        orgCode: 'ORG',
      }
    )

    expect(result).toMatch(/^INV-ORG-\d{2}-\d{6}$/)
  })
})
