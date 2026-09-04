'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from '@/components/ui/motion'
import {
  Calendar as CalendarIcon,
  Plus,
  Bell,
  CheckCircle2,
  RefreshCw,
  Clock,
  AlertTriangle,
  ListTodo,
  Users,
  BookOpen,
  TrendingUp,
  Filter,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { calendarService, type CalendarEvent, type CalendarTodo, type CreateTodoInput, type UpdateTodoInput } from '@/lib/services/calendar.service.client'
import { CalendarView } from '@/components/calendar/calendar-view'
import { TodoModal } from '@/components/calendar/todo-modal'
import { SyncCalendarModal } from '@/components/calendar/sync-calendar-modal'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/client'

export default function CalendarPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  // État local
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const [selectedTodo, setSelectedTodo] = useState<CalendarTodo | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0) // 2 mois
    return { start, end }
  })
  const [filters, setFilters] = useState({
    showSessions: true,
    showFormations: true,
    showTodos: true,
  })

  // Handler pour les changements de filtres (compatible avec CalendarView)
  const handleFiltersChange = useCallback((newFilters: { showSessions?: boolean; showFormations?: boolean; showTodos?: boolean }) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  const isTeacher = user?.role === 'teacher'

  // Récupérer les sessions assignées à l'enseignant (pour les enseignants)
  const { data: teacherSessionIds } = useQuery({
    queryKey: ['teacher-session-ids-calendar', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const supabase = createClient()
      const { data, error } = await supabase
        .from('session_teachers')
        .select('session_id')
        .eq('teacher_id', user.id)
      if (error) {
        logger.error('Erreur récupération sessions enseignant', sanitizeError(error))
        return []
      }
      return (
        data?.map((st: { session_id: string | null }) => st.session_id).filter((id): id is string => id != null) ?? []
      )
    },
    enabled: !!user?.id && isTeacher,
  })

  // Récupérer les événements du calendrier
  // Pour les enseignants, filtrer uniquement les événements des sessions assignées
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: [
      'calendar-events',
      user?.organization_id,
      user?.id,
      isTeacher,
      teacherSessionIds,
      dateRange.start.toISOString(),
      dateRange.end.toISOString(),
    ],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const startDate = dateRange.start.toISOString().split('T')[0]
      const endDate = dateRange.end.toISOString().split('T')[0]
      
      // Le service filtre déjà automatiquement pour les enseignants via userId
      const result = await calendarService.getCalendarEvents(
        user.organization_id,
        startDate,
        endDate,
        user.id
      )
      return result
    },
    enabled: !!user?.organization_id && (!isTeacher || (isTeacher && teacherSessionIds !== undefined)),
  })

  // Récupérer les statistiques
  // Pour les apprenants, calculer les stats uniquement sur leurs propres tâches
  const { data: stats } = useQuery({
    queryKey: ['calendar-stats', user?.organization_id, user?.id, user?.role],
    queryFn: async () => {
      if (!user?.organization_id) return null
      
      // Pour les apprenants, calculer les stats uniquement sur leurs tâches
      if (user?.role === 'learner' || user?.role === 'student') {
        const today = new Date().toISOString().split('T')[0]
        const todos = await calendarService.getTodos(user.organization_id, {
          createdBy: user.id,
        })
        
        const todosList = todos || []
        const totalTodos = todosList.length
        const pendingTodos = todosList.filter((t) => t.status === 'pending').length
        const completedTodos = todosList.filter((t) => t.status === 'completed').length
        const overdueTodos = todosList.filter(
          (t) => t.status !== 'completed' && t.status !== 'cancelled' && t.due_date < today
        ).length
        const todayTodos = todosList.filter((t) => t.due_date === today).length
        const upcomingTodos = todosList.filter(
          (t) => t.status !== 'completed' && t.status !== 'cancelled' && t.due_date > today
        ).length

        return {
          totalTodos,
          pendingTodos,
          completedTodos,
          overdueTodos,
          todayTodos,
          upcomingTodos,
        }
      }
      
      return calendarService.getCalendarStats(user.organization_id)
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les notifications non lues
  const { data: unreadCount } = useQuery({
    queryKey: ['calendar-notifications-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0
      return calendarService.countUnreadNotifications(user.id)
    },
    enabled: !!user?.id,
  })

  // Récupérer les TODOs d'aujourd'hui
  // Pour les apprenants, ne montrer que les tâches qu'ils ont créées
  const { data: todayTodos } = useQuery({
    queryKey: ['today-todos', user?.organization_id, user?.id, user?.role],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const today = new Date().toISOString().split('T')[0]
      const statusList: Array<'pending' | 'in_progress' | 'completed' | 'cancelled'> = ['pending', 'in_progress']
      const filtersForApi = {
        startDate: today,
        endDate: today,
        status: statusList,
        ...(user?.role === 'learner' || user?.role === 'student' ? { createdBy: user.id } : {}),
      }
      return calendarService.getTodos(user.organization_id, filtersForApi)
    },
    enabled: !!user?.organization_id,
  })

  // Mutations
  const createTodoMutation = useMutation({
    mutationFn: async (data: CreateTodoInput) => {
      if (!user?.organization_id || !user?.id) throw new Error('Non authentifié')
      return calendarService.createTodo({
        ...data,
        organization_id: user.organization_id,
        created_by: user.id,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-stats'] })
      queryClient.invalidateQueries({ queryKey: ['today-todos'] })
      addToast({
        type: 'success',
        title: 'Tâche créée',
        description: 'La tâche a été ajoutée au calendrier.',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Impossible de créer la tâche.',
      })
    },
  })

  const updateTodoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTodoInput }) => {
      return calendarService.updateTodo(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-stats'] })
      queryClient.invalidateQueries({ queryKey: ['today-todos'] })
      addToast({
        type: 'success',
        title: 'Tâche mise à jour',
        description: 'Les modifications ont été enregistrées.',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour la tâche.',
      })
    },
  })

  const deleteTodoMutation = useMutation({
    mutationFn: async (id: string) => {
      return calendarService.deleteTodo(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-stats'] })
      queryClient.invalidateQueries({ queryKey: ['today-todos'] })
      addToast({
        type: 'success',
        title: 'Tâche supprimée',
        description: 'La tâche a été supprimée.',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer la tâche.',
      })
    },
  })

  const completeTodoMutation = useMutation({
    mutationFn: async (id: string) => {
      return calendarService.completeTodo(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-stats'] })
      queryClient.invalidateQueries({ queryKey: ['today-todos'] })
      addToast({
        type: 'success',
        title: 'Tâche terminée',
        description: 'Bravo ! La tâche a été marquée comme terminée.',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Impossible de terminer la tâche.',
      })
    },
  })

  // Handlers
  const handleEventClick = async (event: CalendarEvent) => {
    if (event.event_type === 'todo') {
      // Charger le TODO complet
      const todo = await calendarService.getTodoById(event.event_id)
      if (todo) {
        setSelectedTodo(todo)
        setIsModalOpen(true)
      }
    } else if (event.event_type === 'session') {
      // Naviguer vers la session (event_id peut désigner une séance précise —
      // session_slots — dont session_id porte alors la session parente)
      window.location.href = `/dashboard/sessions/${event.session_id ?? event.event_id}`
    } else if (event.event_type === 'formation') {
      // Naviguer vers la formation
      window.location.href = `/dashboard/formations/${event.event_id}`
    }
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
  }

  const handleAddEvent = (date?: Date) => {
    setSelectedTodo(null)
    setSelectedDate(date)
    setIsModalOpen(true)
  }

  const handleSaveTodo = async (data: CreateTodoInput | UpdateTodoInput) => {
    if (selectedTodo) {
      await updateTodoMutation.mutateAsync({ id: selectedTodo.id, data })
    } else {
      await createTodoMutation.mutateAsync(data as CreateTodoInput)
    }
  }

  const handleDeleteTodo = async (id: string) => {
    await deleteTodoMutation.mutateAsync(id)
  }

  const handleCompleteTodo = async (id: string) => {
    await completeTodoMutation.mutateAsync(id)
  }

  // Callback pour mettre à jour la plage de dates lorsque la vue du calendrier change
  const handleDateRangeChange = useCallback((start: Date, end: Date) => {
    // logger.debug('[CalendarPage] Plage de dates mise à jour:', { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] })
    setDateRange({ start, end })
  }, [])

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] as [number, number, number, number] },
    },
  }

  return (
    <motion.div
      className="space-y-8 pb-8 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* En-tête */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <motion.div
              className="p-3 bg-brand-blue rounded-2xl shadow-lg shadow-brand-blue/20"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <CalendarIcon className="h-8 w-8 text-white" />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-gray-900 tracking-tighter leading-none">
              Calendrier
            </h1>
            {unreadCount && unreadCount > 0 && (
              <span className="px-3 py-1.5 bg-brand-blue-ghost text-brand-blue rounded-full text-sm font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4" />
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-gray-500 font-medium text-base tracking-tight">
            Sessions, formations et tâches — tout en un seul endroit
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setIsSyncModalOpen(true)}
            className="border-gray-200 text-gray-600 hover:text-brand-blue hover:border-brand-blue font-semibold px-4 py-5"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Synchroniser
          </Button>
          <Button
            onClick={() => handleAddEvent()}
            className="bg-brand-blue hover:bg-brand-blue-dark text-white shadow-md font-semibold px-6 py-5"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouvelle tâche
          </Button>
        </div>
      </motion.div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            {
              title: 'Total',
              value: stats.totalTodos,
              icon: ListTodo,
              iconCls: 'bg-brand-blue text-white',
              accentCls: 'bg-brand-blue',
            },
            {
              title: "Aujourd'hui",
              value: stats.todayTodos,
              icon: CalendarIcon,
              iconCls: 'bg-brand-cyan text-white',
              accentCls: 'bg-brand-cyan',
            },
            {
              title: 'En attente',
              value: stats.pendingTodos,
              icon: Clock,
              iconCls: 'bg-brand-blue-light text-white',
              accentCls: 'bg-brand-blue-light',
            },
            {
              title: 'En retard',
              value: stats.overdueTodos,
              icon: AlertTriangle,
              iconCls: stats.overdueTodos > 0 ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500',
              accentCls: stats.overdueTodos > 0 ? 'bg-red-400' : 'bg-gray-200',
              alert: stats.overdueTodos > 0,
            },
            {
              title: 'Terminées',
              value: stats.completedTodos,
              icon: CheckCircle2,
              iconCls: 'bg-brand-blue-dark text-white',
              accentCls: 'bg-brand-blue-dark',
            },
            {
              title: 'À venir',
              value: stats.upcomingTodos,
              icon: TrendingUp,
              iconCls: 'bg-brand-blue/70 text-white',
              accentCls: 'bg-brand-blue/70',
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              whileHover={{ y: -3 }}
              className={cn(
                'bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all duration-300',
                stat.alert ? 'border-red-200' : 'border-gray-100'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn('p-2.5 rounded-xl', stat.iconCls)}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <span className="text-3xl font-display font-bold text-gray-900 leading-none">
                  {stat.value}
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {stat.title}
              </p>
              <div className={cn('h-1 rounded-full w-full opacity-60', stat.accentCls)} />
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendrier principal */}
        <div className="lg:col-span-3">
          <CalendarView
            events={events || []}
            isLoading={eventsLoading}
            onEventClick={handleEventClick}
            onDateClick={handleDateClick}
            onAddEvent={handleAddEvent}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onDateRangeChange={handleDateRangeChange}
          />
        </div>

        {/* Sidebar - Tâches du jour */}
        <div className="space-y-6">
          <GlassCard variant="premium" className="p-6 border border-gray-100 hover:border-brand-blue/15 transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-blue rounded-xl">
                  <CalendarIcon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-display font-bold text-gray-900 text-lg tracking-tight">
                  Aujourd&apos;hui
                </h3>
              </div>
              <span className="text-xs text-gray-400 font-medium">
                {new Date().toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </span>
            </div>

            {todayTodos && todayTodos.length > 0 ? (
              <div className="space-y-3">
                {todayTodos.map((todo, index) => (
                  <motion.div
                    key={todo.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 20 }}
                    whileHover={{ x: 4, scale: 1.02 }}
                    className={cn(
                      'p-4 rounded-2xl cursor-pointer transition-all shadow-sm hover:shadow-lg',
                      todo.status === 'completed' && 'opacity-60'
                    )}
                    style={{ backgroundColor: todo.color + '15', borderLeft: `4px solid ${todo.color}` }}
                    onClick={async () => {
                      setSelectedTodo(todo)
                      setIsModalOpen(true)
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCompleteTodo(todo.id)
                        }}
                        className={cn(
                          'mt-0.5 rounded-full p-0.5 transition-all duration-200',
                          todo.status === 'completed'
                            ? 'bg-brand-blue text-white'
                            : 'border-2 border-brand-blue/30 hover:border-brand-blue'
                        )}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {todo.status === 'completed' ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <div className="h-4 w-4" />
                        )}
                      </motion.button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'font-semibold text-sm tracking-tight',
                            todo.status === 'completed' && 'line-through'
                          )}
                          style={{ color: todo.color }}
                        >
                          {todo.title}
                        </p>
                        {todo.due_time && (
                          <p className="text-xs text-gray-600 flex items-center gap-1.5 mt-1 font-medium">
                            <Clock className="h-3.5 w-3.5" />
                            {todo.due_time.slice(0, 5)}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucune tâche pour aujourd&apos;hui</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => handleAddEvent(new Date())}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Ajouter une tâche
                </Button>
              </div>
            )}
          </GlassCard>

          {/* Légende */}
          <GlassCard variant="premium" className="p-6 border border-gray-100 hover:border-brand-blue/15 transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-brand-blue-ghost rounded-xl">
                <Filter className="h-4 w-4 text-brand-blue" />
              </div>
              <h3 className="font-display font-bold text-gray-900 text-base tracking-tight">Légende</h3>
            </div>
            <div className="space-y-2">
              {[
                { icon: Users, label: 'Sessions', color: '#274472' },
                { icon: BookOpen, label: 'Formations', color: '#8B5CF6' },
                { icon: ListTodo, label: 'Tâches', color: '#3B82F6' },
              ].map(({ icon: Icon, label, color }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <Icon className="h-4 w-4 flex-shrink-0" style={{ color }} />
                  <span className="text-sm text-gray-600 font-medium">{label}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Raccourcis clavier */}
          <GlassCard variant="premium" className="p-6 border border-gray-100 hover:border-brand-blue/15 transition-all duration-300">
            <h3 className="font-display font-bold text-gray-900 mb-4 text-base tracking-tight">Raccourcis</h3>
            <div className="space-y-2.5 text-sm text-gray-600">
              <div className="flex items-center gap-3">
                <kbd className="px-2.5 py-1 bg-gray-100 rounded-md text-xs font-semibold text-gray-700 border border-gray-200">T</kbd>
                <span>Aujourd&apos;hui</span>
              </div>
              <div className="flex items-center gap-3">
                <kbd className="px-2.5 py-1 bg-gray-100 rounded-md text-xs font-semibold text-gray-700 border border-gray-200">N</kbd>
                <span>Nouvelle tâche</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 bg-gray-100 rounded-md text-xs font-semibold text-gray-700 border border-gray-200">←</kbd>
                  <kbd className="px-2 py-1 bg-gray-100 rounded-md text-xs font-semibold text-gray-700 border border-gray-200">→</kbd>
                </div>
                <span>Navigation</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Modal synchronisation calendrier */}
      <SyncCalendarModal
        open={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />

      {/* Modal TODO */}
      <TodoModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedTodo(null)
          setSelectedDate(undefined)
        }}
        todo={selectedTodo}
        initialDate={selectedDate}
        onSave={handleSaveTodo}
        onDelete={handleDeleteTodo}
        onComplete={handleCompleteTodo}
        isLoading={
          createTodoMutation.isPending ||
          updateTodoMutation.isPending ||
          deleteTodoMutation.isPending ||
          completeTodoMutation.isPending
        }
      />
    </motion.div>
  )
}
