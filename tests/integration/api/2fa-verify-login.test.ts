import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/2fa/verify-login/route'

vi.mock('@/lib/utils/rate-limiter-distributed', () => ({
  withDistributedRateLimit: vi.fn((_r: unknown, _preset: unknown, fn: (r: NextRequest) => Promise<Response>) => fn(_r as NextRequest)),
}))

describe('API POST /api/2fa/verify-login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when userId is missing', async () => {
    const req = new NextRequest('http://localhost/api/2fa/verify-login', {
      method: 'POST',
      body: JSON.stringify({ code: '123456' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/User ID|userId/i)
  })

  it('returns 400 when code is missing', async () => {
    const req = new NextRequest('http://localhost/api/2fa/verify-login', {
      method: 'POST',
      body: JSON.stringify({ userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Code requis|code/i)
  })
})
