import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/sign/process-pdf/route'

describe('sign process-pdf', () => {
  it('400 no token', async () => {
    const req = new NextRequest('http://localhost/api/sign/process-pdf')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })
})
