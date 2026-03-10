import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/payments/sepa/status/[paymentId]/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

describe('API GET payments/sepa/status/[paymentId]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as any)
    const req = new NextRequest('http://localhost/api/payments/sepa/status/pay-123')
    const res = await GET(req, { params: Promise.resolve({ paymentId: 'pay-123' }) })
    expect(res.status).toBe(401)
    expect((await res.json()).error).toMatch(/Unauthorized|Non authentifié/i)
  })
})
