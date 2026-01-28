/**
 * Tests pour le composant Card
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

describe('Card Component', () => {
  it('devrait rendre la card sans erreur', () => {
    render(<Card data-testid="card">Card content</Card>)
    expect(screen.getByTestId('card')).toBeInTheDocument()
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('devrait gérer les variants', () => {
    const { rerender } = render(<Card variant="default" data-testid="card">Content</Card>)
    expect(screen.getByTestId('card')).toBeInTheDocument()

    rerender(<Card variant="premium" data-testid="card">Content</Card>)
    expect(screen.getByTestId('card')).toBeInTheDocument()

    rerender(<Card variant="elevated" data-testid="card">Content</Card>)
    expect(screen.getByTestId('card')).toBeInTheDocument()

    rerender(<Card variant="outlined" data-testid="card">Content</Card>)
    expect(screen.getByTestId('card')).toBeInTheDocument()
  })

  it('devrait gérer la prop hoverable', () => {
    render(<Card hoverable data-testid="card">Content</Card>)
    const card = screen.getByTestId('card')
    expect(card).toHaveClass('cursor-pointer')
  })

  it('devrait rendre CardHeader avec CardTitle et CardDescription', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
      </Card>
    )
    
    expect(screen.getByText('Card Title')).toBeInTheDocument()
    expect(screen.getByText('Card Description')).toBeInTheDocument()
  })

  it('devrait rendre CardContent', () => {
    render(
      <Card>
        <CardContent>Card body content</CardContent>
      </Card>
    )
    
    expect(screen.getByText('Card body content')).toBeInTheDocument()
  })

  it('devrait rendre CardFooter', () => {
    render(
      <Card>
        <CardFooter>Footer content</CardFooter>
      </Card>
    )
    
    expect(screen.getByText('Footer content')).toBeInTheDocument()
  })

  it('devrait accepter className personnalisée', () => {
    render(<Card className="custom-class" data-testid="card">Content</Card>)
    const card = screen.getByTestId('card')
    expect(card).toHaveClass('custom-class')
  })
})
