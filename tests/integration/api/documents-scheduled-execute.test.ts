import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/documents/scheduled/execute/route'

describe('API POST /api/documents/scheduled/execute', () => {
  it('retourne 401 sans Bearer secret', async () => {
    const req = new NextRequest('http://localhost/api/documents/scheduled/execute', {
      method: 'POST',
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toMatch(/Non autorisé|Unauthorized/i)
  })

  it('retourne 401 avec Bearer invalide', async () => {
    const req = new NextRequest('http://localhost/api/documents/scheduled/execute', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong-secret' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})
