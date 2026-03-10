import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/payment-reminders/process/route'

describe('API /api/payment-reminders/process', () => {
  it('devrait retourner 501 non implemente', async () => {
    const request = new NextRequest('http://localhost:3000/api/payment-reminders/process', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(501)
    expect(data.error).toMatch(/Not implemented|non implémenté/i)
  })
})
