'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, Shield } from 'lucide-react'
import type { QualiopiChecklist as QualiopiChecklistType } from '@/lib/actions/learner-crm-actions'

interface ChecklistItem {
  key: keyof QualiopiChecklistType
  label: string
  description: string
  critical: boolean
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    key: 'convocation_envoyee',
    label: 'Convocation envoyée',
    description: 'Email de convocation transmis au stagiaire',
    critical: true,
  },
  {
    key: 'convocation_ouverte',
    label: 'Convocation lue',
    description: 'Le stagiaire a ouvert l\'email (preuve de réception)',
    critical: false,
  },
  {
    key: 'contrat_genere',
    label: 'Contrat généré',
    description: 'Convention / contrat de formation créé',
    critical: true,
  },
  {
    key: 'contrat_signe',
    label: 'Contrat signé',
    description: 'Signature électronique eIDAS horodatée',
    critical: true,
  },
  {
    key: 'reglement_signe',
    label: 'Règlement intérieur',
    description: 'Règlement intérieur accepté par le stagiaire',
    critical: false,
  },
  {
    key: 'presence_validee',
    label: 'Émargement validé',
    description: 'Au moins une présence enregistrée',
    critical: true,
  },
  {
    key: 'evaluation_faite',
    label: 'Évaluation à chaud',
    description: 'Questionnaire de satisfaction complété',
    critical: true,
  },
  {
    key: 'diplome_emis',
    label: 'Diplôme / Certificat',
    description: 'Attestation ou certificat remis à l\'issue',
    critical: false,
  },
]

interface QualiopiChecklistProps {
  checklist: QualiopiChecklistType
}

export function QualiopiChecklist({ checklist }: QualiopiChecklistProps) {
  const done     = CHECKLIST_ITEMS.filter(item => checklist[item.key]).length
  const total    = CHECKLIST_ITEMS.length
  const pct      = Math.round((done / total) * 100)
  const critical = CHECKLIST_ITEMS.filter(item => item.critical && !checklist[item.key])

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Shield className="h-4 w-4 text-blue-600" />
          Checklist Qualiopi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barre de progression */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{done} / {total} étapes</span>
            <span className={pct === 100 ? 'font-semibold text-green-600' : ''}>{pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className={`h-2 rounded-full transition-all ${
                pct === 100 ? 'bg-green-500' :
                pct >= 60   ? 'bg-blue-500'  :
                              'bg-orange-400'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Alerte critique */}
        {critical.length > 0 && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-xs font-medium text-red-700">
              {critical.length} document{critical.length > 1 ? 's' : ''} obligatoire{critical.length > 1 ? 's' : ''} manquant{critical.length > 1 ? 's' : ''} :
            </p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              {critical.map(item => (
                <li key={item.key} className="text-xs text-red-600">{item.label}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Liste des étapes */}
        <ul className="space-y-2.5">
          {CHECKLIST_ITEMS.map(item => {
            const done = checklist[item.key]
            return (
              <li key={item.key} className="flex items-start gap-2.5">
                {done ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                ) : (
                  <XCircle className={`mt-0.5 h-4 w-4 shrink-0 ${item.critical ? 'text-red-400' : 'text-slate-300'}`} />
                )}
                <div>
                  <p className={`text-sm font-medium leading-tight ${done ? 'text-slate-700' : item.critical ? 'text-red-700' : 'text-slate-400'}`}>
                    {item.label}
                    {item.critical && !done && (
                      <span className="ml-1 text-xs font-normal text-red-400">(obligatoire)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
