import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/mobile-money/webhook/route'

describe('POST mobile-money webhook', () => {
  it('400 when provider invalid', async () => {
    const req = new NextRequest('http://localhost/api/mobile-money/webhook', {
      method: 'POST',
      body: '{}',
    })
    const res = await POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Provider invalide|invalide/i)
  })
})
