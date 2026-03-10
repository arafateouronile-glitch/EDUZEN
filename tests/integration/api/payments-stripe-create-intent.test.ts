import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/payments/stripe/create-intent/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/utils/rate-limiter', () => ({
  withRateLimit: vi.fn((_r: unknown, _l: unknown, fn: () => Promise<Response>) => fn()),
  mutationRateLimiter: {},
}))

describe('API POST payments/stripe/create-intent', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as any)
    const req = new NextRequest('http://localhost/api/payments/stripe/create-intent', {
      method: 'POST',
      body: JSON.stringify({
        amount: 10,
        customer_email: 'a@b.com',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect((await res.json()).error).toMatch(/Unauthorized|Non authentifié/i)
  })
})
