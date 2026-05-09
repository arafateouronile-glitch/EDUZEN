'use client'

import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  message: string
  label?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function AskAiButton({ message, label = "Demander à l'IA", variant = 'outline', size = 'sm', className }: Props) {
  function handleClick() {
    window.dispatchEvent(new CustomEvent('ai-chat:open', { detail: { message } }))
  }

  return (
    <Button variant={variant} size={size} onClick={handleClick} className={cn('gap-1.5', className)}>
      <Sparkles className="h-3.5 w-3.5" />
      {label}
    </Button>
  )
}
