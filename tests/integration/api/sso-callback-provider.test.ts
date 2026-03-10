import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/sso/callback/[provider]/route'

describe('API GET /api/sso/callback/[provider]', () => {
  it('returns 501', async () => {
    const req = new NextRequest('http://localhost/api/sso/callback/google')
    const res = await GET(req, { params: Promise.resolve({ provider: 'google' }) })
    expect(res.status).toBe(501)
    const data = await res.json()
    expect(data.error).toContain('google')
    expect(data.error).toContain('not yet implemented')
  })
})
