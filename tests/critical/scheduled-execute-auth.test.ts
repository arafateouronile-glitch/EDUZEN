/**
 * Tests critiques — Route scheduled/execute : la route doit exiger une clé secrète.
 * On teste la logique d'autorisation (pas l'appel HTTP).
 */

import { describe, it, expect } from 'vitest'

function isScheduledExecuteAuthorized(authHeader: string | null, secretKey: string | undefined): boolean {
  if (!secretKey || !authHeader) return false
  return authHeader === `Bearer ${secretKey}`
}

describe('Scheduled Execute - Auth', () => {
  const validSecret = 'my-secret-key-123'

  it('devrait refuser quand la clé secrète env est absente', () => {
    expect(isScheduledExecuteAuthorized('Bearer any', undefined)).toBe(false)
    expect(isScheduledExecuteAuthorized(null, undefined)).toBe(false)
  })

  it('devrait refuser quand le header Authorization est absent', () => {
    expect(isScheduledExecuteAuthorized(null, validSecret)).toBe(false)
  })

  it('devrait refuser quand le header ne correspond pas à Bearer <secret>', () => {
    expect(isScheduledExecuteAuthorized('Bearer wrong', validSecret)).toBe(false)
    expect(isScheduledExecuteAuthorized('Basic xxx', validSecret)).toBe(false)
    expect(isScheduledExecuteAuthorized(validSecret, validSecret)).toBe(false)
  })

  it('devrait accepter quand Authorization: Bearer <secret> correspond à la clé env', () => {
    expect(isScheduledExecuteAuthorized(`Bearer ${validSecret}`, validSecret)).toBe(true)
  })
})
