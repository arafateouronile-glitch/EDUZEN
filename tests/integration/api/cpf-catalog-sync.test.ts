import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/cpf/catalog-sync/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('API POST /api/cpf/catalog-sync', () => {
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

    const request = new NextRequest('http://localhost/api/cpf/catalog-sync', { method: 'POST' })
    const response = await POST(request)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Non authentifié')
  })

  it('retourne 403 si utilisateur sans organisation', async () => {
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

    const request = new NextRequest('http://localhost/api/cpf/catalog-sync', { method: 'POST' })
    const response = await POST(request)

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('Organisation non trouvée')
  })

  it('retourne 403 si role non super_admin/admin', async () => {
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
              data: { organization_id: 'org-1', role: 'teacher' },
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    const request = new NextRequest('http://localhost/api/cpf/catalog-sync', { method: 'POST' })
    const response = await POST(request)

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('Permission refusée')
  })
})
