import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/health/route'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/services/gotenberg.service', () => ({
  isGotenbergConfigured: vi.fn(),
}))

describe('API /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  })

  it('devrait retourner 200 avec status ok et supabase ok quand tout est configuré', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      }),
    } as any)

    const { isGotenbergConfigured } = await import('@/lib/services/gotenberg.service')
    vi.mocked(isGotenbergConfigured).mockReturnValue(false)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({ status: 'ok', supabase: 'ok' })
    expect(data.gotenberg).toBe('not_configured')
  })

  it('devrait retourner 503 si supabase renvoie une erreur', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ error: { message: 'Connection refused' } }),
          }),
        }),
      }),
    } as any)

    const { isGotenbergConfigured } = await import('@/lib/services/gotenberg.service')
    vi.mocked(isGotenbergConfigured).mockReturnValue(false)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe('ok')
    expect(data.supabase).toContain('error')
  })

  it('devrait indiquer missing_env si les variables Supabase sont absentes', async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const { isGotenbergConfigured } = await import('@/lib/services/gotenberg.service')
    vi.mocked(isGotenbergConfigured).mockReturnValue(false)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.supabase).toBe('missing_env')

    process.env.NEXT_PUBLIC_SUPABASE_URL = url
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = key
  })
})
