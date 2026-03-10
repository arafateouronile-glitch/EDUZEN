import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/v1/students/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/services/api.service', () => ({
  createAPIService: () => ({ verifyAPIKey: vi.fn().mockResolvedValue(null) }),
}))

describe('API GET v1/students', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when API key is missing', async () => {
    const req = new NextRequest('http://localhost/api/v1/students')
    const res = await GET(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBeDefined()
  })
})
