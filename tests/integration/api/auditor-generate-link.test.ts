import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/auditor/generate-link/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/services/auditor-portal.service', () => ({
  AuditorPortalService: class MockAuditorPortalService {
    generateAccessLink = vi.fn().mockResolvedValue({ token: 'token-1', expiresAt: new Date().toISOString() })
  },
}))

describe('API POST /api/auditor/generate-link', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne 401 sans authentification', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
    } as any)

    const request = new NextRequest('http://localhost/api/auditor/generate-link', {
      method: 'POST',
      body: JSON.stringify({ auditorName: 'Test Auditor' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Non autorisé')
  })

  it('retourne 404 si utilisateur sans organisation', async () => {
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
              data: null,
              error: { code: 'PGRST116', message: 'No rows' },
            }),
          }),
        }),
      }),
    } as any)

    const request = new NextRequest('http://localhost/api/auditor/generate-link', {
      method: 'POST',
      body: JSON.stringify({ auditorName: 'Test Auditor' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toContain('organisation')
  })
})
