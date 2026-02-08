'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const LINE_HEIGHT_OPTIONS = [
  { label: 'Simple', value: '1', description: 'Espacement minimal' },
  { label: '1.15', value: '1.15', description: 'Espacement compact' },
  { label: '1.4 (PDF)', value: '1.4', description: 'Standard PDF' },
  { label: '1.5', value: '1.5', description: 'Espacement normal' },
  { label: 'Double', value: '2', description: 'Espacement large' },
  { label: '2.5', value: '2.5', description: 'Très aéré' },
]

export interface LineHeightDropdownProps {
  currentValue?: string | null
  onChange: (value: string) => void
  onReset?: () => void
  disabled?: boolean
}

export function LineHeightDropdown({
  currentValue,
  onChange,
  onReset,
  disabled = false,
}: LineHeightDropdownProps) {
  const currentOption = LINE_HEIGHT_OPTIONS.find(opt => opt.value === currentValue)
  const displayValue = currentOption?.label || currentValue || '1.4'

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild disabled={disabled}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2 min-w-[70px]"
              type="button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <line x1="21" y1="6" x2="3" y2="6" />
                <line x1="21" y1="12" x2="3" y2="12" />
                <line x1="21" y1="18" x2="3" y2="18" />
                <path d="M9 3v18M15 3v18" strokeWidth="1" opacity="0.5" />
              </svg>
              <span className="text-xs hidden sm:inline">{displayValue}</span>
              <ChevronsUpDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Interligne</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel className="text-xs text-gray-500">
          Espacement des lignes
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LINE_HEIGHT_OPTIONS.map(({ label, value, description }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => onChange(value)}
            className={cn(
              'flex items-center justify-between cursor-pointer',
              currentValue === value && 'bg-blue-50'
            )}
          >
            <div className="flex flex-col">
              <span className="text-sm">{label}</span>
              <span className="text-xs text-gray-400">{description}</span>
            </div>
            {currentValue === value && (
              <Check className="h-4 w-4 text-blue-600" />
            )}
          </DropdownMenuItem>
        ))}
        {onReset && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onReset}
              className="text-gray-500 cursor-pointer"
            >
              Réinitialiser
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default LineHeightDropdown
