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
            (error as any).status === 400 ||
            error.code === '400' ||
            error.message?.includes('relation') ||
            error.message?.includes('relationship') ||
            error.message?.includes('does not exist') ||
            error.message?.includes('schema cache') ||
            error.message?.includes('infinite recursion')
          ) {
            logger.warn('Enrollments table may not be accessible (RLS or missing)', {
              studentId: maskId(studentId),
              error: sanitizeError(error),
            })
            return []
          }
          logger.error('Error fetching enrollments', sanitizeError(error), {
            studentId: maskId(studentId),
          })
          return []
        }

        return data || []
      } catch (error: any) {
        logger.error('Unexpected error fetching enrollments', sanitizeError(error), {
          studentId: maskId(studentId),
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
      {/* Header Premium */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="premium" className="p-6 md:p-8 relative overflow-hidden">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 via-brand-cyan-ghost/30 to-brand-cyan-pale/20" />

          {/* Floating orbs */}
          <motion.div
            animate={{ y: [0, -10, 0], x: [0, 5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-10 -right-10 w-40 h-40 bg-brand-blue/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ y: [0, 10, 0], x: [0, -5, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-10 -left-10 w-32 h-32 bg-brand-cyan/10 rounded-full blur-3xl"
          />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <motion.div
                className="p-4 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-2xl shadow-lg shadow-brand-blue/25"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <Calendar className="h-8 w-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-brand-blue to-brand-cyan bg-clip-text text-transparent">
                  Mon planning
                </h1>
                <p className="text-gray-500 mt-1">
                  Calendrier de vos sessions de formation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge className="bg-gradient-to-r from-brand-blue/10 to-brand-cyan-pale text-brand-blue border-0 px-4 py-2">
                <CalendarDays className="h-4 w-4 mr-2" />
                {upcomingEvents?.length || 0} à venir
              </Badge>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendrier Premium */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <GlassCard variant="premium" className="p-6 relative overflow-hidden">
            {/* Subtle gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-blue-ghost/30 to-transparent pointer-events-none" />

            {/* Header du calendrier */}
            <div className="relative flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-brand-blue bg-clip-text text-transparent capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: fr })}
              </h2>
              <div className="flex items-center gap-2">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                    className="rounded-xl hover:border-brand-blue hover:text-brand-blue"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(new Date())}
                    className="rounded-xl hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50"
                  >
                    Aujourd'hui
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                    className="rounded-xl hover:border-brand-blue hover:text-brand-blue"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
            </div>

            {/* Jours de la semaine */}
            <div className="relative grid grid-cols-7 gap-1 mb-3">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                <div key={day} className="text-center text-sm font-semibold text-gray-500 py-2 uppercase tracking-wider">
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
                  <motion.button
                    key={dateKey}
                    onClick={() => setSelectedDate(day)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      aspect-square p-1 rounded-xl transition-all relative
                      ${isToday(day) ? 'ring-2 ring-brand-blue ring-offset-2' : ''}
                      ${isSelected ? 'bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-lg shadow-brand-blue/25' : 'hover:bg-brand-blue-pale'}
                      ${!isSameMonth(day, currentDate) ? 'opacity-30' : ''}
                    `}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <span className={`text-sm font-semibold ${isSelected ? 'text-white' : ''}`}>
                        {format(day, 'd')}
                      </span>
                      {hasEvents && (
                        <div className="flex gap-0.5 mt-1">
                          {dayEvents.slice(0, 3).map((_, i) => (
                            <motion.div
                              key={i}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSelected ? 'bg-white' : 'bg-gradient-to-r from-brand-blue to-brand-cyan'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.button>
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
                            <Badge className={session?.is_remote ? 'bg-brand-cyan-pale text-brand-cyan' : 'bg-brand-blue-pale text-brand-blue'}>
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

        {/* Prochains événements Premium */}
        <motion.div variants={itemVariants}>
          <GlassCard variant="premium" hoverable className="p-6 h-fit relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent pointer-events-none" />

            <div className="relative flex items-center gap-2 mb-5">
              <div className="p-2 bg-gradient-to-br from-brand-blue/10 to-brand-cyan/10 rounded-xl">
                <CalendarDays className="h-5 w-5 text-brand-blue" />
              </div>
              <h3 className="font-bold text-gray-900">Prochaines sessions</h3>
            </div>

            {isLoading ? (
              <div className="relative space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : upcomingEvents.length > 0 ? (
              <div className="relative space-y-3">
                {upcomingEvents.map((enrollment: any, index: number) => {
                  const session = enrollment.sessions
                  const displayDate = enrollment.displayDate || (session?.start_date ? parseISO(session.start_date) : null)
                  const slot = enrollment.slot

                  return (
                    <motion.div
                      key={`${enrollment.id}-${slot?.id || index}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ x: 4 }}
                      className="p-4 bg-gradient-to-r from-blue-50/80 to-cyan-50/50 rounded-xl hover:from-blue-100/80 hover:to-cyan-100/50 transition-all cursor-pointer border border-blue-100/50"
                      onClick={() => displayDate && setSelectedDate(displayDate)}
                    >
                      <h4 className="font-semibold text-gray-900 text-sm mb-2">
                        {session?.formations?.name || session?.name}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5 bg-white/80 px-2 py-1 rounded-lg">
                          <Calendar className="h-3 w-3 text-brand-blue" />
                          {displayDate && format(displayDate, 'dd MMM', { locale: fr })}
                        </span>
                        {(slot?.start_time || session?.start_time) && (
                          <span className="flex items-center gap-1.5 bg-white/80 px-2 py-1 rounded-lg">
                            <Clock className="h-3 w-3 text-blue-500" />
                            {slot?.start_time || session.start_time}
                            {(slot?.end_time || session?.end_time) && ` - ${slot?.end_time || session.end_time}`}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="relative text-center py-8">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center"
                >
                  <Calendar className="h-8 w-8 text-gray-400" />
                </motion.div>
                <p className="text-sm text-gray-500">
                  Aucune session à venir
                </p>
              </div>
            )}
          </GlassCard>

          {/* Légende Premium */}
          <GlassCard variant="subtle" className="p-5 mt-4">
            <h4 className="font-semibold text-gray-900 mb-4">Légende</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-4 h-4 rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan shadow-lg shadow-brand-blue/30" />
                <span className="text-gray-600">Session prévue</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-7 h-7 rounded-lg ring-2 ring-blue-500 ring-offset-2 flex items-center justify-center bg-white">
                  <span className="text-xs font-bold text-brand-blue">{format(new Date(), 'd')}</span>
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


