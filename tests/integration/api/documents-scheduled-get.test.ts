import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/documents/scheduled/route'

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

describe('API GET /api/documents/scheduled', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait retourner 401 sans authentification', async () => {
    const { createServerClient } = await import('@supabase/ssr')
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as any)

    const request = new NextRequest('http://localhost/api/documents/scheduled')
    const response = await GET(request)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Non autorisé')
  })

  it('devrait retourner 404 si utilisateur sans organisation', async () => {
    const { createServerClient } = await import('@supabase/ssr')
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'u@test.com' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'No rows' },
            }),
          }),
        }),
      }),
    } as any)

    const request = new NextRequest('http://localhost/api/documents/scheduled')
    const response = await GET(request)

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('Organisation non trouvée')
  })
})
