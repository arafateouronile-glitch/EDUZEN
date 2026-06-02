'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import {
  Building2,
  Clock,
  Milestone,
  Activity,
  ChevronRight,
  Mail,
} from 'lucide-react'
import type { OrganizationCrmSummary, HealthStatus } from '@/types/crm.types'

const HEALTH_CONFIG: Record<
  HealthStatus,
  { label: string; dot: string; badge: string; border: string }
> = {
  active: {
    label: 'Actif',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    border: 'border-l-emerald-500',
  },
  at_risk: {
    label: 'À risque',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    border: 'border-l-amber-500',
  },
  inactive: {
    label: 'Inactif',
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
    border: 'border-l-rose-500',
  },
  new: {
    label: 'Nouveau',
    dot: 'bg-sky-500',
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400',
    border: 'border-l-sky-500',
  },
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return 'Aucune activité'
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)

  if (minutes < 1) return 'À l\'instant'
  if (minutes < 60) return `Il y a ${minutes} min`
  if (hours < 24) return `Il y a ${hours}h`
  if (days === 1) return 'Hier'
  if (days < 30) return `Il y a ${days} jours`
  const months = Math.floor(days / 30)
  return `Il y a ${months} mois`
}

interface OrganizationHealthCardProps {
  org: OrganizationCrmSummary
  onContact?: (org: OrganizationCrmSummary) => void
}

export function OrganizationHealthCard({ org, onContact }: OrganizationHealthCardProps) {
  const health = HEALTH_CONFIG[org.health_status]
  const showContact = onContact && (org.health_status === 'new' || org.health_status === 'at_risk')

  return (
    <div className="relative group/card">
      <Link href={`/super-admin/crm/${org.organization_id}`}>
        <Card
          className={cn(
            'cursor-pointer border-l-4 transition-all hover:shadow-md hover:-translate-y-0.5',
            health.border
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              {/* Left */}
              <div className="min-w-0 flex-1 space-y-2">
                {/* Org name + health badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="font-semibold text-sm truncate">{org.organization_name}</span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      health.badge
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', health.dot)} />
                    {health.label}
                  </span>
                </div>

                {/* Milestone */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Milestone className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{org.current_milestone}</span>
                </div>

                {/* Last activity */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{formatRelativeDate(org.last_activity_at)}</span>
                  {org.event_count > 0 && (
                    <span className="ml-1 opacity-60">· {org.event_count} événements</span>
                  )}
                </div>

                {/* Subscription tier */}
                {org.subscription_tier && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Activity className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="capitalize">{org.subscription_tier}</span>
                    {org.subscription_status && (
                      <span className="opacity-60">· {org.subscription_status}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Arrow */}
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/card:opacity-100 mt-0.5" />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Bouton Contacter — hors du Link pour éviter la navigation */}
      {showContact && (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onContact(org)
          }}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-brand-blue text-white shadow-sm opacity-0 group-hover/card:opacity-100 transition-all hover:bg-brand-blue-dark z-10"
          title="Générer un email de contact IA"
        >
          <Mail className="h-3 w-3" />
          Contacter
        </button>
      )}
    </div>
  )
}
