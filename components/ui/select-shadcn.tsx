'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface SelectContextValue {
  value?: string
  onValueChange?: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement>
}

const SelectContext = React.createContext<SelectContextValue>({
  open: false,
  setOpen: () => {},
  triggerRef: { current: null },
})

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

export function Select({ value, onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, triggerRef }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  )
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

export function SelectTrigger({ children, className, ...props }: SelectTriggerProps) {
  const { open, setOpen, triggerRef } = React.useContext(SelectContext)

  return (
    <button
      ref={triggerRef}
      type="button"
      aria-expanded={open}
      aria-haspopup="listbox"
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {children}
      <ChevronDown className={cn('h-4 w-4 opacity-50 transition-transform', open && 'rotate-180')} />
    </button>
  )
}

interface SelectValueProps {
  placeholder?: string
  children?: React.ReactNode
}

export function SelectValue({ placeholder, children }: SelectValueProps) {
  const { value } = React.useContext(SelectContext)
  return <span className="block truncate text-left">{children ?? value ?? placeholder}</span>
}

interface SelectContentProps {
  children: React.ReactNode
  className?: string
}

export function SelectContent({ children, className }: SelectContentProps) {
  const { open, setOpen, triggerRef } = React.useContext(SelectContext)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState({ top: 0, left: 0, width: 0 })

  React.useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const updatePosition = () => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 128),
      })
    }
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, triggerRef])

  React.useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        contentRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      ) return
      setOpen(false)
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, setOpen, triggerRef])

  if (!open) return null

  const portalContent = (
    <div
      ref={contentRef}
      role="listbox"
      className={cn(
        'fixed z-[100] min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md',
        className
      )}
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        minWidth: '8rem',
      }}
    >
      <div className="p-1 max-h-[300px] overflow-auto">{children}</div>
    </div>
  )

  if (typeof document !== 'undefined') {
    return createPortal(portalContent, document.body)
  }
  return portalContent
}

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  children: React.ReactNode
}

export function SelectItem({ value, children, className, ...props }: SelectItemProps) {
  const { value: selectedValue, onValueChange, setOpen } = React.useContext(SelectContext)
  const isSelected = selectedValue === value

  return (
    <div
      role="option"
      aria-selected={isSelected}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
        isSelected && 'bg-accent text-accent-foreground',
        className
      )}
      onClick={() => {
        onValueChange?.(value)
        setOpen(false)
      }}
      {...props}
    >
      {children}
    </div>
  )
}
