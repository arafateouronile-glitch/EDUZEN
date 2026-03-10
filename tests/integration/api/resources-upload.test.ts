import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/resources/upload/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/app/api/_middleware/rate-limit', () => ({
  withRateLimit: vi.fn((_r: unknown, _limiter: unknown, fn: (r: NextRequest) => Promise<Response>) => fn(_r as NextRequest)),
  uploadRateLimiter: {},
}))

describe('API POST resources/upload', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as any)
    const form = new FormData()
    const req = new NextRequest('http://localhost/api/resources/upload', {
      method: 'POST',
      body: form,
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect((await res.json()).error).toMatch(/Non authentifié/i)
  })
})
