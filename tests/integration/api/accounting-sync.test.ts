import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/accounting/sync/route'

vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn() }))

const { mockPush, mockGetConfig, mockReconcile, mockGetSyncLogs } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockGetConfig: vi.fn(),
  mockReconcile: vi.fn(),
  mockGetSyncLogs: vi.fn(),
}))
vi.mock('@/lib/services/accounting.service', () => ({
  AccountingService: class {
    pushSalesDocuments = mockPush
    getConfig = mockGetConfig
    reconcilePendingJobs = mockReconcile
    getSyncLogs = mockGetSyncLogs
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
async function withUser(user: unknown, row: unknown) {
  const { createServerClient } = await import('@supabase/ssr')
  vi.mocked(createServerClient).mockReturnValue(mockSupabase(user, row) as never)
}

const postReq = (body: unknown) =>
  new NextRequest('http://localhost/api/accounting/sync', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('POST /api/accounting/sync', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 without auth', async () => {
    await withUser(null, null)
    expect((await POST(postReq({ provider: 'fulll', mode: 'range' }))).status).toBe(401)
  })

  it('403 for a disallowed role', async () => {
    await withUser({ id: 'u1' }, { organization_id: 'org-1', role: 'student' })
    expect((await POST(postReq({ provider: 'fulll', mode: 'range' }))).status).toBe(403)
  })

  it('400 for an unsupported provider', async () => {
    await withUser({ id: 'u1' }, { organization_id: 'org-1', role: 'admin' })
    expect((await POST(postReq({ provider: 'xero', mode: 'range' }))).status).toBe(400)
  })

  it('400 for single mode without invoiceId', async () => {
    await withUser({ id: 'u1' }, { organization_id: 'org-1', role: 'admin' })
    expect((await POST(postReq({ provider: 'fulll', mode: 'single' }))).status).toBe(400)
  })

  it('pushes and returns the SalesPushResult (single)', async () => {
    await withUser({ id: 'u1' }, { organization_id: 'org-1', role: 'accountant' })
    mockPush.mockResolvedValue({
      success: true, records_synced: 0, records_created: 1, records_failed: 0, records_skipped: 0,
      errors: [], items: [{ invoice_id: 'inv-1', status: 'pending', external_id: 'job-1' }],
    })
    const res = await POST(postReq({ provider: 'fulll', mode: 'single', invoiceId: 'inv-1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items[0]).toMatchObject({ invoice_id: 'inv-1', status: 'pending' })
    expect(mockPush).toHaveBeenCalledWith('org-1', 'fulll', expect.objectContaining({ invoiceIds: ['inv-1'] }))
  })
})

describe('GET /api/accounting/sync', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reconciles then returns integration status + logs', async () => {
    await withUser({ id: 'u1' }, { organization_id: 'org-1', role: 'admin' })
    mockGetConfig.mockResolvedValue({ id: 'i1', is_active: true, last_sync_status: 'success' })
    mockReconcile.mockResolvedValue({ checked: 2, synced: 1, failed: 0, pending: 1 })
    mockGetSyncLogs.mockResolvedValue([{ id: 'log-1', status: 'success' }])

    const res = await GET(new NextRequest('http://localhost/api/accounting/sync?provider=fulll'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.integration.is_active).toBe(true)
    expect(body.reconciled).toMatchObject({ synced: 1 })
    expect(body.logs).toHaveLength(1)
    expect(mockReconcile).toHaveBeenCalledWith('org-1', 'fulll')
  })
})
