import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/opco-access/[token]/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

describe('API GET /api/opco-access/[token]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 when share link not found', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('not found') }),
    }
    vi.mocked(createClient).mockResolvedValue(chain as any)
    const req = new NextRequest('http://localhost/api/opco-access/invalid-token')
    const res = await GET(req, { params: Promise.resolve({ token: 'invalid-token' }) })
    expect(res.status).toBe(404)
  })
})
