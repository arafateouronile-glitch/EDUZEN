import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/electronic-attendance/sign/route'

describe('electronic attendance sign route', () => {
  it('400 when token and signatureData missing', async () => {
    const req = new NextRequest('http://localhost/api/electronic-attendance/sign', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
