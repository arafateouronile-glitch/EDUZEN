import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/documents/upload-signed/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

describe('POST docs upload-signed', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as any)
    const req = new NextRequest('http://localhost/api/documents/upload-signed', {
      method: 'POST',
      body: new FormData(),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBeDefined()
  })
})
