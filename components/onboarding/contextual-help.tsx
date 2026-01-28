'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContextualHelpProps {
  content: string
  title?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
}

export function ContextualHelp({
  content,
  title,
  side = 'top',
  className,
}: ContextualHelpProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center justify-center rounded-full text-gray-400 hover:text-brand-blue transition-colors',
              className
            )}
            aria-label="Aide contextuelle"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          {title && <p className="font-semibold mb-1">{title}</p>}
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Composant pour ajouter une bulle d'aide contextuelle à n'importe quel élément
 * 
 * @example
 * ```tsx
 * <div>
 *   <Label>Générer votre BPF</Label>
 *   <ContextualHelp 
 *     content="Le Bilan Pédagogique et Financier (BPF) est un document obligatoire pour les organismes de formation."
 *     title="Qu'est-ce qu'un BPF ?"
 *   />
 * </div>
 * ```
 */
export default ContextualHelp
