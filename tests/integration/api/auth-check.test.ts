import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/auth/check/route'
import { createServerClient } from '@supabase/ssr'

// Mock Supabase SSR
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

// Mock rate limiter
vi.mock('@/lib/utils/rate-limiter', () => ({
  withRateLimit: vi.fn((req, limiter, handler) => handler(req)),
  generalRateLimiter: {},
}))

// Mock error handler
vi.mock('@/lib/errors', () => ({
  errorHandler: {
    handleError: vi.fn((error) => {
      throw error
    }),
  },
}))

describe('API /api/auth/check', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait retourner les informations de cookies et auth', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    }

    const mockSupabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
        setSession: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    }

    vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient as any)

    const request = new NextRequest('http://localhost:3000/api/auth/check', {
      headers: {
        cookie: 'sb-test-auth-token={"access_token":"token123","refresh_token":"refresh123"}',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('timestamp')
    expect(data).toHaveProperty('cookies')
    expect(data).toHaveProperty('standardAuth')
    expect(data.standardAuth.id).toBe('user-123')
    expect(data.standardAuth.email).toBe('test@example.com')
  })

  it('devrait gérer l\'absence de cookies Supabase', async () => {
    const mockSupabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'No session' },
        }),
        setSession: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    }

    vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient as any)

    const request = new NextRequest('http://localhost:3000/api/auth/check')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.standardAuth.id).toBeNull()
    expect(data.manualSessionAuth.hasTokens).toBe(false)
  })

  it('devrait parser les cookies JSON correctement', async () => {
    const mockUser = {
      id: 'user-456',
      email: 'test2@example.com',
    }

    const mockSupabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
        setSession: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    }

    vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient as any)

    const cookieValue = JSON.stringify({
      access_token: 'valid-token',
      refresh_token: 'valid-refresh',
    })

    const request = new NextRequest('http://localhost:3000/api/auth/check', {
      headers: {
        cookie: `sb-test-auth-token=${cookieValue}`,
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.manualSessionAuth.hasTokens).toBe(true)
  })
})
