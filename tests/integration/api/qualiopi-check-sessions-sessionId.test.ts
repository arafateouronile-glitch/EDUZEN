import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/qualiopi-check/sessions/[sessionId]/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/services/qualiopi-check.service', () => ({
  QualiopiCheckService: class MockQualiopiCheckService {
    getSessionCompliance = vi.fn().mockResolvedValue(null)
  },
}))

describe('API GET /api/qualiopi-check/sessions/[sessionId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne 401 sans auth', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }) },
    } as any)

    const request = new NextRequest('http://localhost/api/qualiopi-check/sessions/sess-1')
    const response = await GET(request, { params: Promise.resolve({ sessionId: 'sess-1' }) })

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('Non autorisé')
  })

  it('retourne 403 si utilisateur sans organisation', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'u@t.com' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    } as any)

    const request = new NextRequest('http://localhost/api/qualiopi-check/sessions/sess-1')
    const response = await GET(request, { params: Promise.resolve({ sessionId: 'sess-1' }) })

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('Organisation introuvable')
  })
})
