import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/calendar/sync/route'

describe('API /api/calendar/sync', () => {
  it('GET retourne 501 Not implemented', async () => {
    const request = new NextRequest('http://localhost/api/calendar/sync')
    const response = await GET(request)

    expect(response.status).toBe(501)
    const data = await response.json()
    expect(data.error).toBe('Not implemented')
  })

  it('POST retourne 501 Not implemented', async () => {
    const request = new NextRequest('http://localhost/api/calendar/sync', { method: 'POST' })
    const response = await POST(request)

    expect(response.status).toBe(501)
    const data = await response.json()
    expect(data.error).toBe('Not implemented')
  })
})
