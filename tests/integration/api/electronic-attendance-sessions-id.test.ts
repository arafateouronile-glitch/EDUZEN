import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/electronic-attendance/sessions/[id]/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/services/electronic-attendance.service', () => ({
  ElectronicAttendanceService: vi.fn().mockImplementation(() => ({
    getAttendanceSessionById: vi.fn().mockResolvedValue(null),
  })),
}))

describe('API GET electronic-attendance/sessions/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as any)
    const req = new NextRequest('http://localhost/api/electronic-attendance/sessions/sess-123')
    const res = await GET(req, { params: Promise.resolve({ id: 'sess-123' }) })
    expect(res.status).toBe(401)
    expect((await res.json()).error).toMatch(/Non authentifié/i)
  })
})
