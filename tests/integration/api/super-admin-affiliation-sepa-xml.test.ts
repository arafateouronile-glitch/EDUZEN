import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/super-admin/affiliation/sepa-xml/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('API POST /api/super-admin/affiliation/sepa-xml', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne 401 sans auth', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as any)

    const request = new NextRequest('http://localhost/api/super-admin/affiliation/sepa-xml', {
      method: 'POST',
      body: JSON.stringify({ payments: [] }),
    })
    const response = await POST(request)

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('Non authentifié')
  })

  it('retourne 403 si non super_admin', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'u@t.com' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'support' }, error: null }),
            }),
          }),
        }),
      }),
    } as any)

    const request = new NextRequest('http://localhost/api/super-admin/affiliation/sepa-xml', {
      method: 'POST',
      body: JSON.stringify({ payments: [] }),
    })
    const response = await POST(request)

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('Accès réservé')
  })
})
