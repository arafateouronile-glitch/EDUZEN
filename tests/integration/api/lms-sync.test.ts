import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/lms/sync/route'

describe('API /api/lms/sync', () => {
  it('GET devrait retourner 501 non implemente', async () => {
    const request = new NextRequest('http://localhost:3000/api/lms/sync')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(501)
    expect(data.error).toMatch(/Not implemented|non implémenté/i)
  })

  it('POST devrait retourner 501 non implemente', async () => {
    const request = new NextRequest('http://localhost:3000/api/lms/sync', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(501)
    expect(data.error).toMatch(/Not implemented|non implémenté/i)
  })
})
