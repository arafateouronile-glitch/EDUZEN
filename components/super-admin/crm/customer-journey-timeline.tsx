'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Rocket,
  LogIn,
  CheckCircle2,
  BookOpen,
  CalendarDays,
  UserPlus,
  FileText,
  CreditCard,
  TrendingUp,
  XCircle,
  AlertCircle,
  Link2,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  Activity,
  ChevronDown,
} from 'lucide-react'
import type { CustomerEvent } from '@/types/crm.types'

const INITIAL_VISIBLE = 10

interface EventConfig {
  icon: React.ComponentType<{ className?: string }>
  color: string
  label: string
}

function getEventConfig(eventType: string): EventConfig {
  const configs: Record<string, EventConfig> = {
    signup: { icon: Rocket, color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/40', label: 'Inscription' },
    login: { icon: LogIn, color: 'text-slate-500 bg-slate-100 dark:bg-slate-800', label: 'Connexion' },
    onboarding_started: { icon: CheckCircle2, color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/40', label: 'Onboarding démarré' },
    onboarding_step_1_completed: { icon: CheckCircle2, color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/40', label: 'Étape 1 complétée' },
    onboarding_step_2_completed: { icon: CheckCircle2, color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/40', label: 'Étape 2 complétée' },
    onboarding_step_3_completed: { icon: CheckCircle2, color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/40', label: 'Étape 3 complétée' },
    onboarding_completed: { icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40', label: 'Onboarding terminé' },
    first_formation_created: { icon: BookOpen, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40', label: 'Première formation' },
    first_session_created: { icon: CalendarDays, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40', label: 'Première session' },
    first_student_added: { icon: UserPlus, color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/40', label: 'Premier apprenant' },
    first_document_generated: { icon: FileText, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40', label: 'Premier document' },
    first_pdf_generated: { icon: FileText, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40', label: 'Premier PDF généré' },
    billing_started: { icon: CreditCard, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40', label: 'Abonnement démarré' },
    subscription_upgraded: { icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40', label: 'Plan upgradé' },
    subscription_canceled: { icon: XCircle, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40', label: 'Abonnement annulé' },
    payment_failed: { icon: AlertCircle, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40', label: 'Échec paiement' },
    payment_succeeded: { icon: CreditCard, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40', label: 'Paiement réussi' },
    integration_connected: { icon: Link2, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40', label: 'Intégration connectée' },
    integration_disconnected: { icon: Link2, color: 'text-slate-500 bg-slate-100 dark:bg-slate-800', label: 'Intégration déconnectée' },
    support_ticket_created: { icon: MessageSquare, color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/40', label: 'Ticket support' },
    feature_used: { icon: Sparkles, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40', label: 'Fonctionnalité utilisée' },
    error: { icon: AlertTriangle, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40', label: 'Erreur' },
  }
  return configs[eventType] ?? { icon: Activity, color: 'text-muted-foreground bg-muted', label: eventType }
}

function formatAbsoluteDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)

  if (minutes < 1) return 'À l\'instant'
  if (minutes < 60) return `Il y a ${minutes} min`
  if (hours < 24) return `Il y a ${hours}h`
  if (days === 1) return 'Hier'
  if (days < 30) return `Il y a ${days} jours`
  return formatAbsoluteDate(dateStr)
}

function MetadataDisplay({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata).filter(([, v]) => v !== null && v !== undefined)
  if (entries.length === 0) return null

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {entries.map(([key, value]) => (
        <Badge key={key} variant="secondary" className="text-[11px] font-normal">
          <span className="opacity-60 mr-1">{key}:</span>
          <span>{String(value)}</span>
        </Badge>
      ))}
    </div>
  )
}

interface CustomerJourneyTimelineProps {
  events: CustomerEvent[]
  className?: string
}

export function CustomerJourneyTimeline({ events, className }: CustomerJourneyTimelineProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)

  if (events.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
        <Activity className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Aucun événement enregistré</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Les événements apparaîtront ici au fil de l'utilisation
        </p>
      </div>
    )
  }

  const visible = events.slice(0, visibleCount)
  const hasMore = visibleCount < events.length
  const remaining = events.length - visibleCount

  return (
    <div className={cn('relative', className)}>
      {/* Vertical line */}
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" aria-hidden />

      <ol className="space-y-0">
        {visible.map((event, idx) => {
          const config = getEventConfig(event.event_type)
          const Icon = config.icon
          const isLast = idx === visible.length - 1 && !hasMore

          return (
            <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
              {/* Icon bubble */}
              <div
                className={cn(
                  'relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-background',
                  config.color
                )}
              >
                <Icon className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pt-1.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold text-foreground">{config.label}</span>
                  <time
                    dateTime={event.created_at}
                    title={formatAbsoluteDate(event.created_at)}
                    className="text-xs text-muted-foreground"
                  >
                    {formatRelative(event.created_at)}
                  </time>
                  {event.user_name && (
                    <span className="text-xs text-muted-foreground/70">· {event.user_name}</span>
                  )}
                </div>

                <MetadataDisplay metadata={event.metadata} />
              </div>
            </li>
          )
        })}
      </ol>

      {/* Show more */}
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVisibleCount((c) => c + 20)}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className="h-4 w-4" />
            Voir {Math.min(remaining, 20)} événements de plus
            <span className="text-xs opacity-60">({remaining} restants)</span>
          </Button>
        </div>
      )}
    </div>
  )
}
