import { describe, it, expect } from 'vitest'
import { encryptToken, decryptToken, isEncryptedToken } from '@/lib/services/accounting/token-crypto'

describe('token-crypto', () => {
  it('round-trips a value', () => {
    const secret = 'fulll-refresh-token-abc123.def456'
    const enc = encryptToken(secret)
    expect(enc).not.toBe(secret)
    expect(isEncryptedToken(enc)).toBe(true)
    expect(decryptToken(enc)).toBe(secret)
  })

  it('prefixes ciphertext with enc:v1:', () => {
    expect(encryptToken('x')?.startsWith('enc:v1:')).toBe(true)
  })

  it('passes through legacy plaintext (no prefix) on decrypt', () => {
    expect(decryptToken('plain-legacy-token')).toBe('plain-legacy-token')
  })

  it('does not double-encrypt', () => {
    const once = encryptToken('secret')!
    expect(encryptToken(once)).toBe(once)
  })

  it('returns null / undefined / empty unchanged', () => {
    expect(encryptToken(null)).toBeNull()
    expect(encryptToken(undefined)).toBeUndefined()
    expect(encryptToken('')).toBe('')
    expect(decryptToken(null)).toBeNull()
    expect(decryptToken('')).toBe('')
  })

  it('returns null when ciphertext is corrupted', () => {
    expect(decryptToken('enc:v1:not-valid-aes')).toBeNull()
  })
})
