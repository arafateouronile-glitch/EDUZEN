import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PUT, DELETE } from '@/app/api/v1/document-templates/[id]/route'

describe('API /api/v1/document-templates/[id]', () => {
  it('GET retourne 501', async () => {
    const req = new NextRequest('http://localhost/api/v1/document-templates/tpl-1')
    const res = await GET(req, { params: Promise.resolve({ id: 'tpl-1' }) })
    expect(res.status).toBe(501)
  })

  it('PUT retourne 501', async () => {
    const req = new NextRequest('http://localhost/api/v1/document-templates/tpl-1', { method: 'PUT', body: '{}' })
    const res = await PUT(req, { params: Promise.resolve({ id: 'tpl-1' }) })
    expect(res.status).toBe(501)
  })

  it('DELETE retourne 501', async () => {
    const req = new NextRequest('http://localhost/api/v1/document-templates/tpl-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'tpl-1' }) })
    expect(res.status).toBe(501)
  })
})
