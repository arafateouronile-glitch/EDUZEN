/**
 * Tests pour le composant Input
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from '@/components/ui/input'

// Mock framer-motion pour éviter les problèmes d'animation dans les tests
vi.mock('@/components/ui/motion', () => ({
  motion: {
    label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
    input: ({ children, ...props }: any) => <input {...props}>{children}</input>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('Input Component', () => {
  it('devrait rendre l\'input sans erreur', () => {
    render(<Input placeholder="Test input" />)
    expect(screen.getByPlaceholderText('Test input')).toBeInTheDocument()
  })

  it('devrait afficher le label si fourni', () => {
    render(<Input label="Nom" />)
    expect(screen.getByText('Nom')).toBeInTheDocument()
  })

  it('devrait afficher le message d\'erreur', () => {
    render(<Input error="Ce champ est requis" />)
    expect(screen.getByText('Ce champ est requis')).toBeInTheDocument()
  })

  it('devrait afficher le texte d\'aide', () => {
    render(<Input helperText="Entrez votre nom complet" />)
    expect(screen.getByText('Entrez votre nom complet')).toBeInTheDocument()
  })

  it('devrait gérer les variants', () => {
    const { rerender } = render(<Input variant="default" />)
    let input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()

    rerender(<Input variant="outlined" />)
    input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()

    rerender(<Input variant="filled" />)
    input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
  })

  it('devrait gérer les événements onChange', () => {
    const handleChange = vi.fn()
    render(<Input onChange={handleChange} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test value' } })
    
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('devrait gérer les événements onFocus et onBlur', () => {
    const handleFocus = vi.fn()
    const handleBlur = vi.fn()
    render(<Input onFocus={handleFocus} onBlur={handleBlur} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.focus(input)
    expect(handleFocus).toHaveBeenCalledTimes(1)
    
    fireEvent.blur(input)
    expect(handleBlur).toHaveBeenCalledTimes(1)
  })

  it('devrait afficher l\'icône gauche si fournie', () => {
    const LeftIcon = () => <span data-testid="left-icon">🔍</span>
    render(<Input leftIcon={<LeftIcon />} />)
    expect(screen.getByTestId('left-icon')).toBeInTheDocument()
  })

  it('devrait afficher l\'icône droite si fournie', () => {
    const RightIcon = () => <span data-testid="right-icon">✓</span>
    render(<Input rightIcon={<RightIcon />} />)
    expect(screen.getByTestId('right-icon')).toBeInTheDocument()
  })

  it('devrait gérer la prop disabled', () => {
    render(<Input disabled />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.disabled).toBe(true)
  })

  it('devrait gérer la prop required', () => {
    render(<Input label="Email" required />)
    const label = screen.getByText('Email')
    expect(label.querySelector('span')).toHaveTextContent('*')
  })
})
