import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

describe('API POST /api/emails/scheduled/execute', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns 401 or 503 without valid Bearer', async () => {
    process.env.CRON_SECRET = 'email-cron-secret'
    const { POST } = await import('@/app/api/emails/scheduled/execute/route')
    const req = new NextRequest('http://localhost/api/emails/scheduled/execute', {
      method: 'POST',
    })
    const res = await POST(req)
    expect([401, 503]).toContain(res.status)
    const data = await res.json()
    expect(data.error).toBeDefined()
  })
})
