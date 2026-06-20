'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, RefreshCw, MessageSquare, Star, Users, BarChart3, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'

type SessionStat = {
  session_id: string
  session_name: string
  assessment_type: string
  type_label: string
  avg_rating: number
  response_count: number
  comment_count: number
  respondent_count: number
}

type AnalysisData = {
  stats: SessionStat[]
  globalAvg: number | null
  totalResponses: number
  totalComments: number
}

function StarRating({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${s <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
        />
      ))}
      <span className="ml-1 text-sm font-semibold text-slate-700">{value}/5</span>
    </span>
  )
}

function RatingBar({ value }: { value: number }) {
  const pct = Math.round((value / 5) * 100)
  const color = value >= 4 ? 'bg-green-500' : value >= 3 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function QuestionnaireAnalysisPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [syncing, setSyncing] = useState(false)

  const { data, isLoading } = useQuery<AnalysisData>({
    queryKey: ['questionnaire-analysis'],
    queryFn: async () => {
      const res = await fetch('/api/qualiopi/sync-questionnaire-analysis')
      if (!res.ok) throw new Error('Erreur lors du chargement')
      return res.json()
    },
  })

  const syncMutation = useMutation({
    mutationFn: async () => {
      setSyncing(true)
      const res = await fetch('/api/qualiopi/sync-questionnaire-analysis', { method: 'POST' })
      if (!res.ok) throw new Error('Erreur lors de la synchronisation')
      return res.json()
    },
    onSuccess: (result) => {
      setSyncing(false)
      queryClient.invalidateQueries({ queryKey: ['questionnaire-analysis'] })
      queryClient.invalidateQueries({ queryKey: ['compliance-evidence-premium'] })
      queryClient.invalidateQueries({ queryKey: ['qualiopi-compliance-rate'] })
      addToast({
        type: 'success',
        title: 'Preuves synchronisées',
        description: result.message,
      })
    },
    onError: () => {
      setSyncing(false)
      addToast({ type: 'error', title: 'Erreur', description: 'Impossible de synchroniser les preuves.' })
    },
  })

  const stats = data?.stats ?? []
  const hotSessions = stats.filter((s) => s.assessment_type === 'hot' || s.assessment_type === 'a_chaud')
  const coldSessions = stats.filter((s) => s.assessment_type === 'cold' || s.assessment_type === 'a_froid')
  const preFormationSessions = stats.filter((s) => s.assessment_type === 'pre_formation')

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/dashboard/qualiopi">
            <Button variant="ghost" size="sm" className="mb-2 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour au dashboard Qualiopi
            </Button>
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-[#274472]" />
            Analyse des questionnaires
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Résultats de satisfaction utilisés comme preuves pour les indicateurs 29-32 du référentiel Qualiopi.
          </p>
        </div>
        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncing || syncMutation.isPending}
          className="bg-[#274472] hover:bg-[#1a2f4a] gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          Synchroniser les preuves
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Satisfaction globale</p>
                <p className="text-2xl font-bold mt-1">
                  {isLoading ? '…' : data?.globalAvg != null ? `${data.globalAvg}/5` : '–'}
                </p>
              </div>
              <Star className="h-6 w-6 text-amber-400 mt-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Sessions évaluées</p>
                <p className="text-2xl font-bold mt-1">{isLoading ? '…' : stats.length}</p>
              </div>
              <BarChart3 className="h-6 w-6 text-[#34B9EE] mt-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Réponses collectées</p>
                <p className="text-2xl font-bold mt-1">{isLoading ? '…' : data?.totalResponses ?? 0}</p>
              </div>
              <Users className="h-6 w-6 text-green-500 mt-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Commentaires libres</p>
                <p className="text-2xl font-bold mt-1">{isLoading ? '…' : data?.totalComments ?? 0}</p>
              </div>
              <MessageSquare className="h-6 w-6 text-purple-500 mt-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mapping Qualiopi */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Indicateurs Qualiopi couverts</CardTitle>
          <CardDescription>Les questionnaires complétés alimentent automatiquement ces indicateurs.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          {[
            { num: 2, name: 'Positionnement préalable des apprenants', covered: preFormationSessions.length > 0 },
            { num: 29, name: 'Modalités de recueil des appréciations', covered: stats.length > 0 },
            { num: 30, name: 'Traitement des réclamations', covered: false, note: 'Manuel — ajoutez une preuve manuelle' },
            { num: 31, name: 'Mesures d\'amélioration mises en œuvre', covered: (data?.totalComments ?? 0) > 0 },
            { num: 32, name: 'Amélioration continue documentée', covered: stats.length >= 2 },
          ].map((ind) => (
            <div key={ind.num} className={`flex items-start gap-3 p-3 rounded-xl border ${ind.covered ? 'border-green-200 bg-green-50/50' : 'border-slate-200 bg-slate-50/30'}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${ind.covered ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {ind.num}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">{ind.name}</p>
                {ind.note && <p className="text-xs text-slate-400 mt-0.5">{ind.note}</p>}
                {!ind.note && (
                  <p className="text-xs mt-0.5 text-slate-400">
                    {ind.covered ? 'Couvert automatiquement' : 'En attente de données'}
                  </p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Sessions pré-formation */}
      {preFormationSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Pré-formation</Badge>
              Positionnements pré-formation ({preFormationSessions.length} session{preFormationSessions.length > 1 ? 's' : ''})
            </CardTitle>
            <CardDescription>Complétés avant la formation pour adapter le parcours (Qualiopi indicateur 2).</CardDescription>
          </CardHeader>
          <CardContent>
            <SessionTable sessions={preFormationSessions} />
          </CardContent>
        </Card>
      )}

      {/* Sessions à chaud */}
      {hotSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Badge className="bg-orange-100 text-orange-700 border-orange-200">À chaud</Badge>
              Évaluations à chaud ({hotSessions.length} session{hotSessions.length > 1 ? 's' : ''})
            </CardTitle>
            <CardDescription>Envoyées juste après la fin de la session.</CardDescription>
          </CardHeader>
          <CardContent>
            <SessionTable sessions={hotSessions} />
          </CardContent>
        </Card>
      )}

      {/* Sessions à froid */}
      {coldSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">À froid</Badge>
              Évaluations à froid ({coldSessions.length} session{coldSessions.length > 1 ? 's' : ''})
            </CardTitle>
            <CardDescription>Envoyées 3 mois après la formation (indicateur Qualiopi obligatoire).</CardDescription>
          </CardHeader>
          <CardContent>
            <SessionTable sessions={coldSessions} />
          </CardContent>
        </Card>
      )}

      {/* État vide */}
      {!isLoading && stats.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Aucune réponse de satisfaction trouvée</p>
            <p className="text-slate-400 text-sm mt-1">
              Les notes seront analysées dès que des apprenants auront répondu aux questionnaires.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SessionTable({ sessions }: { sessions: SessionStat[] }) {
  return (
    <div className="space-y-2">
      {sessions.map((s) => (
        <div key={`${s.session_id}:${s.assessment_type}`} className="flex items-center gap-4 p-3 rounded-lg border bg-white hover:bg-slate-50/80 transition-colors">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{s.session_name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {s.response_count} réponse{s.response_count > 1 ? 's' : ''} · {s.comment_count} commentaire{s.comment_count > 1 ? 's' : ''}
            </p>
          </div>
          <div className="w-32 hidden sm:block">
            <RatingBar value={s.avg_rating} />
          </div>
          <div className="shrink-0">
            <StarRating value={s.avg_rating} />
          </div>
        </div>
      ))}
    </div>
  )
}
