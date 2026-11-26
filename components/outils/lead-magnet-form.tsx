'use client'

/**
 * Formulaire commun des outils gratuits (/outils) : informations de
 * l'organisme (gardées dans le navigateur pour les outils suivants), champs de
 * l'outil, puis prénom / nom / email pour recevoir le document.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2, Mail, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { OUTIL_FIELDS, type OutilField } from '@/lib/outils/form-fields'
import { OUTILS, type OutilKey, type QualiopiAnswer } from '@/lib/outils/tools'
import { QualiopiQuestionnaire } from '@/components/outils/qualiopi-questionnaire'

const ORGANISME_STORAGE_KEY = 'eduzen-outils-organisme'
const LOGO_MAX_BYTES = 300 * 1024

type Values = Record<string, string>

const ORGANISME_FIELDS: OutilField[] = [
  { name: 'nom', label: "Nom de l'organisme", type: 'text', required: true, wide: true },
  { name: 'adresse', label: 'Adresse', type: 'text', wide: true },
  { name: 'code_postal', label: 'Code postal', type: 'text' },
  { name: 'ville', label: 'Ville', type: 'text' },
  { name: 'siret', label: 'SIRET', type: 'text' },
  { name: 'nda', label: "N° de déclaration d'activité", type: 'text' },
  { name: 'region', label: 'Région (préfecture)', type: 'text' },
  { name: 'representant', label: 'Représentant légal (prénom et nom)', type: 'text' },
  { name: 'email', label: "Email de l'organisme", type: 'text' },
  { name: 'telephone', label: 'Téléphone', type: 'text' },
]

interface QualiopiResult {
  score: number | null
  criteria: Array<{ number: number; name: string; score: number | null }>
}

function FieldInput({ field, value, onChange }: { field: OutilField; value: string; onChange: (v: string) => void }) {
  const id = `f-${field.name}`
  return (
    <div className={field.wide ? 'sm:col-span-2' : undefined}>
      <Label htmlFor={id} className="text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
      </Label>
      {field.type === 'textarea' ? (
        <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} required={field.required} rows={field.name === 'apprenants' ? 8 : 3} className="mt-1.5" />
      ) : (
        <Input id={id} type={field.type === 'date' ? 'date' : 'text'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} required={field.required} className="mt-1.5" />
      )}
      {field.help && <p className="mt-1 text-xs text-gray-500">{field.help}</p>}
    </div>
  )
}

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-5 flex items-center gap-3 text-lg font-semibold text-gray-900">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-blue text-sm text-white">{step}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

export function LeadMagnetForm({ tool }: { tool: OutilKey }) {
  const meta = OUTILS[tool]
  const isQualiopi = tool === 'qualiopi'
  const [organisme, setOrganisme] = useState<Values>({})
  const [fields, setFields] = useState<Values>({})
  const [answers, setAnswers] = useState<Record<string, QualiopiAnswer>>({})
  const [lead, setLead] = useState<Values>({ first_name: '', last_name: '', email: '' })
  const [website, setWebsite] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ email: string; qualiopi?: QualiopiResult } | null>(null)

  // Informations de l'organisme reprises d'un outil à l'autre
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(ORGANISME_STORAGE_KEY)
      if (saved) setOrganisme(JSON.parse(saved) as Values)
    } catch {
      /* stockage indisponible */
    }
  }, [])

  const updateOrganisme = (name: string, value: string) => {
    setOrganisme((prev) => {
      const next = { ...prev, [name]: value }
      try {
        window.localStorage.setItem(ORGANISME_STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* stockage plein ou indisponible */
      }
      return next
    })
  }

  const onLogo = (file: File | undefined) => {
    if (!file) return
    if (!['image/png', 'image/jpeg'].includes(file.type)) return setError('Logo : PNG ou JPG uniquement')
    if (file.size > LOGO_MAX_BYTES) return setError('Logo : 300 Ko maximum')
    const reader = new FileReader()
    reader.onload = () => updateOrganisme('logo', String(reader.result))
    reader.readAsDataURL(file)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/outils/${tool}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organisme: isQualiopi ? { nom: organisme.nom ?? '' } : organisme,
          fields: isQualiopi ? { answers } : fields,
          lead,
          website,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string } & Partial<QualiopiResult>
      if (!res.ok) throw new Error(json.error ?? 'Une erreur est survenue')
      setDone({ email: lead.email, qualiopi: isQualiopi ? { score: json.score ?? null, criteria: json.criteria ?? [] } : undefined })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
        <h2 className="mb-2 text-2xl font-bold text-gray-900">C&apos;est envoyé !</h2>
        <p className="text-gray-600">
          Votre {meta.documentName} vient de partir à <strong>{done.email}</strong>. Pensez à regarder dans vos indésirables.
        </p>

        {done.qualiopi && (
          <div className="mx-auto mt-8 max-w-lg text-left">
            <p className="text-center text-5xl font-bold text-brand-blue">{done.qualiopi.score === null ? '—' : `${done.qualiopi.score}%`}</p>
            <p className="mb-5 text-center text-sm text-gray-500">de conformité déclarée sur les 32 indicateurs</p>
            <ul className="space-y-2">
              {done.qualiopi.criteria.map((c) => (
                <li key={c.number} className="flex items-center gap-3 text-sm">
                  <span className="w-48 shrink-0 truncate text-gray-700">Critère {c.number} — {c.name}</span>
                  <span className="h-2 flex-1 rounded bg-gray-100">
                    <span className="block h-2 rounded bg-brand-blue" style={{ width: `${c.score ?? 0}%` }} />
                  </span>
                  <span className="w-10 text-right font-medium">{c.score === null ? '—' : `${c.score}%`}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-center text-sm text-gray-500">Le plan d&apos;action détaillé, indicateur par indicateur, est dans votre email.</p>
          </div>
        )}

        <div className="mx-auto mt-8 max-w-lg rounded-xl bg-brand-blue-ghost p-5">
          <p className="font-semibold text-gray-900">Et si ce document se faisait tout seul ?</p>
          <p className="mt-1 text-sm text-gray-600">
            Dans EduZen, conventions, émargements, certificats et preuves Qualiopi se génèrent automatiquement pour chaque session.
          </p>
          <Button asChild className="mt-4">
            <Link href="/demo">Essayer EduZen gratuitement</Link>
          </Button>
        </div>
        <button type="button" onClick={() => setDone(null)} className="mt-6 text-sm text-gray-500 underline">
          Générer un autre document
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Section step={1} title={isQualiopi ? 'Votre organisme' : 'Votre organisme de formation'}>
        <div className="grid gap-4 sm:grid-cols-2">
          {(isQualiopi ? ORGANISME_FIELDS.slice(0, 1) : ORGANISME_FIELDS).map((field) => (
            <FieldInput key={field.name} field={field} value={organisme[field.name] ?? ''} onChange={(v) => updateOrganisme(field.name, v)} />
          ))}
          {!isQualiopi && (
            <div className="sm:col-span-2">
              <Label className="text-sm font-medium text-gray-700">Logo (PNG ou JPG, 300 Ko max)</Label>
              <div className="mt-1.5 flex items-center gap-3">
                {organisme.logo ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={organisme.logo} alt="Logo" className="h-12 max-w-[140px] object-contain" />
                    <button type="button" onClick={() => updateOrganisme('logo', '')} className="text-gray-400 hover:text-gray-600" aria-label="Retirer le logo">
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-brand-blue">
                    <Upload className="h-4 w-4" /> Ajouter un logo
                    <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} />
                  </label>
                )}
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section step={2} title={isQualiopi ? 'Les 32 indicateurs' : 'Le document'}>
        {isQualiopi ? (
          <QualiopiQuestionnaire answers={answers} onChange={setAnswers} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {OUTIL_FIELDS[tool as Exclude<OutilKey, 'qualiopi'>].map((field) => (
              <FieldInput key={field.name} field={field} value={fields[field.name] ?? ''} onChange={(v) => setFields((prev) => ({ ...prev, [field.name]: v }))} />
            ))}
          </div>
        )}
      </Section>

      <Section step={3} title="Recevoir le document">
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldInput field={{ name: 'first_name', label: 'Prénom', type: 'text', required: true }} value={lead.first_name} onChange={(v) => setLead((p) => ({ ...p, first_name: v }))} />
          <FieldInput field={{ name: 'last_name', label: 'Nom', type: 'text', required: true }} value={lead.last_name} onChange={(v) => setLead((p) => ({ ...p, last_name: v }))} />
          <div className="sm:col-span-2">
            <Label htmlFor="f-email" className="text-sm font-medium text-gray-700">
              Email professionnel<span className="text-red-500"> *</span>
            </Label>
            <Input id="f-email" type="email" required value={lead.email} onChange={(e) => setLead((p) => ({ ...p, email: e.target.value }))} className="mt-1.5" />
          </div>
          {/* Champ piège pour les robots */}
          <div className="sr-only" aria-hidden="true">
            <label htmlFor="f-website">Site web</label>
            <input id="f-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={submitting} className="mt-6 h-12 w-full text-base">
          {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Mail className="mr-2 h-5 w-5" />}
          {submitting ? 'Génération en cours…' : `Recevoir mon ${meta.documentName} par email`}
        </Button>
        <p className="mt-3 text-xs leading-relaxed text-gray-500">
          En recevant ce document, vous recevrez aussi nos conseils pour les organismes de formation (quelques emails, sans spam). Désabonnement en un clic dans chaque email. Vos données sont traitées par EduZen conformément à notre{' '}
          <Link href="/legal/privacy" className="underline">politique de confidentialité</Link>.
        </p>
      </Section>
    </form>
  )
}
