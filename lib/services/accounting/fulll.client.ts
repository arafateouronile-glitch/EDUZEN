/**
 * Client HTTP bas niveau pour l'API Fulll (`https://api.fulll.io`).
 *
 * Responsabilités :
 *  - préfixer la base URL (`FULLL_CONFIG.getBaseUrl()`)
 *  - poser `Authorization: Bearer <access_token>`
 *  - JSON in / JSON out
 *  - retry avec backoff sur 429 et 5xx
 *  - sur 401 : appeler `onUnauthorized()` (rafraîchit le token) puis rejouer 1 fois
 *  - `transport` injectable pour les tests (fake fetch)
 *
 * Il ne connaît rien à la logique métier : le mapping des erreurs est fait par
 * `mapFulllError` chez l'appelant (l'adapter).
 */

import { FULLL_CONFIG } from '@/lib/config/app-config'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { mapFulllError, FulllError, FulllServerError } from './fulll.errors'

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

export interface FulllHttpOptions {
  /** Jeton d'accès courant (déjà déchiffré). */
  accessToken: string
  /** Rafraîchit le jeton et renvoie le nouveau ; appelé une fois sur 401. */
  onUnauthorized?: () => Promise<string | null>
  /** fetch injectable (tests). Défaut : `globalThis.fetch`. */
  transport?: FetchLike
  /** Nombre max de tentatives sur erreur transitoire (429/5xx). Défaut 3. */
  maxRetries?: number
  /** Base pour le backoff, en ms. Défaut 500. */
  backoffBaseMs?: number
}

export interface FulllRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Chemin (`/accounting/v1/...`) ou URL absolue. */
  path: string
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
  /** Content-Type du corps. Défaut `application/json`. `form` => x-www-form-urlencoded. */
  bodyType?: 'json' | 'form'
  headers?: Record<string, string>
  /** Ne pas poser le Bearer (ex. échange de token OAuth). */
  noAuth?: boolean
}

export interface FulllResponse<T = unknown> {
  status: number
  data: T
  headers: Headers
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildUrl(path: string, query?: FulllRequest['query']): string {
  const base = path.startsWith('http') ? path : `${FULLL_CONFIG.getBaseUrl()}${path}`
  if (!query) return base
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) usp.set(k, String(v))
  }
  const qs = usp.toString()
  return qs ? `${base}?${qs}` : base
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export class FulllHttpClient {
  private accessToken: string
  private readonly onUnauthorized?: () => Promise<string | null>
  private readonly transport: FetchLike
  private readonly maxRetries: number
  private readonly backoffBaseMs: number

  constructor(opts: FulllHttpOptions) {
    this.accessToken = opts.accessToken
    this.onUnauthorized = opts.onUnauthorized
    this.transport = opts.transport ?? ((url, init) => fetch(url, init))
    this.maxRetries = opts.maxRetries ?? 3
    this.backoffBaseMs = opts.backoffBaseMs ?? 500
  }

  async request<T = unknown>(req: FulllRequest): Promise<FulllResponse<T>> {
    return this.execute<T>(req, /* refreshed */ false)
  }

  get<T = unknown>(path: string, query?: FulllRequest['query']): Promise<FulllResponse<T>> {
    return this.request<T>({ method: 'GET', path, query })
  }

  post<T = unknown>(path: string, body?: unknown, opts: Partial<FulllRequest> = {}): Promise<FulllResponse<T>> {
    return this.request<T>({ method: 'POST', path, body, ...opts })
  }

  private headersFor(req: FulllRequest): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(req.headers ?? {}),
    }
    if (req.body !== undefined) {
      headers['Content-Type'] =
        req.bodyType === 'form' ? 'application/x-www-form-urlencoded' : 'application/json'
    }
    if (!req.noAuth && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }
    return headers
  }

  private encodeBody(req: FulllRequest): BodyInit | undefined {
    if (req.body === undefined) return undefined
    if (req.bodyType === 'form') {
      const usp = new URLSearchParams()
      for (const [k, v] of Object.entries(req.body as Record<string, unknown>)) {
        if (v !== undefined && v !== null) usp.set(k, String(v))
      }
      return usp.toString()
    }
    return JSON.stringify(req.body)
  }

  private async execute<T>(req: FulllRequest, refreshed: boolean): Promise<FulllResponse<T>> {
    const url = buildUrl(req.path, req.query)
    let attempt = 0
    let lastError: unknown

    while (attempt <= this.maxRetries) {
      let res: Response
      try {
        res = await this.transport(url, {
          method: req.method,
          headers: this.headersFor(req),
          body: this.encodeBody(req),
        })
      } catch (networkErr) {
        // Erreur réseau : traitée comme transitoire
        lastError = networkErr
        if (attempt < this.maxRetries) {
          await sleep(this.backoffBaseMs * 2 ** attempt)
          attempt++
          continue
        }
        logger.error('Fulll HTTP network error', networkErr, { error: sanitizeError(networkErr), path: req.path })
        throw new FulllServerError('Fulll injoignable (erreur réseau)')
      }

      const data = (await parseBody(res)) as T

      if (res.ok) {
        return { status: res.status, data, headers: res.headers }
      }

      // 401 : tenter un refresh de token une seule fois
      if (res.status === 401 && !refreshed && this.onUnauthorized) {
        const newToken = await this.onUnauthorized()
        if (newToken) {
          this.accessToken = newToken
          return this.execute<T>(req, /* refreshed */ true)
        }
      }

      // 429 / 5xx : backoff + retry
      if (RETRYABLE_STATUS.has(res.status) && attempt < this.maxRetries) {
        const retryAfterHeader = res.headers.get('retry-after')
        const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : undefined
        await sleep(retryAfterMs ?? this.backoffBaseMs * 2 ** attempt)
        attempt++
        continue
      }

      const retryAfterHeader = res.headers.get('retry-after')
      throw mapFulllError(
        res.status,
        data as never,
        retryAfterHeader ? Number(retryAfterHeader) * 1000 : undefined
      )
    }

    if (lastError instanceof FulllError) throw lastError
    throw new FulllServerError('Fulll : échec après plusieurs tentatives')
  }
}
