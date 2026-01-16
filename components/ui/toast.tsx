'use client'

import * as React from 'react'
import { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    // Valider et normaliser le type de toast - s'assurer qu'il est toujours défini
    const validTypes: ToastType[] = ['success', 'error', 'warning', 'info']
    const toastType: ToastType = (toast.type && validTypes.includes(toast.type)) ? toast.type : 'info'
    const newToast: Toast = {
      ...toast,
      type: toastType,
      id,
      duration: toast.duration || 5000,
    }
    setToasts((prev) => [...prev, newToast])

    // Auto remove after duration
    setTimeout(() => {
      removeToast(id)
    }, newToast.duration)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

function ToastContainer({ 
  toasts, 
  removeToast 
}: { 
  toasts: Toast[]
  removeToast: (id: string) => void 
}) {
  return (
    <div className="fixed bottom-0 right-0 z-50 flex flex-col gap-4 p-6 pointer-events-none max-w-md w-full sm:w-auto">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast, index) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            index={index}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

const ToastItem = React.forwardRef<
  HTMLDivElement,
  {
    toast: Toast
    index: number
    onClose: () => void
  }
>(({
  toast,
  index,
  onClose,
}, ref) => {
  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  }

  const colors = {
    success: {
      bg: 'bg-success-bg border-success-border',
      icon: 'text-success-primary',
      title: 'text-success-primary',
      description: 'text-text-secondary',
      progress: 'bg-success-primary',
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      icon: 'text-red-600',
      title: 'text-red-900',
      description: 'text-red-700',
      progress: 'bg-red-500',
    },
    warning: {
      bg: 'bg-warning-bg border-warning-border',
      icon: 'text-warning-primary',
      title: 'text-warning-primary',
      description: 'text-text-secondary',
      progress: 'bg-warning-primary',
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      icon: 'text-blue-600',
      title: 'text-blue-900',
      description: 'text-blue-700',
      progress: 'bg-blue-500',
    },
  }

  // Protection contre les toasts invalides - vérification très tôt
  if (!toast || typeof toast !== 'object') {
    console.error('Toast is undefined or invalid!', toast)
    return null
  }

  // Définir les types valides
  const validTypes: ToastType[] = ['success', 'error', 'warning', 'info']
  
  // Couleur par défaut garantie - toujours définie
  const DEFAULT_COLOR = {
    bg: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-600',
    title: 'text-blue-900',
    description: 'text-blue-700',
    progress: 'bg-blue-500',
  } as const
  
  // Valider le type du toast
  const toastType = (toast?.type && validTypes.includes(toast.type)) ? toast.type : 'info'
  const finalType: ToastType = toastType
  
  // Récupérer l'icône avec fallback garanti
  const Icon = icons[finalType] || Info
  
  // Récupérer la couleur de manière absolument sûre
  const getColor = (): typeof DEFAULT_COLOR => {
    // Essayer d'obtenir la couleur pour le type
    if (finalType in colors) {
      const color = colors[finalType]
      if (color && typeof color === 'object' && 'bg' in color && color.bg) {
        return color as typeof DEFAULT_COLOR
      }
    }
    // Fallback vers info
    if (colors.info && typeof colors.info === 'object' && 'bg' in colors.info && colors.info.bg) {
      return colors.info as typeof DEFAULT_COLOR
    }
    // Dernier recours : couleur par défaut
    return DEFAULT_COLOR
  }
  
  // Calculer finalColor une seule fois de manière sûre
  const finalColor = getColor()
  
  // Vérification finale - si même ça échoue, retourner null
  if (!finalColor || typeof finalColor !== 'object' || !('bg' in finalColor)) {
    console.error('CRITICAL: Toast color system completely broken!', { finalType, toast })
    return null
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        delay: index * 0.05,
      }}
      layout
      className={cn(
        'relative pointer-events-auto',
        'rounded-xl border-2 shadow-xl backdrop-blur-md',
        'overflow-hidden group',
        finalColor.bg
      )}
      whileHover={{ scale: 1.02 }}
      onClick={onClose}
    >
      {/* Progress bar */}
      <motion.div
        className={cn('absolute top-0 left-0 h-1', finalColor.progress)}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: (toast.duration || 5000) / 1000, ease: 'linear' }}
      />

      <div className="flex items-start gap-4 p-4">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: 0.1,
          }}
          className={cn(
            'flex-shrink-0 p-2 rounded-lg bg-white/50 backdrop-blur-sm',
            finalColor.icon
          )}
        >
          <Icon className="h-5 w-5" />
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <motion.h3
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={cn('text-sm font-semibold mb-1', finalColor.title)}
          >
            {toast.title}
          </motion.h3>
          {toast.description && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={cn('text-sm', finalColor.description)}
            >
              {toast.description}
            </motion.p>
          )}
        </div>

        {/* Close button */}
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className={cn(
            'flex-shrink-0 p-1 rounded-lg transition-colors duration-200',
            'hover:bg-white/50 min-touch-target touch-manipulation',
            finalColor.icon
          )}
        >
          <X className="h-4 w-4" />
        </motion.button>
      </div>

      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      </div>
    </motion.div>
  )
})

ToastItem.displayName = 'ToastItem'
