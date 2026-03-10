import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/document-templates/[id]/copy-header-footer/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/services/document-template.service', () => ({
  DocumentTemplateService: class Mock {
    getTemplateById = vi.fn().mockResolvedValue({ id: 't1', organization_id: 'org-1' })
    copyHeaderFooter = vi.fn().mockResolvedValue({})
  },
}))

describe('API POST /api/document-templates/[id]/copy-header-footer', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('retourne 401 sans auth', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: {} }) },
    } as any)
    const req = new NextRequest('http://localhost/api/document-templates/t1/copy-header-footer', {
      method: 'POST',
      body: JSON.stringify({ sourceTemplateId: 't0' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 't1' }) })
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('Non autorisé')
  })
})
