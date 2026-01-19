'use client'

import * as React from 'react'
import { motion } from '@/components/ui/motion'
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onDrag' | 'onDragStart' | 'onDragEnd'> {
  label: string
  error?: string
  success?: string
  helperText?: string
  icon?: React.ReactNode
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ className, label, error, success, helperText, icon, type = 'text', ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const hasValue = props.value !== undefined && props.value !== null && String(props.value).length > 0

    const statusIcon = error ? (
      <XCircle className="h-4 w-4 text-destructive animate-in fade-in-0 zoom-in-95" />
    ) : success ? (
      <CheckCircle className="h-4 w-4 text-success-primary animate-in fade-in-0 zoom-in-95" />
    ) : null

    return (
      <div className="space-y-2">
        <motion.label
          htmlFor={props.id || props.name}
          className={cn(
            'block text-sm font-medium text-foreground',
            error && 'text-destructive',
            success && 'text-success-primary'
          )}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {label}
        </motion.label>

        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {icon}
            </div>
          )}

          <motion.input
            ref={ref}
            type={type}
            {...(props as any)}
            className={cn(
              'flex h-11 w-full rounded-lg border px-3 py-2 text-sm transition-all duration-300',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              icon && 'pl-10',
              statusIcon && 'pr-10',
              error
                ? 'border-destructive focus-visible:ring-destructive bg-red-50/50 dark:bg-red-950/20'
                : success
                ? 'border-success-border focus-visible:ring-success-primary bg-success-bg/40'
                : 'border-input bg-background focus-visible:ring-primary focus-visible:border-primary',
              isFocused && !error && !success && 'shadow-lg shadow-primary/10',
              className
            )}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            whileFocus={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
          />

          {statusIcon && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {statusIcon}
            </motion.div>
          )}
        </div>

        {(error || success || helperText) && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'text-xs flex items-center gap-1.5',
              error && 'text-destructive',
              success && 'text-success-primary',
              !error && !success && 'text-muted-foreground'
            )}
          >
            {error && <AlertCircle className="h-3 w-3" />}
            {success && <CheckCircle className="h-3 w-3" />}
            {!error && !success && helperText && <Info className="h-3 w-3" />}
            {error || success || helperText}
          </motion.p>
        )}
      </div>
    )
  }
)
FormField.displayName = 'FormField'

