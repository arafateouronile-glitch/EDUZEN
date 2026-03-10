import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

describe('API GET /api/cron/affiliate-followup-j7', () => {
  const original = process.env.CRON_SECRET

  beforeEach(() => {
    vi.resetModules()
  })
  afterEach(() => {
    process.env.CRON_SECRET = original
  })

  it('returns 503 when CRON_SECRET is not set', async () => {
    process.env.CRON_SECRET = ''
    const { GET } = await import('@/app/api/cron/affiliate-followup-j7/route')
    const req = new NextRequest('http://localhost/api/cron/affiliate-followup-j7')
    const res = await GET(req)
    expect(res.status).toBe(503)
    expect((await res.json()).error).toContain('CRON_SECRET')
  })

  it('returns 401 when Bearer is invalid', async () => {
    process.env.CRON_SECRET = 'followup-secret'
    const { GET } = await import('@/app/api/cron/affiliate-followup-j7/route')
    const req = new NextRequest('http://localhost/api/cron/affiliate-followup-j7', {
      headers: { authorization: 'Bearer wrong' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('Unauthorized')
  })
})
