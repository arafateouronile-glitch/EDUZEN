import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/documents/upload-docx-template/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

describe('API POST documents/upload-docx-template', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as any)
    const form = new FormData()
    const req = new NextRequest('http://localhost/api/documents/upload-docx-template', {
      method: 'POST',
      body: form,
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect((await res.json()).error).toMatch(/Non autorisé|Unauthorized/i)
  })
})
