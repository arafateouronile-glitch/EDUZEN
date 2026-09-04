import { describe, it, expect } from 'vitest'
import { signState, verifyState } from '@/lib/utils/oauth-state'

describe('oauth-state', () => {
  it('signs and verifies a payload round-trip', () => {
    const token = signState({ organizationId: 'org-1', provider: 'fulll' })
    const payload = verifyState(token)
    expect(payload).toMatchObject({ organizationId: 'org-1', provider: 'fulll' })
    expect(payload?.ts).toBeTypeOf('number')
    expect(payload?.nonce).toBeTypeOf('string')
  })

  it('rejects a tampered token', () => {
    const token = signState({ organizationId: 'org-1', provider: 'fulll' })
    const [data] = token.split('.')
    expect(verifyState(`${data}.deadbeef`)).toBeNull()
  })

  it('rejects a tampered payload (valid-looking but resigned mismatch)', () => {
    const token = signState({ organizationId: 'org-1', provider: 'fulll' })
    const parts = token.split('.')
    const forged = Buffer.from(JSON.stringify({ organizationId: 'org-2', provider: 'fulll', ts: Date.now() }), 'utf8').toString('base64url')
    expect(verifyState(`${forged}.${parts[1]}`)).toBeNull()
  })

  it('rejects an expired token', () => {
    const token = signState({ organizationId: 'org-1', provider: 'fulll', ts: Date.now() - 20 * 60 * 1000 })
    expect(verifyState(token, 10 * 60 * 1000)).toBeNull()
  })

  it('rejects empty / malformed input', () => {
    expect(verifyState(null)).toBeNull()
    expect(verifyState('')).toBeNull()
    expect(verifyState('no-dot')).toBeNull()
  })
})
