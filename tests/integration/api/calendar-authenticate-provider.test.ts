import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/calendar/authenticate/[provider]/route'

describe('API GET /api/calendar/authenticate/[provider]', () => {
  it('retourne 501', async () => {
    const req = new NextRequest('http://localhost/api/calendar/authenticate/google')
    const res = await GET(req, { params: Promise.resolve({ provider: 'google' }) })
    expect(res.status).toBe(501)
    expect((await res.json()).error).toBe('Not implemented')
  })
})
