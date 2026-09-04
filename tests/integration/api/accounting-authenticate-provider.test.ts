import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/accounting/authenticate/[provider]/route'
import { verifyState } from '@/lib/utils/oauth-state'

vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn() }))

const { mockGetConfig, mockUpsertConfig } = vi.hoisted(() => ({
  mockGetConfig: vi.fn(),
  mockUpsertConfig: vi.fn(),
}))
vi.mock('@/lib/services/accounting.service', () => ({
  AccountingService: class {
    getConfig = mockGetConfig
    upsertConfig = mockUpsertConfig
  },
}))

function mockSupabase(user: unknown, userRow: unknown) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: user ? null : { message: 'no' } }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: userRow, error: userRow ? null : { code: 'PGRST116' } }),
        }),
      }),
    }),
  }
}

describe('GET /api/accounting/authenticate/[provider]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.FULLL_CLIENT_ID = 'cid-123'
    process.env.FULLL_CLIENT_SECRET = 'csecret'
    mockGetConfig.mockResolvedValue({ id: 'i1', is_active: false })
  })

  const call = (provider: string) => {
    const req = new NextRequest(`http://localhost/api/accounting/authenticate/${provider}`)
    return GET(req, { params: Promise.resolve({ provider }) })
  }

  it('returns 501 for a non-fulll provider', async () => {
    const res = await call('cegid')
    expect(res.status).toBe(501)
  })

  it('returns 401 without auth', async () => {
    const { createServerClient } = await import('@supabase/ssr')
    vi.mocked(createServerClient).mockReturnValue(mockSupabase(null, null) as never)
    const res = await call('fulll')
    expect(res.status).toBe(401)
  })

  it('returns 403 for a disallowed role', async () => {
    const { createServerClient } = await import('@supabase/ssr')
    vi.mocked(createServerClient).mockReturnValue(
      mockSupabase({ id: 'u1' }, { organization_id: 'org-1', role: 'teacher' }) as never
    )
    const res = await call('fulll')
    expect(res.status).toBe(403)
  })

  it('returns 503 when the Fulll partner app is not configured', async () => {
    delete process.env.FULLL_CLIENT_ID
    const { createServerClient } = await import('@supabase/ssr')
    vi.mocked(createServerClient).mockReturnValue(
      mockSupabase({ id: 'u1' }, { organization_id: 'org-1', role: 'admin' }) as never
    )
    const res = await call('fulll')
    expect(res.status).toBe(503)
  })

  it('returns an auth_url with client_id, encoded redirect_uri and a valid state', async () => {
    const { createServerClient } = await import('@supabase/ssr')
    vi.mocked(createServerClient).mockReturnValue(
      mockSupabase({ id: 'u1' }, { organization_id: 'org-42', role: 'accountant' }) as never
    )
    const res = await call('fulll')
    expect(res.status).toBe(200)
    const { auth_url } = await res.json()
    const url = new URL(auth_url)
    expect(url.searchParams.get('client_id')).toBe('cid-123')
    expect(url.searchParams.get('redirect_uri')).toContain('/api/accounting/callback/fulll')
    expect(url.searchParams.get('response_type')).toBe('code')
    const state = verifyState(url.searchParams.get('state'))
    expect(state).toMatchObject({ organizationId: 'org-42', provider: 'fulll' })
  })

  it('creates a config row when none exists', async () => {
    mockGetConfig.mockResolvedValue(null)
    const { createServerClient } = await import('@supabase/ssr')
    vi.mocked(createServerClient).mockReturnValue(
      mockSupabase({ id: 'u1' }, { organization_id: 'org-1', role: 'admin' }) as never
    )
    await call('fulll')
    expect(mockUpsertConfig).toHaveBeenCalledWith('org-1', 'fulll', { is_active: false })
  })
})
