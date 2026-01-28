/**
 * Tests unitaires pour useOffline
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useOffline } from '@/lib/hooks/use-offline'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  }
})()

describe('useOffline', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    })
    localStorageMock.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('devrait initialiser avec l\'état online', () => {
    const { result } = renderHook(() => useOffline())
    expect(result.current.isOnline).toBe(true)
  })

  it('devrait détecter l\'état offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })

    const { result } = renderHook(() => useOffline())
    expect(result.current.isOnline).toBe(false)
  })

  it('devrait mettre en cache des données', () => {
    const { result } = renderHook(() => useOffline())

    act(() => {
      result.current.cacheData('test-key', { data: 'test' })
    })

    expect(localStorageMock.setItem).toHaveBeenCalled()
    const cached = result.current.getCachedData('test-key')
    expect(cached).toEqual({ data: 'test' })
  })

  it('devrait récupérer des données du cache', () => {
    const { result } = renderHook(() => useOffline())

    act(() => {
      result.current.cacheData('test-key', { data: 'test' })
    })

    const cached = result.current.getCachedData('test-key')
    expect(cached).toEqual({ data: 'test' })
  })

  it('devrait retourner null pour des données expirées', () => {
    const { result } = renderHook(() => useOffline())

    // Mettre en cache avec une durée très courte (1ms)
    act(() => {
      result.current.cacheData('test-key', { data: 'test' }, 1)
    })

    // Attendre que ça expire
    act(() => {
      vi.advanceTimersByTime(10)
    })

    const cached = result.current.getCachedData('test-key')
    expect(cached).toBeNull()
  })

  it('devrait supprimer des données du cache', () => {
    const { result } = renderHook(() => useOffline())

    act(() => {
      result.current.cacheData('test-key', { data: 'test' })
      result.current.clearCachedData('test-key')
    })

    const cached = result.current.getCachedData('test-key')
    expect(cached).toBeNull()
  })

  it('devrait vider tout le cache', () => {
    const { result } = renderHook(() => useOffline())

    act(() => {
      result.current.cacheData('key1', { data: 'test1' })
      result.current.cacheData('key2', { data: 'test2' })
      result.current.clearAllCache()
    })

    expect(result.current.getCachedData('key1')).toBeNull()
    expect(result.current.getCachedData('key2')).toBeNull()
    expect(result.current.isOfflineReady).toBe(false)
  })

  it('devrait mettre en file d\'attente des actions pour sync', () => {
    const { result } = renderHook(() => useOffline())

    act(() => {
      result.current.queueForSync({
        type: 'create',
        table: 'students',
        data: { name: 'Test' },
        method: 'insert',
      })
    })

    expect(result.current.pendingSyncs).toBeGreaterThan(0)
  })

  it('devrait détecter si offline est prêt', () => {
    const { result } = renderHook(() => useOffline())

    act(() => {
      result.current.cacheData('test-key', { data: 'test' })
    })

    expect(result.current.isOfflineReady).toBe(true)
  })
})
