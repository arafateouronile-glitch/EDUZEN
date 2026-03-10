import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/cron/notification-reminders/route'

describe('API GET /api/cron/notification-reminders', () => {
  const originalEnv = process.env.CRON_SECRET

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env.CRON_SECRET = originalEnv
  })

  it('retourne 503 si CRON_SECRET non configure', async () => {
    process.env.CRON_SECRET = ''
    const { GET: handler } = await import('@/app/api/cron/notification-reminders/route')
    const req = new NextRequest('http://localhost/api/cron/notification-reminders')
    const res = await handler(req)
    expect(res.status).toBe(503)
    expect((await res.json()).error).toContain('CRON_SECRET')
  })

  it('retourne 401 si Bearer invalide', async () => {
    process.env.CRON_SECRET = 'secret-123'
    const { GET: handler } = await import('@/app/api/cron/notification-reminders/route')
    const req = new NextRequest('http://localhost/api/cron/notification-reminders', {
      headers: { authorization: 'Bearer wrong' },
    })
    const res = await handler(req)
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('Unauthorized')
  })
})
