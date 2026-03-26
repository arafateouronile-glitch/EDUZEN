/**
 * Tests d'intégration — POST /api/webhooks/stripe
 *
 * Couverture :
 * - Sécurité : signature manquante / invalide / secret absent
 * - Événements : subscription created/updated/deleted, invoice succeeded/failed,
 *                trial_will_end, charge.refunded
 * - Résilience : commission error → toujours 200 (pas de retry Stripe)
 * - Idempotence : doublon 23505 → 200
 * - Graceful : événement inconnu → 200
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Variables de mock accessibles depuis les factories ─────────────────────────
const mockConstructEvent = vi.fn()
const mockPricesRetrieve = vi.fn()
const mockProductsRetrieve = vi.fn()

const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockResolvedValue({ error: null }),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
}
const mockFrom = vi.fn(() => mockSupabaseChain)

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body: string, signature = 'valid-sig'): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    body,
    headers: { 'stripe-signature': signature },
  })
}

function makeSubscriptionEvent(type: string, overrides: Record<string, unknown> = {}) {
  return {
    type,
    data: {
      object: {
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'active',
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        trial_end: null,
        cancel_at_period_end: false,
        canceled_at: null,
        items: { data: [{ price: { id: 'price_test123' } }] },
        ...overrides,
      },
    },
  }
}

function makeInvoiceEvent(type: string, overrides: Record<string, unknown> = {}) {
  return {
    type,
    data: {
      object: {
        id: 'in_test123',
        customer: 'cus_test123',
        amount_paid: 4900,
        subscription: 'sub_test123',
        metadata: {},
        ...overrides,
      },
    },
  }
}

// ── Setup / Teardown ───────────────────────────────────────────────────────────

const savedEnv: Record<string, string | undefined> = {}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()

  // Sauvegarder et définir les env vars APRÈS resetModules
  savedEnv.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
  savedEnv.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  process.env.STRIPE_SECRET_KEY = 'sk_test_xxx'

  // Defaults mocks
  mockPricesRetrieve.mockResolvedValue({ product: 'prod_test' })
  mockProductsRetrieve.mockResolvedValue({ metadata: {} })
  mockFrom.mockReturnValue(mockSupabaseChain)
  mockSupabaseChain.single.mockResolvedValue({ data: null, error: null })
  mockSupabaseChain.maybeSingle.mockResolvedValue({ data: null, error: null })
  mockSupabaseChain.upsert.mockResolvedValue({ error: null })
  mockSupabaseChain.insert.mockReturnThis()
  mockSupabaseChain.update.mockReturnThis()

  // Enregistrer les mocks pour le prochain import (vi.doMock n'est PAS hoisted)
  vi.doMock('stripe', () => {
    function MockStripe() {
      return {
        webhooks: { constructEvent: mockConstructEvent },
        prices: { retrieve: mockPricesRetrieve },
        products: { retrieve: mockProductsRetrieve },
      }
    }
    return { default: MockStripe }
  })

  vi.doMock('@/lib/supabase/admin', () => ({
    createAdminClient: vi.fn(() => ({ from: mockFrom })),
  }))

  vi.doMock('@/lib/utils/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    sanitizeError: vi.fn((e: unknown) => String(e)),
  }))

  vi.doMock('@/lib/utils/send-email-resend', () => ({
    sendEmailViaResend: vi.fn().mockResolvedValue({ success: true }),
  }))

  vi.doMock('@/lib/config/app-config', () => ({
    APP_URLS: { dashboard: 'https://app.eduzen.io/dashboard' },
  }))
})

afterEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = savedEnv.STRIPE_WEBHOOK_SECRET
  process.env.STRIPE_SECRET_KEY = savedEnv.STRIPE_SECRET_KEY
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('POST /api/webhooks/stripe', () => {

  // ── Sécurité ──────────────────────────────────────────────────────────────

  it('retourne 400 si stripe-signature est absente', async () => {
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const req = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: '{}',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/signature|secret/i)
  })

  it('retourne 400 si STRIPE_WEBHOOK_SECRET est absent', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = ''
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest('{}'))
    expect(res.status).toBe(400)
  })

  it('retourne 400 si la signature Stripe est invalide', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature')
    })
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest('{}'))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/invalid signature/i)
  })

  // ── customer.subscription.created/updated ─────────────────────────────────

  it('retourne 200 pour customer.subscription.created', async () => {
    mockConstructEvent.mockReturnValue(makeSubscriptionEvent('customer.subscription.created'))
    mockFrom.mockReturnValue({
      ...mockSupabaseChain,
      single: vi.fn().mockResolvedValue({ data: { id: 'plan-1' }, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: { organization_id: 'org-1' }, error: null }),
    })
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest('{}'))
    expect(res.status).toBe(200)
    expect((await res.json()).received).toBe(true)
  })

  it('retourne 200 pour customer.subscription.updated', async () => {
    mockConstructEvent.mockReturnValue(makeSubscriptionEvent('customer.subscription.updated', { status: 'past_due' }))
    mockFrom.mockReturnValue({
      ...mockSupabaseChain,
      single: vi.fn().mockResolvedValue({ data: { id: 'plan-1' }, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: { organization_id: 'org-1' }, error: null }),
    })
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest('{}'))
    expect(res.status).toBe(200)
  })

  // ── customer.subscription.deleted ─────────────────────────────────────────

  it('retourne 200 pour customer.subscription.deleted', async () => {
    mockConstructEvent.mockReturnValue(makeSubscriptionEvent('customer.subscription.deleted', { status: 'canceled' }))
    mockFrom.mockReturnValue({
      ...mockSupabaseChain,
      maybeSingle: vi.fn().mockResolvedValue({ data: { organization_id: 'org-1' }, error: null }),
    })
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest('{}'))
    expect(res.status).toBe(200)
  })

  // ── invoice.payment_succeeded ─────────────────────────────────────────────

  it('retourne 200 pour invoice.payment_succeeded', async () => {
    mockConstructEvent.mockReturnValue(makeInvoiceEvent('invoice.payment_succeeded'))
    mockFrom.mockReturnValue({
      ...mockSupabaseChain,
      single: vi.fn().mockResolvedValue({ data: { organization_id: 'org-1' }, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: { organization_id: 'org-1' }, error: null }),
    })
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest('{}'))
    expect(res.status).toBe(200)
    expect((await res.json()).received).toBe(true)
  })

  it('retourne 200 même si la commission échoue (pas de retry Stripe)', async () => {
    mockConstructEvent.mockReturnValue(makeInvoiceEvent('invoice.payment_succeeded'))
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount > 2) {
        return {
          ...mockSupabaseChain,
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      return {
        ...mockSupabaseChain,
        single: vi.fn().mockResolvedValue({ data: { organization_id: 'org-1' }, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: { organization_id: 'org-1' }, error: null }),
      }
    })
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest('{}'))
    expect(res.status).toBe(200)
    expect((await res.json()).received).toBe(true)
  })

  // ── invoice.payment_failed ────────────────────────────────────────────────

  it('retourne 200 pour invoice.payment_failed', async () => {
    mockConstructEvent.mockReturnValue(makeInvoiceEvent('invoice.payment_failed'))
    mockFrom.mockReturnValue({
      ...mockSupabaseChain,
      maybeSingle: vi.fn().mockResolvedValue({ data: { organization_id: 'org-1' }, error: null }),
    })
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest('{}'))
    expect(res.status).toBe(200)
  })

  // ── customer.subscription.trial_will_end ──────────────────────────────────

  it('retourne 200 pour customer.subscription.trial_will_end', async () => {
    mockConstructEvent.mockReturnValue(
      makeSubscriptionEvent('customer.subscription.trial_will_end', {
        trial_end: Math.floor(Date.now() / 1000) + 7 * 86400,
      })
    )
    mockFrom.mockReturnValue({
      ...mockSupabaseChain,
      single: vi.fn().mockResolvedValue({ data: { email: 'admin@test.com', name: 'Test Org' }, error: null }),
    })
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest('{}'))
    expect(res.status).toBe(200)
  })

  // ── charge.refunded ────────────────────────────────────────────────────────

  it('retourne 200 pour charge.refunded', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'charge.refunded',
      data: { object: { id: 'ch_test', amount_refunded: 4900, metadata: {} } },
    })
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest('{}'))
    expect(res.status).toBe(200)
  })

  // ── Événement inconnu ──────────────────────────────────────────────────────

  it('retourne 200 pour un événement non géré (graceful)', async () => {
    mockConstructEvent.mockReturnValue({ type: 'payment_intent.created', data: { object: {} } })
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest('{}'))
    expect(res.status).toBe(200)
    expect((await res.json()).received).toBe(true)
  })

  // ── Idempotence commission ─────────────────────────────────────────────────

  it('retourne 200 si commission déjà enregistrée (doublon 23505)', async () => {
    mockConstructEvent.mockReturnValue(makeInvoiceEvent('invoice.payment_succeeded'))
    mockFrom.mockReturnValue({
      ...mockSupabaseChain,
      single: vi.fn().mockResolvedValue({ data: { organization_id: 'org-1' }, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: { organization_id: 'org-1' }, error: null }),
      insert: vi.fn().mockReturnValue({
        ...mockSupabaseChain,
        single: vi.fn().mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key' } }),
      }),
    })
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest('{}'))
    expect(res.status).toBe(200)
  })
})
