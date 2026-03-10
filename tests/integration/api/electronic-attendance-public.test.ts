import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/electronic-attendance/public/[token]/route'

vi.mock('@/lib/utils/rate-limiter-distributed', () => ({
  withDistributedRateLimit: vi.fn((_r: unknown, _p: unknown, fn: () => Promise<Response>) => fn()),
}))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/services/electronic-attendance.service', () => ({
  ElectronicAttendanceService: class MockService {
    getAttendanceRequestByToken = vi.fn().mockResolvedValue(null)
  },
}))

describe('GET electronic-attendance/public/[token]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 200 with data from service', async () => {
    const req = new NextRequest('http://localhost/api/electronic-attendance/public/abc')
    const res = await GET(req, { params: Promise.resolve({ token: 'abc' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toBeNull()
  })
})
