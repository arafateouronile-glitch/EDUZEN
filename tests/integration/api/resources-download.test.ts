import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/resources/[id]/download/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/services/resource-library.service', () => ({
  ResourceLibraryService: class MockResourceLibraryService {
    recordDownload = vi.fn().mockResolvedValue(undefined)
  },
}))

describe('API GET /api/resources/[id]/download', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne 401 sans authentification', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as any)

    const request = new NextRequest('http://localhost/api/resources/res-1/download')
    const response = await GET(request, { params: Promise.resolve({ id: 'res-1' }) })

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Non authentifié')
  })

  it('retourne 404 si ressource inexistante', async () => {
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

    const request = new NextRequest('http://localhost/api/resources/res-1/download')
    const response = await GET(request, { params: Promise.resolve({ id: 'res-1' }) })

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('Ressource non trouvée')
  })
})
