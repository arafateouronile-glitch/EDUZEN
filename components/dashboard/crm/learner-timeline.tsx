'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FileSignature,
  MailOpen,
  GraduationCap,
  UserCheck,
  Send,
  AlertCircle,
  CheckSquare,
  CreditCard,
  FileText,
  MessageSquare,
  Pen,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { LearnerEvent } from '@/lib/actions/learner-crm-actions'

// ─── Configuration visuelle par type d'événement ──────────────────────────────

type EventStyle = {
  icon: React.ElementType
  color: string
  bgColor: string
  label: string
}

const EVENT_STYLES: Record<string, EventStyle> = {
  enrollment_created:    { icon: UserCheck,      color: 'text-slate-600',   bgColor: 'bg-slate-100',   label: 'Inscription créée' },
  enrollment_completed:  { icon: GraduationCap,  color: 'text-violet-600',  bgColor: 'bg-violet-50',   label: 'Formation terminée' },
  enrollment_cancelled:  { icon: AlertCircle,    color: 'text-red-400',     bgColor: 'bg-red-50',      label: 'Inscription annulée' },
  convocation_envoyee:   { icon: Send,            color: 'text-blue-500',    bgColor: 'bg-blue-50',     label: 'Convocation envoyée' },
  convocation_ouverte:   { icon: MailOpen,        color: 'text-indigo-500',  bgColor: 'bg-indigo-50',   label: 'Convocation ouverte' },
  email_envoye:          { icon: Send,            color: 'text-blue-400',    bgColor: 'bg-blue-50',     label: 'Email envoyé' },
  contrat_genere:        { icon: FileText,        color: 'text-slate-500',   bgColor: 'bg-slate-100',   label: 'Contrat généré' },
  contrat_signe:         { icon: FileSignature,   color: 'text-emerald-500', bgColor: 'bg-emerald-50',  label: 'Contrat signé' },
  reglement_signe:       { icon: FileSignature,   color: 'text-emerald-500', bgColor: 'bg-emerald-50',  label: 'Règlement intérieur signé' },
  presence_validee:      { icon: CheckSquare,     color: 'text-green-600',   bgColor: 'bg-green-50',    label: 'Présence validée' },
  absence_notee:         { icon: AlertCircle,     color: 'text-orange-400',  bgColor: 'bg-orange-50',   label: 'Absence enregistrée' },
  evaluation_faite:      { icon: Pen,             color: 'text-amber-500',   bgColor: 'bg-amber-50',    label: 'Évaluation complétée' },
  diplome_emis:          { icon: GraduationCap,   color: 'text-amber-600',   bgColor: 'bg-amber-50',    label: 'Diplôme / Certificat émis' },
  document_genere:       { icon: FileText,        color: 'text-slate-500',   bgColor: 'bg-slate-100',   label: 'Document généré' },
  document_consulte:     { icon: MailOpen,        color: 'text-blue-400',    bgColor: 'bg-blue-50',     label: 'Document consulté' },
  document_telecharge:   { icon: FileText,        color: 'text-blue-500',    bgColor: 'bg-blue-50',     label: 'Document téléchargé' },
  paiement_recu:         { icon: CreditCard,      color: 'text-green-600',   bgColor: 'bg-green-50',    label: 'Paiement reçu' },
  note_admin:            { icon: MessageSquare,   color: 'text-violet-500',  bgColor: 'bg-violet-50',   label: 'Note' },
  email_bounced:         { icon: AlertCircle,     color: 'text-red-500',     bgColor: 'bg-red-50',      label: 'Email rejeté (bounce)' },
}

const DEFAULT_STYLE: EventStyle = {
  icon: FileText, color: 'text-slate-400', bgColor: 'bg-slate-100', label: 'Événement',
}

// ─── Composant Timeline ───────────────────────────────────────────────────────

interface LearnerTimelineProps {
  events: LearnerEvent[]
  learnerName: string
}

export function LearnerTimeline({ events, learnerName }: LearnerTimelineProps) {
  // Du plus récent au plus ancien
  const sorted = [...events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">Piste d&apos;audit horodatée</CardTitle>
        <CardDescription>Historique de conformité complet pour {learnerName}</CardDescription>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Aucun événement enregistré pour cet apprenant.
          </div>
        ) : (
          <div className="relative ml-3 space-y-5 border-l-2 border-slate-100 pb-4">
            {sorted.map((event, index) => {
              const style = EVENT_STYLES[event.event_type] ?? DEFAULT_STYLE
              const Icon  = style.icon
              const isLatest = index === 0

              const meta = event.metadata as Record<string, any>

              return (
                <div key={event.id} className="group relative pl-6 sm:pl-8">
                  {/* Icône sur la ligne */}
                  <div
                    className={`absolute -left-[17px] top-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white ${style.bgColor} ring-1 ring-slate-100 transition-all group-hover:scale-110`}
                  >
                    <Icon className={`h-4 w-4 ${style.color}`} />
                  </div>

                  {/* Contenu */}
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <div className="flex-1">
                      <h4 className={`text-sm font-semibold ${isLatest ? 'text-slate-900' : 'text-slate-700'}`}>
                        {style.label}
                      </h4>

                      {/* Note admin */}
                      {event.event_type === 'note_admin' && meta.note && (
                        <p className="mt-1 text-sm leading-relaxed text-slate-500 italic">
                          &ldquo;{String(meta.note)}&rdquo;
                        </p>
                      )}

                      {/* Statut de présence */}
                      {event.event_type === 'absence_notee' && meta.attendance_status && (
                        <p className="mt-0.5 text-xs text-orange-500">
                          Statut : {String(meta.attendance_status)}
                          {meta.notes ? ` — ${String(meta.notes)}` : ''}
                        </p>
                      )}

                      {/* Titre du document */}
                      {(event.event_type === 'document_genere' || event.event_type === 'document_consulte' || event.event_type === 'document_telecharge' || event.event_type === 'contrat_genere') && meta.title && (
                        <p className="mt-0.5 text-xs text-slate-400">{String(meta.title)}</p>
                      )}

                      {/* Session liée */}
                      {event.session && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          Session : {event.session.name}
                        </p>
                      )}

                      {/* Métadonnées Qualiopi (preuve) */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {meta.ip_address && (
                          <Badge variant="outline" className="text-xs text-slate-400">
                            IP : {String(meta.ip_address)}
                          </Badge>
                        )}
                        {meta.document_id && (
                          <Badge variant="secondary" className="cursor-pointer text-xs hover:bg-slate-200">
                            Voir le document
                          </Badge>
                        )}
                        {meta.signature_id && (
                          <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50">
                            Signature eIDAS
                          </Badge>
                        )}
                        {meta.score !== undefined && (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 bg-amber-50">
                            Score : {String(meta.score)} / {String(meta.max_score ?? 5)}
                          </Badge>
                        )}
                        {event.event_type === 'email_bounced' && (
                          <Badge variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50">
                            Action requise
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Horodatage */}
                    <time className="mt-1 shrink-0 text-xs font-medium text-slate-400 sm:mt-0">
                      {format(new Date(event.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                    </time>
                  </div>
                </div>
              )
            })}

            {/* Point de départ */}
            <div className="relative pl-8">
              <div className="absolute -left-[5px] top-2 h-2 w-2 rounded-full bg-slate-300 ring-4 ring-white" />
              <p className="text-xs font-medium text-slate-400">Création du dossier apprenant</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
