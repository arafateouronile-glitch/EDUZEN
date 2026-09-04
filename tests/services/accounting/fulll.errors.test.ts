import { describe, it, expect } from 'vitest'
import {
  mapFulllError,
  FulllAuthError,
  FulllCollectiveAccountError,
  FulllImportError,
  FulllRateLimitError,
  FulllValidationError,
  FulllServerError,
} from '@/lib/services/accounting/fulll.errors'

describe('mapFulllError', () => {
  it('maps the collective-account job error', () => {
    const e = mapFulllError(422, { error_code: 'ERROR_ACCOUNT_NUMBER_NOT_GOOD_SCOPE' })
    expect(e).toBeInstanceOf(FulllCollectiveAccountError)
    expect(e.retryable).toBe(false)
  })

  it('maps ERROR_IMPORT_FAILED', () => {
    const e = mapFulllError(422, { error_code: 'ERROR_IMPORT_FAILED', message: 'boom' })
    expect(e).toBeInstanceOf(FulllImportError)
    expect(e.message).toBe('boom')
  })

  it('maps 401 and invalid_grant to auth errors', () => {
    expect(mapFulllError(401, { message: 'nope' })).toBeInstanceOf(FulllAuthError)
    expect(mapFulllError(400, { error: 'invalid_grant' })).toBeInstanceOf(FulllAuthError)
  })

  it('maps 429 to a retryable rate-limit error', () => {
    const e = mapFulllError(429, {}, 2000)
    expect(e).toBeInstanceOf(FulllRateLimitError)
    expect(e.retryable).toBe(true)
    expect((e as FulllRateLimitError).retryAfterMs).toBe(2000)
  })

  it('maps 5xx to a retryable server error, other 4xx to validation', () => {
    expect(mapFulllError(503, {}).retryable).toBe(true)
    expect(mapFulllError(503, {})).toBeInstanceOf(FulllServerError)
    expect(mapFulllError(422, { message: 'bad payload' })).toBeInstanceOf(FulllValidationError)
  })

  it('reads a message from a plain-string body', () => {
    expect(mapFulllError(400, 'raw text').message).toBe('raw text')
  })
})
