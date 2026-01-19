'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { ChevronDown, Check, AlertCircle } from 'lucide-react'

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children' | 'onDrag' | 'onDragStart' | 'onDragEnd'> {
  label?: string
  error?: string
  helperText?: string
  variant?: 'default' | 'outlined' | 'filled'
  leftIcon?: React.ReactNode
  options: Array<{ value: string; label: string; disabled?: boolean }>
  placeholder?: string
}

const SelectNative = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    className, 
    label, 
    error, 
    helperText,
    variant = 'default',
    leftIcon,
    id,
    options,
    placeholder,
    value,
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const [isOpen, setIsOpen] = React.useState(false)
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`
    const hasValue = !!value

    const baseStyles = cn(
      'flex w-full rounded-lg font-medium transition-all duration-300',
      'appearance-none cursor-pointer',
      'focus:outline-none focus:ring-2 focus:ring-primary/20',
      'disabled:cursor-not-allowed disabled:opacity-50',
      {
        // Default variant
        'border-2 border-input bg-background px-4 py-3 pr-11': variant === 'default',
        'focus:border-primary focus:bg-white': variant === 'default' && !error,
        'border-destructive focus:border-destructive focus:ring-destructive/20': error,
        
        // Outlined variant
        'border-2 border-input bg-transparent px-4 py-3 pr-11': variant === 'outlined',
        'focus:border-primary focus:shadow-md focus:shadow-primary/10': variant === 'outlined' && !error,
        
        // Filled variant
        'border-0 border-b-2 border-input bg-muted/50 px-4 py-3 pr-11 rounded-b-none': variant === 'filled',
        'focus:bg-muted focus:border-primary': variant === 'filled' && !error,
        'focus:border-destructive bg-destructive/5': variant === 'filled' && error,
      },
      leftIcon && 'pl-11',
      className
    )

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <motion.label
            htmlFor={selectId}
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
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10">
              {leftIcon}
            </div>
          )}
          
          {/* Select */}
          <motion.select
            ref={ref}
            id={selectId}
            value={value}
            {...(props as any)}
            onFocus={(e) => {
              setIsFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setIsFocused(false)
              setIsOpen(false)
              props.onBlur?.(e)
            }}
            onMouseDown={() => setIsOpen(!isOpen)}
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
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {(options || []).map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </motion.select>
          
          {/* Chevron Icon */}
          <motion.div
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground"
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-5 w-5" />
          </motion.div>
          
          {/* Error Icon */}
          {error && (
            <motion.div
              className="absolute right-11 top-1/2 -translate-y-1/2 pointer-events-none"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <AlertCircle className="h-5 w-5 text-destructive" />
            </motion.div>
          )}
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
SelectNative.displayName = 'SelectNative'

// Export SelectNative as Select for backward compatibility
export { SelectNative as SelectField }

// Composants Radix UI pour compatibilité avec l'API Radix
interface SelectContextValue {
  value?: string
  onValueChange?: (value: string) => void
  open?: boolean
  setOpen?: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextValue>({})

interface SelectRootProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

// Wrapper pour utiliser Select comme composant Radix
export const SelectRoot = React.forwardRef<HTMLDivElement, SelectRootProps>(
  ({ value, onValueChange, children }, ref) => {
    const [open, setOpen] = React.useState(false)
    
    return (
      <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
        <div className="relative" ref={ref}>{children}</div>
      </SelectContext.Provider>
    )
  }
)
SelectRoot.displayName = 'SelectRoot'

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ children, className, ...props }, ref) => {
    const { open, setOpen } = React.useContext(SelectContext)
    
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        onClick={() => setOpen?.(!open)}
        {...props}
      >
        {children}
        <ChevronDown className={cn('h-4 w-4 opacity-50 transition-transform', open && 'rotate-180')} />
      </button>
    )
  }
)
SelectTrigger.displayName = 'SelectTrigger'

interface SelectValueProps {
  placeholder?: string
}

export const SelectValue = React.forwardRef<HTMLSpanElement, SelectValueProps>(
  ({ placeholder }, ref) => {
    const { value } = React.useContext(SelectContext)
    return <span ref={ref}>{value || placeholder}</span>
  }
)
SelectValue.displayName = 'SelectValue'

interface SelectContentProps {
  children: React.ReactNode
}

export const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ children }, ref) => {
    const context = React.useContext(SelectContext)
    const open = context?.open ?? false
    
    if (!open) return null
    
    // S'assurer que children est toujours défini et peut être rendu
    if (!children) return null
    
    return (
      <div 
        ref={ref} 
        className="absolute top-full left-0 z-50 mt-1 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
      >
        <div className="p-1">{children}</div>
      </div>
    )
  }
)
SelectContent.displayName = 'SelectContent'

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  children: React.ReactNode
}

export const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ value, children, className, ...props }, ref) => {
    const { value: selectedValue, onValueChange, setOpen } = React.useContext(SelectContext)
    const isSelected = selectedValue === value

    const handleClick = () => {
      onValueChange?.(value)
      setOpen?.(false)
    }

    return (
      <div
        ref={ref}
        role="option"
        aria-selected={isSelected}
        className={cn(
          'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
          isSelected && 'bg-accent text-accent-foreground',
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {children}
      </div>
    )
  }
)
SelectItem.displayName = 'SelectItem'

// Export Select as alias for SelectRoot for Radix UI compatibility
export const Select = SelectRoot
