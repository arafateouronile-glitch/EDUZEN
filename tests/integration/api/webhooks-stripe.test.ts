import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

describe('API POST webhooks/stripe', () => {
  const original = process.env.STRIPE_WEBHOOK_SECRET

  beforeEach(() => {
    vi.resetModules()
  })
  afterEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = original
  })

  it('returns 400 when signature or webhook secret missing', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = ''
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const req = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: '{}',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Missing signature|signature|secret/i)
  })
})
