import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

describe('API POST subscriptions/webhook', () => {
  const original = process.env.STRIPE_WEBHOOK_SECRET

  beforeEach(() => {
    vi.resetModules()
  })
  afterEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = original
  })

  it('returns 503 when STRIPE_WEBHOOK_SECRET is not set', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = ''
    const { POST } = await import('@/app/api/subscriptions/webhook/route')
    const req = new NextRequest('http://localhost/api/subscriptions/webhook', {
      method: 'POST',
      body: '{}',
    })
    const res = await POST(req)
    expect(res.status).toBe(503)
    expect((await res.json()).error).toMatch(/Webhook non configuré|non configuré/i)
  })
})
