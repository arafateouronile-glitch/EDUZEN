import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

describe('API GET /api/cron/send-notifications', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns 401 when Bearer is invalid', async () => {
    process.env.CRON_SECRET = 'notif-secret'
    const { GET } = await import('@/app/api/cron/send-notifications/route')
    const req = new NextRequest('http://localhost/api/cron/send-notifications', {
      headers: { authorization: 'Bearer wrong' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
    expect((await res.json()).error).toMatch(/Secret invalide|Unauthorized/)
  })
})
