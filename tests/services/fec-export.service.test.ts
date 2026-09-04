/**
 * Tests unitaires pour FECExportService (réduction services sans tests)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FECExportService } from '@/lib/services/fec-export.service'

const thenable = { data: [] as unknown[], error: null }
const chain = {
  select: () => chain,
  eq: () => chain,
  in: () => chain,
  order: () => chain,
  gte: () => chain,
  lte: () => chain,
  then(r: (v: typeof thenable) => void) {
    r(thenable)
    return { catch: () => chain }
  },
}

const mockSupabase = { from: () => chain }

const invoiceRow = {
  id: 'inv-1',
  invoice_number: 'FAC-2026-001',
  issue_date: '2026-03-01',
  created_at: '2026-03-01T10:00:00Z',
  document_type: 'invoice',
  amount: 1000,
  tax_amount: 200,
  total_amount: 1200,
  currency: 'EUR',
  students: { id: 'stu-1', first_name: 'Ada', last_name: 'Lovelace', student_number: 'STU-42' },
  external_entities: null,
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  thenable.data = []
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}))

describe('FECExportService', () => {
  describe('generateFEC', () => {
    it('retourne le fichier FEC avec en-tête uniquement quand aucune écriture', async () => {
      const service = new FECExportService()
      const result = await service.generateFEC({
        organizationId: 'org-1',
      })

      expect(result).toContain('JournalCode')
      expect(result).toContain('JournalLib')
      expect(result.split('\n').length).toBe(1)
    })

    it('modèle "fec_legal" (défaut) : séparateur | avec ligne d\'en-tête', async () => {
      thenable.data = [invoiceRow]
      const service = new FECExportService()
      const result = await service.generateFEC({ organizationId: 'org-1' })
      const lines = result.split('\n')

      expect(lines[0]).toBe(
        'JournalCode|JournalLib|EcritureNum|EcritureDate|CompteNum|CompteLib|CompAuxNum|CompAuxLib|PieceRef|PieceDate|EcritureLib|Debit|Credit|EcritureLet|DateLet|ValidDate|Montantdevise|Idevise'
      )
      // 3 lignes d'écriture (411/701/445) + 1 en-tête
      expect(lines).toHaveLength(4)
      expect(lines[1]).toContain('411000')
      expect(lines[1].split('|')[0]).toBe('VT')
    })

    it('modèle "fulll_custom" : séparateur ; sans ligne d\'en-tête', async () => {
      thenable.data = [invoiceRow]
      const service = new FECExportService()
      const result = await service.generateFEC({ organizationId: 'org-1', model: 'fulll_custom' })
      const lines = result.split('\n')

      expect(lines).toHaveLength(3) // pas d'en-tête, 3 lignes d'écriture
      expect(lines[0]).not.toContain('JournalCode')
      expect(lines[0]).toContain(';')
      expect(lines[0].split(';')[0]).toBe('VT')
    })

    it('un modèle inconnu retombe sur le FEC légal par défaut', async () => {
      thenable.data = [invoiceRow]
      const service = new FECExportService()
      // @ts-expect-error valeur volontairement invalide pour tester le fallback
      const result = await service.generateFEC({ organizationId: 'org-1', model: 'not-a-model' })
      expect(result.split('\n')[0]).toContain('JournalCode|JournalLib')
    })
  })

  describe('generateFECFilename', () => {
    it('préfixe FEC_ et extension .txt par défaut', () => {
      const service = new FECExportService()
      const name = service.generateFECFilename('org-12345678')
      expect(name).toMatch(/^FEC_org-1234_\d{6}\.txt$/)
    })

    it('préfixe FULLL_ et extension .csv pour le modèle fulll_custom', () => {
      const service = new FECExportService()
      const name = service.generateFECFilename('org-12345678', { model: 'fulll_custom' })
      expect(name).toMatch(/^FULLL_org-1234_\d{6}\.csv$/)
    })
  })
})
