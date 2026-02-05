'use client'

/**
 * Page Coffre des preuves – liste par critère / indicateur
 * Permet de voir toutes les preuves et d'ajouter des preuves manuelles.
 */

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { qualiopiService } from '@/lib/services/qualiopi.service'
import { QUALIOPI_REFERENTIAL } from '@/lib/services/auditor-portal.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Shield, Plus, ArrowLeft, FileText, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function QualiopiEvidencePage() {
  const { user } = useAuth()
  const supabase = createClient()

  const { data: indicators = [], isLoading: loadingIndicators } = useQuery({
    queryKey: ['qualiopi-indicators-evidence', user?.organization_id],
    queryFn: () => qualiopiService.getIndicators(user!.organization_id!),
    enabled: !!user?.organization_id,
  })

  const { data: autoEvidence = [], isLoading: loadingAuto } = useQuery({
    queryKey: ['compliance-evidence-list', user?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_evidence_automated')
        .select('*')
        .eq('organization_id', user!.organization_id!)
        .eq('status', 'valid')
        .order('event_date', { ascending: false })
      if (error) return []
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  const { data: manualEvidence = [], isLoading: loadingManual } = useQuery({
    queryKey: ['qualiopi-evidence-manual', user?.organization_id],
    queryFn: async () => {
      const indicatorsList = await qualiopiService.getIndicators(user!.organization_id!)
      const all: Array<{ id: string; indicator_id: string; indicator_code: string; title: string; upload_date: string; source: string }> = []
      for (const ind of indicatorsList) {
        const ev = await qualiopiService.getEvidence(ind.id)
        for (const e of ev) {
          all.push({
            id: e.id,
            indicator_id: e.indicator_id,
            indicator_code: ind.indicator_code,
            title: e.title,
            upload_date: e.upload_date,
            source: 'manual',
          })
        }
      }
      return all.sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime())
    },
    enabled: !!user?.organization_id && indicators.length > 0,
  })

  const isLoading = loadingIndicators || loadingAuto || loadingManual
  const totalAuto = autoEvidence.length
  const totalManual = manualEvidence.length

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/dashboard/qualiopi">
            <Button variant="ghost" size="sm" className="mb-2 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour au dashboard Qualiopi
            </Button>
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-7 w-7 text-[#274472]" />
            Coffre des Preuves
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Preuves automatiques (catalogue, accessibilité, conventions, convocations) et preuves manuelles par critère et indicateur.
          </p>
        </div>
        <Button asChild className="bg-[#274472] hover:bg-[#1a2f4a]">
          <Link href="/dashboard/qualiopi/evidence/add">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une preuve manuelle
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Preuves automatiques</p>
                <p className="text-2xl font-bold">{isLoading ? '…' : totalAuto}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-[#34B9EE]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Preuves manuelles</p>
                <p className="text-2xl font-bold">{isLoading ? '…' : totalManual}</p>
              </div>
              <FileText className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste par critère */}
      <Card>
        <CardHeader>
          <CardTitle>Preuves par critère Qualiopi</CardTitle>
          <CardDescription>
            Cliquez sur un critère pour voir les indicateurs. Ajoutez des preuves manuelles depuis le bouton ci-dessus.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {QUALIOPI_REFERENTIAL.map((criterion) => {
            const criterionIndicators = indicators.filter((ind) => {
              const num = parseInt(ind.indicator_code, 10)
              return criterion.indicators.some((ci) => ci.number === num)
            })
            const autoCount = autoEvidence.filter(
              (e: any) => criterion.indicators.some((ci) => ci.number === e.indicator_number)
            ).length
            const manualCount = manualEvidence.filter((m) =>
              criterionIndicators.some((i) => i.id === m.indicator_id)
            ).length
            const total = autoCount + manualCount
            return (
              <div
                key={criterion.number}
                className="flex items-center justify-between p-4 rounded-xl border bg-slate-50/50"
              >
                <div>
                  <p className="font-semibold">
                    Critère {criterion.number} – {criterion.name}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {criterion.indicators.length} indicateur(s) · {total} preuve(s) (dont {manualCount} manuelle(s))
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{autoCount} auto</Badge>
                  <Badge variant="secondary">{manualCount} manuelles</Badge>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/qualiopi/evidence/add?criterion=${criterion.number}`}>
                      <Plus className="h-3 w-3 mr-1" />
                      Ajouter
                    </Link>
                  </Button>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Dernières preuves manuelles */}
      {manualEvidence.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dernières preuves manuelles</CardTitle>
            <CardDescription>Preuves ajoutées par critère et indicateur.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {manualEvidence.slice(0, 20).map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <span className="font-medium">{e.title}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Ind. {e.indicator_code}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(e.upload_date), 'dd MMM yyyy', { locale: fr })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
