import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/document-templates/[id]/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/services/document-template.service', () => ({
  DocumentTemplateService: class MockDocumentTemplateService {
    getTemplateById = vi.fn().mockResolvedValue({ id: 't1', organization_id: 'org-1' })
  },
}))

describe('API GET /api/document-templates/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne 401 sans authentification', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
    } as any)

    const request = new NextRequest('http://localhost/api/document-templates/t1')
    const response = await GET(request, { params: Promise.resolve({ id: 't1' }) })

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Non autorisé')
  })
})
