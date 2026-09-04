/**
 * Adapter Fulll — pousse les factures / avoirs EDUZEN dans un dossier Fulll via
 * l'API `https://api.fulll.io` (OAuth2 authorization-code).
 *
 * Contrat asynchrone : `syncInvoice` **soumet** le document (`POST /accounting/v1/sales_invoice`)
 * et rend la main immédiatement avec `{ external_id: <job_id>, data: { status: 'pending' } }`.
 * `AccountingService.reconcilePendingJobs` appelle ensuite `getImportJob` pour faire passer
 * le mapping `pending → synced/error`.
 *
 * ⚠️ Les noms de champs / chemins marqués `TODO(fulll-docs)` (ici et dans `fulll.payload.ts`,
 * `app-config.ts`) sont des hypothèses à confirmer avec un compte partenaire Fulll.
 */

import { FULLL_CONFIG } from '@/lib/config/app-config'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'
import type {
  AccountingAdapter,
  AccountingConfig,
  ExpenseData,
  ImportJobStatus,
  InvoiceData,
  PaymentData,
  SyncResult,
} from './accounting.types'
import { getFulllMetadata } from './accounting.types'
import { FulllHttpClient, type FetchLike } from './fulll.client'
import { buildSalesInvoicePayload, buildJournalEntriesPayload, resolveFulllCustomer } from './fulll.payload'
import { FulllAuthError, FulllError, FulllValidationError, mapFulllError } from './fulll.errors'

export type FulllImportJobResult = ImportJobStatus

const PHASE_2 = "Synchronisation Fulll des paiements / dépenses prévue en phase 2"

export class FulllAdapter implements AccountingAdapter {
  private readonly transport?: FetchLike

  constructor(opts: { transport?: FetchLike } = {}) {
    this.transport = opts.transport
  }

  private fetchImpl(): FetchLike {
    return this.transport ?? ((url, init) => fetch(url, init))
  }

  // -------------------------------------------------------------------------
  // OAuth2
  // -------------------------------------------------------------------------

  async authenticate(
    _config: AccountingConfig,
    authCode?: string
  ): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
    if (!authCode) throw new FulllValidationError("Code d'autorisation Fulll manquant")
    return this.tokenRequest({
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: FULLL_CONFIG.getRedirectUri(),
    })
  }

  async refreshToken(
    config: AccountingConfig
  ): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
    const refresh = config.refresh_token
    if (!refresh) throw new FulllAuthError('Aucun refresh token Fulll — reconnexion requise')
    return this.tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: refresh,
    })
  }

  /** Échange OAuth2 (form-urlencoded). TODO(fulll-docs): body form vs JSON, client auth body vs Basic. */
  private async tokenRequest(
    params: Record<string, string>
  ): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
    const clientId = FULLL_CONFIG.getClientId()
    const clientSecret = FULLL_CONFIG.getClientSecret()
    if (!clientId || !clientSecret) {
      throw new FulllAuthError('Connecteur Fulll non configuré (FULLL_CLIENT_ID / FULLL_CLIENT_SECRET absents)')
    }

    const body = new URLSearchParams({ ...params, client_id: clientId, client_secret: clientSecret })
    const url = `${FULLL_CONFIG.getBaseUrl()}${FULLL_CONFIG.tokenPath}`

    let res: Response
    try {
      res = await this.fetchImpl()(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
      })
    } catch (err) {
      logger.error('Fulll token request network error', err, { error: sanitizeError(err) })
      throw new FulllAuthError('Fulll injoignable lors de l\'authentification')
    }

    const text = await res.text()
    const json = text ? safeJson(text) : null

    if (!res.ok) {
      throw mapFulllError(res.status, json as never)
    }

    const payload = json as { access_token?: string; refresh_token?: string; expires_in?: number } | null
    if (!payload?.access_token) {
      throw new FulllAuthError('Réponse OAuth Fulll invalide (access_token manquant)')
    }
    return {
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      expires_in: payload.expires_in,
    }
  }

  private client(config: AccountingConfig): FulllHttpClient {
    return new FulllHttpClient({
      accessToken: config.access_token || '',
      transport: this.transport,
      onUnauthorized: async () => {
        try {
          const t = await this.refreshToken(config)
          // Refresh "one-shot" en mémoire : la persistance est faite par
          // AccountingService lors de l'opération suivante (ensureValidToken).
          return t.access_token
        } catch {
          return null
        }
      },
    })
  }

  // -------------------------------------------------------------------------
  // Référentiels / sanity check
  // -------------------------------------------------------------------------

  async getCompanyInfo(
    config: AccountingConfig
  ): Promise<{ company_id: string; company_name: string; data?: Record<string, unknown> }> {
    const client = this.client(config)
    const meta = getFulllMetadata(config)

    // Appels de sondage — tolérants (un référentiel indisponible ne bloque pas la connexion).
    const [books, currencies, paymentTypes] = await Promise.allSettled([
      client.get(FULLL_CONFIG.booksPath),
      client.get(FULLL_CONFIG.currenciesPath),
      client.get(FULLL_CONFIG.paymentTypesPath),
    ])

    const pick = (r: PromiseSettledResult<{ data: unknown }>) =>
      r.status === 'fulfilled' ? r.value.data : undefined

    const data = {
      books: pick(books),
      currencies: pick(currencies),
      payment_types: pick(paymentTypes),
    }

    // TODO(fulll-docs): d'où vient l'id/nom du dossier ? En attendant on retombe
    // sur la valeur configurée (company_id) ou un placeholder.
    return {
      company_id: meta.company_id || config.company_id || 'fulll-dossier',
      company_name: config.company_name || 'Dossier Fulll',
      data,
    }
  }

  // -------------------------------------------------------------------------
  // Synchronisation d'une facture / d'un avoir
  // -------------------------------------------------------------------------

  async syncInvoice(
    config: AccountingConfig,
    invoiceData: InvoiceData
  ): Promise<{ external_id: string; data?: Record<string, unknown> }> {
    const meta = getFulllMetadata(config)
    const client = this.client(config)

    // 1. Résoudre / créer le client Fulll
    const customerRef = resolveFulllCustomer(invoiceData)
    let customerId = meta.customer_cache?.[customerRef.code]
    if (!customerId) {
      customerId = await this.resolveCustomer(client, customerRef.code, customerRef.name, customerRef.email)
    }

    // 2. Construire le payload selon le mode
    const ctx = { customerId, currencyCode: invoiceData.currency || 'EUR' }
    const submitted_at = new Date().toISOString()

    if (meta.mode === 'entries') {
      const payload = buildJournalEntriesPayload(invoiceData, meta, ctx)
      const res = await client.post<{ job_id?: string; id?: string; status?: string }>(
        FULLL_CONFIG.entriesPath,
        payload
      )
      return this.asPendingResult(res.data, submitted_at)
    }

    const payload = buildSalesInvoicePayload(invoiceData, meta, ctx)
    const res = await client.post<{ job_id?: string; id?: string; status?: string }>(
      FULLL_CONFIG.salesInvoicePath,
      payload
    )
    return this.asPendingResult(res.data, submitted_at)
  }

  /** Cherche un client Fulll par code ; le crée s'il n'existe pas. Renvoie l'id Fulll. */
  private async resolveCustomer(
    client: FulllHttpClient,
    code: string,
    name: string,
    email?: string
  ): Promise<string> {
    // TODO(fulll-docs): nom du paramètre de recherche (`search` / `code` / `reference`)
    try {
      const found = await client.get<{ data?: Array<{ id: string; code?: string }>; id?: string }>(
        FULLL_CONFIG.customersPath,
        { search: code }
      )
      const list = Array.isArray(found.data) ? (found.data as Array<{ id: string; code?: string }>) : found.data?.data
      const match = list?.find((c) => c.code === code) || list?.[0]
      if (match?.id) return match.id
    } catch (err) {
      // recherche non supportée / vide : on tente la création
      if (err instanceof FulllError && err.kind === 'auth') throw err
    }

    // TODO(fulll-docs): champs requis à la création (`code` vs `reference`, compte collectif parent…)
    const created = await client.post<{ id?: string; data?: { id?: string } }>(FULLL_CONFIG.customersPath, {
      code,
      name,
      email,
    })
    const id = (created.data as { id?: string })?.id || (created.data as { data?: { id?: string } })?.data?.id
    if (!id) throw mapFulllError(created.status, created.data as never)
    return id
  }

  private asPendingResult(
    raw: { job_id?: string; id?: string; status?: string } | null,
    submitted_at: string
  ): FulllImportJobResult {
    const jobId = raw?.job_id || raw?.id || `pending-${submitted_at}`
    return {
      external_id: jobId,
      data: { status: 'pending', job_id: jobId, submitted_at },
    }
  }

  /**
   * Interroge le statut d'un job d'import Fulll.
   * TODO(fulll-docs): path exact (`/accounting/v1/jobs/{id}`), forme de la réponse,
   * polling vs webhook.
   */
  async getImportJob(config: AccountingConfig, jobId: string): Promise<FulllImportJobResult> {
    // Job jamais réellement soumis (mode dégradé) : renvoyer une erreur exploitable.
    if (jobId.startsWith('pending-')) {
      return {
        external_id: jobId,
        data: { status: 'error', error_code: 'ERROR_IMPORT_FAILED', error_message: 'Job Fulll introuvable' },
      }
    }

    const client = this.client(config)
    let res
    try {
      res = await client.get<{
        status?: string
        state?: string
        result?: { id?: string; piece_ref?: string; url?: string }
        error_code?: string
        error?: string
        message?: string
      }>(`${FULLL_CONFIG.jobsPath}/${encodeURIComponent(jobId)}`)
    } catch (err) {
      if (err instanceof FulllError && err.retryable) {
        // transitoire : laisser en pending, on réessaiera
        return { external_id: jobId, data: { status: 'pending', job_id: jobId } }
      }
      throw err
    }

    const status = String(res.data.status || res.data.state || '').toLowerCase()
    const done = ['done', 'success', 'succeeded', 'completed', 'finished'].includes(status)
    const failed = ['failed', 'error', 'errored'].includes(status)

    if (done) {
      return {
        external_id: res.data.result?.id || jobId,
        data: {
          status: 'synced',
          job_id: jobId,
          fulll_id: res.data.result?.id,
          piece_ref: res.data.result?.piece_ref,
          url: res.data.result?.url,
          confirmed_at: new Date().toISOString(),
        },
      }
    }
    if (failed) {
      const mapped = mapFulllError(422, {
        error_code: res.data.error_code,
        message: res.data.message || res.data.error,
      } as never)
      return {
        external_id: jobId,
        data: {
          status: 'error',
          job_id: jobId,
          error_code: mapped.code || res.data.error_code || 'ERROR_IMPORT_FAILED',
          error_message: mapped.message,
        },
      }
    }
    return { external_id: jobId, data: { status: 'pending', job_id: jobId } }
  }

  // -------------------------------------------------------------------------
  // Phase 2 — non implémenté
  // -------------------------------------------------------------------------

  async syncPayment(_config: AccountingConfig, _paymentData: PaymentData): Promise<{ external_id: string; data?: Record<string, unknown> }> {
    throw new FulllError('validation', PHASE_2)
  }

  async syncExpense(_config: AccountingConfig, _expenseData: ExpenseData): Promise<{ external_id: string; data?: Record<string, unknown> }> {
    throw new FulllError('validation', PHASE_2)
  }

  async syncBatch(
    config: AccountingConfig,
    data: { invoices?: InvoiceData[]; payments?: PaymentData[]; expenses?: ExpenseData[] }
  ): Promise<SyncResult> {
    const invoices = data.invoices ?? []
    const result: SyncResult = {
      success: true,
      records_synced: 0,
      records_failed: 0,
      records_created: 0,
      records_updated: 0,
      records_skipped: 0,
      errors: [],
    }

    const settled = await Promise.allSettled(invoices.map((inv) => this.syncInvoice(config, inv)))
    settled.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        result.records_synced++
        result.records_created++
      } else {
        result.records_failed++
        result.errors?.push({
          entity_id: invoices[i]?.id,
          error: r.reason instanceof Error ? r.reason.message : 'Erreur inconnue',
        })
        logger.error('Fulll syncBatch item failed', r.reason, {
          error: sanitizeError(r.reason),
          invoice: maskId(invoices[i]?.id || ''),
        })
      }
    })
    result.success = result.records_failed === 0
    return result
  }
}

// ---------------------------------------------------------------------------

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
