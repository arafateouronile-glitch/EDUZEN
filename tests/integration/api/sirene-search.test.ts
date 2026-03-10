import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/sirene/search/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('API /api/sirene/search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.SIRENE_API_KEY
  })

  it('devrait retourner 401 sans authentification', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'No session' },
        }),
      },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/sirene/search?siret=12345678901234')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Non autorisé')
  })

  it('devrait retourner 400 si aucun paramètre siret, siren ou name', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'u@test.com' } },
          error: null,
        }),
      },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/sirene/search')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toMatch(/SIRET|SIREN|requis/)
  })

  it('devrait retourner 500 si SIRENE_API_KEY est absente', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'u@test.com' } },
          error: null,
        }),
      },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/sirene/search?siret=12345678901234')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toMatch(/Configuration|SIRENE|manquante/)
  })
})
