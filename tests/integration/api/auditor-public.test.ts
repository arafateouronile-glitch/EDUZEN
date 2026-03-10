import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/auditor/public/route'

vi.mock('@/lib/utils/rate-limiter-distributed', () => ({
  withDistributedRateLimit: vi.fn((_r: unknown, _preset: unknown, fn: () => Promise<Response>) => fn()),
}))
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({}),
}))
vi.mock('@/lib/services/auditor-portal.service', () => ({
  AuditorPortalService: vi.fn().mockImplementation(() => ({
    getAuditorPortalData: vi.fn().mockResolvedValue(null),
  })),
}))

describe('API GET auditor/public', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 when token is missing', async () => {
    const req = new NextRequest('http://localhost/api/auditor/public')
    const res = await GET(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Token requis/i)
  })
})
