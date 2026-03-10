import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/documentation/feedback/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/utils/rate-limiter', () => ({
  withRateLimit: vi.fn((_req: unknown, _limiter: unknown, handler: (r: NextRequest) => Promise<Response>) => handler(_req as NextRequest)),
  mutationRateLimiter: {},
}))

vi.mock('@/lib/utils/api-validation', () => ({
  withBodyValidation: vi.fn(async (_req: unknown, _schema: unknown, handler: (req: unknown, data: unknown) => Promise<Response>) => {
    const req = _req as NextRequest
    let body: Record<string, unknown>
    try {
      body = await req.json() as Record<string, unknown>
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    if (!body?.article_id || typeof body.article_id !== 'string' || (body.article_id as string).length === 0) {
      return new Response(JSON.stringify({ error: 'article_id required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    const validatedData = {
      article_id: body.article_id,
      rating: body.rating,
      comment: body.comment,
      is_helpful: body.is_helpful,
    }
    return handler(req, validatedData)
  }),
}))

vi.mock('@/lib/services/documentation.service', () => ({
  DocumentationService: vi.fn().mockImplementation(() => ({
    createFeedback: vi.fn().mockResolvedValue({ id: 'fb-1', article_id: 'art-1', rating: 5 }),
  })),
}))

describe('API /api/documentation/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait retourner 401 sans authentification', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/documentation/feedback', {
      method: 'POST',
      body: JSON.stringify({ article_id: 'art-123', rating: 5 }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toMatch(/Non authentifié|Unauthorized/i)
  })

  it('devrait retourner 400 si article_id manquant', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'u@test.com' } },
          error: null,
        }),
      },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/documentation/feedback', {
      method: 'POST',
      body: JSON.stringify({ rating: 5 }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toMatch(/article_id|required/i)
  })
})
