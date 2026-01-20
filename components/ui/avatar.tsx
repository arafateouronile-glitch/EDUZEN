'use client'

import * as React from 'react'
import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import { User } from 'lucide-react'
import { getAvatarColor, getInitials, getPremiumGradient } from '@/lib/utils/avatar-colors'

interface AvatarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrag' | 'onDragStart' | 'onDragEnd'> {
  src?: string
  alt?: string
  fallback?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'premium' | 'gradient' | 'auto'
  online?: boolean
  userId?: string // Pour générer une couleur déterministe
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-xl',
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, size = 'md', variant = 'auto', online, userId, ...props }, ref) => {
    // Déterminer la couleur basée sur l'ID utilisateur ou le fallback
    const identifier = userId || fallback || 'default'
    const avatarColor = getAvatarColor(identifier)
    const premiumGradient = getPremiumGradient(identifier)

    const variantStyles = React.useMemo(() => {
      if (variant === 'auto' && identifier !== 'default') {
        return {
          background: premiumGradient.gradient,
          color: premiumGradient.textColor,
          boxShadow: `0 4px 12px ${premiumGradient.shadowColor}, 0 2px 4px ${premiumGradient.shadowColor}40`,
        }
      }

      const variantClasses = {
        default: 'bg-gray-100 text-gray-600 border-gray-200',
        premium: 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white border-0 shadow-lg shadow-purple-500/50',
        gradient: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-md',
        auto: 'bg-gray-100 text-gray-600 border-gray-200',
      }

      return {
        className: variantClasses[variant],
      }
    }, [variant, identifier, premiumGradient])

    const initials = fallback ? getInitials(fallback) : ''

    return (
      <motion.div
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center rounded-full border-2',
          'overflow-hidden select-none font-semibold',
          sizeClasses[size],
          variant === 'auto' && identifier !== 'default' ? '' : variantStyles.className,
          variant === 'auto' && identifier !== 'default' ? 'border-0' : '',
          className
        )}
        style={
          variant === 'auto' && identifier !== 'default'
            ? variantStyles
            : undefined
        }
        whileHover={{ scale: 1.05, boxShadow: variant === 'auto' ? `0 8px 20px ${premiumGradient.shadowColor}` : undefined }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.2 }}
        {...(props as any)}
      >
        {src ? (
          <motion.img
            src={src}
            alt={alt || ''}
            className="w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        ) : (
          <span className="font-semibold">
            {initials || <User className="h-1/2 w-1/2" />}
          </span>
        )}
        {online !== undefined && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn(
              'absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-gray-900',
              size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3',
              'shadow-sm',
              online ? 'bg-brand-cyan' : 'bg-gray-400'
            )}
          />
        )}
      </motion.div>
    )
  }
)
Avatar.displayName = 'Avatar'

// Exports pour compatibilité avec les composants qui utilisent AvatarImage, AvatarFallback
export const AvatarImage = ({ src, alt, className }: { src?: string; alt?: string; className?: string }) => {
  if (!src) return null
  return <img src={src} alt={alt} className={className} />
}

export const AvatarFallback = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return <div className={className}>{children}</div>
}

