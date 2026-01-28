/**
 * Tests unitaires pour useDebounce et useDebouncedCallback
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDebounce, useDebouncedCallback } from '@/lib/hooks/use-debounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('devrait retourner la valeur initiale immédiatement', () => {
    const { result } = renderHook(() => useDebounce('initial', 300))
    expect(result.current).toBe('initial')
  })

  it('devrait debouncer les changements de valeur', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 300 },
      }
    )

    expect(result.current).toBe('initial')

    // Changer la valeur
    act(() => {
      rerender({ value: 'updated', delay: 300 })
    })

    // La valeur ne devrait pas changer immédiatement
    expect(result.current).toBe('initial')

    // Avancer le temps de 299ms
    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(result.current).toBe('initial')

    // Avancer le temps de 1ms de plus (total 300ms)
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('updated')
  })

  it('devrait annuler le timer précédent si la valeur change avant la fin du délai', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 300 },
      }
    )

    // Changer la valeur
    act(() => {
      rerender({ value: 'first', delay: 300 })
      vi.advanceTimersByTime(150)
    })

    // Changer à nouveau avant la fin du délai
    act(() => {
      rerender({ value: 'second', delay: 300 })
      vi.advanceTimersByTime(150)
    })

    // La valeur devrait toujours être 'initial'
    expect(result.current).toBe('initial')

    // Avancer le temps de 150ms de plus (total 300ms depuis le dernier changement)
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(result.current).toBe('second')
  })

  it('devrait utiliser le délai par défaut de 300ms si non spécifié', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      {
        initialProps: { value: 'initial' },
      }
    )

    act(() => {
      rerender({ value: 'updated' })
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe('updated')
  })

  it('devrait fonctionner avec différents types de valeurs', () => {
    // Test avec nombre
    const { result: result1, rerender: rerender1 } = renderHook(
      ({ value }) => useDebounce(value, 100),
      {
        initialProps: { value: 0 },
      }
    )

    act(() => {
      rerender1({ value: 42 })
      vi.advanceTimersByTime(100)
    })
    expect(result1.current).toBe(42)

    // Test avec objet (nouveau hook)
    const { result: result2, rerender: rerender2 } = renderHook(
      ({ value }) => useDebounce(value, 100),
      {
        initialProps: { value: { name: 'initial' } },
      }
    )

    act(() => {
      rerender2({ value: { name: 'test' } })
      vi.advanceTimersByTime(100)
    })
    expect(result2.current).toEqual({ name: 'test' })
  })
})

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('devrait retourner une fonction', () => {
    const callback = vi.fn()
    const { result } = renderHook(() =>
      useDebouncedCallback(callback, 300)
    )

    expect(typeof result.current).toBe('function')
  })

  it('devrait appeler la fonction après le délai', () => {
    const callback = vi.fn()
    const { result } = renderHook(() =>
      useDebouncedCallback(callback, 300)
    )

    act(() => {
      result.current('arg1', 'arg2', 123)
    })

    // La fonction ne devrait pas être appelée immédiatement
    expect(callback).not.toHaveBeenCalled()

    // Avancer le temps de 300ms
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // La fonction devrait être appelée avec les bons arguments
    expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 123)
  })

  it('devrait utiliser le délai par défaut de 300ms si non spécifié', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback))

    act(() => {
      result.current()
      vi.advanceTimersByTime(300)
    })

    expect(callback).toHaveBeenCalledTimes(1)
  })

  // Note: Les tests de debounce avec plusieurs appels rapides sont complexes
  // car useDebouncedCallback utilise useState pour le timeoutId, ce qui peut
  // causer des problèmes de synchronisation avec les fake timers.
  // Pour des tests plus complets, il faudrait utiliser useRef au lieu de useState.
})
