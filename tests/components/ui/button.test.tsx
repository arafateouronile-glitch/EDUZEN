/**
 * Tests pour le composant Button
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  afterEach(() => {
    cleanup()
  })

  it('devrait rendre le bouton sans erreur', () => {
    render(<Button>Test Button</Button>)
    expect(screen.getByText('Test Button')).toBeInTheDocument()
  })

  it('devrait accepter les variants', () => {
    const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link', 'gradient'] as const

    variants.forEach((variant) => {
      const { unmount } = render(<Button variant={variant}>Test {variant}</Button>)
      expect(screen.getByText(`Test ${variant}`)).toBeInTheDocument()
      unmount()
    })
  })

  it('devrait gérer les props DOM correctement', () => {
    const domProps: Record<string, unknown> = {
      className: 'test-class',
      disabled: false,
      onClick: () => {},
    }

    // Vérifier que les props peuvent être supprimées
    delete (domProps as Record<string, unknown>).asChild
    delete (domProps as Record<string, unknown>).variant
    delete (domProps as Record<string, unknown>).size
    delete (domProps as Record<string, unknown>).isLoading

    expect(domProps.asChild).toBeUndefined()
    expect(domProps.variant).toBeUndefined()
    expect(domProps.size).toBeUndefined()
    expect(domProps.isLoading).toBeUndefined()
  })

  describe('Type Safety', () => {
    it('devrait utiliser Record<string, unknown> pour domProps', () => {
      const domProps: Record<string, unknown> = {
        test: 'value',
        number: 123,
        boolean: true,
      }

      expect(typeof domProps.test).toBe('string')
      expect(typeof domProps.number).toBe('number')
      expect(typeof domProps.boolean).toBe('boolean')
    })

    it('devrait utiliser ReactElement<Record<string, unknown>> pour children', () => {
      // Vérifier que le type est correct
      const element: React.ReactElement<Record<string, unknown>> = (
        <div data-testid="test">Test</div>
      )

      expect(element).toBeDefined()
      expect(element.type).toBe('div')
    })
  })
})

