import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/learner/access-token/validate/route'

describe('API GET /api/learner/access-token/validate', () => {
  it('returns 400 when token is missing', async () => {
    const req = new NextRequest('http://localhost/api/learner/access-token/validate')
    const res = await GET(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/token est requis/i)
  })

  it('returns 400 when token is placeholder', async () => {
    const req = new NextRequest('http://localhost/api/learner/access-token/validate?token=[token]')
    const res = await GET(req)
    expect(res.status).toBe(400)
    expect((await res.json()).valid).toBe(false)
  })
})
