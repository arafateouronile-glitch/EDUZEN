import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/send-email/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

describe('API POST send-email', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as any)
    const req = new NextRequest('http://localhost/api/send-email', {
      method: 'POST',
      body: JSON.stringify({ to: 'a@b.com', subject: 'Test', message: 'Hi' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect((await res.json()).error).toMatch(/Non authentifié|Unauthorized/i)
  })
})
