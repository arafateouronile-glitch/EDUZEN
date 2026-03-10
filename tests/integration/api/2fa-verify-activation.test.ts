import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/2fa/verify-activation/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/utils/rate-limiter', () => ({
  withRateLimit: vi.fn((_r: unknown, _l: unknown, fn: (r: NextRequest) => Promise<Response>) => fn(_r as NextRequest)),
  authRateLimiter: {},
}))

describe('API POST /api/2fa/verify-activation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as any)
    const req = new NextRequest('http://localhost/api/2fa/verify-activation', {
      method: 'POST',
      body: JSON.stringify({ code: '123456' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect((await res.json()).error).toMatch(/Non authentifié|Unauthorized/i)
  })
})
