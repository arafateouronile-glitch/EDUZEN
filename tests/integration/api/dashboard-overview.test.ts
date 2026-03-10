import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/dashboard/overview/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('API /api/dashboard/overview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait retourner 401 sans authentification', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
    } as any)

    const response = await GET()

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Non autorisé')
  })

  it('devrait retourner 403 si utilisateur sans organisation', async () => {
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
              data: null,
              error: { code: 'PGRST116', message: 'No rows' },
            }),
          }),
        }),
      }),
    } as any)

    const response = await GET()

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('Organisation introuvable')
  })

  it('devrait retourner 200 avec les stats du dashboard (happy path)', async () => {
    const fromChain = (count = 0) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], count }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn((fn: (r: { data: unknown[]; count: number }) => unknown) =>
        Promise.resolve(fn({ data: [], count }))
      ),
    })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'u@test.com' } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null,
            }),
          }
        }
        return fromChain(0)
      }),
    } as any)

    const response = await GET()

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toMatchObject({
      studentsCount: expect.any(Number),
      monthlyRevenue: expect.any(Number),
      currency: expect.any(String),
      teachersCount: expect.any(Number),
      activeSessionsCount: expect.any(Number),
      activeFormationsCount: expect.any(Number),
      activeProgramsCount: expect.any(Number),
      totalEnrollments: expect.any(Number),
      completedSessions: expect.any(Number),
    })
  })
})
