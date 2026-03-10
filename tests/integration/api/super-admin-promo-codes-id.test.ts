import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from '@/app/api/super-admin/promo-codes/[id]/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('API PATCH /api/super-admin/promo-codes/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne 401 sans auth', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as any)

    const request = new NextRequest('http://localhost/api/super-admin/promo-codes/pc-1', {
      method: 'PATCH',
      body: JSON.stringify({ code: 'PROMO10' }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'pc-1' }) })

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('Non authentifié')
  })

  it('retourne 403 si pas manage_promo_codes', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'u@t.com' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { permissions: {} }, error: null }),
            }),
          }),
        }),
      }),
    } as any)

    const request = new NextRequest('http://localhost/api/super-admin/promo-codes/pc-1', {
      method: 'PATCH',
      body: JSON.stringify({ code: 'PROMO10' }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'pc-1' }) })

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('Accès refusé')
  })
})
