import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/accounting/authenticate/[provider]/route'

describe('API GET /api/accounting/authenticate/[provider]', () => {
  it('retourne 501 avec provider dans la reponse', async () => {
    const req = new NextRequest('http://localhost/api/accounting/authenticate/cegid')
    const res = await GET(req, { params: Promise.resolve({ provider: 'cegid' }) })
    expect(res.status).toBe(501)
    const data = await res.json()
    expect(data.error).toBe('Not implemented')
    expect(data.provider).toBe('cegid')
  })
})
