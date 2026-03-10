import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/documentation/search/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/services/documentation.service', () => ({
  DocumentationService: class MockDocumentationService {
    searchArticles = vi.fn().mockResolvedValue([])
  },
}))

describe('API GET /api/documentation/search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne 401 sans auth', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as any)

    const request = new NextRequest('http://localhost/api/documentation/search?q=test')
    const response = await GET(request)

    expect(response.status).toBe(401)
  })

  it('retourne 403 si utilisateur sans organisation', async () => {
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

    const request = new NextRequest('http://localhost/api/documentation/search?q=test')
    const response = await GET(request)

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('Organisation introuvable')
  })
})
