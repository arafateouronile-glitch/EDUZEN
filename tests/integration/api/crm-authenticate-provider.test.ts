import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/crm/authenticate/[provider]/route'

describe('API GET /api/crm/authenticate/[provider]', () => {
  it('retourne 501', async () => {
    const req = new NextRequest('http://localhost/api/crm/authenticate/hubspot')
    const res = await GET(req, { params: Promise.resolve({ provider: 'hubspot' }) })
    expect(res.status).toBe(501)
    expect((await res.json()).error).toBe('Not implemented')
  })
})
