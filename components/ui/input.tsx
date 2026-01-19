'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

// Compteur global pour générer des IDs uniques et stables
let inputIdCounter = 0

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onDrag' | 'onDragStart' | 'onDragEnd'> {
  label?: string
  error?: string
  helperText?: string
  variant?: 'default' | 'outlined' | 'filled'
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    label, 
    error, 
    helperText,
    variant = 'default',
    leftIcon,
    rightIcon,
    id,
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(!!props.value || !!props.defaultValue)
    // Utiliser useId() pour un ID stable entre SSR et client (React 18+)
    // Fallback vers un compteur si useId n'est pas disponible
    const reactId = React.useId?.() || null
    const inputId = id || reactId || `input-${++inputIdCounter}`
    
    React.useEffect(() => {
      if (props.value !== undefined) {
        setHasValue(!!props.value)
      }
    }, [props.value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value)
      props.onChange?.(e)
    }

    const baseStyles = cn(
      'flex w-full rounded-lg font-medium transition-all duration-300',
      'placeholder:text-muted-foreground/60',
      'focus:outline-none focus:ring-2 focus:ring-primary/20',
      'disabled:cursor-not-allowed disabled:opacity-50',
      {
        // Default variant
        'border-2 border-input bg-background px-4 py-3': variant === 'default',
        'focus:border-primary focus:bg-white': variant === 'default' && !error,
        'border-destructive focus:border-destructive focus:ring-destructive/20': error,
        
        // Outlined variant
        'border-2 border-input bg-transparent px-4 py-3': variant === 'outlined',
        'focus:border-primary focus:shadow-md focus:shadow-primary/10': variant === 'outlined' && !error,
        
        // Filled variant
        'border-0 border-b-2 border-input bg-muted/50 px-4 py-3 rounded-b-none': variant === 'filled',
        'focus:bg-muted focus:border-primary': variant === 'filled' && !error,
        'focus:border-destructive bg-destructive/5': variant === 'filled' && error,
      },
      leftIcon && 'pl-11',
      rightIcon && 'pr-11',
      error && 'pr-11',
      className
    )

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <motion.label
            htmlFor={inputId}
            initial={false}
            animate={{
              color: error ? '#EF4444' : isFocused ? 'rgb(37, 99, 235)' : 'rgb(107, 114, 128)',
            }}
            className={cn(
              'block text-sm font-medium transition-colors duration-200',
              error && 'text-destructive'
            )}
          >
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </motion.label>
        )}
        
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {leftIcon}
            </div>
          )}
          
          {/* Input */}
          <motion.input
            ref={ref}
            id={inputId}
            {...(props as any)}
            onChange={handleChange}
            onFocus={(e) => {
              setIsFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setIsFocused(false)
              props.onBlur?.(e)
            }}
            className={baseStyles}
            animate={{
              scale: isFocused ? 1.01 : 1,
              borderColor: error 
                ? '#EF4444' 
                : isFocused 
                  ? 'rgb(37, 99, 235)' 
                  : 'rgb(226, 232, 240)',
            }}
            transition={{ duration: 0.2 }}
          />
          
          {/* Right Icon / Status */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {error ? (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <AlertCircle className="h-5 w-5 text-destructive" />
              </motion.div>
            ) : rightIcon ? (
              <div className="text-muted-foreground">
                {rightIcon}
              </div>
            ) : hasValue && !error && variant === 'filled' ? (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <CheckCircle2 className="h-5 w-5 text-success" />
              </motion.div>
            ) : null}
          </div>
        </div>
        
        {/* Helper Text / Error Message */}
        <AnimatePresence mode="wait">
          {(error || helperText) && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'text-xs transition-colors duration-200',
                error ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              {error || helperText}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
