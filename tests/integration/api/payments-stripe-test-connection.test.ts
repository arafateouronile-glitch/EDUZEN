import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/payments/stripe/test-connection/route'

describe('API POST payments/stripe/test-connection', () => {
  it('returns 400 when keys are missing', async () => {
    const req = new NextRequest('http://localhost/api/payments/stripe/test-connection', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Clés API requises|requises/i)
  })
})
