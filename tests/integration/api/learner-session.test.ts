import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, resetLearnerSessionRateLimitForTests } from '@/app/api/learner/session/route'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: new Error('not found') }),
  }),
}))

describe('API POST /api/learner/session', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetLearnerSessionRateLimitForTests()
  })

  it('returns 400 when studentId is missing', async () => {
    const req = new NextRequest('http://localhost/api/learner/session', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/studentId requis/i)
  })

  it('returns 403 when access proof cookie is missing', async () => {
    const req = new NextRequest('http://localhost/api/learner/session', {
      method: 'POST',
      body: JSON.stringify({ studentId: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
    expect((await res.json()).error).toMatch(/Accès non autorisé|Passez par le lien/i)
  })
})
