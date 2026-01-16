'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SliderProps {
  value?: number[]
  onValueChange?: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  className?: string
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ value = [0], onValueChange, min = 0, max = 100, step = 1, disabled, className }, ref) => {
    const currentValue = value[0] || min

    return (
      <div className={cn('relative flex w-full touch-none select-none items-center', className)}>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          disabled={disabled}
          onChange={(e) => onValueChange?.([Number(e.target.value)])}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-input"
          style={{
            background: `linear-gradient(to right, #335ACF 0%, #335ACF ${((currentValue - min) / (max - min)) * 100}%, #E5E7EB ${((currentValue - min) / (max - min)) * 100}%, #E5E7EB 100%)`,
          }}
        />
      </div>
    )
  }
)
Slider.displayName = 'Slider'
