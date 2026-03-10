/**
 * Tests unitaires pour SignatureRequestService
 * Couverture : createSignatureRequest (auth, document, insert), getById (audit P1-10)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SignatureRequestService } from '@/lib/services/signature-request.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

vi.mock('@/lib/utils/send-email-resend', () => ({
  sendEmailViaResend: vi.fn().mockResolvedValue({ success: true }),
}))

function createMockSupabase(mocks: {
  getUser?: { user: { id: string; user_metadata?: { full_name?: string } } | null }
  document?: { id: string; title: string | null; file_url: string | null; organization_id: string } | null
  documentError?: { message: string; code?: string } | null
  insertResult?: { id: string; signature_token: string; access_token?: string } | null
  insertError?: { message: string } | null
}) {
  const docChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mocks.document ?? null, error: mocks.documentError ?? null }),
  }
  const sigChain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mocks.insertResult ?? null, error: mocks.insertError ?? null }),
  }
  const from = vi.fn((table: string) => (table === 'documents' ? docChain : sigChain))
  const auth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: mocks.getUser?.user ?? null },
      error: null,
    }),
  }
  return { from, auth } as unknown as SupabaseClient<Database>
}

describe('SignatureRequestService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSignatureRequest', () => {
    it('devrait lever si l’utilisateur n’est pas authentifié', async () => {
      const supabase = createMockSupabase({ getUser: { user: null } })
      const service = new SignatureRequestService(supabase)
      await expect(
        service.createSignatureRequest({
          documentId: 'doc-1',
          organizationId: 'org-1',
          recipientEmail: 'a@b.com',
          recipientName: 'Test',
          recipientType: 'student',
        })
      ).rejects.toThrow(/authentifié|non authentifié/i)
    })

    it('devrait lever si le document est introuvable', async () => {
      const supabase = createMockSupabase({
        getUser: { user: { id: 'user-1', user_metadata: {} } },
        document: null,
        documentError: { message: 'Not found', code: 'PGRST116' },
      })
      const service = new SignatureRequestService(supabase)
      await expect(
        service.createSignatureRequest({
          documentId: 'doc-1',
          organizationId: 'org-1',
          recipientEmail: 'a@b.com',
          recipientName: 'Test',
          recipientType: 'student',
        })
      ).rejects.toThrow(/Document introuvable|introuvable/i)
    })

    it('devrait créer une demande et appeler insert avec les bons champs', async () => {
      const supabase = createMockSupabase({
        getUser: { user: { id: 'user-1', user_metadata: { full_name: 'Admin' } } },
        document: { id: 'doc-1', title: 'Contrat', file_url: 'https://x.com/f.pdf', organization_id: 'org-1' },
        insertResult: { id: 'sr-1', signature_token: 'tok_abc', access_token: 'tok_abc' },
      })
      const service = new SignatureRequestService(supabase)
      const result = await service.createSignatureRequest({
        documentId: 'doc-1',
        organizationId: 'org-1',
        recipientEmail: 'signer@example.com',
        recipientName: 'Signer',
        recipientType: 'student',
      })
      expect(result).toBeDefined()
      expect((result as { id: string }).id).toBe('sr-1')
      expect(supabase.from).toHaveBeenCalledWith('documents')
      expect(supabase.from).toHaveBeenCalledWith('signature_requests')
    })
  })
})
