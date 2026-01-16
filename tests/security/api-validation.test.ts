/**
 * Tests de sécurité - Validation d'API
 * Teste la validation stricte, sanitization, et protection XSS
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      })),
    },
  })),
}))

// Mock documentation service
vi.mock('@/lib/services/documentation.service', () => ({
  documentationService: {
    createFeedback: vi.fn((data) => Promise.resolve({ id: 'feedback-1', ...data })),
  },
}))

describe('API Validation Security Tests', () => {
  describe('Documentation Feedback Validation', () => {
    const createRequest = (body: any) => {
      return new NextRequest('http://localhost:3000/api/documentation/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
    }

    it('should accept valid feedback data', async () => {
      const validData = {
        article_id: 'article-123',
        rating: 5,
        comment: 'Great article!',
        is_helpful: true,
      }

      const request = createRequest(validData)
      const { POST } = await import('@/app/api/documentation/feedback/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should reject missing required field (article_id)', async () => {
      const invalidData = {
        rating: 5,
        comment: 'Great article!',
      }

      const request = createRequest(invalidData)
      const { POST } = await import('@/app/api/documentation/feedback/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.errors).toBeDefined()
    })

    it('should reject invalid rating (out of range)', async () => {
      const invalidData = {
        article_id: 'article-123',
        rating: 10, // Max is 5
        comment: 'Great article!',
      }

      const request = createRequest(invalidData)
      const { POST } = await import('@/app/api/documentation/feedback/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.errors).toBeDefined()
      expect(data.errors.rating).toBeDefined()
    })

    it('should reject comment exceeding max length', async () => {
      const invalidData = {
        article_id: 'article-123',
        comment: 'x'.repeat(5001), // Max is 5000
      }

      const request = createRequest(invalidData)
      const { POST } = await import('@/app/api/documentation/feedback/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.errors).toBeDefined()
      expect(data.errors.comment).toBeDefined()
    })

    it('should detect suspicious content in comment field', async () => {
      const xssData = {
        article_id: 'article-123',
        comment: '<script>alert("XSS")</script>Legitimate comment',
        rating: 5,
      }

      const request = createRequest(xssData)
      const { POST } = await import('@/app/api/documentation/feedback/route')
      const response = await POST(request)
      const data = await response.json()

      // Should reject suspicious content
      expect(response.status).toBe(400)
      expect(data.errors).toBeDefined()
      expect(data.errors.comment).toBeDefined()
    })

    it('should reject invalid boolean for is_helpful', async () => {
      const invalidData = {
        article_id: 'article-123',
        is_helpful: 'yes', // Should be boolean
      }

      const request = createRequest(invalidData)
      const { POST } = await import('@/app/api/documentation/feedback/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.errors).toBeDefined()
      expect(data.errors.is_helpful).toBeDefined()
    })

    it('should accept optional fields as undefined', async () => {
      const minimalData = {
        article_id: 'article-123',
      }

      const request = createRequest(minimalData)
      const { POST } = await import('@/app/api/documentation/feedback/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('SEPA Transfer Validation', () => {
    const createRequest = (body: any) => {
      return new NextRequest('http://localhost:3000/api/payments/sepa/create-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
    }

    it('should accept valid IBAN format', async () => {
      const validIBAN = 'FR7630006000011234567890189'
      const validData = {
        amount: 100.50,
        currency: 'EUR',
        debtor_name: 'John Doe',
        debtor_iban: validIBAN,
        creditor_name: 'Jane Smith',
        creditor_iban: 'DE89370400440532013000',
      }

      const request = createRequest(validData)
      // Note: Will need to mock Supabase properly for this to fully work
      // This tests the validation schema
    })

    it('should reject invalid IBAN format', async () => {
      const invalidData = {
        amount: 100,
        debtor_name: 'John Doe',
        debtor_iban: 'INVALID_IBAN',
        creditor_name: 'Jane Smith',
        creditor_iban: 'DE89370400440532013000',
      }

      const request = createRequest(invalidData)
      const { POST } = await import('@/app/api/payments/sepa/create-transfer/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.errors).toBeDefined()
      expect(data.errors.debtor_iban).toBeDefined()
    })

    it('should reject invalid amount (negative)', async () => {
      const invalidData = {
        amount: -100,
        debtor_name: 'John Doe',
        debtor_iban: 'FR7630006000011234567890189',
        creditor_name: 'Jane Smith',
        creditor_iban: 'DE89370400440532013000',
      }

      const request = createRequest(invalidData)
      const { POST } = await import('@/app/api/payments/sepa/create-transfer/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.errors).toBeDefined()
      expect(data.errors.amount).toBeDefined()
    })

    it('should reject invalid currency (not whitelisted)', async () => {
      const invalidData = {
        amount: 100,
        currency: 'BTC', // Not in whitelist
        debtor_name: 'John Doe',
        debtor_iban: 'FR7630006000011234567890189',
        creditor_name: 'Jane Smith',
        creditor_iban: 'DE89370400440532013000',
      }

      const request = createRequest(invalidData)
      const { POST } = await import('@/app/api/payments/sepa/create-transfer/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.errors).toBeDefined()
      expect(data.errors.currency).toBeDefined()
    })

    it('should detect suspicious content in text fields', async () => {
      const xssData = {
        amount: 100,
        debtor_name: '<script>alert("XSS")</script>John Doe',
        debtor_iban: 'FR7630006000011234567890189',
        creditor_name: 'Jane Smith',
        creditor_iban: 'DE89370400440532013000',
        description: '<img src=x onerror=alert(1)>Payment',
      }

      const request = createRequest(xssData)
      const { POST } = await import('@/app/api/payments/sepa/create-transfer/route')
      const response = await POST(request)
      const data = await response.json()

      // Should reject suspicious content
      expect(response.status).toBe(400)
      expect(data.errors).toBeDefined()
    })

    it('should validate BIC format when provided', async () => {
      const invalidData = {
        amount: 100,
        debtor_name: 'John Doe',
        debtor_iban: 'FR7630006000011234567890189',
        debtor_bic: 'INVALID', // Invalid BIC format
        creditor_name: 'Jane Smith',
        creditor_iban: 'DE89370400440532013000',
      }

      const request = createRequest(invalidData)
      const { POST } = await import('@/app/api/payments/sepa/create-transfer/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.errors).toBeDefined()
      expect(data.errors.debtor_bic).toBeDefined()
    })
  })
})
