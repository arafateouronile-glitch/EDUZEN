import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/documents/init-docx-templates/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

describe('API POST /api/documents/init-docx-templates', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('retourne 401 sans auth', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: {} }) },
    } as any)
    const req = new NextRequest('http://localhost/api/documents/init-docx-templates', {
      method: 'POST',
      body: JSON.stringify({ organizationId: 'org-1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('Non autorisé')
  })

  it('retourne 400 si organizationId manquant', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'u@t.com' } }, error: null }) },
    } as any)
    const req = new NextRequest('http://localhost/api/documents/init-docx-templates', { method: 'POST', body: '{}' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('ID organisation manquant')
  })
})
