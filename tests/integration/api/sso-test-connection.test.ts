import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/sso/test-connection/route'

describe('API /api/sso/test-connection', () => {
  it('devrait retourner 200 avec success false et message non implemente', async () => {
    const request = new NextRequest('http://localhost:3000/api/sso/test-connection', {
      method: 'POST',
      body: JSON.stringify({ provider: 'google', clientId: 'x', clientSecret: 'y' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(false)
    expect(data.message).toMatch(/not yet implemented|SSO/i)
  })
})
