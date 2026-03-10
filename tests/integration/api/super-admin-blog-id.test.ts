import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH } from '@/app/api/super-admin/blog/[id]/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('API /api/super-admin/blog/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET retourne 401 sans auth', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as any)

    const request = new NextRequest('http://localhost/api/super-admin/blog/post-1')
    const response = await GET(request, { params: Promise.resolve({ id: 'post-1' }) })

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('Non authentifié')
  })

  it('PATCH retourne 401 sans auth', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as any)

    const request = new NextRequest('http://localhost/api/super-admin/blog/post-1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Updated' }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'post-1' }) })

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('Non authentifié')
  })
})
