import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/subscriptions/create-setup-intent/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

describe('API POST /api/subscriptions/create-setup-intent', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('retourne 401 sans auth', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: {} }) },
    } as any)
    const req = new NextRequest('http://localhost/api/subscriptions/create-setup-intent', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('Non authentifié')
  })

  it('retourne 404 si pas d organisation', async () => {
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
    const req = new NextRequest('http://localhost/api/subscriptions/create-setup-intent', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Organisation non trouvée')
  })
})
