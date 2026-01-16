'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'gradient'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  isLoading?: boolean
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', isLoading = false, asChild = false, children, disabled, ...props }, ref) => {
    const buttonClassName = cn(
      'inline-flex items-center justify-center rounded-lg font-medium',
      'transition-all duration-300 ease-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
      'ring-offset-background min-touch-target touch-manipulation',
      'relative overflow-hidden group',
      'active:scale-[0.98]',
      {
        // Default variant - Bleu principal #335ACF
        'bg-brand-blue text-white shadow-md hover:shadow-lg hover:shadow-brand-blue/25': variant === 'default',
        'hover:bg-brand-blue-dark hover:-translate-y-0.5': variant === 'default' && !disabled,
        
        // Gradient variant - Dégradé bleu → cyan
        'bg-gradient-brand text-white shadow-lg hover:shadow-xl': variant === 'gradient',
        'hover:opacity-90 hover:-translate-y-0.5': variant === 'gradient' && !disabled,
        
        // Destructive variant
        'bg-destructive text-destructive-foreground shadow-md hover:shadow-lg hover:shadow-destructive/25': variant === 'destructive',
        'hover:bg-destructive/90 hover:-translate-y-0.5': variant === 'destructive' && !disabled,
        
        // Outline variant - Bordure gris avec hover
        'border-2 border-bg-gray-200 bg-transparent text-text-secondary hover:bg-bg-gray-100 hover:border-brand-blue hover:text-text-primary': variant === 'outline',
        'hover:-translate-y-0.5': variant === 'outline' && !disabled,
        
        // Secondary variant - Cyan #34B9EE
        'bg-brand-cyan text-white shadow-sm hover:shadow-md': variant === 'secondary',
        'hover:bg-brand-cyan-dark hover:-translate-y-0.5': variant === 'secondary' && !disabled,
        
        // Ghost variant
        'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
        'hover:-translate-y-0.5': variant === 'ghost' && !disabled,
        
        // Link variant - Bleu pour liens
        'underline-offset-4 hover:underline text-brand-blue p-0 h-auto': variant === 'link',
        
        // Sizes
        'h-10 px-5 py-2.5 text-sm': size === 'default',
        'h-9 px-3.5 rounded-md text-sm': size === 'sm',
        'h-12 px-8 rounded-lg text-base font-semibold': size === 'lg',
        'h-10 w-10 p-0': size === 'icon',
      },
      className
    )

    // Préparer les props DOM en excluant les props spécifiques au composant Button
    // Ces props ne doivent jamais être passées au DOM
    const domProps = { ...props }
    delete (domProps as Record<string, unknown>).asChild
    delete (domProps as Record<string, unknown>).variant
    delete (domProps as Record<string, unknown>).size
    delete (domProps as Record<string, unknown>).isLoading

    if (asChild && React.isValidElement(children)) {
      // Mode composition : cloner l'enfant et lui passer les styles et props
      return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        className: cn(buttonClassName, (children as React.ReactElement<Record<string, unknown>>).props?.className),
        disabled: disabled || isLoading,
        ...domProps,
      })
    }

    // Mode normal : rendre un élément button natif
    return (
      <button
        className={buttonClassName}
        ref={ref}
        disabled={disabled || isLoading}
        {...domProps}
      >
        {/* Shimmer effect on hover */}
        <span className={cn(
          'absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500',
          'bg-gradient-to-r from-transparent via-white/20 to-transparent',
          'translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700'
        )} />
        
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span className="opacity-70">Chargement...</span>
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button }
