/**
 * Tests unitaires pour DocumentTemplateService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DocumentTemplateService } from '@/lib/services/document-template.service'
import type { SupabaseClient } from '@supabase/supabase-js'

const mockConvertTemplateContent = vi.fn((t: unknown) => t)
vi.mock('@/lib/utils/document-generation/template-converter', () => ({
  convertTemplateContent: (template: unknown) => mockConvertTemplateContent(template),
}))

const mockTemplateSecurityService = {
  hasPermission: vi.fn().mockResolvedValue(true),
  logAudit: vi.fn().mockResolvedValue(undefined),
  isTemplateEncrypted: vi.fn().mockResolvedValue(false),
  decryptTemplate: vi.fn(),
}
vi.mock('@/lib/services/template-collaboration.service', () => ({
  TemplateCollaborationService: class {
    constructor() {}
  },
}))
vi.mock('@/lib/services/template-security.service', () => ({
  TemplateSecurityService: class {
    hasPermission = mockTemplateSecurityService.hasPermission
    logAudit = mockTemplateSecurityService.logAudit
    isTemplateEncrypted = mockTemplateSecurityService.isTemplateEncrypted
    decryptTemplate = mockTemplateSecurityService.decryptTemplate
  },
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
  sanitizeError: (e: unknown) => (e && typeof e === 'object' && 'message' in e ? { message: (e as { message: string }).message } : {}),
}))

describe('DocumentTemplateService', () => {
  let service: DocumentTemplateService
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockConvertTemplateContent.mockImplementation((t: unknown) => t)
    mockTemplateSecurityService.hasPermission.mockResolvedValue(true)
    mockTemplateSecurityService.logAudit.mockResolvedValue(undefined)
    mockTemplateSecurityService.isTemplateEncrypted.mockResolvedValue(false)

    mockSupabase = {
      from: vi.fn(),
    }
    service = new DocumentTemplateService(mockSupabase as SupabaseClient)
  })

  describe('getAllTemplates', () => {
    it('devrait retourner la liste des templates avec conversion', async () => {
      const mockTemplates = [
        { id: 'tpl-1', organization_id: 'org-1', type: 'attestation', name: 'Attestation', is_active: true },
      ]
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTemplates, error: null }),
      }
      mockSupabase.from.mockReturnValue(chain)

      const result = await service.getAllTemplates('org-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('document_templates')
      expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1')
      expect(result).toHaveLength(1)
      expect(mockConvertTemplateContent).toHaveBeenCalledWith(mockTemplates[0])
    })

    it('devrait appliquer le filtre type quand fourni', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabase.from.mockReturnValue(chain)

      await service.getAllTemplates('org-1', { type: 'certificate' })

      expect(chain.eq).toHaveBeenCalledWith('type', 'certificate')
    })

    it('devrait propager l\'erreur si la requête échoue', async () => {
      const err = { message: 'DB error', code: 'PGRST_ERROR' }
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: err }),
      }
      mockSupabase.from.mockReturnValue(chain)

      await expect(service.getAllTemplates('org-1')).rejects.toEqual(err)
    })
  })

  describe('getTemplateById', () => {
    it('devrait retourner le template sans userId (pas de vérification permission)', async () => {
      const mockTemplate = { id: 'tpl-1', organization_id: 'org-1', name: 'Test', header: null, content: {}, footer: null }
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
      }
      mockSupabase.from.mockReturnValue(chain)
      mockTemplateSecurityService.isTemplateEncrypted.mockResolvedValue(false)

      const result = await service.getTemplateById('tpl-1')

      expect(result).toEqual(mockTemplate)
      expect(mockTemplateSecurityService.hasPermission).not.toHaveBeenCalled()
      expect(mockConvertTemplateContent).toHaveBeenCalledWith(mockTemplate)
    })

    it('devrait propager l\'erreur si single échoue', async () => {
      const err = { message: 'Not found', code: 'PGRST116' }
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: err }),
      }
      mockSupabase.from.mockReturnValue(chain)

      await expect(service.getTemplateById('tpl-1')).rejects.toEqual(err)
    })
  })

  describe('getTemplatesByType', () => {
    it('devrait retourner les templates du type demandé', async () => {
      const mockTemplates = [
        { id: 'tpl-1', organization_id: 'org-1', type: 'attestation', is_active: true },
      ]
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      }
      chain.order = vi.fn().mockReturnValueOnce(chain).mockResolvedValueOnce({ data: mockTemplates, error: null })
      mockSupabase.from.mockReturnValue(chain)

      const result = await service.getTemplatesByType('attestation', 'org-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('document_templates')
      expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1')
      expect(chain.eq).toHaveBeenCalledWith('type', 'attestation')
      expect(chain.eq).toHaveBeenCalledWith('is_active', true)
      expect(result).toHaveLength(1)
    })

    it('devrait propager l\'erreur si la requête échoue', async () => {
      const err = { message: 'DB error', code: 'PGRST_ERROR' }
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      }
      chain.order = vi.fn().mockReturnValueOnce(chain).mockResolvedValueOnce({ data: null, error: err })
      mockSupabase.from.mockReturnValue(chain)

      await expect(service.getTemplatesByType('attestation', 'org-1')).rejects.toEqual(err)
    })
  })

  describe('getDefaultTemplate', () => {
    it('devrait retourner le template par défaut si trouvé', async () => {
      const mockTemplate = { id: 'tpl-1', organization_id: 'org-1', type: 'attestation', is_default: true, is_active: true, header: null, content: {}, footer: null }
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
      }
      mockSupabase.from.mockReturnValue(chain)
      mockTemplateSecurityService.isTemplateEncrypted.mockResolvedValue(false)

      const result = await service.getDefaultTemplate('org-1', 'attestation')

      expect(result).toEqual(mockTemplate)
      expect(chain.eq).toHaveBeenCalledWith('is_default', true)
    })

    it('devrait retourner null si aucun template par défaut', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabase.from.mockReturnValue(chain)

      const result = await service.getDefaultTemplate('org-1', 'attestation')

      expect(result).toBeNull()
    })

    it('devrait propager l\'erreur si la requête échoue', async () => {
      const err = { message: 'DB error', code: 'PGRST_ERROR' }
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: err }),
      }
      mockSupabase.from.mockReturnValue(chain)

      await expect(service.getDefaultTemplate('org-1', 'attestation')).rejects.toEqual(err)
    })
  })
})
