import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/qualiopi-check/sessions/[sessionId]/audit-zip/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/services/qualiopi-check.service', () => ({
  QualiopiCheckService: vi.fn().mockImplementation(() => ({
    getSessionCompliance: vi.fn().mockResolvedValue(null),
  })),
}))

describe('API GET qualiopi-check/sessions/[sessionId]/audit-zip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any)
    const req = new NextRequest('http://localhost/api/qualiopi-check/sessions/abc/audit-zip')
    const res = await GET(req, { params: Promise.resolve({ sessionId: 'abc' }) })
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBeDefined()
  })
})
