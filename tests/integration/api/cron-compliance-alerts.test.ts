import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

describe('API GET /api/cron/compliance-alerts', () => {
  const originalEnv = process.env.CRON_SECRET

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env.CRON_SECRET = originalEnv
  })

  it('retourne 401 si Bearer invalide', async () => {
    process.env.CRON_SECRET = 'alerts-secret'
    const { GET } = await import('@/app/api/cron/compliance-alerts/route')
    const req = new NextRequest('http://localhost/api/cron/compliance-alerts', {
      headers: { authorization: 'Bearer invalid' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
    expect((await res.json()).error).toMatch(/Secret invalide|Unauthorized/)
  })
})
