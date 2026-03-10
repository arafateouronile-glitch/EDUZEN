import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/2fa/disable/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/utils/rate-limiter', () => ({
  withRateLimit: vi.fn((_req: unknown, _limiter: unknown, handler: (r: NextRequest) => Promise<Response>) => handler(_req as NextRequest)),
  authRateLimiter: {},
}))

vi.mock('@/lib/services/2fa.service', () => ({
  TwoFactorAuthService: vi.fn().mockImplementation(() => ({
    disable2FA: vi.fn().mockResolvedValue(undefined),
  })),
}))

describe('API /api/2fa/disable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait retourner 401 sans authentification', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toMatch(/Non authentifié|Unauthorized/i)
  })
})
