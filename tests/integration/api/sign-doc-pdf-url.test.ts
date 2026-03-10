import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/sign/document-pdf-url/route'

describe('sign document-pdf-url', () => {
  it('400 no token', async () => {
    const req = new NextRequest('http://localhost/api/sign/document-pdf-url')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })
})
