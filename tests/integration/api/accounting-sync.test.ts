import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/accounting/sync/route'

describe('API /api/accounting/sync', () => {
  it('GET retourne 501 Not implemented', async () => {
    const request = new NextRequest('http://localhost/api/accounting/sync')
    const response = await GET(request)

    expect(response.status).toBe(501)
    expect((await response.json()).error).toBe('Not implemented')
  })

  it('POST retourne 501 Not implemented', async () => {
    const request = new NextRequest('http://localhost/api/accounting/sync', { method: 'POST' })
    const response = await POST(request)

    expect(response.status).toBe(501)
    expect((await response.json()).error).toBe('Not implemented')
  })
})
