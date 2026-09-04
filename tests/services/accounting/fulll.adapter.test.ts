import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FulllAdapter } from '@/lib/services/accounting/fulll.adapter'
import { FulllAuthError } from '@/lib/services/accounting/fulll.errors'
import type { AccountingConfig, InvoiceData } from '@/lib/services/accounting/accounting.types'

// FULLL_CLIENT_ID / SECRET requis par tokenRequest
beforeEach(() => {
  process.env.FULLL_CLIENT_ID = 'test-client'
  process.env.FULLL_CLIENT_SECRET = 'test-secret'
})

type Route = { match: (url: string, method: string) => boolean; reply: () => { status?: number; body?: unknown; headers?: Record<string, string> } }

function makeTransport(routes: Route[]) {
  const calls: Array<{ url: string; method: string; body?: string }> = []
  const transport = vi.fn(async (url: string, init?: RequestInit) => {
    const method = (init?.method || 'GET').toUpperCase()
    calls.push({ url, method, body: init?.body as string | undefined })
    const route = routes.find((r) => r.match(url, method))
    const { status = 200, body = {}, headers = {} } = route ? route.reply() : { status: 404, body: { error: 'no route' } }
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    })
  })
  return { transport, calls }
}

const baseConfig: AccountingConfig = {
  id: 'integ-1',
  organization_id: 'org-1',
  provider: 'fulll',
  access_token: 'access-abc',
  refresh_token: 'refresh-abc',
  is_active: true,
  metadata: {},
}

const invoiceData: InvoiceData = {
  id: 'inv-1',
  invoice_number: 'FAC-1',
  issue_date: '2026-03-01',
  due_date: '2026-03-31',
  amount: 1000,
  tax_amount: 200,
  total_amount: 1200,
  currency: 'EUR',
  status: 'sent',
  student_number: 'STU-42',
  student_name: 'Ada Lovelace',
  document_type: 'invoice',
  items: [{ description: 'Formation', quantity: 1, unit_price: 1000, total: 1000 }],
}

describe('FulllAdapter.authenticate / refreshToken', () => {
  it('exchanges an auth code for tokens (form-encoded)', async () => {
    const { transport, calls } = makeTransport([
      {
        match: (u) => u.includes('/cred/oauth2/token'),
        reply: () => ({ body: { access_token: 'AT', refresh_token: 'RT', expires_in: 3600 } }),
      },
    ])
    const adapter = new FulllAdapter({ transport })
    const tokens = await adapter.authenticate(baseConfig, 'the-code')
    expect(tokens).toEqual({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600 })
    expect(calls[0].body).toContain('grant_type=authorization_code')
    expect(calls[0].body).toContain('code=the-code')
  })

  it('throws FulllAuthError on invalid_grant during refresh', async () => {
    const { transport } = makeTransport([
      { match: (u) => u.includes('/cred/oauth2/token'), reply: () => ({ status: 400, body: { error: 'invalid_grant' } }) },
    ])
    const adapter = new FulllAdapter({ transport })
    await expect(adapter.refreshToken(baseConfig)).rejects.toBeInstanceOf(FulllAuthError)
  })

  it('throws when partner credentials are missing', async () => {
    delete process.env.FULLL_CLIENT_ID
    const adapter = new FulllAdapter({ transport: vi.fn() })
    await expect(adapter.authenticate(baseConfig, 'x')).rejects.toBeInstanceOf(FulllAuthError)
  })
})

describe('FulllAdapter.getCompanyInfo', () => {
  it('collects books / currencies / payment_types', async () => {
    const { transport } = makeTransport([
      { match: (u) => u.includes('/accounting/v1/books'), reply: () => ({ body: [{ code: 'VT' }] }) },
      { match: (u) => u.includes('/accounting/v1/currencies'), reply: () => ({ body: [{ code: 'EUR' }] }) },
      { match: (u) => u.includes('/accounting/v1/payment_types'), reply: () => ({ body: [] }) },
    ])
    const adapter = new FulllAdapter({ transport })
    const info = await adapter.getCompanyInfo({ ...baseConfig, company_id: 'dossier-9', company_name: 'ACME' })
    expect(info.company_id).toBe('dossier-9')
    expect(info.data?.books).toEqual([{ code: 'VT' }])
    expect(info.data?.currencies).toEqual([{ code: 'EUR' }])
  })
})

describe('FulllAdapter.syncInvoice', () => {
  it('reuses an existing customer and submits without blocking', async () => {
    const { transport, calls } = makeTransport([
      {
        match: (u, m) => u.includes('/accounting/v1/customers') && m === 'GET',
        reply: () => ({ body: { data: [{ id: 'cust-1', code: 'STU-42' }] } }),
      },
      {
        match: (u, m) => u.includes('/accounting/v1/sales_invoice') && m === 'POST',
        reply: () => ({ status: 202, body: { job_id: 'job-1' } }),
      },
    ])
    const adapter = new FulllAdapter({ transport })
    const res = await adapter.syncInvoice(baseConfig, invoiceData)
    expect(res.external_id).toBe('job-1')
    expect(res.data?.status).toBe('pending')
    // pas de POST /customers puisque trouvé
    expect(calls.some((c) => c.url.includes('/customers') && c.method === 'POST')).toBe(false)
  })

  it('creates the customer when missing', async () => {
    const { transport, calls } = makeTransport([
      { match: (u, m) => u.includes('/accounting/v1/customers') && m === 'GET', reply: () => ({ body: { data: [] } }) },
      { match: (u, m) => u.includes('/accounting/v1/customers') && m === 'POST', reply: () => ({ body: { id: 'cust-new' } }) },
      { match: (u, m) => u.includes('/accounting/v1/sales_invoice') && m === 'POST', reply: () => ({ body: { job_id: 'job-2' } }) },
    ])
    const adapter = new FulllAdapter({ transport })
    const res = await adapter.syncInvoice(baseConfig, invoiceData)
    expect(res.external_id).toBe('job-2')
    expect(calls.some((c) => c.url.includes('/customers') && c.method === 'POST')).toBe(true)
  })
})

describe('FulllAdapter.getImportJob', () => {
  it('maps a done job to synced', async () => {
    const { transport } = makeTransport([
      {
        match: (u) => u.includes('/accounting/v1/jobs/'),
        reply: () => ({ body: { status: 'done', result: { id: 'SI-9', piece_ref: 'FAC-1', url: 'https://fulll/SI-9' } } }),
      },
    ])
    const adapter = new FulllAdapter({ transport })
    const job = await adapter.getImportJob(baseConfig, 'job-1')
    expect(job.data.status).toBe('synced')
    expect(job.external_id).toBe('SI-9')
    expect(job.data.url).toBe('https://fulll/SI-9')
  })

  it('maps a failed job (collective account) to error with a code', async () => {
    const { transport } = makeTransport([
      {
        match: (u) => u.includes('/accounting/v1/jobs/'),
        reply: () => ({ body: { status: 'failed', error_code: 'ERROR_ACCOUNT_NUMBER_NOT_GOOD_SCOPE' } }),
      },
    ])
    const adapter = new FulllAdapter({ transport })
    const job = await adapter.getImportJob(baseConfig, 'job-1')
    expect(job.data.status).toBe('error')
    expect(job.data.error_code).toBe('ERROR_ACCOUNT_NUMBER_NOT_GOOD_SCOPE')
  })

  it('keeps a still-running job pending', async () => {
    const { transport } = makeTransport([
      { match: (u) => u.includes('/accounting/v1/jobs/'), reply: () => ({ body: { status: 'processing' } }) },
    ])
    const adapter = new FulllAdapter({ transport })
    const job = await adapter.getImportJob(baseConfig, 'job-1')
    expect(job.data.status).toBe('pending')
  })
})

describe('FulllAdapter phase 2 stubs', () => {
  it('syncPayment / syncExpense reject', async () => {
    const adapter = new FulllAdapter({ transport: vi.fn() })
    await expect(adapter.syncPayment(baseConfig, {} as never)).rejects.toThrow()
    await expect(adapter.syncExpense(baseConfig, {} as never)).rejects.toThrow()
  })
})
