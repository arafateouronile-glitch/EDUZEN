import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/payments/sepa/create-transfer/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/utils/rate-limiter', () => ({
  withRateLimit: vi.fn((_r: unknown, _l: unknown, fn: (r: NextRequest) => Promise<Response>) => fn(_r as NextRequest)),
  mutationRateLimiter: {},
}))

const validIban = 'FR7630006000011234567890189'

describe('API POST payments/sepa/create-transfer', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as any)
    const req = new NextRequest('http://localhost/api/payments/sepa/create-transfer', {
      method: 'POST',
      body: JSON.stringify({
        amount: 100,
        debtor_name: 'Test Debtor',
        debtor_iban: validIban,
        creditor_name: 'Test Creditor',
        creditor_iban: validIban,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect((await res.json()).error).toMatch(/Unauthorized|Non authentifié/i)
  })
})
