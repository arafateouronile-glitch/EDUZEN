import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/2fa/generate-secret/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/utils/rate-limiter', () => ({
  withRateLimit: vi.fn((_req: unknown, _limiter: unknown, handler: (r: NextRequest) => Promise<Response>) => handler(_req as NextRequest)),
  authRateLimiter: {},
}))

describe('API POST /api/2fa/generate-secret', () => {
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

    const req = new NextRequest('http://localhost/api/2fa/generate-secret', { method: 'POST' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.error).toMatch(/Non authentifié|Unauthorized/i)
  })
})
