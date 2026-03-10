import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/signature-requests/sign/route'

describe('POST signature-requests sign', () => {
  it('400 when token and signatureData missing', async () => {
    const req = new NextRequest('http://localhost/api/signature-requests/sign', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Token et signature|requis/i)
  })
})
