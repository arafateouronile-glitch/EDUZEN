import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/learner/access-proof/route'

describe('POST learner access-proof', () => {
  it('400 when studentId missing', async () => {
    const req = new NextRequest('http://localhost/api/learner/access-proof', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/studentId requis|requis/i)
  })
})
