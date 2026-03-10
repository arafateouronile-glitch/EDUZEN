import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/calendar/callback/[provider]/route'

describe('API GET calendar/callback/[provider]', () => {
  it('returns 501', async () => {
    const req = new NextRequest('http://localhost/api/calendar/callback/google')
    const res = await GET(req, { params: Promise.resolve({ provider: 'google' }) })
    expect(res.status).toBe(501)
    const data = await res.json()
    expect(data.error).toBe('Not implemented')
  })
})
