import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PUT } from '@/app/api/sso/config/route'

describe('API /api/sso/config', () => {
  it('GET devrait retourner 200 avec providers et enabled false', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      providers: [],
      enabled: false,
    })
    expect(data.message).toMatch(/not yet implemented/i)
  })

  it('PUT devrait retourner 501 non implémenté', async () => {
    const request = new NextRequest('http://localhost:3000/api/sso/config', {
      method: 'PUT',
      body: JSON.stringify({ providers: [] }),
    })
    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(501)
    expect(data.error).toMatch(/not yet implemented/i)
  })
})
