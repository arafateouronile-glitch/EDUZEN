import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/subscriptions/create-checkout-setup/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

describe('API POST /api/subscriptions/create-checkout-setup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as any)
    const req = new NextRequest('http://localhost/api/subscriptions/create-checkout-setup', {
      method: 'POST',
      body: JSON.stringify({ planId: 'plan_1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect((await res.json()).error).toMatch(/Non authentifié|Unauthorized/i)
  })
})
