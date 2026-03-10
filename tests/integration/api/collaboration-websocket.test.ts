import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/collaboration/websocket/route'

describe('API /api/collaboration/websocket', () => {
  it('GET retourne 501', async () => {
    const request = new NextRequest('http://localhost/api/collaboration/websocket')
    const response = await GET(request)
    expect(response.status).toBe(501)
    expect((await response.json()).error).toBe('WebSocket endpoint not implemented')
  })

  it('POST retourne 501', async () => {
    const request = new NextRequest('http://localhost/api/collaboration/websocket', { method: 'POST' })
    const response = await POST(request)
    expect(response.status).toBe(501)
    expect((await response.json()).error).toBe('WebSocket endpoint not implemented')
  })
})
