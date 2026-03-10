import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/mobile-money/initiate/route'

describe('POST mobile-money/initiate', () => {
  it('returns 501', async () => {
    const req = new NextRequest('http://localhost/api/mobile-money/initiate', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(501)
    expect((await res.json()).error).toBeDefined()
  })
})
