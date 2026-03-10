import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/templates/create-sample/route'

describe('API /api/templates/create-sample', () => {
  it('devrait retourner 400 pour un type inconnu', async () => {
    const request = new NextRequest('http://localhost:3000/api/templates/create-sample?type=inconnu')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toMatch(/Type inconnu|inconnu/i)
  })

  it('devrait retourner 200 avec un DOCX pour type=convention', async () => {
    const request = new NextRequest('http://localhost:3000/api/templates/create-sample?type=convention')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toMatch(/wordprocessingml|docx/)
    expect(response.headers.get('Content-Disposition')).toMatch(/template_convention\.docx/)
    const buffer = await response.arrayBuffer()
    expect(buffer.byteLength).toBeGreaterThan(0)
  })
})
