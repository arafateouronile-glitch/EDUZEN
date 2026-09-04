import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/accounting/callback/[provider]/route'
import { signState } from '@/lib/utils/oauth-state'

vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn() }))

const { mockAuthenticate } = vi.hoisted(() => ({ mockAuthenticate: vi.fn() }))
vi.mock('@/lib/services/accounting.service', () => ({
  AccountingService: class {
    authenticate = mockAuthenticate
  },
}))

function mockSupabase(user: unknown, userRow: unknown) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: userRow, error: null }),
        }),
      }),
    }),
  }
}

const call = (qs: string) => {
  const req = new NextRequest(`http://localhost/api/accounting/callback/fulll${qs}`)
  return GET(req, { params: Promise.resolve({ provider: 'fulll' }) })
}
const locationOf = (res: Response) => res.headers.get('location') || ''

describe('GET /api/accounting/callback/fulll', () => {
  beforeEach(() => vi.clearAllMocks())

  it('redirects with ?error when Fulll returns an error param', async () => {
    const res = await call('?error=access_denied')
    expect(res.status).toBe(307)
    expect(locationOf(res)).toContain('/dashboard/settings/fulll?error=access_denied')
  })

  it('redirects with ?error=missing_code when code/state absent', async () => {
    const res = await call('?state=x')
    expect(locationOf(res)).toContain('error=missing_code')
  })

  it('redirects with ?error=invalid_state for a bad state', async () => {
    const res = await call('?code=abc&state=not-a-valid-state')
    expect(locationOf(res)).toContain('error=invalid_state')
  })

  it('redirects with ?error=org_mismatch when the session org differs from the state', async () => {
    const { createServerClient } = await import('@supabase/ssr')
    vi.mocked(createServerClient).mockReturnValue(
      mockSupabase({ id: 'u1' }, { organization_id: 'org-OTHER', role: 'admin' }) as never
    )
    const state = signState({ organizationId: 'org-1', provider: 'fulll' })
    const res = await call(`?code=abc&state=${encodeURIComponent(state)}`)
    expect(locationOf(res)).toContain('error=org_mismatch')
    expect(mockAuthenticate).not.toHaveBeenCalled()
  })

  it('exchanges the code and redirects with ?connected=1 on success', async () => {
    const { createServerClient } = await import('@supabase/ssr')
    vi.mocked(createServerClient).mockReturnValue(
      mockSupabase({ id: 'u1' }, { organization_id: 'org-1', role: 'admin' }) as never
    )
    mockAuthenticate.mockResolvedValue({ id: 'i1', is_active: true })
    const state = signState({ organizationId: 'org-1', provider: 'fulll' })
    const res = await call(`?code=the-code&state=${encodeURIComponent(state)}`)
    expect(mockAuthenticate).toHaveBeenCalledWith('org-1', 'fulll', 'the-code')
    expect(locationOf(res)).toContain('/dashboard/settings/fulll?connected=1')
  })

  it('redirects with ?error=exchange_failed when authenticate throws', async () => {
    const { createServerClient } = await import('@supabase/ssr')
    vi.mocked(createServerClient).mockReturnValue(
      mockSupabase({ id: 'u1' }, { organization_id: 'org-1', role: 'admin' }) as never
    )
    mockAuthenticate.mockRejectedValue(new Error('token endpoint 400'))
    const state = signState({ organizationId: 'org-1', provider: 'fulll' })
    const res = await call(`?code=x&state=${encodeURIComponent(state)}`)
    expect(locationOf(res)).toContain('error=exchange_failed')
  })
})
