import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/payments/stripe/create-intent/route'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock rate limiter
vi.mock('@/lib/utils/rate-limiter', () => ({
  withRateLimit: vi.fn((req, limiter, handler) => handler(req)),
  mutationRateLimiter: {},
}))

// Mock API validation
vi.mock('@/lib/utils/api-validation', () => ({
  withBodyValidation: vi.fn((req, schema, handler) => {
    return handler(req, {
      amount: 100.50,
      currency: 'EUR',
      customer_email: 'test@example.com',
      customer_name: 'Test User',
    })
  }),
}))

describe('API /api/payments/stripe/create-intent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait créer une intention de paiement avec succès', async () => {
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
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-123' },
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'payment-123',
                amount: '100.50',
                currency: 'EUR',
                status: 'pending',
              },
              error: null,
            }),
          }),
        }),
      }),
    }

    vi.mocked(createClient).mockResolvedValue(mockSupabaseClient as any)

    const request = new NextRequest('http://localhost:3000/api/payments/stripe/create-intent', {
      method: 'POST',
      body: JSON.stringify({
        amount: 100.50,
        currency: 'EUR',
        customer_email: 'test@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('paymentIntentId')
    expect(data).toHaveProperty('clientSecret')
    expect(data).toHaveProperty('status', 'requires_payment_method')
    expect(data).toHaveProperty('paymentId', 'payment-123')
  })

  it('devrait rejeter si l\'utilisateur n\'est pas authentifié', async () => {
    const mockSupabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    }

    vi.mocked(createClient).mockResolvedValue(mockSupabaseClient as any)

    const request = new NextRequest('http://localhost:3000/api/payments/stripe/create-intent', {
      method: 'POST',
      body: JSON.stringify({
        amount: 100.50,
        customer_email: 'test@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('devrait gérer les erreurs de base de données', async () => {
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
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-123' },
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      }),
    }

    vi.mocked(createClient).mockResolvedValue(mockSupabaseClient as any)

    const request = new NextRequest('http://localhost:3000/api/payments/stripe/create-intent', {
      method: 'POST',
      body: JSON.stringify({
        amount: 100.50,
        customer_email: 'test@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Erreur lors de l\'enregistrement')
  })
})
