import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/csrf/route'

describe('API /api/csrf', () => {
  it('devrait retourner 200 avec un token CSRF et le cookie', async () => {
    const request = new NextRequest('http://localhost:3000/api/csrf')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('token')
    expect(typeof data.token).toBe('string')
    // Token format: timestamp.random.signature (3 parts)
    expect(data.token.split('.')).toHaveLength(3)

    const setCookie = response.headers.get('set-cookie')
    expect(setCookie).toBeTruthy()
    expect(setCookie).toContain('csrf_token=')
  })

  it('devrait générer un token différent à chaque appel', async () => {
    const request = new NextRequest('http://localhost:3000/api/csrf')
    const res1 = await GET(request)
    const res2 = await GET(request)
    const data1 = await res1.json()
    const data2 = await res2.json()

    expect(data1.token).not.toBe(data2.token)
  })
})
