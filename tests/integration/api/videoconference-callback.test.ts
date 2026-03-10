import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/videoconference/callback/[provider]/route'

describe('API GET /api/videoconference/callback/[provider]', () => {
  it('returns 501', async () => {
    const req = new NextRequest('http://localhost/api/videoconference/callback/teams')
    const res = await GET(req, { params: Promise.resolve({ provider: 'teams' }) })
    expect(res.status).toBe(501)
    const data = await res.json()
    expect(data.error).toBe('Not implemented')
  })
})
