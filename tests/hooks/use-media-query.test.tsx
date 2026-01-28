/**
 * Tests unitaires pour useMediaQuery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMediaQuery, useIsMobile, useIsTablet, useIsDesktop } from '@/lib/hooks/use-media-query'

describe('useMediaQuery', () => {
  let matchMediaMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    matchMediaMock = vi.fn()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('devrait retourner true si la media query correspond', () => {
    const mediaQueryList = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }
    matchMediaMock.mockReturnValue(mediaQueryList)

    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'))

    expect(result.current).toBe(true)
    expect(matchMediaMock).toHaveBeenCalledWith('(max-width: 768px)')
  })

  it('devrait retourner false si la media query ne correspond pas', () => {
    const mediaQueryList = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }
    matchMediaMock.mockReturnValue(mediaQueryList)

    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'))

    expect(result.current).toBe(false)
  })

  it('devrait mettre à jour quand la media query change', () => {
    const listeners: Array<(e: MediaQueryListEvent) => void> = []
    const mediaQueryList = {
      matches: false,
      addEventListener: vi.fn((event: string, callback: (e: MediaQueryListEvent) => void) => {
        listeners.push(callback)
      }),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }
    matchMediaMock.mockReturnValue(mediaQueryList)

    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'))

    expect(result.current).toBe(false)

    // Simuler un changement
    act(() => {
      const newMediaQueryList = {
        ...mediaQueryList,
        matches: true,
      }
      matchMediaMock.mockReturnValue(newMediaQueryList)
      listeners.forEach((listener) => {
        listener({ matches: true } as MediaQueryListEvent)
      })
    })

    expect(result.current).toBe(true)
  })

  it('devrait utiliser addListener pour les anciens navigateurs', () => {
    const listeners: Array<(e: MediaQueryListEvent) => void> = []
    const mediaQueryList = {
      matches: false,
      addEventListener: undefined,
      removeEventListener: undefined,
      addListener: vi.fn((callback: (e: MediaQueryListEvent) => void) => {
        listeners.push(callback)
      }),
      removeListener: vi.fn(),
    }
    matchMediaMock.mockReturnValue(mediaQueryList)

    renderHook(() => useMediaQuery('(max-width: 768px)'))

    expect(mediaQueryList.addListener).toHaveBeenCalled()
  })

  it('devrait nettoyer les event listeners au démontage', () => {
    const removeEventListenerSpy = vi.fn()
    const removeListenerSpy = vi.fn()
    const mediaQueryList = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: removeEventListenerSpy,
      addListener: vi.fn(),
      removeListener: removeListenerSpy,
    }
    matchMediaMock.mockReturnValue(mediaQueryList)

    const { unmount } = renderHook(() => useMediaQuery('(max-width: 768px)'))

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalled()
  })
})

describe('useIsMobile', () => {
  it('devrait utiliser la media query pour mobile', () => {
    const matchMediaSpy = vi.spyOn(window, 'matchMedia')
    const mediaQueryList = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }
    matchMediaSpy.mockReturnValue(mediaQueryList as any)

    renderHook(() => useIsMobile())

    expect(matchMediaSpy).toHaveBeenCalledWith('(max-width: 768px)')
    matchMediaSpy.mockRestore()
  })
})

describe('useIsTablet', () => {
  it('devrait utiliser la media query pour tablet', () => {
    const matchMediaSpy = vi.spyOn(window, 'matchMedia')
    const mediaQueryList = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }
    matchMediaSpy.mockReturnValue(mediaQueryList as any)

    renderHook(() => useIsTablet())

    expect(matchMediaSpy).toHaveBeenCalledWith('(min-width: 769px) and (max-width: 1024px)')
    matchMediaSpy.mockRestore()
  })
})

describe('useIsDesktop', () => {
  it('devrait utiliser la media query pour desktop', () => {
    const matchMediaSpy = vi.spyOn(window, 'matchMedia')
    const mediaQueryList = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }
    matchMediaSpy.mockReturnValue(mediaQueryList as any)

    renderHook(() => useIsDesktop())

    expect(matchMediaSpy).toHaveBeenCalledWith('(min-width: 1025px)')
    matchMediaSpy.mockRestore()
  })
})
