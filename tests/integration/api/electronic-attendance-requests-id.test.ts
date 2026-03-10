import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from '@/app/api/electronic-attendance/requests/[id]/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/services/electronic-attendance.service', () => ({
  ElectronicAttendanceService: vi.fn().mockImplementation(() => ({
    sendAttendanceReminder: vi.fn().mockResolvedValue(true),
  })),
}))

describe('API PATCH electronic-attendance/requests/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as any)
    const req = new NextRequest('http://localhost/api/electronic-attendance/requests/req-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'remind' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'req-1' }) })
    expect(res.status).toBe(401)
    expect((await res.json()).error).toMatch(/Non authentifié/i)
  })
})
