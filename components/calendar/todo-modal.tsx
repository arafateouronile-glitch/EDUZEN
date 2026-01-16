'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from '@/components/ui/motion'
import {
  X,
  Calendar,
  Clock,
  Flag,
  Tag,
  Bell,
  Repeat,
  User,
  Link2,
  Save,
  Trash2,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { GlassCard } from '@/components/ui/glass-card'
import { cn } from '@/lib/utils'
import type { CalendarTodo, CreateTodoInput, UpdateTodoInput } from '@/lib/services/calendar.service'

const todoSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(200, 'Titre trop long'),
  description: z.string().optional(),
  due_date: z.string().min(1, 'La date d\'échéance est requise'),
  due_time: z.string().optional(),
  start_date: z.string().optional(),
  start_time: z.string().optional(),
  all_day: z.boolean().default(false),
  category: z.enum(['task', 'meeting', 'deadline', 'reminder', 'event']).default('task'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  color: z.string().default('#3B82F6'),
  reminder_enabled: z.boolean().default(true),
  reminder_minutes_before: z.number().min(0).default(30),
  is_recurring: z.boolean().default(false),
  recurrence_rule: z.string().optional(),
  tags: z.string().optional(), // Comma-separated
})

type TodoFormData = z.infer<typeof todoSchema>

interface TodoModalProps {
  isOpen: boolean
  onClose: () => void
  todo?: CalendarTodo | null
  initialDate?: Date
  onSave: (data: CreateTodoInput | UpdateTodoInput) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onComplete?: (id: string) => Promise<void>
  isLoading?: boolean
}

const CATEGORIES = [
  { value: 'task', label: 'Tâche', icon: '📋', color: '#3B82F6' },
  { value: 'meeting', label: 'Réunion', icon: '👥', color: '#8B5CF6' },
  { value: 'deadline', label: 'Échéance', icon: '⏰', color: '#EF4444' },
  { value: 'reminder', label: 'Rappel', icon: '🔔', color: '#F59E0B' },
  { value: 'event', label: 'Événement', icon: '🎉', color: '#10B981' },
]

const PRIORITIES = [
  { value: 'low', label: 'Basse', color: '#6B7280' },
  { value: 'medium', label: 'Moyenne', color: '#3B82F6' },
  { value: 'high', label: 'Haute', color: '#F59E0B' },
  { value: 'urgent', label: 'Urgente', color: '#EF4444' },
]

const COLORS = [
  '#3B82F6', // Bleu
  '#10B981', // Vert
  '#8B5CF6', // Violet
  '#F59E0B', // Orange
  '#EF4444', // Rouge
  '#EC4899', // Rose
  '#06B6D4', // Cyan
  '#84CC16', // Lime
]

const REMINDER_OPTIONS = [
  { value: 0, label: 'Au moment de l\'échéance' },
  { value: 5, label: '5 minutes avant' },
  { value: 15, label: '15 minutes avant' },
  { value: 30, label: '30 minutes avant' },
  { value: 60, label: '1 heure avant' },
  { value: 120, label: '2 heures avant' },
  { value: 1440, label: '1 jour avant' },
  { value: 10080, label: '1 semaine avant' },
]

export function TodoModal({
  isOpen,
  onClose,
  todo,
  initialDate,
  onSave,
  onDelete,
  onComplete,
  isLoading = false,
}: TodoModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'options'>('details')
  const [selectedColor, setSelectedColor] = useState(todo?.color || '#3B82F6')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TodoFormData>({
    resolver: zodResolver(todoSchema),
    defaultValues: {
      title: '',
      description: '',
      due_date: initialDate ? initialDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      due_time: '',
      start_date: '',
      start_time: '',
      all_day: false,
      category: 'task',
      priority: 'medium',
      color: '#3B82F6',
      reminder_enabled: true,
      reminder_minutes_before: 30,
      is_recurring: false,
      recurrence_rule: '',
      tags: '',
    },
  })

  const watchedCategory = watch('category')
  const watchedAllDay = watch('all_day')
  const watchedReminderEnabled = watch('reminder_enabled')
  const watchedIsRecurring = watch('is_recurring')

  // Charger les données du TODO si édition
  useEffect(() => {
    if (todo) {
      reset({
        title: todo.title,
        description: todo.description || '',
        due_date: todo.due_date,
        due_time: todo.due_time || '',
        start_date: todo.start_date || '',
        start_time: todo.start_time || '',
        all_day: todo.all_day,
        category: todo.category,
        priority: todo.priority,
        color: todo.color,
        reminder_enabled: todo.reminder_enabled,
        reminder_minutes_before: todo.reminder_minutes_before,
        is_recurring: todo.is_recurring,
        recurrence_rule: todo.recurrence_rule || '',
        tags: todo.tags?.join(', ') || '',
      })
      setSelectedColor(todo.color)
    } else if (initialDate) {
      setValue('due_date', initialDate.toISOString().split('T')[0])
      if (initialDate.getHours() !== 0) {
        setValue('due_time', `${String(initialDate.getHours()).padStart(2, '0')}:00`)
      }
    }
  }, [todo, initialDate, reset, setValue])

  // Mettre à jour la couleur selon la catégorie
  useEffect(() => {
    const category = CATEGORIES.find((c) => c.value === watchedCategory)
    if (category && !todo) {
      setSelectedColor(category.color)
      setValue('color', category.color)
    }
  }, [watchedCategory, todo, setValue])

  const onSubmit = async (data: TodoFormData) => {
    const todoData: CreateTodoInput | UpdateTodoInput = {
      title: data.title,
      description: data.description || undefined,
      due_date: data.due_date,
      due_time: data.due_time || undefined,
      start_date: data.start_date || undefined,
      start_time: data.start_time || undefined,
      all_day: data.all_day,
      category: data.category,
      priority: data.priority,
      color: selectedColor,
      reminder_enabled: data.reminder_enabled,
      reminder_minutes_before: data.reminder_minutes_before,
      is_recurring: data.is_recurring,
      recurrence_rule: data.recurrence_rule || undefined,
      tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
    }

    await onSave(todoData)
    onClose()
  }

  const handleDelete = async () => {
    if (todo && onDelete && confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      await onDelete(todo.id)
      onClose()
    }
  }

  const handleComplete = async () => {
    if (todo && onComplete) {
      await onComplete(todo.id)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg max-h-[90vh] overflow-hidden"
        >
          <GlassCard variant="premium" className="overflow-hidden">
            {/* En-tête */}
            <div
              className="p-4 border-b flex items-center justify-between"
              style={{ backgroundColor: selectedColor + '10' }}
            >
              <h2 className="text-lg font-semibold">
                {todo ? 'Modifier la tâche' : 'Nouvelle tâche'}
              </h2>
              <div className="flex items-center gap-2">
                {todo && todo.status !== 'completed' && onComplete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleComplete}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <CheckCircle className="h-5 w-5" />
                  </Button>
                )}
                {todo && onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDelete}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Onglets */}
            <div className="flex border-b">
              {['details', 'options'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as 'details' | 'options')}
                  className={cn(
                    'flex-1 py-2 text-sm font-medium transition-colors',
                    activeTab === tab
                      ? 'border-b-2 text-brand-blue'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                  style={activeTab === tab ? { borderColor: selectedColor } : {}}
                >
                  {tab === 'details' ? 'Détails' : 'Options'}
                </button>
              ))}
            </div>

            {/* Contenu */}
            <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {activeTab === 'details' && (
                <>
                  {/* Titre */}
                  <div>
                    <Label htmlFor="title">Titre *</Label>
                    <Input
                      id="title"
                      {...register('title')}
                      placeholder="Ex: Préparer le cours de mathématiques"
                      className={cn(errors.title && 'border-red-500')}
                    />
                    {errors.title && (
                      <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      {...register('description')}
                      placeholder="Détails de la tâche..."
                      rows={3}
                    />
                  </div>

                  {/* Catégorie */}
                  <div>
                    <Label>Catégorie</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setValue('category', cat.value as TodoFormData['category'])}
                          className={cn(
                            'flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all',
                            watchedCategory === cat.value
                              ? 'ring-2 ring-offset-1'
                              : 'bg-gray-100 hover:bg-gray-200'
                          )}
                          style={
                            watchedCategory === cat.value
                              ? { backgroundColor: cat.color + '20', color: cat.color, ringColor: cat.color }
                              : {}
                          }
                        >
                          <span>{cat.icon}</span>
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="due_date" className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Date d&apos;échéance *
                      </Label>
                      <Input
                        id="due_date"
                        type="date"
                        {...register('due_date')}
                        className={cn(errors.due_date && 'border-red-500')}
                      />
                    </div>
                    {!watchedAllDay && (
                      <div>
                        <Label htmlFor="due_time" className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Heure
                        </Label>
                        <Input id="due_time" type="time" {...register('due_time')} />
                      </div>
                    )}
                  </div>

                  {/* Toute la journée */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('all_day')}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Toute la journée</span>
                  </label>

                  {/* Priorité */}
                  <div>
                    <Label className="flex items-center gap-1">
                      <Flag className="h-4 w-4" />
                      Priorité
                    </Label>
                    <div className="flex gap-2 mt-1">
                      {PRIORITIES.map((priority) => (
                        <button
                          key={priority.value}
                          type="button"
                          onClick={() => setValue('priority', priority.value as TodoFormData['priority'])}
                          className={cn(
                            'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                            watch('priority') === priority.value
                              ? 'ring-2 ring-offset-1'
                              : 'bg-gray-100 hover:bg-gray-200'
                          )}
                          style={
                            watch('priority') === priority.value
                              ? { backgroundColor: priority.color + '20', color: priority.color, ringColor: priority.color }
                              : {}
                          }
                        >
                          {priority.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Couleur */}
                  <div>
                    <Label>Couleur</Label>
                    <div className="flex gap-2 mt-1">
                      {COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => {
                            setSelectedColor(color)
                            setValue('color', color)
                          }}
                          className={cn(
                            'w-8 h-8 rounded-full transition-transform hover:scale-110',
                            selectedColor === color && 'ring-2 ring-offset-2'
                          )}
                          style={{ backgroundColor: color, ringColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'options' && (
                <>
                  {/* Rappel */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('reminder_enabled')}
                        className="rounded border-gray-300"
                      />
                      <Bell className="h-4 w-4" />
                      <span className="text-sm font-medium">Activer le rappel</span>
                    </label>
                    {watchedReminderEnabled && (
                      <select
                        {...register('reminder_minutes_before', { valueAsNumber: true })}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                      >
                        {REMINDER_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Récurrence */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('is_recurring')}
                        className="rounded border-gray-300"
                      />
                      <Repeat className="h-4 w-4" />
                      <span className="text-sm font-medium">Tâche récurrente</span>
                    </label>
                    {watchedIsRecurring && (
                      <select
                        {...register('recurrence_rule')}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                      >
                        <option value="">Sélectionner...</option>
                        <option value="FREQ=DAILY">Tous les jours</option>
                        <option value="FREQ=WEEKLY">Toutes les semaines</option>
                        <option value="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR">Jours ouvrés</option>
                        <option value="FREQ=MONTHLY">Tous les mois</option>
                        <option value="FREQ=YEARLY">Tous les ans</option>
                      </select>
                    )}
                  </div>

                  {/* Date de début (optionnel) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start_date">Date de début</Label>
                      <Input id="start_date" type="date" {...register('start_date')} />
                    </div>
                    <div>
                      <Label htmlFor="start_time">Heure de début</Label>
                      <Input id="start_time" type="time" {...register('start_time')} />
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <Label htmlFor="tags" className="flex items-center gap-1">
                      <Tag className="h-4 w-4" />
                      Tags
                    </Label>
                    <Input
                      id="tags"
                      {...register('tags')}
                      placeholder="Séparez les tags par des virgules"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Ex: urgent, cours, administratif
                    </p>
                  </div>
                </>
              )}
            </form>

            {/* Actions */}
            <div className="p-4 border-t flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>
                Annuler
              </Button>
              <Button
                onClick={handleSubmit(onSubmit)}
                disabled={isLoading}
                style={{ backgroundColor: selectedColor }}
                className="text-white hover:opacity-90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {todo ? 'Mettre à jour' : 'Créer'}
                  </>
                )}
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

