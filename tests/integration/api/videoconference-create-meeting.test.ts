import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/videoconference/create-meeting/route'

describe('API /api/videoconference/create-meeting', () => {
  it('devrait retourner 501 non implemente', async () => {
    const request = new NextRequest('http://localhost:3000/api/videoconference/create-meeting', {
      method: 'POST',
      body: JSON.stringify({ title: 'Meeting', startTime: '2025-01-01T10:00:00Z' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(501)
    expect(data.error).toMatch(/Not implemented|non implémenté/i)
  })
})
