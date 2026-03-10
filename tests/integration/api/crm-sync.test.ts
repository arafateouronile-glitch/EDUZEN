import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/crm/sync/route'

describe('API /api/crm/sync', () => {
  it('GET retourne 501', async () => {
    const res = await GET(new NextRequest('http://localhost/api/crm/sync'))
    expect(res.status).toBe(501)
    expect((await res.json()).error).toBe('Not implemented')
  })

  it('POST retourne 501', async () => {
    const res = await POST(new NextRequest('http://localhost/api/crm/sync', { method: 'POST' }))
    expect(res.status).toBe(501)
    expect((await res.json()).error).toBe('Not implemented')
  })
})
