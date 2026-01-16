/**
 * Tests de sécurité - Rate Limiting
 * Teste que les limites de requêtes sont correctement appliquées
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { generalRateLimiter, authRateLimiter, mutationRateLimiter } from '@/lib/utils/rate-limiter'

describe('Rate Limiting Security Tests', () => {
  beforeEach(() => {
    // Reset rate limiters before each test
    generalRateLimiter.resetAll()
    authRateLimiter.resetAll()
    mutationRateLimiter.resetAll()
  })

  describe('General Rate Limiter', () => {
    it('should allow requests within limit', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      })

      const result1 = await generalRateLimiter.check(request)
      expect(result1.allowed).toBe(true)
      expect(result1.remaining).toBe(99) // 100 - 1

      const result2 = await generalRateLimiter.check(request)
      expect(result2.allowed).toBe(true)
      expect(result2.remaining).toBe(98) // 100 - 2
    })

    it('should block requests exceeding limit', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.2',
        },
      })

      // Make 100 requests (the limit)
      for (let i = 0; i < 100; i++) {
        const result = await generalRateLimiter.check(request)
        expect(result.allowed).toBe(true)
      }

      // 101st request should be blocked
      const blockedResult = await generalRateLimiter.check(request)
      expect(blockedResult.allowed).toBe(false)
      expect(blockedResult.remaining).toBe(0)
    })

    it('should differentiate between different IPs', async () => {
      const request1 = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.10',
        },
      })

      const request2 = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.20',
        },
      })

      const result1 = await generalRateLimiter.check(request1)
      const result2 = await generalRateLimiter.check(request2)

      expect(result1.allowed).toBe(true)
      expect(result2.allowed).toBe(true)
      // Both should have 99 remaining (independent counters)
      expect(result1.remaining).toBe(99)
      expect(result2.remaining).toBe(99)
    })

    it('should include resetTime in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.3',
        },
      })

      const result = await generalRateLimiter.check(request)

      expect(result.resetTime).toBeDefined()
      expect(result.resetTime).toBeGreaterThan(Date.now())
      // Should reset in ~1 minute (60000ms)
      expect(result.resetTime).toBeLessThan(Date.now() + 65000)
    })
  })

  describe('Auth Rate Limiter', () => {
    it('should have stricter limits than general (5 per 15min)', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        headers: {
          'x-forwarded-for': '192.168.1.4',
        },
      })

      // Make 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        const result = await authRateLimiter.check(request)
        expect(result.allowed).toBe(true)
      }

      // 6th request should be blocked
      const blockedResult = await authRateLimiter.check(request)
      expect(blockedResult.allowed).toBe(false)
      expect(blockedResult.remaining).toBe(0)
    })

    it('should have longer reset window (15 minutes)', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        headers: {
          'x-forwarded-for': '192.168.1.5',
        },
      })

      const result = await authRateLimiter.check(request)

      expect(result.resetTime).toBeDefined()
      // Should reset in ~15 minutes (900000ms)
      expect(result.resetTime).toBeGreaterThan(Date.now() + 850000)
      expect(result.resetTime).toBeLessThan(Date.now() + 950000)
    })
  })

  describe('Mutation Rate Limiter', () => {
    it('should allow 50 requests per minute', async () => {
      const request = new NextRequest('http://localhost:3000/api/documents/generate', {
        headers: {
          'x-forwarded-for': '192.168.1.6',
        },
      })

      // Make 50 requests (the limit)
      for (let i = 0; i < 50; i++) {
        const result = await mutationRateLimiter.check(request)
        expect(result.allowed).toBe(true)
      }

      // 51st request should be blocked
      const blockedResult = await mutationRateLimiter.check(request)
      expect(blockedResult.allowed).toBe(false)
    })
  })

  describe('Rate Limit Headers', () => {
    it('should include proper rate limit headers in response', async () => {
      const { createRateLimitResponse } = await import('@/lib/utils/rate-limiter')

      const resetTime = Date.now() + 60000
      const response = createRateLimitResponse(10, resetTime)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('10')
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined()
      expect(response.headers.get('Retry-After')).toBeDefined()

      expect(data.error).toBe('Too many requests')
    })
  })

  describe('Rate Limit Reset', () => {
    it('should reset counter for specific key', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.7',
        },
      })

      // Make some requests
      await generalRateLimiter.check(request)
      await generalRateLimiter.check(request)

      const resultBefore = await generalRateLimiter.check(request)
      expect(resultBefore.remaining).toBe(97) // 100 - 3

      // Reset the limiter
      generalRateLimiter.resetAll()

      const resultAfter = await generalRateLimiter.check(request)
      expect(resultAfter.remaining).toBe(99) // Reset to 100, then -1
    })
  })

  describe('Different Routes Different Limits', () => {
    it('should apply different limits to different routes', async () => {
      const ip = '192.168.1.8'

      const authRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        headers: { 'x-forwarded-for': ip },
      })

      const generalRequest = new NextRequest('http://localhost:3000/api/general', {
        headers: { 'x-forwarded-for': ip },
      })

      // Auth is limited to 5
      for (let i = 0; i < 5; i++) {
        const result = await authRateLimiter.check(authRequest)
        expect(result.allowed).toBe(true)
      }
      const authBlocked = await authRateLimiter.check(authRequest)
      expect(authBlocked.allowed).toBe(false)

      // But general endpoint should still work (different limiter)
      const generalResult = await generalRateLimiter.check(generalRequest)
      expect(generalResult.allowed).toBe(true)
    })
  })
})
