'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  GraduationCap,
  Calendar,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  X,
  Loader2,
  UserPlus,
  Building2,
  Mail,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { juryService, type SessionJury, type JuryMember } from '@/lib/services/jury.service'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { GlassCard } from '@/components/ui/glass-card'
import { Avatar } from '@/components/ui/avatar'
import { formatDate } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Schéma formulaire nouveau membre ────────────────────────────────────────

const newMemberSchema = z.object({
  first_name: z.string().min(1, 'Prénom requis'),
  last_name:  z.string().min(1, 'Nom requis'),
  email:      z.string().email('Email invalide'),
  company:    z.string().optional(),
})
type NewMemberForm = z.infer<typeof newMemberSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusConfig = {
  pending: {
    label: 'En attente',
    icon: Clock,
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  confirmed: {
    label: 'Confirmé',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  declined: {
    label: 'Décliné',
    icon: XCircle,
    className: 'bg-red-100 text-red-700 border-red-200',
  },
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface GestionExamenProps {
  sessionId: string
  sessionData: {
    name?: string | null
    start_date?: string | null
    end_date?: string | null
    location?: string | null
    exam_date?: string | null
    formations?: { name?: string | null } | null
  } | null
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function GestionExamen({ sessionId, sessionData }: GestionExamenProps) {
  const supabase    = createClient()
  const { user }    = useAuth()
  const { addToast } = useToast()
  const queryClient  = useQueryClient()

  // UI states
  const [examDate, setExamDate]         = useState<string>('')
  const [isSavingDate, setIsSavingDate] = useState(false)
  const [searchQuery, setSearchQuery]   = useState('')
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [showNewForm, setShowNewForm]   = useState(false)

  // Initialiser la date depuis sessionData
  useEffect(() => {
    if (sessionData?.exam_date) {
      // Format datetime-local : "YYYY-MM-DDTHH:MM"
      setExamDate(sessionData.exam_date.slice(0, 16))
    }
  }, [sessionData?.exam_date])

  // ─── Queries ───────────────────────────────────────────────────────────────

  const { data: sessionJury = [], isLoading: isJuryLoading } = useQuery({
    queryKey: ['session-jury', sessionId],
    queryFn: () => juryService.getSessionJury(sessionId),
    enabled: !!sessionId,
  })

  const { data: orgMembers = [] } = useQuery<JuryMember[]>({
    queryKey: ['jury-members', user?.organization_id],
    queryFn: () => juryService.getJuryMembers(user?.organization_id ?? ''),
    enabled: !!user?.organization_id,
  })

  // IDs déjà assignés
  const assignedIds = new Set(sessionJury.map((sj) => sj.jury_member_id))

  // Filtrer les membres org pour le panneau d'ajout
  const availableMembers = orgMembers.filter((m) => {
    if (assignedIds.has(m.id)) return false
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      m.first_name.toLowerCase().includes(q) ||
      m.last_name.toLowerCase().includes(q)  ||
      m.email.toLowerCase().includes(q)      ||
      (m.company || '').toLowerCase().includes(q)
    )
  })

  // ─── Mutation : sauvegarder exam_date ─────────────────────────────────────

  const handleSaveExamDate = async () => {
    setIsSavingDate(true)
    try {
      const { error } = await (supabase as any)
        .from('sessions')
        .update({ exam_date: examDate ? new Date(examDate).toISOString() : null })
        .eq('id', sessionId)
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
      addToast({ type: 'success', title: 'Date enregistrée', description: 'La date d\'examen a été mise à jour.' })
    } catch (e) {
      addToast({ type: 'error', title: 'Erreur', description: (e as Error).message })
    } finally {
      setIsSavingDate(false)
    }
  }

  // ─── Mutation : ajouter un jury à la session ──────────────────────────────

  const addJuryMutation = useMutation({
    mutationFn: (memberId: string) =>
      juryService.addJuryToSession(sessionId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-jury', sessionId] })
      addToast({ type: 'success', title: 'Jury ajouté', description: 'Le membre du jury a été assigné à la session.' })
    },
    onError: (e) =>
      addToast({ type: 'error', title: 'Erreur', description: (e as Error).message }),
  })

  // ─── Mutation : retirer un jury de la session ─────────────────────────────

  const removeJuryMutation = useMutation({
    mutationFn: (sessionJuryId: string) =>
      juryService.removeJuryFromSession(sessionJuryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-jury', sessionId] })
      addToast({ type: 'success', title: 'Jury retiré', description: 'Le membre du jury a été retiré de la session.' })
    },
    onError: (e) =>
      addToast({ type: 'error', title: 'Erreur', description: (e as Error).message }),
  })

  // ─── Mutation : envoyer / renvoyer la convocation ─────────────────────────

  const sendConvocationMutation = useMutation({
    mutationFn: async (sj: SessionJury) => {
      const res = await fetch('/api/jury/send-convocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionJuryId: sj.id }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Erreur lors de l\'envoi')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-jury', sessionId] })
      addToast({ type: 'success', title: 'Convocation envoyée', description: 'L\'email de convocation a été envoyé au membre du jury.' })
    },
    onError: (e) =>
      addToast({ type: 'error', title: 'Erreur d\'envoi', description: (e as Error).message }),
  })

  // ─── Formulaire nouveau membre ────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewMemberForm>({ resolver: zodResolver(newMemberSchema) })

  const createMemberMutation = useMutation({
    mutationFn: async (values: NewMemberForm) => {
      const member = await juryService.createJuryMember(user?.organization_id ?? '', values)
      // Assigner directement à la session
      await juryService.addJuryToSession(sessionId, member.id)
      return member
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-jury', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['jury-members', user?.organization_id] })
      reset()
      setShowNewForm(false)
      setShowAddPanel(false)
      addToast({ type: 'success', title: 'Membre créé et assigné', description: 'Le nouveau membre du jury a été créé et ajouté à la session.' })
    },
    onError: (e) =>
      addToast({ type: 'error', title: 'Erreur', description: (e as Error).message }),
  })

  // ─── Render ───────────────────────────────────────────────────────────────

  const examDateDisplay = sessionData?.exam_date
    ? format(new Date(sessionData.exam_date), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })
    : null

  const daysUntilExam = sessionData?.exam_date
    ? Math.ceil((new Date(sessionData.exam_date).getTime() - Date.now()) / 86_400_000)
    : null

  return (
    <div className="space-y-6">

      {/* ── Date d'examen ──────────────────────────────────────────────────── */}
      <GlassCard variant="premium" className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-brand-blue/10 rounded-xl">
            <Calendar className="h-5 w-5 text-brand-blue" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Date d'examen</h3>
            {examDateDisplay && (
              <p className="text-sm text-gray-500 mt-0.5">
                {examDateDisplay}
                {daysUntilExam !== null && daysUntilExam > 0 && (
                  <span className="ml-2 text-brand-blue font-medium">
                    (J-{daysUntilExam})
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor="exam_date" className="text-sm font-medium text-gray-700">
              Date et heure de l'examen
            </Label>
            <Input
              id="exam_date"
              type="datetime-local"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button
            onClick={handleSaveExamDate}
            disabled={isSavingDate}
            className="mb-0.5"
          >
            {isSavingDate ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement…</>
            ) : (
              'Enregistrer'
            )}
          </Button>
        </div>
      </GlassCard>

      {/* ── Jury assigné ───────────────────────────────────────────────────── */}
      <GlassCard variant="premium" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-xl">
              <GraduationCap className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Jury d'examen</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {sessionJury.length} membre{sessionJury.length > 1 ? 's' : ''} assigné{sessionJury.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button
            onClick={() => { setShowAddPanel(!showAddPanel); setSearchQuery('') }}
            variant={showAddPanel ? 'outline' : 'default'}
          >
            {showAddPanel ? (
              <><X className="h-4 w-4 mr-2" />Fermer</>
            ) : (
              <><Plus className="h-4 w-4 mr-2" />Ajouter un jury</>
            )}
          </Button>
        </div>

        {/* Panneau d'ajout */}
        {showAddPanel && (
          <div className="mb-6 p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un membre existant…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowNewForm(!showNewForm)}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Nouveau
              </Button>
            </div>

            {/* Formulaire création nouveau membre */}
            {showNewForm && (
              <form
                onSubmit={handleSubmit((v) => createMemberMutation.mutate(v))}
                className="p-4 rounded-lg border border-gray-200 bg-white space-y-3"
              >
                <h4 className="text-sm font-semibold text-gray-800">Créer un nouveau membre</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="jm_first_name">Prénom *</Label>
                    <Input id="jm_first_name" {...register('first_name')} placeholder="Marie" />
                    {errors.first_name && (
                      <p className="text-xs text-red-500 mt-1">{errors.first_name.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="jm_last_name">Nom *</Label>
                    <Input id="jm_last_name" {...register('last_name')} placeholder="Dupont" />
                    {errors.last_name && (
                      <p className="text-xs text-red-500 mt-1">{errors.last_name.message}</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="jm_email">Email *</Label>
                  <Input id="jm_email" type="email" {...register('email')} placeholder="m.dupont@entreprise.fr" />
                  {errors.email && (
                    <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="jm_company">Entreprise / Organisme</Label>
                  <Input id="jm_company" {...register('company')} placeholder="Ex : Ministère du Travail" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setShowNewForm(false); reset() }}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={createMemberMutation.isPending}>
                    {createMemberMutation.isPending
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Création…</>
                      : 'Créer et assigner'
                    }
                  </Button>
                </div>
              </form>
            )}

            {/* Liste membres disponibles */}
            {!showNewForm && availableMembers.length === 0 && (
              <p className="text-sm text-center text-gray-500 py-4">
                {orgMembers.length === 0
                  ? 'Aucun membre créé. Utilisez "Nouveau" pour en ajouter.'
                  : 'Tous les membres existants sont déjà assignés à cette session.'}
              </p>
            )}

            {!showNewForm && availableMembers.length > 0 && (
              <div className="space-y-2">
                {availableMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-100 hover:border-purple-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        fallback={`${member.first_name[0]}${member.last_name[0]}`}
                        size="sm"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {member.first_name} {member.last_name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Mail className="h-3 w-3" />
                          <span>{member.email}</span>
                          {member.company && (
                            <>
                              <Building2 className="h-3 w-3 ml-1" />
                              <span>{member.company}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addJuryMutation.mutate(member.id)}
                      disabled={addJuryMutation.isPending}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Assigner
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Liste des jurys assignés */}
        {isJuryLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : sessionJury.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-600 font-medium">Aucun jury assigné</p>
            <p className="text-sm text-gray-400 mt-1">
              Cliquez sur "Ajouter un jury" pour assigner des membres à cet examen.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessionJury.map((sj) => {
              const member    = sj.jury_members
              const cfg       = statusConfig[sj.status]
              const StatusIcon = cfg.icon
              const isPending  = sendConvocationMutation.isPending

              return (
                <div
                  key={sj.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:border-purple-200 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar
                      fallback={member
                        ? `${member.first_name[0]}${member.last_name[0]}`
                        : '?'}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">
                        {member
                          ? `${member.first_name} ${member.last_name}`
                          : 'Membre inconnu'}
                      </p>
                      {member && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </span>
                          {member.company && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {member.company}
                            </span>
                          )}
                          {sj.email_sent_at && (
                            <span className="text-gray-400">
                              Convoqué le {formatDate(sj.email_sent_at)}
                            </span>
                          )}
                          {sj.confirmed_at && (
                            <span className="text-green-600 font-medium">
                              Confirmé le {formatDate(sj.confirmed_at)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    {/* Badge statut */}
                    <Badge
                      variant="outline"
                      className={`text-xs ${cfg.className} flex items-center gap-1`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {cfg.label}
                    </Badge>

                    {/* Bouton envoyer / renvoyer convocation */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendConvocationMutation.mutate(sj)}
                      disabled={isPending}
                      title={sj.email_sent_at ? 'Renvoyer la convocation' : 'Envoyer la convocation'}
                      className="h-8"
                    >
                      {isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : sj.email_sent_at ? (
                        <><RefreshCw className="h-3 w-3 mr-1" />Renvoyer</>
                      ) : (
                        <><Send className="h-3 w-3 mr-1" />Envoyer</>
                      )}
                    </Button>

                    {/* Retirer de la session */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => removeJuryMutation.mutate(sj.id)}
                      disabled={removeJuryMutation.isPending}
                      title="Retirer ce jury"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Avertissement si exam_date non définie */}
        {sessionJury.length > 0 && !sessionData?.exam_date && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-700">
              La date d'examen n'est pas encore définie. Elle sera incluse dans la convocation — pensez à la renseigner avant l'envoi.
            </p>
          </div>
        )}
      </GlassCard>

    </div>
  )
}
