import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/affiliate/track/route'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

describe('API /api/affiliate/track', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait retourner 400 si le parametre ref est absent', async () => {
    const request = new NextRequest('http://localhost:3000/api/affiliate/track')
    const response = await GET(request)

    expect(response.status).toBe(400)
  })

  it('devrait retourner 404 si l\'affilie est invalide ou inactif', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }),
    } as any)

    const request = new NextRequest('http://localhost:3000/api/affiliate/track?ref=invalid-ref')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toMatch(/invalide|inactif|invalid/i)
  })
})
