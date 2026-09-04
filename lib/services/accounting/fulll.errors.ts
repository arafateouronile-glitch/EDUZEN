/**
 * Taxonomie d'erreurs du connecteur Fulll.
 *
 * `mapFulllError(status, body)` traduit une réponse HTTP Fulll (ou un statut de job
 * d'import) en une erreur typée que `AccountingService` / la route de sync savent
 * catégoriser (reconnexion requise, erreur de config, à réessayer, échec définitif).
 */

export type FulllErrorKind =
  | 'auth' // reconnexion Fulll requise
  | 'collective_account' // ERROR_ACCOUNT_NUMBER_NOT_GOOD_SCOPE
  | 'import' // ERROR_IMPORT_FAILED / échec de job
  | 'rate_limit' // 429
  | 'validation' // 4xx : payload / données invalides
  | 'server' // 5xx / réseau — à réessayer

export class FulllError extends Error {
  readonly kind: FulllErrorKind
  /** `true` si un nouvel essai automatique a du sens (5xx, 429). */
  readonly retryable: boolean
  /** Code d'erreur Fulll d'origine, si connu. */
  readonly code?: string
  readonly httpStatus?: number

  constructor(
    kind: FulllErrorKind,
    message: string,
    opts: { retryable?: boolean; code?: string; httpStatus?: number } = {}
  ) {
    super(message)
    this.name = 'FulllError'
    this.kind = kind
    this.retryable = opts.retryable ?? (kind === 'server' || kind === 'rate_limit')
    this.code = opts.code
    this.httpStatus = opts.httpStatus
  }
}

export class FulllAuthError extends FulllError {
  constructor(message = 'Reconnexion Fulll requise', code?: string) {
    super('auth', message, { retryable: false, code, httpStatus: 401 })
    this.name = 'FulllAuthError'
  }
}

export class FulllCollectiveAccountError extends FulllError {
  constructor(
    message = 'Compte client collectif (411) non imputable directement — configurez une stratégie de compte auxiliaire dans Paramètres → Fulll.'
  ) {
    super('collective_account', message, { retryable: false, code: 'ERROR_ACCOUNT_NUMBER_NOT_GOOD_SCOPE' })
    this.name = 'FulllCollectiveAccountError'
  }
}

export class FulllImportError extends FulllError {
  constructor(message = "L'import Fulll a échoué", code = 'ERROR_IMPORT_FAILED') {
    super('import', message, { retryable: false, code })
    this.name = 'FulllImportError'
  }
}

export class FulllRateLimitError extends FulllError {
  readonly retryAfterMs?: number
  constructor(message = 'Fulll : limite de débit atteinte', retryAfterMs?: number) {
    super('rate_limit', message, { retryable: true, httpStatus: 429 })
    this.name = 'FulllRateLimitError'
    this.retryAfterMs = retryAfterMs
  }
}

export class FulllValidationError extends FulllError {
  constructor(message: string, opts: { code?: string; httpStatus?: number } = {}) {
    super('validation', message, { retryable: false, ...opts })
    this.name = 'FulllValidationError'
  }
}

export class FulllServerError extends FulllError {
  constructor(message = 'Fulll est momentanément indisponible', httpStatus?: number) {
    super('server', message, { retryable: true, httpStatus })
    this.name = 'FulllServerError'
  }
}

type FulllErrorBody = {
  error?: string
  error_description?: string
  message?: string
  code?: string
  error_code?: string
  errors?: Array<{ message?: string; code?: string }>
} | string | null | undefined

function extractMessage(body: FulllErrorBody): { message?: string; code?: string } {
  if (!body) return {}
  if (typeof body === 'string') return { message: body }
  const code = body.error_code || body.code || body.errors?.[0]?.code
  const message =
    body.error_description ||
    body.message ||
    body.errors?.[0]?.message ||
    (typeof body.error === 'string' ? body.error : undefined)
  return { message, code }
}

/**
 * Traduit une réponse Fulll en `FulllError`. `body` peut être l'objet JSON parsé
 * de la réponse HTTP, ou l'objet d'un job d'import en échec.
 */
export function mapFulllError(status: number, body: FulllErrorBody, retryAfterMs?: number): FulllError {
  const { message, code } = extractMessage(body)
  const upperCode = code?.toUpperCase()

  if (upperCode === 'ERROR_ACCOUNT_NUMBER_NOT_GOOD_SCOPE') {
    return new FulllCollectiveAccountError(message)
  }
  if (upperCode === 'ERROR_IMPORT_FAILED') {
    return new FulllImportError(message, code)
  }
  if (status === 401 || (typeof body === 'object' && body?.error === 'invalid_grant')) {
    return new FulllAuthError(message, code)
  }
  if (status === 429) {
    return new FulllRateLimitError(message, retryAfterMs)
  }
  if (status >= 500) {
    return new FulllServerError(message, status)
  }
  if (status >= 400) {
    return new FulllValidationError(message || `Fulll a rejeté la requête (HTTP ${status})`, {
      code,
      httpStatus: status,
    })
  }
  return new FulllError('server', message || `Erreur Fulll inattendue (HTTP ${status})`, { httpStatus: status, code })
}

export function isFulllError(err: unknown): err is FulllError {
  return err instanceof FulllError
}
