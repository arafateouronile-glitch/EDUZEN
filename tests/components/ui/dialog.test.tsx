/**
 * Tests pour le composant Dialog
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

// Mock Radix UI Dialog pour les tests
vi.mock('@radix-ui/react-dialog', () => ({
  Root: ({ children, open, onOpenChange }: any) => (
    <div data-testid="dialog-root" data-open={open}>
      {children}
    </div>
  ),
  Trigger: ({ children, ...props }: any) => (
    <button data-testid="dialog-trigger" {...props}>
      {children}
    </button>
  ),
  Portal: ({ children }: any) => <div data-testid="dialog-portal">{children}</div>,
  Overlay: ({ className, ...props }: any) => (
    <div data-testid="dialog-overlay" className={className} {...props} />
  ),
  Content: ({ children, className, ...props }: any) => (
    <div data-testid="dialog-content" className={className} {...props}>
      {children}
    </div>
  ),
  Close: ({ children, className, ...props }: any) => (
    <button data-testid="dialog-close" className={className} {...props}>
      {children}
    </button>
  ),
  Title: React.forwardRef(({ children, className, ...props }: any, ref: any) => (
    <h2 ref={ref} className={className} {...props}>
      {children}
    </h2>
  )),
  Description: React.forwardRef(({ children, className, ...props }: any, ref: any) => (
    <p ref={ref} className={className} {...props}>
      {children}
    </p>
  )),
}))

describe('Dialog Component', () => {
  it('devrait rendre le Dialog sans erreur', () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <div>Dialog content</div>
        </DialogContent>
      </Dialog>
    )
    
    expect(screen.getByTestId('dialog-root')).toBeInTheDocument()
    expect(screen.getByText('Dialog content')).toBeInTheDocument()
  })

  it('devrait rendre DialogTrigger', () => {
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
      </Dialog>
    )
    
    expect(screen.getByTestId('dialog-trigger')).toBeInTheDocument()
    expect(screen.getByText('Open Dialog')).toBeInTheDocument()
  })

  it('devrait rendre DialogContent avec DialogHeader', () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog Description</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
    
    expect(screen.getByTestId('dialog-content')).toBeInTheDocument()
    expect(screen.getByText('Dialog Title')).toBeInTheDocument()
    expect(screen.getByText('Dialog Description')).toBeInTheDocument()
  })

  it('devrait rendre DialogFooter', () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <DialogFooter>Footer content</DialogFooter>
        </DialogContent>
      </Dialog>
    )
    
    expect(screen.getByText('Footer content')).toBeInTheDocument()
  })

  it('devrait gérer l\'état open/closed', () => {
    const { rerender } = render(
      <Dialog open={true}>
        <DialogContent>Content</DialogContent>
      </Dialog>
    )
    
    let root = screen.getByTestId('dialog-root')
    expect(root).toHaveAttribute('data-open', 'true')
    
    rerender(
      <Dialog open={false}>
        <DialogContent>Content</DialogContent>
      </Dialog>
    )
    
    root = screen.getByTestId('dialog-root')
    expect(root).toHaveAttribute('data-open', 'false')
  })
})
