import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/dashboard/students-distribution/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('API /api/dashboard/students-distribution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait retourner 401 sans authentification', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'No session' },
        }),
      },
    } as any)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Non autorisé')
  })

  it('devrait retourner 403 si l\'utilisateur n\'a pas d\'organisation', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'u@test.com' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { organization_id: null },
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toMatch(/Organisation|introuvable/i)
  })
})
