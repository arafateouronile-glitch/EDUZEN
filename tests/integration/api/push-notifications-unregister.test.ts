import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/push-notifications/unregister/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/services/push-notifications.service', () => ({
  PushNotificationsService: vi.fn().mockImplementation(() => ({
    unregisterDevice: vi.fn().mockResolvedValue(undefined),
  })),
}))

describe('API /api/push-notifications/unregister', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait retourner 401 sans authentification', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/push-notifications/unregister', {
      method: 'POST',
      body: JSON.stringify({ deviceId: 'device-123' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toMatch(/Unauthorized|Non autorisé/i)
  })

  it('devrait retourner 400 si deviceId manquant', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'u@test.com' } },
          error: null,
        }),
      },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/push-notifications/unregister', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toMatch(/Missing deviceId|deviceId/i)
  })
})
