import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/push-notifications/register/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/services/push-notifications.service', () => ({
  PushNotificationsService: vi.fn().mockImplementation(() => ({
    registerDevice: vi.fn().mockResolvedValue({ id: 'device-1', device_token: 'token-1' }),
  })),
}))

describe('API /api/push-notifications/register', () => {
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

    const request = new NextRequest('http://localhost:3000/api/push-notifications/register', {
      method: 'POST',
      body: JSON.stringify({
        deviceToken: 'token-123',
        deviceType: 'mobile',
        platform: 'ios',
      }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toMatch(/Unauthorized|Non autorisé/i)
  })

  it('devrait retourner 400 si deviceToken, deviceType ou platform manquants', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'u@test.com' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    const request = new NextRequest('http://localhost:3000/api/push-notifications/register', {
      method: 'POST',
      body: JSON.stringify({ deviceToken: 'token-123' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toMatch(/Missing required|deviceToken|deviceType|platform/i)
  })
})
