'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { addLearnerNote } from '@/lib/actions/learner-crm-actions'
import type { LearnerProfile } from '@/lib/actions/learner-crm-actions'
import { LearnerTimeline } from '@/components/dashboard/crm/learner-timeline'
import { QualiopiChecklist } from '@/components/dashboard/crm/qualiopi-checklist'
import { ProspectTrackingForm } from '@/components/dashboard/crm/prospect-tracking-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  BookOpen,
  CreditCard,
  Send,
  Building2,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Statut CRM → Badge ───────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  prospect:  { label: 'Prospect',     className: 'bg-slate-100 text-slate-700' },
  inscrit:   { label: 'Inscrit',      className: 'bg-blue-100 text-blue-700' },
  en_cours:  { label: 'En formation', className: 'bg-green-100 text-green-700' },
  termine:   { label: 'Terminé',      className: 'bg-violet-100 text-violet-700' },
  abandon:   { label: 'Abandon',      className: 'bg-red-100 text-red-700' },
}

// ─── Page Profil 360° ─────────────────────────────────────────────────────────

export default function LearnerProfilePage() {
  const params      = useParams()
  const router      = useRouter()
  const studentId   = String(params.id)
  const queryClient = useQueryClient()

  const [noteText, setNoteText] = useState('')

  const { data: profile, isLoading } = useQuery<LearnerProfile>({
    queryKey: ['learner-profile', studentId],
    queryFn:  async () => {
      const res = await fetch(`/api/crm/learner/${studentId}`)
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    staleTime: 60 * 1000,
  })

  const addNoteMutation = useMutation({
    mutationFn: () => addLearnerNote(studentId, noteText),
    onSuccess: () => {
      setNoteText('')
      queryClient.invalidateQueries({ queryKey: ['learner-profile', studentId] })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-1">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  if (!profile) return null

  const fullName  = `${profile.first_name} ${profile.last_name}`
  const initials  = `${profile.first_name[0] ?? ''}${profile.last_name[0] ?? ''}`.toUpperCase()
  const statusCfg = profile.enrollment
    ? STATUS_BADGE[
        (() => {
          const now = new Date()
          const start = new Date(profile.enrollment.start_date)
          const end   = new Date(profile.enrollment.end_date)
          if (profile.enrollment.status === 'completed' || end < now) return 'termine'
          if (start <= now && end >= now) return 'en_cours'
          return 'inscrit'
        })()
      ] ?? STATUS_BADGE.inscrit
    : STATUS_BADGE.prospect

  return (
    <div className="space-y-6 p-6">
      {/* Navigation */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Retour au pipeline
        </Button>
      </div>

      {/* Header apprenant */}
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          {profile.photo_url && <AvatarImage src={profile.photo_url} />}
          <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{fullName}</h1>
            <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">N° {profile.student_number}</p>
        </div>
      </div>

      {/* Layout 3 colonnes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Colonne gauche : Infos + Qualiopi ── */}
        <div className="space-y-4 lg:col-span-1">
          {/* Coordonnées */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Coordonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              {profile.email && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <a href={`mailto:${profile.email}`} className="hover:text-blue-600 hover:underline">
                    {profile.email}
                  </a>
                </div>
              )}
              {profile.phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {profile.phone}
                </div>
              )}
              {(profile.address || profile.city) && (
                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>{[profile.address, profile.city, profile.postal_code].filter(Boolean).join(', ')}</span>
                </div>
              )}
              {profile.date_of_birth && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {format(new Date(profile.date_of_birth), 'd MMMM yyyy', { locale: fr })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formation en cours */}
          {profile.enrollment && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Formation en cours</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <div className="flex items-start gap-2">
                  <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-800">{profile.enrollment.session_name}</p>
                    {profile.enrollment.formation_name && (
                      <p className="text-xs text-slate-400">{profile.enrollment.formation_name}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {format(new Date(profile.enrollment.start_date), 'd MMM yyyy', { locale: fr })}
                  {' → '}
                  {format(new Date(profile.enrollment.end_date), 'd MMM yyyy', { locale: fr })}
                </div>
                {profile.enrollment.payment_status && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                    <Badge
                      variant="outline"
                      className={
                        profile.enrollment.payment_status === 'paid'
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'border-orange-200 bg-orange-50 text-orange-700'
                      }
                    >
                      {profile.enrollment.payment_status === 'paid' ? 'Payé' : 'En attente'}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Entreprise */}
          {profile.company && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Entreprise</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-medium">{profile.company.name}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Checklist Qualiopi */}
          <QualiopiChecklist checklist={profile.checklist} />
        </div>

        {/* ── Colonne droite : Timeline + Note ── */}
        <div className="space-y-4 lg:col-span-2">
          {/* Suivi commercial */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Suivi commercial</CardTitle>
            </CardHeader>
            <CardContent>
              <ProspectTrackingForm
                studentId={studentId}
                initial={{
                  contacted: profile.contacted,
                  contacted_at: profile.contacted_at,
                  next_follow_up_date: profile.next_follow_up_date,
                  notes: profile.notes,
                  commercial_status: profile.commercial_status,
                }}
                invalidateKeys={[['learner-profile', studentId]]}
              />
            </CardContent>
          </Card>

          {/* Ajouter une note */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Ajouter une note</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                placeholder="Observation, rappel, information importante…"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                rows={2}
                className="resize-none"
              />
              <Button
                size="sm"
                disabled={!noteText.trim() || addNoteMutation.isPending}
                onClick={() => addNoteMutation.mutate()}
              >
                <Send className="mr-1.5 h-3.5 w-3.5" />
                Enregistrer la note
              </Button>
            </CardContent>
          </Card>

          {/* Timeline */}
          <LearnerTimeline events={profile.events} learnerName={profile.first_name} />
        </div>
      </div>
    </div>
  )
}
