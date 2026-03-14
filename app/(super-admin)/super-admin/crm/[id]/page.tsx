'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from '@/components/ui/motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, RefreshCw, Building2 } from 'lucide-react'
import { CustomerJourneyTimeline } from '@/components/super-admin/crm/customer-journey-timeline'
import { OrganizationHealthCard } from '@/components/super-admin/crm/organization-health-card'
import { getOrganizationTimeline, getCrmOrganizations } from '@/lib/actions/crm-actions'
import type { CustomerEvent, OrganizationCrmSummary } from '@/types/crm.types'
import { cn } from '@/lib/utils'

export default function CrmOrganizationPage() {
  const params = useParams()
  const router = useRouter()
  const organizationId = params.id as string

  const [events, setEvents] = useState<CustomerEvent[]>([])
  const [orgName, setOrgName] = useState<string>('')
  const [orgSummary, setOrgSummary] = useState<OrganizationCrmSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const load = () => {
    startTransition(async () => {
      const [timelineResult, orgsResult] = await Promise.all([
        getOrganizationTimeline(organizationId),
        getCrmOrganizations(),
      ])

      if (timelineResult.success && timelineResult.data) {
        setEvents(timelineResult.data)
        setOrgName(timelineResult.orgName ?? organizationId)
        setError(null)
      } else {
        setError(timelineResult.error ?? 'Erreur inconnue')
      }

      if (orgsResult.success && orgsResult.data) {
        const summary = orgsResult.data.find((o) => o.organization_id === organizationId)
        if (summary) setOrgSummary(summary)
      }
    })
  }

  useEffect(() => { load() }, [organizationId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="rounded-lg">
            <Link href="/super-admin/crm">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2"
            >
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-2xl font-bold tracking-tight">
                {orgName || 'Chargement...'}
              </h1>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground text-sm"
            >
              Parcours client & historique des événements
            </motion.p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={isPending}
          className="gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', isPending && 'animate-spin')} />
          Actualiser
        </Button>
      </div>

      {error ? (
        <Card className="border-rose-200 bg-rose-50 dark:bg-rose-950/20">
          <CardContent className="p-4 text-sm text-rose-700 dark:text-rose-400">{error}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Health card */}
          <div className="space-y-4">
            {orgSummary ? (
              <OrganizationHealthCard org={orgSummary} />
            ) : isPending ? (
              <div className="h-40 rounded-xl bg-muted animate-pulse" />
            ) : null}

            {/* Quick stats */}
            {events.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Résumé d'activité</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total événements</span>
                    <span className="font-medium">{events.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Premier événement</span>
                    <span className="font-medium text-xs">
                      {new Date(events[events.length - 1].created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dernier événement</span>
                    <span className="font-medium text-xs">
                      {new Date(events[0].created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline des événements</CardTitle>
              <CardDescription>
                {events.length > 0
                  ? `${events.length} événements — du plus récent au plus ancien`
                  : 'Aucun événement enregistré'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              {isPending && events.length === 0 ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-2 pt-2">
                        <div className="h-4 bg-muted animate-pulse rounded w-40" />
                        <div className="h-3 bg-muted animate-pulse rounded w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <CustomerJourneyTimeline events={events} />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
