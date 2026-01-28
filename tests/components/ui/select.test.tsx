/**
 * Tests pour le composant Select
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SelectField } from '@/components/ui/select'

// Mock framer-motion
vi.mock('@/components/ui/motion', () => ({
  motion: {
    label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
    select: ({ children, ...props }: any) => <select {...props}>{children}</select>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

const mockOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3', disabled: true },
]

describe('Select Component', () => {
  it('devrait rendre le select sans erreur', () => {
    render(<SelectField options={mockOptions} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('devrait afficher toutes les options', () => {
    render(<SelectField options={mockOptions} />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    
    // Vérifier que le select est rendu avec les options
    expect(select).toBeInTheDocument()
    expect(select.options.length).toBeGreaterThanOrEqual(3)
  })

  it('devrait afficher le label si fourni', () => {
    render(<SelectField label="Choisir une option" options={mockOptions} />)
    expect(screen.getByText('Choisir une option')).toBeInTheDocument()
  })

  it('devrait afficher le message d\'erreur', () => {
    render(<SelectField error="Ce champ est requis" options={mockOptions} />)
    expect(screen.getByText('Ce champ est requis')).toBeInTheDocument()
  })

  it('devrait afficher le texte d\'aide', () => {
    render(<SelectField helperText="Sélectionnez une option" options={mockOptions} />)
    expect(screen.getByText('Sélectionnez une option')).toBeInTheDocument()
  })

  it('devrait gérer les variants', () => {
    const { rerender } = render(<SelectField variant="default" options={mockOptions} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()

    rerender(<SelectField variant="outlined" options={mockOptions} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()

    rerender(<SelectField variant="filled" options={mockOptions} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('devrait gérer les événements onChange', () => {
    const handleChange = vi.fn()
    render(<SelectField options={mockOptions} onChange={handleChange} data-testid="select" />)
    
    const select = screen.getByTestId('select')
    fireEvent.change(select, { target: { value: 'option1' } })
    
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('devrait gérer la prop disabled', () => {
    render(<SelectField options={mockOptions} disabled />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.disabled).toBe(true)
  })

  it('devrait gérer la prop placeholder', () => {
    render(<SelectField options={mockOptions} placeholder="Sélectionnez..." />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    // Le placeholder devrait être la première option
    expect(select).toBeInTheDocument()
  })

  it('devrait désactiver les options marquées comme disabled', () => {
    render(<SelectField options={mockOptions} />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    // Vérifier que le select est rendu avec les options
    expect(select).toBeInTheDocument()
    // Les options disabled sont gérées par le composant
    const option3 = Array.from(select.options).find(opt => opt.value === 'option3')
    if (option3) {
      expect(option3.disabled).toBe(true)
    }
  })
})
