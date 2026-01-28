/**
 * Tests unitaires pour RateLimiter
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { generalRateLimiter } from '@/lib/utils/rate-limiter'

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

    // resetTime devrait être dans le futur
    expect(result.resetTime).toBeGreaterThan(Date.now())
    // resetTime devrait être dans une fenêtre raisonnable (60 secondes + marge)
    const maxExpectedTime = Date.now() + 120000 // 2 minutes de marge pour éviter les problèmes de timing
    expect(result.resetTime).toBeLessThanOrEqual(maxExpectedTime)
  })
})
