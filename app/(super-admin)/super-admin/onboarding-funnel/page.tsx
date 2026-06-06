'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { usePlatformAdmin } from '@/lib/hooks/use-platform-admin'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Users, TrendingUp, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 'configure-org',     label: 'Organisme configuré' },
  { id: 'document-templates',label: 'Modèles vérifiés' },
  { id: 'ask-jeane',         label: 'Catalogue créé (Jeane)' },
  { id: 'generate-document', label: '1er document généré' },
]

type FunnelRow = {
  orgId: string
  orgName: string
  createdAt: string
  status: string
  steps: Record<string, string>
  converted: boolean
}

export default function OnboardingFunnelPage() {
  const { isSuperAdmin } = usePlatformAdmin()
  const supabase = createClient()

  const { data, isLoading } = useQuery({
    queryKey: ['onboarding-funnel'],
    queryFn: async () => {
      // Orgs en trial ou récemment expirées (30 derniers jours)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString()
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name, created_at, settings, subscription_status')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })

      if (!orgs) return []

      const orgIds = orgs.map(o => o.id)
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('organization_id, status')
        .in('organization_id', orgIds)

      const subMap = Object.fromEntries((subs ?? []).map(s => [s.organization_id, s.status]))

      return orgs.map(org => {
        const settings = (org.settings as Record<string, unknown>) || {}
        const steps = (settings.onboarding_checklist_steps as Record<string, string>) || {}
        const status = subMap[org.id] || 'no_sub'
        return {
          orgId: org.id,
          orgName: org.name,
          createdAt: org.created_at,
          status,
          steps,
          converted: status === 'active',
        } as FunnelRow
      })
    },
    enabled: isSuperAdmin,
    refetchInterval: 60_000,
  })

  if (!isSuperAdmin) return null

  const rows = data ?? []
  const total = rows.length
  const converted = rows.filter(r => r.converted).length

  // Compter combien ont complété chaque étape
  const stepCounts = STEPS.map(step => ({
    ...step,
    count: rows.filter(r => !!r.steps[step.id]).length,
    pct: total > 0 ? Math.round((rows.filter(r => !!r.steps[step.id]).length / total) * 100) : 0,
  }))

  const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Funnel d'onboarding</h1>
        <p className="text-gray-500 mt-1">Progression des organismes en essai sur les 30 derniers jours</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg"><Users className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-sm text-gray-500">Orgs en essai (30j)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg"><TrendingUp className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">{converted}</p>
                <p className="text-sm text-gray-500">Convertis</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', conversionRate >= 20 ? 'bg-green-50' : conversionRate >= 10 ? 'bg-amber-50' : 'bg-red-50')}>
                <TrendingUp className={cn('h-5 w-5', conversionRate >= 20 ? 'text-green-600' : conversionRate >= 10 ? 'text-amber-600' : 'text-red-600')} />
              </div>
              <div>
                <p className="text-2xl font-bold">{conversionRate}%</p>
                <p className="text-sm text-gray-500">Taux de conversion</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel visuel */}
      <Card>
        <CardHeader>
          <CardTitle>Étapes de la checklist</CardTitle>
          <CardDescription>Pourcentage d'orgs ayant complété chaque étape</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stepCounts.map((step, i) => (
              <div key={step.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    {i > 0 && <ArrowRight className="h-3 w-3 text-gray-300" />}
                    <span>{step.label}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{step.count} <span className="text-gray-400 font-normal">({step.pct}%)</span></span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      step.pct >= 60 ? 'bg-green-500' : step.pct >= 30 ? 'bg-blue-500' : 'bg-red-400'
                    )}
                    style={{ width: `${step.pct}%` }}
                  />
                </div>
                {i < stepCounts.length - 1 && stepCounts[i + 1] && (
                  <p className="text-xs text-gray-400 mt-1">
                    Dropout : {step.count - stepCounts[i + 1].count} org{step.count - stepCounts[i + 1].count > 1 ? 's' : ''} perdues à cette étape
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table détaillée */}
      <Card>
        <CardHeader>
          <CardTitle>Détail par organisme</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-400">Chargement...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500 text-left">
                    <th className="pb-3 pr-4 font-medium">Organisme</th>
                    <th className="pb-3 pr-4 font-medium">Inscrit le</th>
                    {STEPS.map(s => (
                      <th key={s.id} className="pb-3 pr-2 font-medium text-center text-xs">{s.label.split(' ')[0]}</th>
                    ))}
                    <th className="pb-3 font-medium text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map(row => (
                    <tr key={row.orgId} className="hover:bg-gray-50">
                      <td className="py-2.5 pr-4 font-medium text-gray-900 max-w-[160px] truncate">{row.orgName}</td>
                      <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                      </td>
                      {STEPS.map(s => (
                        <td key={s.id} className="py-2.5 pr-2 text-center">
                          {row.steps[s.id]
                            ? <span className="text-green-500">✓</span>
                            : <span className="text-gray-200">—</span>
                          }
                        </td>
                      ))}
                      <td className="py-2.5 text-center">
                        <span className={cn(
                          'inline-block px-2 py-0.5 rounded-full text-xs font-medium',
                          row.converted ? 'bg-green-100 text-green-700' :
                          row.status === 'trialing' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        )}>
                          {row.converted ? 'Converti' : row.status === 'trialing' ? 'En essai' : 'Expiré'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-gray-400">Aucune donnée</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
