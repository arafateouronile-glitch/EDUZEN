import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/signing-processes/[id]/resend/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/services/signing-process.service', () => ({
  SigningProcessService: class Mock {
    getProcessWithDetail = vi.fn().mockResolvedValue(null)
    sendNextEmail = vi.fn().mockResolvedValue(true)
  },
}))

describe('API POST /api/signing-processes/[id]/resend', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('retourne 401 sans auth', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: {} }) },
    } as any)
    const req = new NextRequest('http://localhost/api/signing-processes/proc-1/resend', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'proc-1' }) })
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('Non authentifié')
  })

  it('retourne 403 si role non admin/secretary/teacher', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'u@t.com' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1', role: 'student' },
              error: null,
            }),
          }),
        }),
      }),
    } as any)
    const req = new NextRequest('http://localhost/api/signing-processes/proc-1/resend', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'proc-1' }) })
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('Accès non autorisé')
  })
})
