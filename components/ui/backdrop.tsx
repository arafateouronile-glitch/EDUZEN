'use client'

import { motion, AnimatePresence } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'

export interface BackdropProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  variant?: 'default' | 'blur' | 'glass' | 'dark'
  className?: string
  closeOnClick?: boolean
}

export function Backdrop({
  isOpen,
  onClose,
  children,
  variant = 'blur',
  className,
  closeOnClick = true,
}: BackdropProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const variantClasses = {
    default: 'bg-black/50',
    blur: 'bg-black/50 backdrop-blur-sm',
    glass: 'bg-white/10 backdrop-blur-md',
    dark: 'bg-black/75',
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={closeOnClick ? onClose : undefined}
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center p-4',
            variantClasses[variant],
            className
          )}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
























