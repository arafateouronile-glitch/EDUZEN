import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/documents/generate-word/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

describe('documents generate-word', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 without auth', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as any)
    const req = new NextRequest('http://localhost/api/documents/generate-word', {
      method: 'POST',
      body: JSON.stringify({ template: {}, variables: {} }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})
