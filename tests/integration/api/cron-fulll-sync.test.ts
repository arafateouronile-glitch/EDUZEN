import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockPush, mockReconcile, mockFrom } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockReconcile: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/services/accounting.service', () => ({
  AccountingService: class {
    pushSalesDocuments = mockPush
    reconcilePendingJobs = mockReconcile
  },
}))

describe('GET /api/cron/fulll-sync', () => {
  const originalSecret = process.env.CRON_SECRET

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })
  afterEach(() => {
    process.env.CRON_SECRET = originalSecret
  })

  it('returns 401 with an invalid Bearer', async () => {
    process.env.CRON_SECRET = 'fulll-cron-secret'
    const { GET } = await import('@/app/api/cron/fulll-sync/route')
    const req = new NextRequest('http://localhost/api/cron/fulll-sync', {
      headers: { authorization: 'Bearer nope' },
    })
    expect((await GET(req)).status).toBe(401)
  })

  it('returns 503 when CRON_SECRET is unset', async () => {
    delete process.env.CRON_SECRET
    const { GET } = await import('@/app/api/cron/fulll-sync/route')
    const res = await GET(new NextRequest('http://localhost/api/cron/fulll-sync'))
    expect(res.status).toBe(503)
  })

  it('iterates only active auto_sync Fulll integrations', async () => {
    process.env.CRON_SECRET = 'fulll-cron-secret'

    const eqChain: Record<string, unknown> = {}
    eqChain.eq = vi.fn().mockReturnValue(eqChain)
    // dernière .eq() résout la requête
    ;(eqChain.eq as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      eq: eqChain.eq,
      then: (resolve: (v: unknown) => void) =>
        resolve({ data: [{ id: 'i1', organization_id: 'org-1', last_sync_at: null }], error: null }),
    }))
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(eqChain) })
    mockReconcile.mockResolvedValue({ checked: 0, synced: 0, failed: 0, pending: 0 })
    mockPush.mockResolvedValue({
      records_synced: 2, records_created: 0, records_failed: 0, records_skipped: 1,
    })

    const { GET } = await import('@/app/api/cron/fulll-sync/route')
    const req = new NextRequest('http://localhost/api/cron/fulll-sync', {
      headers: { authorization: 'Bearer fulll-cron-secret' },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.integrations).toBe(1)
    expect(mockPush).toHaveBeenCalledWith('org-1', 'fulll', expect.objectContaining({ syncType: 'incremental' }))
  })
})
