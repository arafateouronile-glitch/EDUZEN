'use client'

import { useEffect, useState, useTransition } from 'react'
import { motion } from '@/components/ui/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RefreshCw, Search, Users, CheckCircle2, AlertTriangle, XCircle, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { OrganizationHealthCard } from '@/components/super-admin/crm/organization-health-card'
import { getCrmOrganizations } from '@/lib/actions/crm-actions'
import type { OrganizationCrmSummary, HealthStatus } from '@/types/crm.types'
import { cn } from '@/lib/utils'

type Filter = 'all' | HealthStatus

const FILTER_CONFIG: { value: Filter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'all', label: 'Tous', icon: Users },
  { value: 'active', label: 'Actifs', icon: CheckCircle2 },
  { value: 'at_risk', label: 'À risque', icon: AlertTriangle },
  { value: 'inactive', label: 'Inactifs', icon: XCircle },
  { value: 'new', label: 'Nouveaux', icon: Sparkles },
]

const FILTER_COLORS: Record<Filter, string> = {
  all: 'data-[active=true]:bg-primary data-[active=true]:text-primary-foreground',
  active: 'data-[active=true]:bg-emerald-100 data-[active=true]:text-emerald-800 dark:data-[active=true]:bg-emerald-950/60 dark:data-[active=true]:text-emerald-300',
  at_risk: 'data-[active=true]:bg-amber-100 data-[active=true]:text-amber-800 dark:data-[active=true]:bg-amber-950/60 dark:data-[active=true]:text-amber-300',
  inactive: 'data-[active=true]:bg-rose-100 data-[active=true]:text-rose-800 dark:data-[active=true]:bg-rose-950/60 dark:data-[active=true]:text-rose-300',
  new: 'data-[active=true]:bg-sky-100 data-[active=true]:text-sky-800 dark:data-[active=true]:bg-sky-950/60 dark:data-[active=true]:text-sky-300',
}

export default function CrmPage() {
  const [orgs, setOrgs] = useState<OrganizationCrmSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  const load = () => {
    startTransition(async () => {
      const result = await getCrmOrganizations()
      if (result.success && result.data) {
        setOrgs(result.data)
        setError(null)
      } else {
        setError(result.error ?? 'Erreur inconnue')
      }
    })
  }

  useEffect(() => { load() }, [])

  const counts = {
    all: orgs.length,
    active: orgs.filter((o) => o.health_status === 'active').length,
    at_risk: orgs.filter((o) => o.health_status === 'at_risk').length,
    inactive: orgs.filter((o) => o.health_status === 'inactive').length,
    new: orgs.filter((o) => o.health_status === 'new').length,
  }

  const filtered = orgs.filter((o) => {
    const matchesFilter = filter === 'all' || o.health_status === filter
    const matchesSearch = !search || o.organization_name.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold tracking-tight"
          >
            CRM — Parcours Client
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground"
          >
            Suivez le cycle de vie de chaque Organisme de Formation
          </motion.p>
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

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Actifs', count: counts.active, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
          { label: 'À risque', count: counts.at_risk, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20' },
          { label: 'Inactifs', count: counts.inactive, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/20' },
          { label: 'Nouveaux', count: counts.new, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-950/20' },
        ].map((stat) => (
          <Card key={stat.label} className={cn('border-0', stat.bg)}>
            <CardContent className="p-4">
              <div className={cn('text-2xl font-bold', stat.color)}>{stat.count}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un organisme..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTER_CONFIG.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              data-active={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                'border border-border bg-background text-muted-foreground hover:text-foreground',
                FILTER_COLORS[value]
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              <span className="rounded-full bg-black/10 dark:bg-white/10 px-1.5 py-0.5 text-[10px]">
                {counts[value]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {error ? (
        <Card className="border-rose-200 bg-rose-50 dark:bg-rose-950/20">
          <CardContent className="p-4 text-sm text-rose-700 dark:text-rose-400">{error}</CardContent>
        </Card>
      ) : isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Aucun organisme trouvé</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        >
          {filtered.map((org) => (
            <OrganizationHealthCard key={org.organization_id} org={org} />
          ))}
        </motion.div>
      )}
    </div>
  )
}
