/**
 * Types pour les services comptables
 */

export type AccountingProvider = 'xero' | 'quickbooks' | 'sage'

export interface AccountingConfig {
  id: string
  organization_id: string
  provider: AccountingProvider
  access_token?: string
  refresh_token?: string
  tenant_id?: string
  company_id?: string
  is_active: boolean
  metadata?: Record<string, unknown>
}

export interface InvoiceData {
  id: string
  invoice_number: string
  issue_date?: string | null
  due_date: string
  amount: number
  tax_amount: number
  total_amount: number
  currency: string
  status: string
  student_id?: string | null
  student_name?: string
  items?: Array<{ description: string; quantity: number; unit_price: number; total: number }>
}

export interface PaymentData {
  id: string
  invoice_id: string
  amount: number
  currency: string
  payment_method: string
  paid_at?: string | null
  payment_date?: string | null
  transaction_id?: string
  status?: string
}

export interface ExpenseData {
  id: string
  description: string
  amount: number
  currency: string
  date: string
  category?: string
  vendor?: string
}

export interface SyncResult {
  success: boolean
  records_synced: number
  records_failed: number
  records_created: number
  records_updated: number
  records_skipped: number
  errors?: Array<{ error: string; record_id?: string; entity_id?: string }>
}

export interface AccountingAdapter {
  authenticate(config: AccountingConfig, authCode?: string): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }>
  refreshToken(config: AccountingConfig): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }>
  getCompanyInfo(config: AccountingConfig): Promise<{ company_id: string; company_name: string; data?: Record<string, unknown> }>
  syncInvoice(config: AccountingConfig, invoiceData: InvoiceData): Promise<{ external_id: string; data?: Record<string, unknown> }>
  syncPayment(config: AccountingConfig, paymentData: PaymentData): Promise<{ external_id: string; data?: Record<string, unknown> }>
  syncExpense(config: AccountingConfig, expenseData: ExpenseData): Promise<{ external_id: string; data?: Record<string, unknown> }>
  syncBatch(config: AccountingConfig, data: { invoices?: InvoiceData[]; payments?: PaymentData[]; expenses?: ExpenseData[] }): Promise<SyncResult>
}
