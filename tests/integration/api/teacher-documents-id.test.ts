import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { DELETE } from '@/app/api/teacher-documents/[id]/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

describe('API DELETE teacher-documents/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as any)
    const req = new NextRequest('http://localhost/api/teacher-documents/doc-123', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'doc-123' }) })
    expect(res.status).toBe(401)
    expect((await res.json()).error).toMatch(/Non authentifié/i)
  })
})
