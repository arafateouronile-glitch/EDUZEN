import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/documents/generate-pdf/route'

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/utils/rate-limiter-distributed', () => ({
  pdfRateLimiter: null,
}))

vi.mock('@/lib/utils/rate-limit', () => ({
  applyRateLimit: vi.fn().mockReturnValue({ allowed: true }),
  RATE_LIMITS: { DOCUMENT_GENERATION: {} },
}))

describe('API POST documents/generate-pdf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    const { createServerClient } = await import('@supabase/ssr')
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as any)

    const req = new NextRequest('http://localhost/api/documents/generate-pdf', {
      method: 'POST',
      body: JSON.stringify({ variables: {} }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when template is missing', async () => {
    const { createServerClient } = await import('@supabase/ssr')
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'test@test.com' } },
          error: null,
        }),
      },
    } as any)

    const req = new NextRequest('http://localhost/api/documents/generate-pdf', {
      method: 'POST',
      body: JSON.stringify({ variables: {} }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Template manquant|template/i)
  })
})
