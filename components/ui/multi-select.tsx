'use client'

import * as React from 'react'
import { X, ChevronsUpDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

export type Option = {
  label: string
  value: string
}

interface MultiSelectProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Sélectionner...',
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const handleRemove = (value: string) => {
    onChange(selected.filter((item) => item !== value))
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-left font-normal h-auto min-h-[42px] py-2 px-3 bg-white border-gray-200 hover:bg-gray-50"
          >
            <div className="flex flex-wrap gap-1.5 w-full items-center">
              {selected.length === 0 && (
                <span className="text-muted-foreground text-sm">{placeholder}</span>
              )}
              {selected.length > 0 && (
                selected.map((value) => {
                  const option = options.find((o) => o.value === value)
                  return (
                    <Badge
                      key={value}
                      variant="secondary"
                      className="mr-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium bg-brand-blue-ghost text-brand-blue hover:bg-brand-blue/20 border-brand-blue/10 transition-colors flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemove(value)
                      }}
                    >
                      {option?.label || value}
                      <div 
                        className="ml-0.5 rounded-full p-0.5 hover:bg-brand-blue/20 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </div>
                    </Badge>
                  )
                })
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] p-1 max-h-60 overflow-y-auto">
          {options.map((option) => (
            <div
              key={option.value}
              className={cn(
                "relative flex cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                selected.includes(option.value) ? "bg-accent/50 font-medium" : ""
              )}
              onClick={(e) => {
                e.preventDefault() // Prevent closing
                handleSelect(option.value)
              }}
            >
              <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                {selected.includes(option.value) && (
                  <Check className="h-4 w-4 text-brand-blue" />
                )}
              </span>
              {option.label}
            </div>
          ))}
          {options.length === 0 && (
            <div className="py-3 px-2 text-center text-sm text-muted-foreground">
              Aucune option disponible
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}





