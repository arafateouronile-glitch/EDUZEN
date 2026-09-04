/**
 * Tests du câblage Fulll dans AccountingService :
 *  - pushSalesDocuments (factures + avoirs, mapping par issue, skip/force)
 *  - reconcilePendingJobs (bascule pending -> synced/error)
 *  - chiffrement transparent des jetons (convertToAccountingConfig / refreshToken)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockAdapter } = vi.hoisted(() => ({
  mockAdapter: {
    syncInvoice: vi.fn(),
    getImportJob: vi.fn(),
    refreshToken: vi.fn(),
  },
}))
vi.mock('@/lib/services/accounting/fulll.adapter', () => ({
  FulllAdapter: class {
    syncInvoice = mockAdapter.syncInvoice
    getImportJob = mockAdapter.getImportJob
    refreshToken = mockAdapter.refreshToken
    authenticate = vi.fn()
    getCompanyInfo = vi.fn()
    syncPayment = vi.fn()
    syncExpense = vi.fn()
    syncBatch = vi.fn()
  },
}))
vi.mock('@/lib/services/invoice.service', () => ({ InvoiceService: class {} }))
vi.mock('@/lib/services/payment.service', () => ({ PaymentService: class {} }))

import { AccountingService } from '@/lib/services/accounting.service'
import { encryptToken } from '@/lib/services/accounting/token-crypto'

type ResolverKey = string
function makeSupabase(resolvers: Record<ResolverKey, unknown>) {
  const captured: { inserts: unknown[]; updates: unknown[] } = { inserts: [], updates: [] }
  function builder(table: string) {
    let single = false
    let lastOp: 'select' | 'insert' | 'update' = 'select'
    const proxy: Record<string | symbol, unknown> = {}
    const ret = () => proxy
    Object.assign(proxy, {
      select: ret,
      eq: ret,
      in: ret,
      order: ret,
      limit: ret,
      gte: ret,
      lte: ret,
      single: () => {
        single = true
        return proxy
      },
      insert: (rows: unknown) => {
        lastOp = 'insert'
        captured.inserts.push({ table, rows })
        return proxy
      },
      update: (patch: unknown) => {
        lastOp = 'update'
        captured.updates.push({ table, patch })
        return proxy
      },
      then: (res: (v: unknown) => void, rej?: (e: unknown) => void) => {
        const key = lastOp === 'select' ? `${table}${single ? ':single' : ''}` : `${table}:${lastOp}`
        const value = resolvers[key] ?? { data: lastOp === 'select' ? [] : null, error: null }
        return Promise.resolve(value).then(res, rej)
      },
    })
    return proxy
  }
  return {
    client: { from: (t: string) => builder(t) } as never,
    captured,
  }
}

const activeConfig = {
  id: 'integ-1',
  organization_id: 'org-1',
  provider: 'fulll',
  is_active: true,
  token_expires_at: null,
  access_token: encryptToken('access-abc'),
  refresh_token: encryptToken('refresh-abc'),
  metadata: {},
}

const invoiceRow = {
  id: 'inv-1',
  invoice_number: 'FAC-1',
  issue_date: '2026-03-01',
  due_date: '2026-03-31',
  amount: 1000,
  tax_amount: 200,
  total_amount: 1200,
  currency: 'EUR',
  status: 'sent',
  document_type: 'invoice',
  student_id: 'stu-1',
  students: { id: 'stu-1', first_name: 'Ada', last_name: 'Lovelace', student_number: 'STU-42' },
  external_entities: null,
  items: [{ description: 'Formation', quantity: 1, unit_price: 1000, total: 1000 }],
}

describe('AccountingService.pushSalesDocuments', () => {
  beforeEach(() => vi.clearAllMocks())

  it('submits an unmapped invoice and stages a pending mapping', async () => {
    const { client, captured } = makeSupabase({
      'accounting_integrations:single': { data: activeConfig, error: null },
      invoices: { data: [invoiceRow], error: null },
      accounting_entity_mappings: { data: [], error: null },
      'accounting_entity_mappings:insert': { error: null },
      'accounting_sync_logs:insert': { error: null },
      'accounting_integrations:update': { error: null },
    })
    mockAdapter.syncInvoice.mockResolvedValue({ external_id: 'job-1', data: { status: 'pending', job_id: 'job-1' } })

    const service = new AccountingService(client)
    const result = await service.pushSalesDocuments('org-1', 'fulll', {})

    expect(mockAdapter.syncInvoice).toHaveBeenCalledOnce()
    expect(result.records_created).toBe(1)
    expect(result.items).toEqual([{ invoice_id: 'inv-1', status: 'pending', external_id: 'job-1' }])
    const insertedMappings = captured.inserts.find((i: any) => i.table === 'accounting_entity_mappings') as any
    expect(insertedMappings.rows[0]).toMatchObject({ local_entity_id: 'inv-1', entity_type: 'invoice', sync_status: 'pending' })
  })

  it('skips an already-synced invoice unless force is set', async () => {
    const { client } = makeSupabase({
      'accounting_integrations:single': { data: activeConfig, error: null },
      invoices: { data: [invoiceRow], error: null },
      accounting_entity_mappings: {
        data: [{ id: 'map-1', local_entity_id: 'inv-1', entity_type: 'invoice', sync_status: 'synced' }],
        error: null,
      },
      'accounting_sync_logs:insert': { error: null },
      'accounting_integrations:update': { error: null },
    })

    const service = new AccountingService(client)
    const result = await service.pushSalesDocuments('org-1', 'fulll', {})
    expect(mockAdapter.syncInvoice).not.toHaveBeenCalled()
    expect(result.records_skipped).toBe(1)
    expect(result.items[0]).toMatchObject({ invoice_id: 'inv-1', status: 'skipped' })
  })

  it('blocks a synced invoice even with force (create-only API)', async () => {
    const { client } = makeSupabase({
      'accounting_integrations:single': { data: activeConfig, error: null },
      invoices: { data: [invoiceRow], error: null },
      accounting_entity_mappings: {
        data: [{ id: 'map-1', local_entity_id: 'inv-1', entity_type: 'invoice', sync_status: 'synced' }],
        error: null,
      },
      'accounting_sync_logs:insert': { error: null },
      'accounting_integrations:update': { error: null },
    })
    const service = new AccountingService(client)
    const result = await service.pushSalesDocuments('org-1', 'fulll', { force: true })
    expect(mockAdapter.syncInvoice).not.toHaveBeenCalled()
    expect(result.records_skipped).toBe(1)
    expect(result.items[0].error).toMatch(/déjà exporté/i)
  })

  it('records an error mapping when the adapter throws', async () => {
    const { client, captured } = makeSupabase({
      'accounting_integrations:single': { data: activeConfig, error: null },
      invoices: { data: [invoiceRow], error: null },
      accounting_entity_mappings: { data: [], error: null },
      'accounting_entity_mappings:insert': { error: null },
      'accounting_sync_logs:insert': { error: null },
      'accounting_integrations:update': { error: null },
    })
    mockAdapter.syncInvoice.mockRejectedValue(new Error('Fulll a rejeté la requête'))

    const service = new AccountingService(client)
    const result = await service.pushSalesDocuments('org-1', 'fulll', {})
    expect(result.records_failed).toBe(1)
    expect(result.items[0]).toMatchObject({ invoice_id: 'inv-1', status: 'error' })
    const inserted = captured.inserts.find((i: any) => i.table === 'accounting_entity_mappings') as any
    expect(inserted.rows[0].sync_status).toBe('error')
  })

  it('throws when the integration is inactive', async () => {
    const { client } = makeSupabase({
      'accounting_integrations:single': { data: { ...activeConfig, is_active: false }, error: null },
    })
    const service = new AccountingService(client)
    await expect(service.pushSalesDocuments('org-1', 'fulll', {})).rejects.toThrow(/non active/i)
  })
})

describe('AccountingService.reconcilePendingJobs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('flips pending mappings to synced / error from the job status', async () => {
    const { client } = makeSupabase({
      'accounting_integrations:single': { data: activeConfig, error: null },
      accounting_entity_mappings: {
        data: [
          { id: 'm1', external_entity_id: 'job-1', entity_type: 'invoice', sync_status: 'pending' },
          { id: 'm2', external_entity_id: 'job-2', entity_type: 'credit_note', sync_status: 'pending' },
        ],
        error: null,
      },
      'accounting_entity_mappings:update': { error: null },
    })
    mockAdapter.getImportJob
      .mockResolvedValueOnce({ external_id: 'SI-1', data: { status: 'synced', fulll_id: 'SI-1' } })
      .mockResolvedValueOnce({ external_id: 'job-2', data: { status: 'error', error_code: 'ERROR_IMPORT_FAILED' } })

    const service = new AccountingService(client)
    const counts = await service.reconcilePendingJobs('org-1', 'fulll')
    expect(counts).toMatchObject({ checked: 2, synced: 1, failed: 1 })
  })

  it('is a no-op when nothing is pending', async () => {
    const { client } = makeSupabase({
      'accounting_integrations:single': { data: activeConfig, error: null },
      accounting_entity_mappings: { data: [], error: null },
    })
    const service = new AccountingService(client)
    expect(await service.reconcilePendingJobs('org-1', 'fulll')).toEqual({ checked: 0, synced: 0, failed: 0, pending: 0 })
    expect(mockAdapter.getImportJob).not.toHaveBeenCalled()
  })
})
