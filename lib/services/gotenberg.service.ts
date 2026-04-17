/**
 * Service Gotenberg pour la génération PDF – contrats Qualiopi, émargements, BPF.
 * Conçu pour une instance Gotenberg 8.x déployée (ex. Railway).
 *
 * Env : GOTENBERG_URL, optionnellement GOTENBERG_API_KEY ou GOTENBERG_BASIC_AUTH
 */

import { logger } from '@/lib/utils/logger'

const GOTENBERG_URL = process.env.GOTENBERG_URL?.replace(/\/$/, '')
const GOTENBERG_API_KEY = process.env.GOTENBERG_API_KEY
const GOTENBERG_BASIC_AUTH = process.env.GOTENBERG_BASIC_AUTH // "user:password" à encoder en Base64 côté appelant ou via env

const DEFAULT_TIMEOUT_MS = 25_000
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

// Cache du chemin d'endpoint détecté pour éviter les détections répétées
let detectedEndpoint: string | null = null

/**
 * Détecte la version de Gotenberg et retourne le bon chemin d'endpoint.
 * Gotenberg 8.x → /forms/chromium/convert/html
 * Gotenberg 7.x → /convert/html
 */
async function detectGotenbergEndpoint(authHeaders: Record<string, string>): Promise<string> {
  if (detectedEndpoint) return detectedEndpoint

  const v8Path = `${GOTENBERG_URL}/forms/chromium/convert/html`
  const v7Path = `${GOTENBERG_URL}/convert/html`

  // Tenter un health check v8
  try {
    const res = await fetch(`${GOTENBERG_URL}/health`, {
      method: 'GET',
      headers: authHeaders,
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      detectedEndpoint = v8Path
      logger.debug('[Gotenberg] Détecté v8 via /health')
      return detectedEndpoint
    }
  } catch {
    // Pas de /health → probablement v7
  }

  // Tenter un health check v7
  try {
    const res = await fetch(`${GOTENBERG_URL}/ping`, {
      method: 'GET',
      headers: authHeaders,
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      detectedEndpoint = v7Path
      logger.debug('[Gotenberg] Détecté v7 via /ping')
      return detectedEndpoint
    }
  } catch {
    // Ignore
  }

  // Par défaut v8
  detectedEndpoint = v8Path
  return detectedEndpoint
}

export function isGotenbergConfigured(): boolean {
  return !!GOTENBERG_URL
}

export interface GotenbergHtmlToPdfOptions {
  /** Format de page */
  format?: 'A4' | 'Letter'
  /** Marges en inches (Gotenberg attend des strings) */
  marginTop?: string
  marginBottom?: string
  marginLeft?: string
  marginRight?: string
  /** HTML d'en-tête (page répétée) – logos, numéro de page via .pageNumber / .totalPages */
  headerHtml?: string
  /** HTML de pied de page */
  footerHtml?: string
  /** CSS additionnel (injecté ou fichier séparé selon implémentation) */
  css?: string
  /** Délai d'attente avant rendu (ex. "1s") */
  waitDelay?: string
  /** Préférer la taille de page définie en CSS (@page) */
  preferCssPageSize?: boolean
  /** Métadonnées pour conformité (titre, créateur – PDF/A exige des métadonnées) */
  metadata?: {
    title?: string
    creator?: string
    subject?: string
  }
}

export class GotenbergError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly body?: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'GotenbergError'
  }
}

function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  if (GOTENBERG_API_KEY) {
    headers['X-API-Key'] = GOTENBERG_API_KEY
  }
  if (GOTENBERG_BASIC_AUTH) {
    // GOTENBERG_BASIC_AUTH peut être "user:password" (on encode) ou déjà "base64"
    const raw = GOTENBERG_BASIC_AUTH
    const encoded = raw.includes(' ') || /^[A-Za-z0-9+/]+=*$/.test(raw) ? raw : Buffer.from(raw, 'utf-8').toString('base64')
    headers['Authorization'] = `Basic ${encoded}`
  }
  return headers
}

/**
 * Génère un PDF à partir de HTML (et optionnellement header/footer) avec retry et timeout.
 */
export async function htmlToPdf(
  html: string,
  options: GotenbergHtmlToPdfOptions = {}
): Promise<Buffer> {
  if (!GOTENBERG_URL) {
    throw new GotenbergError('GOTENBERG_URL is not configured')
  }

  const authHeaders = buildAuthHeaders()
  let endpoint = await detectGotenbergEndpoint(authHeaders)
  const formData = new FormData()

  const blob = new Blob([html], { type: 'text/html' })
  formData.append('files', blob, 'index.html')

  if (options.headerHtml) {
    const headerBlob = new Blob([options.headerHtml], { type: 'text/html' })
    formData.append('files', headerBlob, 'header.html')
  }
  if (options.footerHtml) {
    const footerBlob = new Blob([options.footerHtml], { type: 'text/html' })
    formData.append('files', footerBlob, 'footer.html')
  }
  if (options.css) {
    const cssBlob = new Blob([options.css], { type: 'text/css' })
    formData.append('files', cssBlob, 'styles.css')
  }

  const format = options.format ?? 'A4'
  formData.append('paperWidth', format === 'Letter' ? '8.5' : '8.267')
  formData.append('paperHeight', format === 'Letter' ? '11' : '11.692')

  if (options.marginTop != null) formData.append('marginTop', options.marginTop)
  if (options.marginBottom != null) formData.append('marginBottom', options.marginBottom)
  if (options.marginLeft != null) formData.append('marginLeft', options.marginLeft)
  if (options.marginRight != null) formData.append('marginRight', options.marginRight)
  if (options.waitDelay != null) formData.append('waitDelay', options.waitDelay)
  if (options.preferCssPageSize === true) formData.append('preferCssPageSize', 'true')

  const timeoutMs = DEFAULT_TIMEOUT_MS

  let lastError: Error | null = null
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          ...authHeaders,
        },
      })

      clearTimeout(timeout)

      if (!response.ok) {
        const text = await response.text()
        lastError = new GotenbergError(
          `Gotenberg returned ${response.status}: ${text.slice(0, 500)}`,
          response.status,
          text
        )
        // Si 404 sur l'endpoint v8, basculer vers v7 et réessayer
        if (response.status === 404 && endpoint.includes('/forms/chromium/convert/html')) {
          detectedEndpoint = `${GOTENBERG_URL}/convert/html`
          endpoint = detectedEndpoint
          logger.warn('[Gotenberg] 404 sur v8, bascule vers v7', { newEndpoint: endpoint })
          continue
        }
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          break
        }
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1)
          logger.warn('Gotenberg retry', { attempt, maxRetries: MAX_RETRIES, delay, status: response.status })
          await new Promise((r) => setTimeout(r, delay))
        }
        continue
      }

      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (err) {
      clearTimeout(timeout)
      const isTimeout = err instanceof Error && err.name === 'AbortError'
      const isNetwork = err instanceof TypeError && err.message?.includes('fetch')
      lastError = err instanceof Error ? err : new Error(String(err))

      logger.error('Gotenberg request failed', lastError, {
        attempt,
        maxRetries: MAX_RETRIES,
        isTimeout,
        isNetwork,
      })

      if (attempt < MAX_RETRIES && (isTimeout || isNetwork)) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1)
        await new Promise((r) => setTimeout(r, delay))
      } else {
        break
      }
    }
  }

  if (lastError instanceof GotenbergError) throw lastError
  throw new GotenbergError(
    lastError?.message ?? 'Gotenberg PDF generation failed',
    undefined,
    undefined,
    lastError ?? undefined
  )
}

/**
 * Alias pour compatibilité avec l’ancien client : génère un PDF à partir du HTML seul.
 * Les options étendues (header, footer, métadonnées) sont disponibles via htmlToPdf.
 */
export async function generatePDFWithGotenberg(
  html: string,
  options: { format?: 'A4' | 'Letter'; marginTop?: string; marginBottom?: string; marginLeft?: string; marginRight?: string; waitDelay?: string } = {}
): Promise<Buffer> {
  return htmlToPdf(html, {
    format: options.format,
    marginTop: options.marginTop,
    marginBottom: options.marginBottom,
    marginLeft: options.marginLeft,
    marginRight: options.marginRight,
    waitDelay: options.waitDelay,
  })
}
