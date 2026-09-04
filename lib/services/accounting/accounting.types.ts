/**
 * Types pour les services comptables
 */

export type AccountingProvider = 'xero' | 'quickbooks' | 'sage' | 'fulll'

export interface AccountingConfig {
  id: string
  organization_id: string
  provider: AccountingProvider
  access_token?: string
  refresh_token?: string
  token_expires_at?: string
  tenant_id?: string
  company_id?: string
  company_name?: string
  api_key?: string
  api_secret?: string
  api_url?: string
  is_active: boolean
  is_test_mode?: boolean | null
  sync_invoices?: boolean | null
  sync_payments?: boolean | null
  sync_expenses?: boolean | null
  auto_sync?: boolean | null
  sync_frequency?: 'hourly' | 'daily' | 'weekly' | 'manual'
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
  /** Numéro d'apprenant (compte auxiliaire côté Fulll) */
  student_number?: string | null
  /** Entité externe destinataire de la facture (OPCO, entreprise) si pas d'apprenant */
  entity?: { id: string; name: string; email?: string | null } | null
  /** 'invoice' (facture) ou 'credit_note' (avoir) */
  document_type?: 'invoice' | 'credit_note'
  /** Numéro de la facture d'origine, pour un avoir */
  original_invoice_number?: string | null
  /** Code journal comptable (défaut 'VT') */
  journal_code?: string
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

/** Statut d'un job d'import asynchrone (Fulll). `external_id` = id du document créé une fois `synced`. */
export interface ImportJobStatus {
  external_id: string
  data: {
    status: 'pending' | 'synced' | 'error'
    job_id?: string
    fulll_id?: string
    piece_ref?: string
    url?: string
    error_code?: string
    error_message?: string
    submitted_at?: string
    confirmed_at?: string
  }
}

export interface AccountingAdapter {
  authenticate(config: AccountingConfig, authCode?: string): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }>
  refreshToken(config: AccountingConfig): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }>
  getCompanyInfo(config: AccountingConfig): Promise<{ company_id: string; company_name: string; data?: Record<string, unknown> }>
  syncInvoice(config: AccountingConfig, invoiceData: InvoiceData): Promise<{ external_id: string; data?: Record<string, unknown> }>
  syncPayment(config: AccountingConfig, paymentData: PaymentData): Promise<{ external_id: string; data?: Record<string, unknown> }>
  syncExpense(config: AccountingConfig, expenseData: ExpenseData): Promise<{ external_id: string; data?: Record<string, unknown> }>
  syncBatch(config: AccountingConfig, data: { invoices?: InvoiceData[]; payments?: PaymentData[]; expenses?: ExpenseData[] }): Promise<SyncResult>
  /** Optionnel : providers à import asynchrone (Fulll) — interroge le statut d'un job. */
  getImportJob?(config: AccountingConfig, jobId: string): Promise<ImportJobStatus>
}

// ---------------------------------------------------------------------------
// Fulll — configuration par organisation (stockée dans accounting_integrations.metadata)
// ---------------------------------------------------------------------------

export type FulllMode = 'sales_invoice' | 'entries'
export type FulllCustomerAccountStrategy = 'collective_auxiliary' | 'per_customer'

export interface FulllMetadata {
  /** Code du journal des ventes (défaut 'VT') */
  sales_journal_code: string
  /** Stratégie de compte client */
  customer_account_strategy: FulllCustomerAccountStrategy
  /** Compte client collectif (défaut '411000') — utilisé avec la stratégie collective + auxiliaire */
  collective_customer_account: string
  /** Compte de produit par défaut (défaut '701000') */
  default_revenue_account: string
  /** Compte de produit par taux de TVA ex. { '20': '445710' } (défaut { '20': '445710' }) */
  vat_account_map: Record<string, string>
  /** Identifiant du dossier Fulll (rempli après connexion) */
  company_id?: string
  /** Mode d'envoi : facture structurée (défaut) ou écritures brutes (expérimental, sans UI) */
  mode: FulllMode
  /** Cache résolution client EDUZEN ref -> id Fulll (rempli par l'adapter) */
  customer_cache?: Record<string, string>
  /** Snapshot des référentiels Fulll (journaux, devises, types de paiement) rangé par getCompanyInfo */
  company_info?: Record<string, unknown>
}

export const FULLL_METADATA_DEFAULTS: FulllMetadata = {
  sales_journal_code: 'VT',
  customer_account_strategy: 'collective_auxiliary',
  collective_customer_account: '411000',
  default_revenue_account: '701000',
  vat_account_map: { '20': '445710' },
  mode: 'sales_invoice',
}

/**
 * Lit la configuration Fulll d'une organisation depuis `config.metadata`, en
 * appliquant les valeurs par défaut pour toute clé absente.
 */
export function getFulllMetadata(config: {
  metadata?: Record<string, unknown> | null
  company_id?: string | null
}): FulllMetadata {
  const raw = (config.metadata ?? {}) as Partial<FulllMetadata>
  return {
    ...FULLL_METADATA_DEFAULTS,
    ...raw,
    vat_account_map: {
      ...FULLL_METADATA_DEFAULTS.vat_account_map,
      ...(raw.vat_account_map ?? {}),
    },
    company_id: raw.company_id ?? config.company_id ?? undefined,
  }
}
