import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/payments/stripe/status/[paymentIntentId]/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/utils/rate-limiter', () => ({
  withRateLimit: vi.fn((_r: unknown, _l: unknown, fn: (r: NextRequest) => Promise<Response>) => fn(_r as NextRequest)),
  generalRateLimiter: {},
}))

describe('API GET payments/stripe/status/[paymentIntentId]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as any)
    const req = new NextRequest('http://localhost/api/payments/stripe/status/pi_xxx')
    const res = await GET(req, { params: Promise.resolve({ paymentIntentId: 'pi_xxx' }) })
    expect(res.status).toBe(401)
    expect((await res.json()).error).toMatch(/Unauthorized|Non authentifié/i)
  })
})
