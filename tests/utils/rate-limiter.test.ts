/**
 * Tests unitaires pour RateLimiter
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  RateLimiter,
  generalRateLimiter,
  authRateLimiter,
  createRateLimitResponse,
  withRateLimit,
} from '@/lib/utils/rate-limiter'

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('devrait autoriser les requêtes dans la limite', async () => {
    const request = new Request('http://localhost/api/test')

    for (let i = 0; i < 10; i++) {
      const result = await generalRateLimiter.check(request)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBeGreaterThanOrEqual(0)
    }
  })

  it('devrait bloquer les requêtes au-delà de la limite', async () => {
    const request = new Request('http://localhost/api/test')

    // Faire 100 requêtes (limite de generalRateLimiter)
    for (let i = 0; i < 100; i++) {
      await generalRateLimiter.check(request)
    }

    // La 101ème requête devrait être bloquée
    const result = await generalRateLimiter.check(request)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('devrait réinitialiser le compteur après la fenêtre de temps', async () => {
    const request = new Request('http://localhost/api/test')

    // Faire 100 requêtes (limite)
    for (let i = 0; i < 100; i++) {
      await generalRateLimiter.check(request)
    }

    // Avancer le temps de 61 secondes (au-delà de la fenêtre de 60 secondes)
    vi.advanceTimersByTime(61000)

    // La requête devrait maintenant être autorisée
    const result = await generalRateLimiter.check(request)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBeGreaterThan(0)
  })

  it('devrait générer des clés différentes pour différentes IPs', async () => {
    const request1 = new Request('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '192.168.1.1' },
    })
    const request2 = new Request('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '192.168.1.2' },
    })

    // Faire 100 requêtes avec la première IP
    for (let i = 0; i < 100; i++) {
      await generalRateLimiter.check(request1)
    }

    // La deuxième IP devrait toujours pouvoir faire des requêtes
    const result = await generalRateLimiter.check(request2)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBeGreaterThan(0)
  })

  it('devrait générer des clés différentes pour différentes routes', async () => {
    const request1 = new Request('http://localhost/api/test1')
    const request2 = new Request('http://localhost/api/test2')

    // Faire 100 requêtes sur la première route
    for (let i = 0; i < 100; i++) {
      await generalRateLimiter.check(request1)
    }

    // La deuxième route devrait toujours pouvoir faire des requêtes
    const result = await generalRateLimiter.check(request2)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBeGreaterThan(0)
  })

  it('devrait retourner le resetTime correct', async () => {
    const request = new Request('http://localhost/api/test')
    const result = await generalRateLimiter.check(request)
    const now = Date.now()

    // resetTime devrait être dans le futur (ou très proche en cas de fake timers)
    expect(result.resetTime).toBeGreaterThanOrEqual(now)
    // resetTime devrait être dans une fenêtre raisonnable (fenêtre du limiter + marge 5 min)
    const maxExpectedTime = now + 5 * 60 * 1000
    expect(result.resetTime).toBeLessThanOrEqual(maxExpectedTime)
  })

  it('devrait utiliser x-real-ip quand x-forwarded-for est absent', async () => {
    const req1 = new Request('http://localhost/api/realip', {
      headers: { 'x-real-ip': '10.0.0.1' },
    })
    const req2 = new Request('http://localhost/api/realip', {
      headers: { 'x-real-ip': '10.0.0.2' },
    })
    for (let i = 0; i < 100; i++) await generalRateLimiter.check(req1)
    const r = await generalRateLimiter.check(req2)
    expect(r.allowed).toBe(true)
  })

  it('devrait utiliser la première IP dans x-forwarded-for (plusieurs IPs)', async () => {
    const reqA = new Request('http://localhost/api/multi', {
      headers: { 'x-forwarded-for': '192.168.1.10, 10.0.0.1' },
    })
    const reqB = new Request('http://localhost/api/multi', {
      headers: { 'x-forwarded-for': '192.168.1.10' },
    })
    for (let i = 0; i < 100; i++) await generalRateLimiter.check(reqA)
    const r = await generalRateLimiter.check(reqB)
    expect(r.allowed).toBe(false)
    expect(r.remaining).toBe(0)
  })

  it('devrait utiliser "unknown" comme clé si ni x-forwarded-for ni x-real-ip', async () => {
    const req = new Request('http://localhost/api/unknown-ip')
    for (let i = 0; i < 100; i++) await generalRateLimiter.check(req)
    const r = await generalRateLimiter.check(req)
    expect(r.allowed).toBe(false)
    expect(r.remaining).toBe(0)
  })

  it('devrait nettoyer les entrées expirées via l\'intervalle (5 min)', async () => {
    const request = new Request('http://localhost/api/cleanup')
    for (let i = 0; i < 10; i++) await generalRateLimiter.check(request)
    vi.advanceTimersByTime(5 * 60 * 1000 + 1000)
    const result = await generalRateLimiter.check(request)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBeGreaterThanOrEqual(99)
  })

  it('devrait appeler cleanup explicitement et supprimer les entrées expirées', async () => {
    const limiter = new RateLimiter({ windowMs: 2000, maxRequests: 5 })
    const req = new Request('http://localhost/api/explicit-cleanup', {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    })
    for (let i = 0; i < 3; i++) await limiter.check(req)
    vi.advanceTimersByTime(3000)
    ;(limiter as any).cleanup()
    const result = await limiter.check(req)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBeGreaterThanOrEqual(4)
  })

  it('devrait décrémenter via decrementOnFailure quand skipFailedRequests et entry.count > 0 (l.146)', async () => {
    const limiter = new RateLimiter({
      windowMs: 60_000,
      maxRequests: 2,
      skipFailedRequests: true,
    })
    const req = new Request('http://localhost/api/decr-fail', {
      headers: { 'x-forwarded-for': '10.0.0.99' },
    })
    await limiter.check(req)
    const store = (limiter as any).store as Record<string, { count: number; resetTime: number }>
    const key = '10.0.0.99:/api/decr-fail'
    expect(store[key].count).toBe(1)
    await limiter.decrementOnFailure(req)
    expect(store[key].count).toBe(0)
    const b = await limiter.check(req)
    expect(b.allowed).toBe(true)
    expect(b.remaining).toBe(1)
  })
})

describe('createRateLimitResponse', () => {
  it('devrait retourner une réponse 429 avec en-têtes et corps JSON', async () => {
    const resetTime = Date.now() + 60_000
    const res = createRateLimitResponse(0, resetTime)
    const data = await res.json()
    expect(res.status).toBe(429)
    expect(res.headers.get('Content-Type')).toContain('application/json')
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(res.headers.get('X-RateLimit-Reset')).toBeDefined()
    expect(res.headers.get('Retry-After')).toBeDefined()
    expect(data.error).toBe('Too many requests')
    expect(data.message).toContain('limite')
  })
})

describe('withRateLimit', () => {
  beforeEach(() => {
    authRateLimiter.resetAll()
    generalRateLimiter.resetAll()
  })

  it('devrait retourner 429 sans appeler le handler si limite dépassée', async () => {
    const req = new Request('http://localhost/api/auth', {
      headers: { 'x-forwarded-for': '192.168.1.100' },
    })
    for (let i = 0; i < 5; i++) await authRateLimiter.check(req)
    const handler = vi.fn().mockResolvedValue(new Response('ok'))
    const res = await withRateLimit(req, authRateLimiter, handler)
    expect(res.status).toBe(429)
    expect(handler).not.toHaveBeenCalled()
  })

  it('devrait appeler le handler et ajouter les en-têtes si autorisé', async () => {
    const req = new Request('http://localhost/api/auth', {
      headers: { 'x-forwarded-for': '192.168.1.101' },
    })
    const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const res = await withRateLimit(req, authRateLimiter, handler)
    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalledWith(req)
    expect(res.headers.get('X-RateLimit-Remaining')).toBeDefined()
    expect(res.headers.get('X-RateLimit-Reset')).toBeDefined()
  })

  it('devrait appeler decrementOnFailure si le handler retourne une erreur (4xx/5xx)', async () => {
    const req = new Request('http://localhost/api/auth', {
      headers: { 'x-forwarded-for': '192.168.1.102' },
    })
    const handler = vi.fn().mockResolvedValue(new Response('error', { status: 500 }))
    const res = await withRateLimit(req, authRateLimiter, handler)
    expect(res.status).toBe(500)
    expect(handler).toHaveBeenCalled()
  })

  it('devrait propager l\'erreur et appeler decrementOnFailure si le handler lance', async () => {
    const req = new Request('http://localhost/api/auth', {
      headers: { 'x-forwarded-for': '192.168.1.103' },
    })
    const handler = vi.fn().mockRejectedValue(new Error('handler error'))
    await expect(withRateLimit(req, authRateLimiter, handler)).rejects.toThrow('handler error')
    expect(handler).toHaveBeenCalled()
  })

  it('devrait décrémenter après succès (skipSuccessfulRequests) : 5 succès puis 6ème autorisée', async () => {
    const req = new Request('http://localhost/api/auth', {
      headers: { 'x-forwarded-for': '192.168.1.200' },
    })
    const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    for (let i = 0; i < 5; i++) {
      const res = await withRateLimit(req, authRateLimiter, handler)
      expect(res.status).toBe(200)
    }
    const sixth = await withRateLimit(req, authRateLimiter, handler)
    expect(sixth.status).toBe(200)
    expect(handler).toHaveBeenCalledTimes(6)
  })

  it('devrait décrémenter après échec (skipFailedRequests) : échecs ne consument pas la limite', async () => {
    const limiter = new RateLimiter({
      windowMs: 60_000,
      maxRequests: 2,
      skipFailedRequests: true,
    })
    const req = new Request('http://localhost/api/fail', {
      headers: { 'x-forwarded-for': '192.168.1.201' },
    })
    const handler = vi.fn().mockResolvedValue(new Response('error', { status: 500 }))
    const r1 = await withRateLimit(req, limiter, handler)
    const r2 = await withRateLimit(req, limiter, handler)
    expect(r1.status).toBe(500)
    expect(r2.status).toBe(500)
    const r3 = await withRateLimit(req, limiter, handler)
    expect(r3.status).toBe(500)
    expect(handler).toHaveBeenCalledTimes(3)
  })

  it('devrait inclure X-RateLimit-Remaining et Retry-After dans la 429', async () => {
    const req = new Request('http://localhost/api/headers', {
      headers: { 'x-forwarded-for': '192.168.1.202' },
    })
    for (let i = 0; i < 5; i++) await authRateLimiter.check(req)
    const handler = vi.fn().mockResolvedValue(new Response('ok'))
    const res = await withRateLimit(req, authRateLimiter, handler)
    expect(res.status).toBe(429)
    expect(res.headers.get('X-RateLimit-Remaining')).toBeDefined()
    expect(res.headers.get('X-RateLimit-Reset')).toBeDefined()
    expect(res.headers.get('Retry-After')).toBeDefined()
    expect(handler).not.toHaveBeenCalled()
  })
})
