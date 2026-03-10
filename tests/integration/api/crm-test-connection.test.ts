import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/crm/test-connection/route'

describe('API /api/crm/test-connection', () => {
  it('devrait retourner 501 non implemente', async () => {
    const request = new NextRequest('http://localhost:3000/api/crm/test-connection', {
      method: 'POST',
      body: JSON.stringify({ provider: 'salesforce' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(501)
    expect(data.error).toMatch(/Not implemented|non implémenté/i)
  })
})
