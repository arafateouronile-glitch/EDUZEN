'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { RefreshCw, PlusCircle } from 'lucide-react'

// ─── Référentiel 32 indicateurs ───────────────────────────────────────────────

const INDICATOR_OPTIONS: { value: number; label: string; criterion: number }[] = [
  { value: 1,  label: 'Ind. 1  — Information sur les prestations',         criterion: 1 },
  { value: 2,  label: 'Ind. 2  — Indicateurs de résultats publiés',        criterion: 1 },
  { value: 3,  label: "Ind. 3  — Délais d'accès à la formation",           criterion: 1 },
  { value: 4,  label: 'Ind. 4  — Analyse du besoin',                       criterion: 2 },
  { value: 5,  label: 'Ind. 5  — Objectifs opérationnels',                 criterion: 2 },
  { value: 6,  label: 'Ind. 6  — Contenu de la prestation',                criterion: 2 },
  { value: 7,  label: 'Ind. 7  — Adéquation contenus/objectifs',           criterion: 2 },
  { value: 8,  label: 'Ind. 8  — Positionnement initial',                  criterion: 2 },
  { value: 9,  label: 'Ind. 9  — Conditions de déroulement',               criterion: 3 },
  { value: 10, label: 'Ind. 10 — Adaptation de la prestation',             criterion: 3 },
  { value: 11, label: "Ind. 11 — Évaluation de l'atteinte des objectifs",  criterion: 3 },
  { value: 12, label: "Ind. 12 — Suivi de l'exécution",                    criterion: 3 },
  { value: 13, label: 'Ind. 13 — Coordination intervenants',               criterion: 3 },
  { value: 14, label: 'Ind. 14 — Exercice citoyenneté (CFA)',              criterion: 3 },
  { value: 15, label: 'Ind. 15 — Accompagnement socio-professionnel (CFA)',criterion: 3 },
  { value: 16, label: 'Ind. 16 — Accessibilité handicap',                  criterion: 3 },
  { value: 17, label: 'Ind. 17 — Moyens humains et techniques',            criterion: 4 },
  { value: 18, label: 'Ind. 18 — Coordination alternants (CFA)',           criterion: 4 },
  { value: 19, label: 'Ind. 19 — Ressources pédagogiques',                 criterion: 4 },
  { value: 20, label: 'Ind. 20 — Personnel dédié handicap',                criterion: 4 },
  { value: 21, label: 'Ind. 21 — Compétences des intervenants',            criterion: 5 },
  { value: 22, label: 'Ind. 22 — Développement des compétences',           criterion: 5 },
  { value: 23, label: 'Ind. 23 — Veille légale et réglementaire',          criterion: 6 },
  { value: 24, label: 'Ind. 24 — Veille métiers et emploi',                criterion: 6 },
  { value: 25, label: 'Ind. 25 — Veille technologique et pédagogique',     criterion: 6 },
  { value: 26, label: "Ind. 26 — Mobilisation acteurs de l'orientation",   criterion: 6 },
  { value: 27, label: 'Ind. 27 — Réseau CFA (CFA)',                        criterion: 6 },
  { value: 28, label: "Ind. 28 — Ingénierie de formation",                 criterion: 6 },
  { value: 29, label: 'Ind. 29 — Recueil des appréciations',               criterion: 7 },
  { value: 30, label: 'Ind. 30 — Traitement des réclamations',             criterion: 7 },
  { value: 31, label: "Ind. 31 — Mesures d'amélioration",                  criterion: 7 },
  { value: 32, label: "Ind. 32 — Amélioration continue",                   criterion: 7 },
]

const EVIDENCE_TYPES = [
  { value: 'document',       label: 'Document officiel' },
  { value: 'compte_rendu',   label: 'Compte-rendu de réunion' },
  { value: 'convention',     label: 'Convention / partenariat' },
  { value: 'rapport_veille', label: 'Rapport de veille' },
  { value: 'attestation',    label: 'Attestation / certificat' },
  { value: 'email',          label: 'Email / courrier' },
  { value: 'autre',          label: 'Autre' },
]

function indicatorToCriterion(n: number): number {
  if (n <= 3)  return 1
  if (n <= 8)  return 2
  if (n <= 16) return 3
  if (n <= 20) return 4
  if (n <= 22) return 5
  if (n <= 28) return 6
  return 7
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AddEvidenceModalProps {
  defaultIndicatorNumber?: number
  trigger: React.ReactNode
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function AddEvidenceModal({ defaultIndicatorNumber, trigger }: AddEvidenceModalProps) {
  const [open, setOpen]           = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const today = new Date().toISOString().split('T')[0]

  const defaultForm = {
    indicator_number: defaultIndicatorNumber ?? 23,
    title:            '',
    description:      '',
    event_date:       today,
    evidence_type:    'document',
    file_url:         '',
  }

  const [form, setForm] = useState(defaultForm)

  const set = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/qualiopi/manual-evidence', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          indicator_number: form.indicator_number,
          title:            form.title.trim(),
          description:      form.description.trim() || null,
          event_date:       form.event_date,
          evidence_type:    form.evidence_type,
          file_url:         form.file_url.trim() || null,
        }),
      })
      if (!res.ok) throw new Error('Erreur API')

      // Invalider le coffre des preuves + le panneau du critère concerné
      const c = indicatorToCriterion(form.indicator_number)
      queryClient.invalidateQueries({ queryKey: ['compliance-evidence-premium'] })
      queryClient.invalidateQueries({ queryKey: [`c${c}-detail-evidence`] })

      addToast({
        title:       'Preuve ajoutée',
        description: `Ind. ${form.indicator_number} — ${form.title}`,
        type:        'success',
      })
      setForm({ ...defaultForm, indicator_number: defaultIndicatorNumber ?? 23 })
      setOpen(false)
    } catch {
      addToast({ title: 'Erreur', description: "Impossible d'ajouter la preuve.", type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#274472]/20 focus:border-[#274472]/40'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-space-grotesk text-[#274472]">
            Ajouter une preuve manuelle
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Indicateur */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Indicateur *
            </label>
            <select
              value={form.indicator_number}
              onChange={(e) => set('indicator_number', parseInt(e.target.value))}
              className={inputCls}
            >
              {[1, 2, 3, 4, 5, 6, 7].map((c) => (
                <optgroup key={c} label={`Critère ${c}`}>
                  {INDICATOR_OPTIONS.filter((o) => o.criterion === c).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Titre */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Titre *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Ex. : Compte-rendu de veille réglementaire Q1 2026"
              required
              className={inputCls}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Description <span className="font-normal text-slate-400">(optionnel)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Résumé, contexte, source de la preuve…"
              rows={3}
              className={inputCls + ' resize-none'}
            />
          </div>

          {/* Type + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Type de preuve
              </label>
              <select
                value={form.evidence_type}
                onChange={(e) => set('evidence_type', e.target.value)}
                className={inputCls}
              >
                {EVIDENCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={form.event_date}
                onChange={(e) => set('event_date', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Lien document */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Lien vers le document <span className="font-normal text-slate-400">(optionnel)</span>
            </label>
            <input
              type="url"
              value={form.file_url}
              onChange={(e) => set('file_url', e.target.value)}
              placeholder="https://drive.google.com/…"
              className={inputCls}
            />
          </div>

          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button variant="outline" type="button" size="sm">
                Annuler
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !form.title.trim()}
              className="bg-[#274472] hover:bg-[#1a2f4a] text-white"
            >
              {isSubmitting
                ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                : <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
              }
              {isSubmitting ? 'Enregistrement…' : 'Ajouter la preuve'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
