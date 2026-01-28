/**
 * Tests unitaires pour useClickOutside
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useClickOutside } from '@/lib/hooks/use-click-outside'

describe('useClickOutside', () => {
  let handler: ReturnType<typeof vi.fn>

  beforeEach(() => {
    handler = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('devrait retourner une ref', () => {
    const { result } = renderHook(() => useClickOutside(handler))
    expect(result.current).toBeDefined()
    expect(result.current.current).toBeNull()
  })

  it('devrait appeler le handler quand on clique en dehors', () => {
    const { result } = renderHook(() => useClickOutside(handler))
    
    // Créer un élément DOM et l'attacher à la ref
    const div = document.createElement('div')
    document.body.appendChild(div)
    // Utiliser Object.defineProperty pour définir current
    Object.defineProperty(result.current, 'current', {
      value: div,
      writable: true,
      configurable: true,
    })

    // Créer un autre élément en dehors
    const outsideDiv = document.createElement('div')
    document.body.appendChild(outsideDiv)

    // Simuler un clic en dehors
    const event = new MouseEvent('mousedown', { bubbles: true })
    document.dispatchEvent(event)

    expect(handler).toHaveBeenCalled()
    
    // Nettoyer
    document.body.removeChild(div)
    document.body.removeChild(outsideDiv)
  })

  it('ne devrait pas appeler le handler quand on clique à l\'intérieur', () => {
    const { result } = renderHook(() => useClickOutside(handler))
    
    const div = document.createElement('div')
    document.body.appendChild(div)
    Object.defineProperty(result.current, 'current', {
      value: div,
      writable: true,
      configurable: true,
    })

    // Simuler un clic à l'intérieur
    const event = new MouseEvent('mousedown', { bubbles: true, target: div })
    div.dispatchEvent(event)

    expect(handler).not.toHaveBeenCalled()
    
    document.body.removeChild(div)
  })

  it('ne devrait pas appeler le handler si enabled est false', () => {
    const { result } = renderHook(() => useClickOutside(handler, false))
    
    const div = document.createElement('div')
    document.body.appendChild(div)
    Object.defineProperty(result.current, 'current', {
      value: div,
      writable: true,
      configurable: true,
    })

    const event = new MouseEvent('mousedown', { bubbles: true })
    document.dispatchEvent(event)

    expect(handler).not.toHaveBeenCalled()
    
    document.body.removeChild(div)
  })

  it('devrait gérer les événements touchstart', () => {
    const { result } = renderHook(() => useClickOutside(handler))
    
    const div = document.createElement('div')
    document.body.appendChild(div)
    Object.defineProperty(result.current, 'current', {
      value: div,
      writable: true,
      configurable: true,
    })

    // Simuler un touchstart
    const event = new TouchEvent('touchstart', { bubbles: true })
    document.dispatchEvent(event)

    expect(handler).toHaveBeenCalled()
    
    document.body.removeChild(div)
  })

  it('devrait nettoyer les event listeners au démontage', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

    const { unmount } = renderHook(() => useClickOutside(handler))
    
    expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function))
    expect(addEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function))

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function))

    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })
})
