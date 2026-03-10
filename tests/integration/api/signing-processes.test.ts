import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/signing-processes/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/services/signing-process.service', () => ({
  SigningProcessService: class MockSigningProcessService {
    listByOrganization = vi.fn().mockResolvedValue([])
  },
}))

describe('API GET /api/signing-processes', () => {
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

    const request = new NextRequest('http://localhost/api/signing-processes')
    const response = await GET(request)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Non authentifié')
  })

  it('retourne 403 si role non admin/secretary/teacher', async () => {
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
              data: { organization_id: 'org-1', role: 'student' },
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    const request = new NextRequest('http://localhost/api/signing-processes')
    const response = await GET(request)

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('Accès non autorisé')
  })
})
