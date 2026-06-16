import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/document-templates/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/services/document-template.service', () => ({
  DocumentTemplateService: class Mock { getAllTemplates = vi.fn().mockResolvedValue([]) },
}))

describe('API GET /api/document-templates (route handler)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('retourne 401 sans auth', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: {} }) },
    } as any)
    const res = await GET(new NextRequest('http://localhost/api/document-templates'))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('Non autorisé')
  })

  it('retourne 404 si pas d organisation', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'u@t.com' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    } as any)
    const res = await GET(new NextRequest('http://localhost/api/document-templates'))
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Organisation non trouvée')
  })
})
