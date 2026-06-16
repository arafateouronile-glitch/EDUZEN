import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/v1/document-templates/route'

describe('API /api/v1/document-templates', () => {
  it('GET retourne 401 sans clé API', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/document-templates')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toMatch(/API key|api key/i)
  })
})
