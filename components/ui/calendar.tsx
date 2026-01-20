'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

export interface CalendarProps {
  value?: Date
  onChange?: (date: Date) => void
  className?: string
}

export function Calendar({ value, onChange, className }: CalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(value || new Date())
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(value || null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startingDayOfWeek = firstDayOfMonth.getDay()

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]

  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

  const handleDateClick = (day: number) => {
    const newDate = new Date(year, month, day)
    setSelectedDate(newDate)
    onChange?.(newDate)
  }

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
    onChange?.(today)
  }

  return (
    <div className={cn('p-3', className)}>
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousMonth}
          className="h-7 w-7 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium">
          {monthNames[month]} {year}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={goToNextMonth}
          className="h-7 w-7 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground p-1"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startingDayOfWeek }).map((_, index) => (
          <div key={`empty-${index}`} className="p-2" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1
          const date = new Date(year, month, day)
          const isToday = date.toDateString() === new Date().toDateString()
          const isSelected = selectedDate?.toDateString() === date.toDateString()

          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              className={cn(
                'p-2 text-sm rounded-md hover:bg-accent transition-colors',
                isToday && 'bg-accent font-semibold',
                isSelected && 'bg-primary text-primary-foreground font-semibold',
                !isSelected && !isToday && 'hover:bg-accent'
              )}
            >
              {day}
            </button>
          )
        })}
      </div>

      <div className="mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          className="w-full"
        >
          Aujourd'hui
        </Button>
      </div>
    </div>
  )
}
