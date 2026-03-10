import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/qualiopi-check/sessions/[sessionId]/resend/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/services/qualiopi-check.service', () => ({
  QualiopiCheckService: class Mock { getSessionCompliance = vi.fn().mockResolvedValue(null) },
}))
vi.mock('@/lib/services/signature-request.service', () => ({
  SignatureRequestService: class Mock {},
}))

describe('API POST /api/qualiopi-check/sessions/[sessionId]/resend', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('retourne 401 sans auth', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: {} }) },
    } as any)
    const req = new NextRequest('http://localhost/api/qualiopi-check/sessions/sess-1/resend', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ sessionId: 'sess-1' }) })
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('Non autorisé')
  })

  it('retourne 403 si pas d organisation', async () => {
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
    const req = new NextRequest('http://localhost/api/qualiopi-check/sessions/sess-1/resend', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ sessionId: 'sess-1' }) })
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('Organisation introuvable')
  })
})
