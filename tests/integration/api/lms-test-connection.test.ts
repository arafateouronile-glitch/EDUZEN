import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/lms/test-connection/route'

describe('API /api/lms/test-connection', () => {
  it('devrait retourner 501 non implémenté', async () => {
    const request = new NextRequest('http://localhost:3000/api/lms/test-connection', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://lms.example.com', apiKey: 'key' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(501)
    expect(data.error).toMatch(/Not implemented|non implémenté/i)
  })
})
