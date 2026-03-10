import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/v1/documents/generate/route'

describe('POST v1 documents generate', () => {
  it('returns 501', async () => {
    const req = new NextRequest('http://localhost/api/v1/documents/generate', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(501)
    expect((await res.json()).error).toBeDefined()
  })
})
