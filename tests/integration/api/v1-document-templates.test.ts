import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/v1/document-templates/route'

describe('API /api/v1/document-templates', () => {
  it('GET devrait retourner 200 avec templates vides et message', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('templates')
    expect(Array.isArray(data.templates)).toBe(true)
    expect(data.templates).toHaveLength(0)
    expect(data.message).toMatch(/not yet implemented|v1/i)
  })

  it('POST devrait retourner 501 non implémenté', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/document-templates', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', type: 'attestation' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(501)
    expect(data.error).toMatch(/not yet implemented|v1/i)
  })
})
