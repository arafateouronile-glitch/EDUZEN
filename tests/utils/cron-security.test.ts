/**
 * Tests unitaires pour lib/utils/cron-security.ts (validateCronRequest)
 */
import { describe, it, expect } from 'vitest'
import { validateCronRequest } from '@/lib/utils/cron-security'
import type { NextRequest } from 'next/server'

function createMockRequest(headers: Record<string, string> = {}): NextRequest {
  const get = (name: string) => {
    const lower = name.toLowerCase()
    const key = Object.keys(headers).find((k) => k.toLowerCase() === lower)
    return key ? headers[key] : null
  }
  return {
    headers: { get },
    nextUrl: { pathname: '/api/cron/test' },
    method: 'GET',
  } as unknown as NextRequest
}

describe('validateCronRequest', () => {
  it('retourne valid false si requireSecret et pas de secret configuré', () => {
    const req = createMockRequest({ Authorization: 'Bearer x' })
    const result = validateCronRequest(req, { secret: undefined, requireSecret: true })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('CRON_SECRET')
  })

  it('retourne valid false si secret fourni mais pas de header Authorization', () => {
    const req = createMockRequest({})
    const result = validateCronRequest(req, { secret: 'my-secret', requireSecret: true })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Secret manquant')
  })

  it('retourne valid false si Bearer ne correspond pas au secret', () => {
    const req = createMockRequest({ Authorization: 'Bearer wrong' })
    const result = validateCronRequest(req, { secret: 'my-secret', requireSecret: true })
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Secret invalide')
    expect(result.details?.secretValid).toBe(false)
  })

  it('retourne valid true si Bearer correspond au secret', () => {
    const req = createMockRequest({ Authorization: 'Bearer my-secret' })
    const result = validateCronRequest(req, { secret: 'my-secret', requireSecret: true })
    expect(result.valid).toBe(true)
    expect(result.details?.secretValid).toBe(true)
    expect(result.details?.ipValid).toBe(true)
  })

  it('retourne valid true si requireSecret false (pas de verification secret)', () => {
    const req = createMockRequest({})
    const result = validateCronRequest(req, { requireSecret: false })
    expect(result.valid).toBe(true)
  })

  it('retourne valid false si allowedIPs configuré et IP non dans la liste', () => {
    const req = createMockRequest({
      Authorization: 'Bearer s',
      'x-forwarded-for': '192.168.1.1',
    })
    const result = validateCronRequest(req, {
      secret: 's',
      requireSecret: true,
      allowedIPs: ['10.0.0.1'],
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('IP non autorisée')
    expect(result.details?.ipValid).toBe(false)
  })

  it('retourne valid true si allowedIPs configuré et IP dans la liste', () => {
    const req = createMockRequest({
      Authorization: 'Bearer s',
      'x-forwarded-for': '10.0.0.1',
    })
    const result = validateCronRequest(req, {
      secret: 's',
      requireSecret: true,
      allowedIPs: ['10.0.0.1'],
    })
    expect(result.valid).toBe(true)
    expect(result.details?.ipValid).toBe(true)
  })
})
