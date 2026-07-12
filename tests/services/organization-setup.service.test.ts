/**
 * Tests unitaires pour OrganizationSetupService (réduction services sans tests)
 * Couverture : initializeNewOrg avec mocks des dépendances
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/services/document-template.service.client', () => ({
  documentTemplateService: {
    getDefaultTemplate: vi.fn().mockResolvedValue(null),
    createTemplate: vi.fn().mockResolvedValue({}),
  },
}))
// Les fichiers .client.ts (importés par organization-setup.service.ts) font
// `export const xxxService = new XxxService(createClient())` au chargement du
// module : la classe mockée doit donc renvoyer la même instance stubée que
// celle exportée directement, sinon xxxService se retrouve vide au runtime.
vi.mock('@/lib/services/qualiopi.service', () => {
  const instance = { initializeIndicators: vi.fn().mockResolvedValue(undefined) }
  return { qualiopiService: instance, QualiopiService: vi.fn(function () { return instance }) }
})
vi.mock('@/lib/services/session.service', () => {
  const instance = { createSession: vi.fn().mockResolvedValue({}) }
  return { sessionService: instance, SessionService: vi.fn(function () { return instance }) }
})
vi.mock('@/lib/services/program.service', () => {
  const instance = { createProgram: vi.fn().mockResolvedValue({ id: 'prog-1' }) }
  return { programService: instance, ProgramService: vi.fn(function () { return instance }) }
})
vi.mock('@/lib/services/formation.service', () => {
  const instance = { createFormation: vi.fn().mockResolvedValue({ id: 'form-1' }) }
  return { formationService: instance, FormationService: vi.fn(function () { return instance }) }
})

import { createClient } from '@/lib/supabase/client'
import { OrganizationSetupService } from '@/lib/services/organization-setup.service'

function createMockSupabase() {
  const selectChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { settings: {} }, error: null }),
  }
  const updateChain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
  }
  const from = vi.fn((table: string) => {
    if (table === 'organizations') {
      return { ...selectChain, update: () => updateChain }
    }
    return selectChain
  })
  return { from } as unknown as SupabaseClient<any>
}

describe('OrganizationSetupService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const mockSupabase = createMockSupabase()
    vi.mocked(createClient).mockReturnValue(mockSupabase)
  })

  describe('initializeNewOrg', () => {
    it('termine sans erreur avec config minimale (dépendances mockées)', async () => {
      const mockSupabase = createMockSupabase()
      const service = new OrganizationSetupService(mockSupabase)

      await expect(
        service.initializeNewOrg({
          organizationId: 'org-1',
          userId: 'user-1',
        })
      ).resolves.toBeUndefined()
    })

    it('termine sans erreur avec primaryColor et logoUrl', async () => {
      const mockSupabase = createMockSupabase()
      const service = new OrganizationSetupService(mockSupabase)

      await expect(
        service.initializeNewOrg({
          organizationId: 'org-2',
          userId: 'user-2',
          primaryColor: '#0066cc',
          logoUrl: 'https://example.com/logo.png',
        })
      ).resolves.toBeUndefined()
    })
  })
})
