import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/v1/document-templates/[id]/route'

describe('API /api/v1/document-templates/[id]', () => {
  it('GET retourne 401 sans clé API', async () => {
    const req = new NextRequest('http://localhost/api/v1/document-templates/tpl-1')
    const res = await GET(req, { params: Promise.resolve({ id: 'tpl-1' }) })
    expect(res.status).toBe(401)
  })
})
