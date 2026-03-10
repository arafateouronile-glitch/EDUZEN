import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/documents/generate-pdf/route'

describe('API POST documents/generate-pdf', () => {
  it('returns 400 when template is missing', async () => {
    const req = new NextRequest('http://localhost/api/documents/generate-pdf', {
      method: 'POST',
      body: JSON.stringify({ variables: {} }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Template manquant|template/i)
  })
})
