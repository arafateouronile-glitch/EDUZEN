import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/signature-requests/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/services/signature-request.service', () => ({
  SignatureRequestService: class MockSignatureRequestService {
    getSignatureRequestsByOrganization = vi.fn().mockResolvedValue([])
  },
}))

describe('API GET /api/signature-requests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne 401 sans auth', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }) },
    } as any)

    const request = new NextRequest('http://localhost/api/signature-requests')
    const response = await GET(request)

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('Non authentifié')
  })

  it('retourne 404 si utilisateur sans organisation', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'u@t.com' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
      }),
    } as any)

    const request = new NextRequest('http://localhost/api/signature-requests')
    const response = await GET(request)

    expect(response.status).toBe(404)
    expect((await response.json()).error).toBe('Organisation non trouvée')
  })

  it('retourne 403 si role non admin/secretary/teacher', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'u@t.com' } }, error: null }) },
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

    const request = new NextRequest('http://localhost/api/signature-requests')
    const response = await GET(request)

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('Permissions insuffisantes')
  })
})
