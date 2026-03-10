import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/elearning/lessons/[lessonId]/responses/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/app/api/_middleware/rate-limit', () => ({
  withRateLimit: vi.fn((_r: unknown, _l: unknown, fn: (r: NextRequest) => Promise<Response>) => fn(_r as NextRequest)),
}))
vi.mock('@/lib/utils/rate-limiter', () => ({ mutationRateLimiter: {} }))

describe('POST elearning lessons responses', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 without auth', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as any)
    const req = new NextRequest('http://localhost/api/elearning/lessons/l1/responses', {
      method: 'POST',
      body: JSON.stringify({ block_id: 'b1', type: 'text' }),
    })
    const res = await POST(req, { params: Promise.resolve({ lessonId: 'l1' }) })
    expect(res.status).toBe(401)
  })
})
