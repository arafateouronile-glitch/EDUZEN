import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/sign/public/[token]/route'

vi.mock('@/lib/utils/rate-limiter-distributed', () => ({
  withDistributedRateLimit: vi.fn((_r: unknown, _p: unknown, fn: () => Promise<Response>) => fn()),
}))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
}))

describe('sign public token', () => {
  beforeEach(() => vi.clearAllMocks())

  it('400 when token empty', async () => {
    const req = new NextRequest('http://localhost/api/sign/public/x')
    const res = await GET(req, { params: Promise.resolve({ token: '' }) })
    expect(res.status).toBe(400)
  })
})
