import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

describe('API GET /api/cron/send-scheduled-documents', () => {
  const originalEnv = process.env.CRON_SECRET

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env.CRON_SECRET = originalEnv
  })

  it('returns 401 when Bearer is invalid', async () => {
    process.env.CRON_SECRET = 'cron-secret-xyz'
    const { GET } = await import('@/app/api/cron/send-scheduled-documents/route')
    const req = new NextRequest('http://localhost/api/cron/send-scheduled-documents', {
      headers: { authorization: 'Bearer wrong' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
    expect((await res.json()).error).toMatch(/Secret invalide|Unauthorized/)
  })
})
