import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/sign/submit/route'

describe('sign submit', () => {
  it('400 when body empty', async () => {
    const req = new NextRequest('http://localhost/api/sign/submit', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
