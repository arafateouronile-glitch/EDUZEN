'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from '@/components/ui/motion'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Users,
  BookOpen,
  ListTodo,
  LayoutGrid,
  List,
  CalendarDays,
  MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { Badge } from '@/components/ui/badge'
import { cn, formatDate } from '@/lib/utils'
import type { CalendarEvent } from '@/lib/services/calendar.service'

type ViewType = 'month' | 'week' | 'day' | 'agenda'

interface CalendarViewProps {
  events: CalendarEvent[]
  isLoading?: boolean
  onEventClick?: (event: CalendarEvent) => void
  onDateClick?: (date: Date) => void
  onAddEvent?: (date?: Date) => void
  initialView?: ViewType
  showControls?: boolean
  showFilters?: boolean
  filters?: {
    showSessions?: boolean
    showFormations?: boolean
    showTodos?: boolean
  }
  onFiltersChange?: (filters: { showSessions?: boolean; showFormations?: boolean; showTodos?: boolean }) => void
  onDateRangeChange?: (start: Date, end: Date) => void
}

// Utilitaires de dates
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()
const formatDateKey = (date: Date) => date.toISOString().split('T')[0]

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const DAYS_FULL_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

export function CalendarView({
  events,
  isLoading = false,
  onEventClick,
  onDateClick,
  onAddEvent,
  initialView = 'month',
  showControls = true,
  showFilters = true,
  filters = { showSessions: true, showFormations: true, showTodos: true },
  onFiltersChange,
  onDateRangeChange,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<ViewType>(initialView)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  // Mémoriser la dernière plage de dates pour éviter les appels répétés
  const lastDateRangeRef = useRef<{ start: Date; end: Date } | null>(null)

  // Calculer la plage de dates visible et notifier le parent
  useEffect(() => {
    if (!onDateRangeChange) return

    let start: Date
    let end: Date

    if (view === 'month') {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      start = new Date(year, month, 1)
      end = new Date(year, month + 1, 0) // Dernier jour du mois
    } else if (view === 'week') {
      const startOfWeek = new Date(currentDate)
      const dayOfWeek = startOfWeek.getDay()
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      startOfWeek.setDate(startOfWeek.getDate() + diff)
      start = new Date(startOfWeek)
      end = new Date(startOfWeek)
      end.setDate(startOfWeek.getDate() + 6)
    } else {
      start = new Date(currentDate)
      end = new Date(currentDate)
    }

    // Étendre la plage pour inclure un mois avant et après
    const extendedStart = new Date(start)
    extendedStart.setMonth(extendedStart.getMonth() - 1)
    const extendedEnd = new Date(end)
    extendedEnd.setMonth(extendedEnd.getMonth() + 1)

    // Vérifier si la plage a vraiment changé
    const lastRange = lastDateRangeRef.current
    if (
      lastRange &&
      lastRange.start.getTime() === extendedStart.getTime() &&
      lastRange.end.getTime() === extendedEnd.getTime()
    ) {
      // La plage n'a pas changé, ne pas notifier le parent
      return
    }

    // Mémoriser la nouvelle plage
    lastDateRangeRef.current = { start: extendedStart, end: extendedEnd }

    // Notifier le parent
    onDateRangeChange(extendedStart, extendedEnd)
  }, [currentDate, view, onDateRangeChange])

  // Filtrer les événements
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (event.event_type === 'session' && !filters.showSessions) return false
      if (event.event_type === 'formation' && !filters.showFormations) return false
      if (event.event_type === 'todo' && !filters.showTodos) return false
      return true
    })
  }, [events, filters])

  // Grouper les événements par date
  // Pour les événements multi-jours (sessions, formations), créer un événement pour chaque jour
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {}
    
    filteredEvents.forEach((event) => {
      // Normaliser les dates au format YYYY-MM-DD
      const startDateStr = event.start_date
        ? typeof event.start_date === 'string'
          ? event.start_date.split('T')[0]
          : new Date(event.start_date).toISOString().split('T')[0]
        : null
      
      if (!startDateStr) return
      
      const startDate = new Date(startDateStr + 'T00:00:00') // Éviter les problèmes de timezone
      const endDateStr = event.end_date
        ? typeof event.end_date === 'string'
          ? event.end_date.split('T')[0]
          : new Date(event.end_date).toISOString().split('T')[0]
        : null
      
      // Pour les sessions et formations, créer un événement pour chaque jour entre start_date et end_date
      // Pour les TODOs, n'afficher que le jour de début (ou due_date)
      if ((event.event_type === 'session' || event.event_type === 'formation') && endDateStr) {
        const endDate = new Date(endDateStr + 'T00:00:00')
        
        // Créer un événement pour chaque jour entre start_date et end_date (inclus)
        const currentDate = new Date(startDate)
        while (currentDate <= endDate) {
          const dateKey = currentDate.toISOString().split('T')[0]
          
          if (!grouped[dateKey]) {
            grouped[dateKey] = []
          }
          
          // Créer une copie de l'événement pour ce jour spécifique
          // Utiliser event_id + dateKey comme clé unique pour éviter les doublons
          const dayEvent: CalendarEvent = {
            ...event,
            start_date: dateKey,
            // Garder le même titre pour tous les jours de la session/formation
            title: event.title,
          }
          
          // Vérifier qu'on n'a pas déjà ajouté cet événement pour ce jour
          const alreadyAdded = grouped[dateKey].some(
            (e) => e.event_id === event.event_id && e.event_type === event.event_type
          )
          
          if (!alreadyAdded) {
            grouped[dateKey].push(dayEvent)
          }
          
          // Passer au jour suivant
          currentDate.setDate(currentDate.getDate() + 1)
        }
      } else {
        // Pour les TODOs et autres événements ponctuels, n'afficher que le jour de début
        const dateKey = startDateStr
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = []
        }
        grouped[dateKey].push(event)
      }
    })
    
    return grouped
  }, [filteredEvents])

  // Navigation
  const navigatePrev = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (view === 'month') {
        newDate.setMonth(prev.getMonth() - 1)
      } else if (view === 'week') {
        newDate.setDate(prev.getDate() - 7)
      } else {
        newDate.setDate(prev.getDate() - 1)
      }
      return newDate
    })
  }

  const navigateNext = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (view === 'month') {
        newDate.setMonth(prev.getMonth() + 1)
      } else if (view === 'week') {
        newDate.setDate(prev.getDate() + 7)
      } else {
        newDate.setDate(prev.getDate() + 1)
      }
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Rendu de l'icône par type d'événement
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'session':
        return <Users className="h-3 w-3" />
      case 'formation':
        return <BookOpen className="h-3 w-3" />
      case 'todo':
        return <ListTodo className="h-3 w-3" />
      default:
        return <CalendarIcon className="h-3 w-3" />
    }
  }

  // Rendu d'un événement
  const renderEvent = (event: CalendarEvent, compact = false) => {
    const isPast = new Date(event.end_date) < new Date()
    const isCompleted = event.status === 'completed'

    return (
      <motion.div
        key={event.event_id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'group relative rounded-md px-2 py-1 text-xs cursor-pointer transition-all',
          'hover:shadow-md hover:scale-[1.02]',
          compact ? 'truncate' : '',
          isPast && !isCompleted && 'opacity-60',
          isCompleted && 'line-through opacity-50'
        )}
        style={{ backgroundColor: event.color + '20', borderLeft: `3px solid ${event.color}` }}
        onClick={(e) => {
          e.stopPropagation()
          onEventClick?.(event)
        }}
      >
        <div className="flex items-center gap-1">
          {getEventIcon(event.event_type)}
          <span className="font-medium truncate" style={{ color: event.color }}>
            {event.title}
          </span>
        </div>
        {!compact && (
          <div className="space-y-0.5 mt-1">
            {event.start_time && (
              <div className="flex items-center gap-1 text-gray-500 text-xs">
                <Clock className="h-2.5 w-2.5" />
                <span>
                  {event.start_time.slice(0, 5)}
                  {event.end_time && ` - ${event.end_time.slice(0, 5)}`}
                </span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-1 text-gray-500 text-xs">
                <MapPin className="h-2.5 w-2.5" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
            {event.description && !event.location && (
              <div className="text-xs text-gray-500 truncate">
                {event.description}
              </div>
            )}
          </div>
        )}
      </motion.div>
    )
  }

  // Vue Mois
  const renderMonthView = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    const today = formatDateKey(new Date())

    // Ajuster pour commencer le lundi (1) au lieu du dimanche (0)
    const startOffset = firstDay === 0 ? 6 : firstDay - 1
    const days: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

    // Compléter la grille
    while (days.length % 7 !== 0) {
      days.push(null)
    }

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden">
        {/* En-têtes des jours */}
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
          <div
            key={day}
            className="bg-gray-50 p-2 text-center text-xs font-semibold text-gray-600"
          >
            {day}
          </div>
        ))}

        {/* Jours du mois */}
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="bg-white p-2 min-h-[100px]" />
          }

          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayEvents = eventsByDate[dateKey] || []
          const isToday = dateKey === today
          const isSelected = selectedDate && formatDateKey(selectedDate) === dateKey
          
          // Debug: log si on trouve des événements pour cette date
          // if (dayEvents.length > 0) {
          //   console.log(`[CalendarView] Événements trouvés pour ${dateKey}:`, dayEvents)
          // }

          return (
            <motion.div
              key={dateKey}
              className={cn(
                'bg-white p-2 min-h-[100px] cursor-pointer transition-colors',
                'hover:bg-gray-50',
                isToday && 'bg-brand-blue-ghost',
                isSelected && 'ring-2 ring-brand-blue ring-inset'
              )}
              onClick={() => {
                const date = new Date(year, month, day)
                setSelectedDate(date)
                onDateClick?.(date)
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    'text-sm font-medium',
                    isToday && 'bg-brand-blue text-white rounded-full w-6 h-6 flex items-center justify-center'
                  )}
                >
                  {day}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] text-gray-400">{dayEvents.length}</span>
                )}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => renderEvent(event, true))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-gray-500 text-center">
                    +{dayEvents.length - 3} autres
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    )
  }

  // Vue Semaine
  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate)
    const dayOfWeek = startOfWeek.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    startOfWeek.setDate(startOfWeek.getDate() + diff)

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      return date
    })

    const today = formatDateKey(new Date())
    const hours = Array.from({ length: 12 }, (_, i) => i + 8) // 8h à 19h

    return (
      <div className="flex flex-col h-[600px]">
        {/* En-têtes des jours */}
        <div className="grid grid-cols-8 border-b">
          <div className="p-2 text-xs text-gray-400 border-r" />
          {weekDays.map((date) => {
            const dateKey = formatDateKey(date)
            const isToday = dateKey === today
            return (
              <div
                key={dateKey}
                className={cn(
                  'p-2 text-center border-r',
                  isToday && 'bg-brand-blue-ghost'
                )}
              >
                <div className="text-xs text-gray-500">{DAYS_FR[date.getDay()]}</div>
                <div
                  className={cn(
                    'text-lg font-semibold',
                    isToday && 'text-brand-blue'
                  )}
                >
                  {date.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* Grille horaire */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-8">
            {/* Colonne des heures */}
            <div className="border-r">
              {hours.map((hour) => (
                <div key={hour} className="h-16 border-b p-1 text-right">
                  <span className="text-xs text-gray-400">{hour}:00</span>
                </div>
              ))}
            </div>

            {/* Colonnes des jours */}
            {weekDays.map((date) => {
              const dateKey = formatDateKey(date)
              const dayEvents = eventsByDate[dateKey] || []
              const isToday = dateKey === today

              return (
                <div
                  key={dateKey}
                  className={cn('border-r relative', isToday && 'bg-brand-blue-ghost/30')}
                >
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="h-16 border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        const clickDate = new Date(date)
                        clickDate.setHours(hour)
                        onDateClick?.(clickDate)
                      }}
                    />
                  ))}
                  {/* Événements positionnés */}
                  <div className="absolute inset-0 p-0.5 pointer-events-none">
                    {dayEvents.map((event) => {
                      const startHour = event.start_time
                        ? parseInt(event.start_time.split(':')[0])
                        : 9
                      const top = (startHour - 8) * 64 // 64px = h-16

                      return (
                        <div
                          key={event.event_id}
                          className="absolute left-0.5 right-0.5 pointer-events-auto"
                          style={{ top: `${top}px` }}
                        >
                          {renderEvent(event)}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Vue Jour
  const renderDayView = () => {
    const dateKey = formatDateKey(currentDate)
    const dayEvents = eventsByDate[dateKey] || []
    const hours = Array.from({ length: 14 }, (_, i) => i + 7) // 7h à 20h

    return (
      <div className="flex flex-col h-[600px]">
        {/* En-tête */}
        <div className="p-4 border-b text-center">
          <div className="text-lg font-semibold">
            {DAYS_FULL_FR[currentDate.getDay()]}
          </div>
          <div className="text-3xl font-bold text-brand-blue">
            {currentDate.getDate()}
          </div>
          <div className="text-sm text-gray-500">
            {MONTHS_FR[currentDate.getMonth()]} {currentDate.getFullYear()}
          </div>
        </div>

        {/* Grille horaire */}
        <div className="flex-1 overflow-y-auto">
          {hours.map((hour) => {
            const hourEvents = dayEvents.filter((event) => {
              if (!event.start_time) return hour === 9
              const eventHour = parseInt(event.start_time.split(':')[0])
              return eventHour === hour
            })

            return (
              <div key={hour} className="flex border-b min-h-[60px]">
                <div className="w-16 p-2 text-right border-r">
                  <span className="text-sm text-gray-400">{hour}:00</span>
                </div>
                <div
                  className="flex-1 p-1 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    const clickDate = new Date(currentDate)
                    clickDate.setHours(hour)
                    onDateClick?.(clickDate)
                  }}
                >
                  <div className="space-y-1">
                    {hourEvents.map((event) => renderEvent(event))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Vue Agenda (liste)
  const renderAgendaView = () => {
    const sortedDates = Object.keys(eventsByDate).sort()
    const today = formatDateKey(new Date())

    // Filtrer les dates futures ou aujourd'hui
    const upcomingDates = sortedDates.filter((date) => date >= today)

    return (
      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {upcomingDates.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun événement à venir</p>
          </div>
        ) : (
          upcomingDates.map((dateKey) => {
            const date = new Date(dateKey)
            const isToday = dateKey === today
            const events = eventsByDate[dateKey]

            return (
              <div key={dateKey}>
                <div
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg',
                    isToday && 'bg-brand-blue-ghost'
                  )}
                >
                  <div className="text-center w-14">
                    <div className="text-xs text-gray-500 uppercase">
                      {DAYS_FR[date.getDay()]}
                    </div>
                    <div
                      className={cn(
                        'text-2xl font-bold',
                        isToday && 'text-brand-blue'
                      )}
                    >
                      {date.getDate()}
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    {events.map((event) => renderEvent(event))}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Contrôles */}
      {showControls && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={navigatePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={goToToday} className="text-sm">
              Aujourd&apos;hui
            </Button>
            <h2 className="text-lg font-semibold ml-2">
              {view === 'day'
                ? `${currentDate.getDate()} ${MONTHS_FR[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                : `${MONTHS_FR[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
            </h2>
          </div>

          {/* Actions et filtres */}
          <div className="flex items-center gap-2">
            {/* Sélecteur de vue */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {[
                { value: 'month', icon: LayoutGrid, label: 'Mois' },
                { value: 'week', icon: CalendarDays, label: 'Semaine' },
                { value: 'day', icon: CalendarIcon, label: 'Jour' },
                { value: 'agenda', icon: List, label: 'Agenda' },
              ].map(({ value, icon: Icon, label }) => (
                <Button
                  key={value}
                  variant={view === value ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView(value as ViewType)}
                  className={cn(
                    'gap-1',
                    view === value && 'bg-white shadow-sm'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Button>
              ))}
            </div>

            {/* Bouton Ajouter */}
            {onAddEvent && (
              <Button onClick={() => onAddEvent(selectedDate || undefined)}>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Filtres */}
      {showFilters && (
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm text-gray-500">Afficher :</span>
          {[
            { key: 'showSessions', label: 'Sessions', color: '#10B981', icon: Users },
            { key: 'showFormations', label: 'Formations', color: '#8B5CF6', icon: BookOpen },
            { key: 'showTodos', label: 'Tâches', color: '#3B82F6', icon: ListTodo },
          ].map(({ key, label, color, icon: Icon }) => (
            <label
              key={key}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={filters[key as keyof typeof filters]}
                onChange={(e) =>
                  onFiltersChange?.({ ...filters, [key]: e.target.checked })
                }
                className="rounded border-gray-300"
                style={{ accentColor: color }}
              />
              <Icon className="h-4 w-4" style={{ color }} />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      )}

      {/* Calendrier */}
      <GlassCard variant="default" className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={view + currentDate.toISOString()}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {view === 'month' && renderMonthView()}
              {view === 'week' && renderWeekView()}
              {view === 'day' && renderDayView()}
              {view === 'agenda' && renderAgendaView()}
            </motion.div>
          </AnimatePresence>
        )}
      </GlassCard>
    </div>
  )
}

