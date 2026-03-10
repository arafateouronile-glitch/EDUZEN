import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/affiliate/me/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

describe('API /api/affiliate/me', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait retourner 401 sans authentification', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as any)

    const response = await GET()

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Non authentifié')
  })

  it('devrait retourner 403 si pas d\'affilié approuvé', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { createAdminClient } = await import('@/lib/supabase/admin')

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'affiliate@test.com' } },
          error: null,
        }),
      },
    } as any)

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as any)

    const response = await GET()

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('Accès portail affilié non autorisé')
  })
})
