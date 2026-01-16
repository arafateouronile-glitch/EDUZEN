'use client'

import { motion, AnimatePresence } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export interface LoadingOverlayProps {
  isLoading: boolean
  message?: string
  variant?: 'default' | 'spinner' | 'dots' | 'pulse'
  className?: string
}

export function LoadingOverlay({
  isLoading,
  message = 'Chargement...',
  variant = 'spinner',
  className,
}: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center',
            'bg-white/80 dark:bg-gray-900/80 backdrop-blur-md',
            className
          )}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center space-y-4"
          >
            {variant === 'spinner' && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              >
                <Loader2 className="h-8 w-8 text-primary" />
              </motion.div>
            )}

            {variant === 'dots' && (
              <div className="flex space-x-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-3 w-3 rounded-full bg-primary"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.2,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>
            )}

            {variant === 'pulse' && (
              <motion.div
                className="h-12 w-12 rounded-full bg-primary"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.7, 1],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            )}

            {message && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-sm font-medium text-muted-foreground"
              >
                {message}
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function PageLoader({
  isLoading,
  message,
  variant = 'spinner',
}: LoadingOverlayProps) {
  return <LoadingOverlay isLoading={isLoading} message={message} variant={variant} />
}
























