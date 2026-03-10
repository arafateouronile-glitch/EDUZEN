import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/document-templates/seed-defaults/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/services/document-template.service', () => ({
  DocumentTemplateService: class MockDocumentTemplateService {},
}))

describe('API POST /api/document-templates/seed-defaults', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne 401 sans auth', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }) },
    } as any)

    const request = new NextRequest('http://localhost/api/document-templates/seed-defaults', { method: 'POST' })
    const response = await POST(request)

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('Non autorisé')
  })

  it('retourne 404 si utilisateur sans organisation', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'u@t.com' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
      }),
    } as any)

    const request = new NextRequest('http://localhost/api/document-templates/seed-defaults', { method: 'POST' })
    const response = await POST(request)

    expect(response.status).toBe(404)
    expect((await response.json()).error).toBe('Organisation non trouvée')
  })
})
