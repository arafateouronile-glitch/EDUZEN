import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/super-admin/subscriptions/[id]/reminder/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('API POST /api/super-admin/subscriptions/[id]/reminder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne 401 sans authentification', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as any)

    const request = new NextRequest('http://localhost/api/super-admin/subscriptions/sub-1/reminder', {
      method: 'POST',
    })
    const response = await POST(request, { params: Promise.resolve({ id: 'sub-1' }) })

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Non authentifié')
  })

  it('retourne 403 si pas permission manage_subscriptions', async () => {
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
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { permissions: {} },
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as any)

    const request = new NextRequest('http://localhost/api/super-admin/subscriptions/sub-1/reminder', {
      method: 'POST',
    })
    const response = await POST(request, { params: Promise.resolve({ id: 'sub-1' }) })

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('Accès refusé')
  })
})
