import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/accounting/fec-export/route'

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

const { mockGenerateFEC, mockGenerateFilename } = vi.hoisted(() => ({
  mockGenerateFEC: vi.fn().mockResolvedValue('JournalCode|...'),
  mockGenerateFilename: vi.fn().mockReturnValue('FEC_org-1234_202603.txt'),
}))
vi.mock('@/lib/services/fec-export.service', () => ({
  fecExportService: { generateFEC: mockGenerateFEC, generateFECFilename: mockGenerateFilename },
}))

function mockAuthedAdmin() {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { organization_id: 'org-1', role: 'admin' }, error: null }),
        }),
      }),
    }),
  }
}

describe('API GET /api/accounting/fec-export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne 401 sans authentification', async () => {
    const { createServerClient } = await import('@supabase/ssr')
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
    } as any)

    const request = new NextRequest('http://localhost/api/accounting/fec-export')
    const response = await GET(request)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Non authentifié')
  })

  it('retourne 403 si utilisateur sans organisation', async () => {
    const { createServerClient } = await import('@supabase/ssr')
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'u@test.com' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'No rows' },
            }),
          }),
        }),
      }),
    } as any)

    const request = new NextRequest('http://localhost/api/accounting/fec-export')
    const response = await GET(request)

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('Organisation non trouvée')
  })

  it("transmet le modèle choisi (?model=fulll_custom) au service d'export", async () => {
    const { createServerClient } = await import('@supabase/ssr')
    vi.mocked(createServerClient).mockReturnValue(mockAuthedAdmin() as any)

    const request = new NextRequest('http://localhost/api/accounting/fec-export?model=fulll_custom')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockGenerateFEC).toHaveBeenCalledWith(expect.objectContaining({ model: 'fulll_custom' }))
    expect(mockGenerateFilename).toHaveBeenCalledWith('org-1', expect.objectContaining({ model: 'fulll_custom' }))
  })

  it('sans ?model, utilise le modèle par défaut (undefined -> FEC légal côté service)', async () => {
    const { createServerClient } = await import('@supabase/ssr')
    vi.mocked(createServerClient).mockReturnValue(mockAuthedAdmin() as any)

    const request = new NextRequest('http://localhost/api/accounting/fec-export')
    await GET(request)

    expect(mockGenerateFEC).toHaveBeenCalledWith(expect.objectContaining({ model: undefined }))
  })
})
