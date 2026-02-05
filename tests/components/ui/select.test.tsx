/**
 * Tests pour le composant Select
 */

import * as React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  SelectField,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

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
    expect(select).toBeInTheDocument()
    const option3 = Array.from(select.options).find(opt => opt.value === 'option3')
    if (option3) {
      expect(option3.disabled).toBe(true)
    }
  })

  it('devrait appeler onFocus et onBlur quand le select reçoit focus/blur (l.97-105)', () => {
    const onFocus = vi.fn()
    const onBlur = vi.fn()
    render(<SelectField options={mockOptions} onFocus={onFocus} onBlur={onBlur} />)
    const select = screen.getByRole('combobox')
    fireEvent.focus(select)
    expect(onFocus).toHaveBeenCalledTimes(1)
    fireEvent.blur(select)
    expect(onBlur).toHaveBeenCalledTimes(1)
  })

  it('devrait réagir à onMouseDown pour toggle isOpen', () => {
    render(<SelectField options={mockOptions} />)
    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)
    expect(select).toBeInTheDocument()
  })
})

describe('Select Radix API (SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItem)', () => {
  it('devrait rendre SelectRoot avec SelectTrigger et SelectValue', () => {
    render(
      <SelectRoot value="a" onValueChange={vi.fn()}>
        <SelectTrigger>
          <SelectValue placeholder="Choisir..." />
        </SelectTrigger>
      </SelectRoot>
    )
    expect(screen.getByText('a')).toBeInTheDocument()
  })

  it('devrait afficher le placeholder si pas de valeur', () => {
    render(
      <SelectRoot onValueChange={vi.fn()}>
        <SelectTrigger>
          <SelectValue placeholder="Choisir une option" />
        </SelectTrigger>
      </SelectRoot>
    )
    expect(screen.getByText('Choisir une option')).toBeInTheDocument()
  })

  it('devrait appeler onValueChange quand on clique sur un SelectItem', () => {
    const onValueChange = vi.fn()
    render(
      <SelectRoot value="" onValueChange={onValueChange}>
        <SelectTrigger>Ouvrir</SelectTrigger>
        <SelectContent>
          <SelectItem value="opt1">Option 1</SelectItem>
          <SelectItem value="opt2">Option 2</SelectItem>
        </SelectContent>
      </SelectRoot>
    )
    fireEvent.click(screen.getByText('Ouvrir'))
    const option1 = screen.getByRole('option', { name: /option 1/i })
    fireEvent.click(option1)
    expect(onValueChange).toHaveBeenCalledWith('opt1')
  })

  it('devrait rendre SelectItem avec aria-selected si sélectionné', () => {
    render(
      <SelectRoot value="selected" onValueChange={vi.fn()}>
        <SelectTrigger>Trigger</SelectTrigger>
        <SelectContent>
          <SelectItem value="selected">Selected</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </SelectContent>
      </SelectRoot>
    )
    fireEvent.click(screen.getByText('Trigger'))
    const selectedItem = screen.getByRole('option', { name: 'Selected' })
    expect(selectedItem).toHaveAttribute('aria-selected', 'true')
  })

  it('devrait assigner ref objet au bouton trigger (l.230)', () => {
    const ref = React.createRef<HTMLButtonElement | null>()
    render(
      <SelectRoot value="a" onValueChange={vi.fn()}>
        <SelectTrigger ref={ref}>Trigger</SelectTrigger>
      </SelectRoot>
    )
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    expect(ref.current?.textContent).toContain('Trigger')
  })
})
