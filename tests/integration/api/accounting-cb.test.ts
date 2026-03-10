import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/accounting/callback/[provider]/route'

describe('API GET accounting/callback/[provider]', () => {
  it('returns 501', async () => {
    const req = new NextRequest('http://localhost/api/accounting/callback/cegid')
    const res = await GET(req, { params: Promise.resolve({ provider: 'cegid' }) })
    expect(res.status).toBe(501)
    const data = await res.json()
    expect(data.error).toBe('Not implemented')
  })
})
