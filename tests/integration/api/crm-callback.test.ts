import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/crm/callback/[provider]/route'

describe('API GET /api/crm/callback/[provider]', () => {
  it('returns 501', async () => {
    const req = new NextRequest('http://localhost/api/crm/callback/hubspot')
    const res = await GET(req, { params: Promise.resolve({ provider: 'hubspot' }) })
    expect(res.status).toBe(501)
    const data = await res.json()
    expect(data.error).toBe('Not implemented')
  })
})
