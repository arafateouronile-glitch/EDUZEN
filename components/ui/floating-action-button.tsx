'use client'

import * as React from 'react'
import { motion } from '@/components/ui/motion'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface FloatingActionButtonProps {
  onClick: () => void
  icon?: React.ReactNode
  label?: string
  variant?: 'default' | 'gradient' | 'glass'
  className?: string
}

export function FloatingActionButton({
  onClick,
  icon = <Plus className="h-5 w-5" />,
  label,
  variant = 'gradient',
  className,
}: FloatingActionButtonProps) {
  const variants = {
    default: 'bg-primary text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40',
    gradient: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/60',
    glass: 'glass-morphism text-foreground border-white/20 shadow-lg',
  }

  return (
    <motion.div
      className={cn('fixed bottom-6 right-6 z-50', className)}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ 
        type: "spring",
        stiffness: 260,
        damping: 20
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <motion.button
        onClick={onClick}
        className={cn(
          'h-14 w-14 rounded-full flex items-center justify-center',
          'transition-all duration-300 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'min-touch-target touch-manipulation',
          variants[variant]
        )}
        whileHover={{ rotate: 90 }}
        transition={{ duration: 0.3 }}
      >
        {icon}
        {label && (
          <span className="sr-only">{label}</span>
        )}
      </motion.button>
    </motion.div>
  )
}
























