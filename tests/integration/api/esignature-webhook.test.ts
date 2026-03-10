import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

describe('API POST esignature/webhook', () => {
  const originalEnv = process.env.ESIGNATURE_WEBHOOK_SECRET

  beforeEach(() => {
    vi.resetModules()
  })
  afterEach(() => {
    process.env.ESIGNATURE_WEBHOOK_SECRET = originalEnv
  })

  it('returns 503 when webhook secret is not configured', async () => {
    process.env.ESIGNATURE_WEBHOOK_SECRET = ''
    const { POST } = await import('@/app/api/esignature/webhook/route')
    const req = new NextRequest('http://localhost/api/esignature/webhook', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(503)
    expect((await res.json()).error).toMatch(/Webhook non configuré|non configuré/i)
  })
})
