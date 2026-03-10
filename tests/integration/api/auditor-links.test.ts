import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/auditor/links/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/services/auditor-portal.service', () => ({
  AuditorPortalService: class MockAuditorPortalService {
    getAccessLinks = vi.fn().mockResolvedValue([])
  },
}))

describe('API GET /api/auditor/links', () => {
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

    const request = new NextRequest('http://localhost/api/auditor/links')
    const response = await GET(request)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Non autorisé')
  })

  it('retourne 404 si utilisateur sans organisation', async () => {
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
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'No rows' },
            }),
          }),
        }),
      }),
    } as any)

    const request = new NextRequest('http://localhost/api/auditor/links')
    const response = await GET(request)

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toContain('organisation')
  })
})
