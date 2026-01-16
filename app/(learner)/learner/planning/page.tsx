'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { useLearnerContext } from '@/lib/contexts/learner-context'
import { createLearnerClient } from '@/lib/supabase/learner-client'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion } from '@/components/ui/motion'
import {
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Video,
  Users,
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

export default function LearnerPlanningPage() {
  const { student: studentData, studentId } = useLearnerContext()
  const supabase = useMemo(() => (studentId ? createLearnerClient(studentId) : null), [studentId])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Récupérer les sessions de l'apprenant
  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['learner-sessions-calendar', studentId],
    queryFn: async () => {
      if (!studentId) return []
      if (!supabase) return []
      
      try {
        const { data, error } = await supabase
          .from('enrollments')
          .select(`
            *,
            sessions(
              id,
              name,
              start_date,
              end_date,
              location,
              status,
              formations(id, name),
              session_slots(
                id,
                date,
                start_time,
                end_time,
                location
              )
            )
          `)
          .eq('student_id', studentId)
        
        if (error) {
          // Gérer les erreurs RLS ou table inexistante
          if (
            error.code === 'PGRST116' ||
            error.code === '42P01' ||
            error.code === 'PGRST301' ||
            error.code === '42P17' ||
            error.status === 400 ||
            error.code === '400' ||
            error.message?.includes('relation') ||
            error.message?.includes('relationship') ||
            error.message?.includes('does not exist') ||
            error.message?.includes('schema cache') ||
            error.message?.includes('infinite recursion')
          ) {
            logger.warn('Enrollments table may not be accessible (RLS or missing)', error, {
              studentId: maskId(studentId),
              error: sanitizeError(error),
            })
            return []
          }
          logger.error('Error fetching enrollments', error, {
            studentId: maskId(studentId),
            error: sanitizeError(error),
          })
          return []
        }

        return data || []
      } catch (error: any) {
        logger.error('Unexpected error fetching enrollments', error, {
          studentId: maskId(studentId),
          error: sanitizeError(error),
        })
        return []
      }
    },
    enabled: !!studentId && !!supabase,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  const sessions = enrollments || []

  // Générer le calendrier
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Créer une map des événements par jour (incluant les créneaux horaires)
  const eventsByDate = useMemo(() => {
    const map: Record<string, any[]> = {}
    
    sessions?.forEach((enrollment: any) => {
      const session = enrollment.sessions
      if (!session?.start_date) return
      
      // Si la session a des créneaux (session_slots), utiliser ceux-ci
      if (session.session_slots && session.session_slots.length > 0) {
        session.session_slots.forEach((slot: any) => {
          if (!slot.date) return
          const slotDate = parseISO(slot.date)
          const key = format(slotDate, 'yyyy-MM-dd')
          if (!map[key]) map[key] = []
          map[key].push({
            ...enrollment,
            slot: slot,
            isStart: true,
            isEnd: true,
          })
        })
      } else {
        // Sinon, utiliser les dates de début/fin de session
        const startDate = parseISO(session.start_date)
        const endDate = session.end_date ? parseISO(session.end_date) : startDate
        
        const days = eachDayOfInterval({ start: startDate, end: endDate })
        days.forEach((day) => {
          const key = format(day, 'yyyy-MM-dd')
          if (!map[key]) map[key] = []
          map[key].push({
            ...enrollment,
            isStart: isSameDay(day, startDate),
            isEnd: isSameDay(day, endDate),
          })
        })
      }
    })
    
    return map
  }, [sessions])

  // Événements du jour sélectionné
  const selectedDayEvents = selectedDate
    ? eventsByDate[format(selectedDate, 'yyyy-MM-dd')] || []
    : []

  // Prochains événements (avec créneaux horaires)
  const upcomingEvents = useMemo(() => {
    const today = new Date()
    const events: any[] = []
    
    sessions?.forEach((enrollment: any) => {
      const session = enrollment.sessions
      if (!session) return
      
      // Si la session a des créneaux, créer un événement pour chaque créneau futur
      if (session.session_slots && session.session_slots.length > 0) {
        session.session_slots.forEach((slot: any) => {
          if (!slot.date) return
          const slotDate = parseISO(slot.date)
          if (slotDate >= today) {
            events.push({
              ...enrollment,
              slot: slot,
              displayDate: slotDate,
            })
          }
        })
      } else if (session.start_date) {
        // Sinon, utiliser la date de début de session
        const startDate = parseISO(session.start_date)
        if (startDate >= today) {
          events.push({
            ...enrollment,
            displayDate: startDate,
          })
        }
      }
    })
    
    return events
      .sort((a: any, b: any) => a.displayDate.getTime() - b.displayDate.getTime())
      .slice(0, 5)
  }, [sessions])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  }

  return (
    <motion.div
      className="space-y-6 pb-24 lg:pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-xl">
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Mon planning
            </h1>
            <p className="text-gray-500">
              Calendrier de vos sessions de formation
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendrier */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <GlassCard className="p-6">
            {/* Header du calendrier */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                {format(currentDate, 'MMMM yyyy', { locale: fr })}
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Aujourd'hui
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Jours de la semaine */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Jours du mois */}
            <div className="grid grid-cols-7 gap-1">
              {/* Jours vides au début */}
              {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square p-1" />
              ))}

              {/* Jours du mois */}
              {calendarDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd')
                const dayEvents = eventsByDate[dateKey] || []
                const hasEvents = dayEvents.length > 0
                const isSelected = selectedDate && isSameDay(day, selectedDate)

                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      aspect-square p-1 rounded-lg transition-all relative
                      ${isToday(day) ? 'ring-2 ring-brand-blue ring-offset-2' : ''}
                      ${isSelected ? 'bg-brand-blue text-white' : 'hover:bg-gray-100'}
                      ${!isSameMonth(day, currentDate) ? 'opacity-30' : ''}
                    `}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <span className={`text-sm font-medium ${isSelected ? 'text-white' : ''}`}>
                        {format(day, 'd')}
                      </span>
                      {hasEvents && (
                        <div className="flex gap-0.5 mt-1">
                          {dayEvents.slice(0, 3).map((_, i) => (
                            <div
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSelected ? 'bg-white' : 'bg-brand-blue'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Événements du jour sélectionné */}
            {selectedDate && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold text-gray-900 mb-4">
                  {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
                </h3>
                {selectedDayEvents.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDayEvents.map((enrollment: any, index: number) => {
                      const session = enrollment.sessions
                      const slot = enrollment.slot
                      return (
                        <div
                          key={`${enrollment.id}-${slot?.id || index}`}
                          className="p-4 bg-gradient-to-r from-brand-blue/5 to-indigo-50 rounded-xl border border-brand-blue/10"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-brand-blue/10 rounded-lg">
                              {session?.is_remote ? (
                                <Video className="h-5 w-5 text-brand-blue" />
                              ) : (
                                <Users className="h-5 w-5 text-brand-blue" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">
                                {session?.formations?.name || session?.name}
                              </h4>
                              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                                {enrollment.slot?.start_time ? (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {enrollment.slot.start_time}
                                    {enrollment.slot.end_time && ` - ${enrollment.slot.end_time}`}
                                  </span>
                                ) : session?.start_time ? (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {session.start_time}
                                    {session.end_time && ` - ${session.end_time}`}
                                  </span>
                                ) : null}
                                {(enrollment.slot?.location || session?.location) && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {enrollment.slot?.location || session.location}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge className={session?.is_remote ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}>
                              {session?.is_remote ? 'À distance' : 'Présentiel'}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    Aucune session prévue ce jour
                  </p>
                )}
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Prochains événements */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-6 h-fit">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="h-5 w-5 text-brand-blue" />
              <h3 className="font-bold text-gray-900">Prochaines sessions</h3>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map((enrollment: any, index: number) => {
                  const session = enrollment.sessions
                  const displayDate = enrollment.displayDate || (session?.start_date ? parseISO(session.start_date) : null)
                  const slot = enrollment.slot

                  return (
                    <div
                      key={`${enrollment.id}-${slot?.id || index}`}
                      className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => displayDate && setSelectedDate(displayDate)}
                    >
                      <h4 className="font-medium text-gray-900 text-sm mb-1">
                        {session?.formations?.name || session?.name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {displayDate && format(displayDate, 'dd MMM', { locale: fr })}
                        {(slot?.start_time || session?.start_time) && (
                          <>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            {slot?.start_time || session.start_time}
                            {(slot?.end_time || session?.end_time) && ` - ${slot?.end_time || session.end_time}`}
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  Aucune session à venir
                </p>
              </div>
            )}
          </GlassCard>

          {/* Légende */}
          <GlassCard className="p-6 mt-4">
            <h4 className="font-semibold text-gray-900 mb-3">Légende</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-brand-blue" />
                <span className="text-gray-600">Session prévue</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded ring-2 ring-brand-blue ring-offset-2 flex items-center justify-center">
                  <span className="text-xs">{format(new Date(), 'd')}</span>
                </div>
                <span className="text-gray-600">Aujourd'hui</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </motion.div>
  )
}


