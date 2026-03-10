/**
 * Tests unitaires pour TemplateSecurityService (réduction services sans tests)
 */
import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { TemplateSecurityService } from '@/lib/services/template-security.service'

vi.mock('@/lib/config/app-config', () => ({
  SECURITY_CONFIG: { getEncryptionKey: () => 'test-key' },
}))

function createMockSupabase() {
  const permChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST205', message: 'Not found' },
    }),
  }
  const userChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
  const from = vi.fn((table: string) =>
    table === 'template_permissions' ? permChain : userChain
  )
  return { from } as unknown as SupabaseClient
}

describe('TemplateSecurityService', () => {
  describe('hasPermission', () => {
    it('retourne false quand table permissions absente et utilisateur non trouvé', async () => {
      const mockSupabase = createMockSupabase()
      const service = new TemplateSecurityService(mockSupabase)

      const result = await service.hasPermission('tpl-1', 'user-1', 'view')

      expect(result).toBe(false)
      expect(mockSupabase.from).toHaveBeenCalledWith('template_permissions')
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
    })
  })
})
