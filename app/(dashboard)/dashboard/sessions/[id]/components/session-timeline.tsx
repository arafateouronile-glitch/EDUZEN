'use client'

import { useState, useMemo } from 'react'
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Circle, 
  Calendar,
  Users,
  FileText,
  CreditCard,
  GraduationCap,
  ClipboardCheck,
  Mail,
  Settings,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Check,
  X
} from 'lucide-react'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { cn, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// Types
interface Task {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'skipped'
  dueDate?: string
  completedAt?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignedTo?: string
  category: string
}

interface TimelinePhase {
  id: string
  title: string
  description: string
  icon: React.ElementType
  color: string
  startDate?: string
  endDate?: string
  status: 'pending' | 'in_progress' | 'completed'
  tasks: Task[]
}

interface SessionTimelineProps {
  sessionId: string
  sessionData?: {
    name: string
    start_date: string
    end_date: string
    status: string
    enrollmentsCount?: number
    hasConventions?: boolean
    hasConvocations?: boolean
    attendanceRate?: number
    invoicesGenerated?: boolean
    evaluationsCompleted?: boolean
  }
  onTaskComplete?: (taskId: string) => void
  onTaskStart?: (taskId: string) => void
}

// Configuration des phases d'une session
const createTimelinePhases = (sessionData?: SessionTimelineProps['sessionData']): TimelinePhase[] => {
  const today = new Date()
  const startDate = sessionData?.start_date ? new Date(sessionData.start_date) : null
  const endDate = sessionData?.end_date ? new Date(sessionData.end_date) : null
  
  const isBeforeStart = startDate && today < startDate
  const isDuring = startDate && endDate && today >= startDate && today <= endDate
  const isAfter = endDate && today > endDate

  return [
    {
      id: 'preparation',
      title: 'Préparation',
      description: 'Configuration initiale et préparation de la session',
      icon: Settings,
      color: 'purple',
      status: isBeforeStart ? 'in_progress' : 'completed',
      tasks: [
        {
          id: 'setup-dates',
          title: 'Définir les dates et horaires',
          description: 'Configurer les créneaux et le calendrier',
          status: sessionData?.start_date ? 'completed' : 'pending',
          priority: 'critical',
          category: 'configuration',
        },
        {
          id: 'assign-trainers',
          title: 'Assigner les formateurs',
          description: 'Attribuer les intervenants à la session',
          status: 'completed',
          priority: 'high',
          category: 'configuration',
        },
        {
          id: 'setup-program',
          title: 'Configurer le programme',
          description: 'Définir le contenu pédagogique',
          status: 'completed',
          priority: 'high',
          category: 'configuration',
        },
        {
          id: 'prepare-materials',
          title: 'Préparer les ressources pédagogiques',
          description: 'Supports de cours, documents, etc.',
          status: 'pending',
          priority: 'medium',
          category: 'ressources',
        },
      ],
    },
    {
      id: 'inscriptions',
      title: 'Inscriptions',
      description: 'Gestion des inscriptions et administratif',
      icon: Users,
      color: 'blue',
      status: sessionData?.enrollmentsCount && sessionData.enrollmentsCount > 0 ? 'completed' : (isBeforeStart ? 'in_progress' : 'pending'),
      tasks: [
        {
          id: 'enroll-students',
          title: 'Inscrire les apprenants',
          description: `${sessionData?.enrollmentsCount || 0} apprenant(s) inscrit(s)`,
          status: sessionData?.enrollmentsCount && sessionData.enrollmentsCount > 0 ? 'completed' : 'in_progress',
          priority: 'critical',
          category: 'inscriptions',
        },
        {
          id: 'generate-conventions',
          title: 'Générer les conventions',
          description: 'Conventions de formation à signer',
          status: sessionData?.hasConventions ? 'completed' : 'pending',
          priority: 'high',
          category: 'documents',
        },
        {
          id: 'send-convocations',
          title: 'Envoyer les convocations',
          description: 'Convocations par email aux apprenants',
          status: sessionData?.hasConvocations ? 'completed' : 'pending',
          priority: 'high',
          category: 'communication',
        },
        {
          id: 'generate-invoices',
          title: 'Générer les factures',
          description: 'Facturation des inscriptions',
          status: sessionData?.invoicesGenerated ? 'completed' : 'pending',
          priority: 'medium',
          category: 'finances',
        },
      ],
    },
    {
      id: 'deroulement',
      title: 'Déroulement',
      description: 'Suivi pendant la formation',
      icon: Play,
      color: 'green',
      startDate: sessionData?.start_date,
      endDate: sessionData?.end_date,
      status: isDuring ? 'in_progress' : (isAfter ? 'completed' : 'pending'),
      tasks: [
        {
          id: 'daily-attendance',
          title: 'Émargement quotidien',
          description: `Taux de présence : ${sessionData?.attendanceRate || 0}%`,
          status: isDuring ? 'in_progress' : (isAfter ? 'completed' : 'pending'),
          priority: 'critical',
          category: 'présences',
        },
        {
          id: 'track-progress',
          title: 'Suivi de la progression',
          description: 'Avancement des modules et activités',
          status: isDuring ? 'in_progress' : 'pending',
          priority: 'medium',
          category: 'pédagogie',
        },
        {
          id: 'handle-absences',
          title: 'Gérer les absences',
          description: 'Justificatifs et relances',
          status: 'pending',
          priority: 'medium',
          category: 'présences',
        },
        {
          id: 'intermediate-evals',
          title: 'Évaluations intermédiaires',
          description: 'Tests et QCM en cours de formation',
          status: 'pending',
          priority: 'medium',
          category: 'évaluations',
        },
      ],
    },
    {
      id: 'cloture',
      title: 'Clôture',
      description: 'Finalisation et évaluations finales',
      icon: ClipboardCheck,
      color: 'orange',
      status: isAfter && sessionData?.evaluationsCompleted ? 'completed' : (isAfter ? 'in_progress' : 'pending'),
      tasks: [
        {
          id: 'final-evaluation',
          title: 'Évaluation finale',
          description: 'Examen ou projet de fin de formation',
          status: sessionData?.evaluationsCompleted ? 'completed' : 'pending',
          priority: 'critical',
          category: 'évaluations',
        },
        {
          id: 'satisfaction-survey',
          title: 'Enquête de satisfaction',
          description: 'Évaluation à chaud par les apprenants',
          status: 'pending',
          priority: 'high',
          category: 'qualité',
        },
        {
          id: 'generate-attendance-sheets',
          title: 'Feuilles d\'émargement finales',
          description: 'Export des émargements signés',
          status: 'pending',
          priority: 'high',
          category: 'documents',
        },
        {
          id: 'generate-certificates',
          title: 'Générer les attestations',
          description: 'Certificats de réalisation et attestations',
          status: 'pending',
          priority: 'high',
          category: 'documents',
        },
      ],
    },
    {
      id: 'suivi',
      title: 'Suivi Post-Formation',
      description: 'Bilan et suivi après la formation',
      icon: GraduationCap,
      color: 'teal',
      status: 'pending',
      tasks: [
        {
          id: 'cold-survey',
          title: 'Évaluation à froid',
          description: 'Enquête 3 mois après la formation',
          status: 'pending',
          dueDate: endDate ? new Date(new Date(endDate).setMonth(new Date(endDate).getMonth() + 3)).toISOString() : undefined,
          priority: 'medium',
          category: 'qualité',
        },
        {
          id: 'archive-session',
          title: 'Archiver la session',
          description: 'Clôturer et archiver tous les documents',
          status: 'pending',
          priority: 'low',
          category: 'administratif',
        },
        {
          id: 'generate-bpf',
          title: 'Bilan Pédagogique et Financier',
          description: 'Export pour le BPF annuel',
          status: 'pending',
          priority: 'medium',
          category: 'administratif',
        },
      ],
    },
  ]
}

// Couleurs par statut
const statusColors = {
  pending: 'text-gray-400 bg-gray-100',
  in_progress: 'text-blue-600 bg-blue-100',
  completed: 'text-green-600 bg-green-100',
  overdue: 'text-red-600 bg-red-100',
  skipped: 'text-gray-400 bg-gray-50',
}

const statusIcons = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  overdue: AlertCircle,
  skipped: X,
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

const phaseColors: Record<string, { bg: string; text: string; border: string }> = {
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
}

// Composant Task
function TaskItem({ task, onComplete, onStart }: { task: Task; onComplete?: () => void; onStart?: () => void }) {
  const StatusIcon = statusIcons[task.status]
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border transition-all',
        task.status === 'completed' ? 'bg-green-50 border-green-200' :
        task.status === 'in_progress' ? 'bg-blue-50 border-blue-200' :
        task.status === 'overdue' ? 'bg-red-50 border-red-200' :
        'bg-white border-gray-200 hover:border-gray-300'
      )}
    >
      <div className={cn('p-1 rounded-full', statusColors[task.status])}>
        <StatusIcon className="h-4 w-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            'font-medium text-sm',
            task.status === 'completed' ? 'text-green-800 line-through' : 'text-gray-900'
          )}>
            {task.title}
          </span>
          <span className={cn('text-xs px-2 py-0.5 rounded-full', priorityColors[task.priority])}>
            {task.priority === 'critical' ? 'Critique' : 
             task.priority === 'high' ? 'Haute' : 
             task.priority === 'medium' ? 'Moyenne' : 'Basse'}
          </span>
        </div>
        {task.description && (
          <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
        )}
        {task.dueDate && task.status !== 'completed' && (
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Échéance: {task.dueDate ? formatDate(task.dueDate) : ''}
          </p>
        )}
      </div>

      {task.status === 'pending' && onStart && (
        <Button size="sm" variant="ghost" onClick={onStart} className="h-7">
          <Play className="h-3 w-3 mr-1" />
          Démarrer
        </Button>
      )}
      {task.status === 'in_progress' && onComplete && (
        <Button size="sm" variant="ghost" onClick={onComplete} className="h-7 text-green-600 hover:text-green-700 hover:bg-green-50">
          <Check className="h-3 w-3 mr-1" />
          Terminer
        </Button>
      )}
    </motion.div>
  )
}

// Composant Phase
function PhaseCard({ phase, isExpanded, onToggle, onTaskComplete, onTaskStart }: { 
  phase: TimelinePhase
  isExpanded: boolean
  onToggle: () => void
  onTaskComplete?: (taskId: string) => void
  onTaskStart?: (taskId: string) => void
}) {
  const PhaseIcon = phase.icon
  const colors = phaseColors[phase.color]
  
  const completedTasks = phase.tasks.filter(t => t.status === 'completed').length
  const totalTasks = phase.tasks.length
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border-2 overflow-hidden transition-all',
        colors.border,
        phase.status === 'in_progress' ? 'ring-2 ring-offset-2 ring-blue-400' : ''
      )}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between p-4 transition-colors',
          colors.bg
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', colors.bg, colors.text)}>
            <PhaseIcon className="h-5 w-5" />
          </div>
          <div className="text-left">
            <h3 className={cn('font-semibold', colors.text)}>{phase.title}</h3>
            <p className="text-xs text-gray-500">{phase.description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Progress */}
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={cn(
                  'h-full rounded-full transition-all',
                  phase.status === 'completed' ? 'bg-green-500' :
                  phase.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-300'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 w-12">
              {completedTasks}/{totalTasks}
            </span>
          </div>
          
          {/* Status badge */}
          <span className={cn(
            'text-xs px-2 py-1 rounded-full font-medium',
            phase.status === 'completed' ? 'bg-green-100 text-green-700' :
            phase.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-600'
          )}>
            {phase.status === 'completed' ? 'Terminé' :
             phase.status === 'in_progress' ? 'En cours' : 'À venir'}
          </span>
          
          {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </div>
      </button>

      {/* Tasks */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white"
          >
            <div className="p-4 space-y-2">
              {phase.tasks.map((task) => (
                <TaskItem 
                  key={task.id} 
                  task={task}
                  onComplete={onTaskComplete ? () => onTaskComplete(task.id) : undefined}
                  onStart={onTaskStart ? () => onTaskStart(task.id) : undefined}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Composant Principal
export function SessionTimeline({ sessionId, sessionData, onTaskComplete, onTaskStart }: SessionTimelineProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(['preparation', 'inscriptions']))
  
  const phases = useMemo(() => createTimelinePhases(sessionData), [sessionData])
  
  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev)
      if (next.has(phaseId)) {
        next.delete(phaseId)
      } else {
        next.add(phaseId)
      }
      return next
    })
  }

  // Stats globales
  const totalTasks = phases.reduce((sum, p) => sum + p.tasks.length, 0)
  const completedTasks = phases.reduce((sum, p) => sum + p.tasks.filter(t => t.status === 'completed').length, 0)
  const inProgressTasks = phases.reduce((sum, p) => sum + p.tasks.filter(t => t.status === 'in_progress').length, 0)
  const overdueTasks = phases.reduce((sum, p) => sum + p.tasks.filter(t => t.status === 'overdue').length, 0)

  // Calcul de la progression (éviter division par zéro)
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Protection contre les erreurs
  if (!sessionId) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>Session ID manquant</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header avec stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Timeline de la Session</h2>
          <p className="text-sm text-gray-500">Suivi des étapes et tâches</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-gray-600">{completedTasks} terminées</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="text-gray-600">{inProgressTasks} en cours</span>
            </div>
            {overdueTasks > 0 && (
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-red-600 font-medium">{overdueTasks} en retard</span>
              </div>
            )}
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {progressPercentage}%
            </div>
            <div className="text-xs text-gray-500">Progression globale</div>
          </div>
        </div>
      </div>

      {/* Progress bar globale */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-green-500 transition-all"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Phases Timeline */}
      <div className="relative">
        {/* Ligne verticale de connexion */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
        
        <div className="space-y-4 relative">
          {phases.map((phase, index) => (
            <div key={phase.id} className="relative pl-12">
              {/* Point sur la timeline */}
              <div className={cn(
                'absolute left-4 top-6 w-4 h-4 rounded-full border-2 bg-white z-10',
                phase.status === 'completed' ? 'border-green-500 bg-green-500' :
                phase.status === 'in_progress' ? 'border-blue-500 bg-blue-500' :
                'border-gray-300'
              )} />
              
              <PhaseCard
                phase={phase}
                isExpanded={expandedPhases.has(phase.id)}
                onToggle={() => togglePhase(phase.id)}
                onTaskComplete={onTaskComplete}
                onTaskStart={onTaskStart}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SessionTimeline
