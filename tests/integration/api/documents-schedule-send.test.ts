import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/documents/schedule-send/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

describe('API POST /api/documents/schedule-send', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('retourne 401 sans auth', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: {} }) },
    } as any)
    const req = new NextRequest('http://localhost/api/documents/schedule-send', {
      method: 'POST',
      body: JSON.stringify({ document_id: 'd1', scheduled_at: new Date().toISOString() }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('Non autorisé')
  })

  it('retourne 400 si pas d organisation', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'u@t.com' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
      }),
    } as any)
    const req = new NextRequest('http://localhost/api/documents/schedule-send', {
      method: 'POST',
      body: JSON.stringify({ document_id: 'd1', scheduled_at: new Date().toISOString() }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Organisation non trouvée')
  })

  it('retourne 403 si role non admin/secretary/super_admin', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'u@t.com' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1', role: 'teacher' },
              error: null,
            }),
          }),
        }),
      }),
    } as any)
    const req = new NextRequest('http://localhost/api/documents/schedule-send', {
      method: 'POST',
      body: JSON.stringify({ document_id: 'd1', scheduled_at: new Date().toISOString() }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('Permissions insuffisantes')
  })
})
