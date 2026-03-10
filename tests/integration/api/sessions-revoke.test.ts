import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/sessions/revoke/route'

describe('API POST /api/sessions/revoke', () => {
  it('returns 200 when revoke_all is true', async () => {
    const req = new NextRequest('http://localhost/api/sessions/revoke', {
      method: 'POST',
      body: JSON.stringify({ revoke_all: true }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })
})
