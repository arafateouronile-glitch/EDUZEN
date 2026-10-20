'use client'

import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Wallet,
  Pencil,
  FileDown,
  PenLine,
  RefreshCw,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  ExternalLink,
  Info,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { GlassCard } from '@/components/ui/glass-card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils'
import { juryService, type JuryMember, type SessionJury } from '@/lib/services/jury.service'
import {
  computeExpense,
  formatAmount,
  juryExpenseService,
  juryMemberFullName,
  type JuryExpense,
  type JuryExpenseStatus,
} from '@/lib/services/jury-expense.service'
import { documentTemplateService } from '@/lib/services/document-template.service.client'
import { extractDefraiementVariables } from '@/lib/utils/jury-expense/extract-variables'
import type { DocumentTemplate } from '@/lib/types/document-templates'

const DOC_TYPE = 'attestation_defraiement' as const

const STATUS: Record<JuryExpenseStatus, { label: string; icon: typeof Clock; className: string }> = {
  draft: { label: 'Brouillon', icon: FileText, className: 'bg-gray-100 text-gray-600 border-gray-200' },
  sent: { label: 'En attente de signature', icon: Clock, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  signed: { label: 'Signée', icon: CheckCircle2, className: 'bg-green-100 text-green-700 border-green-200' },
}

const AMOUNT_FIELDS = ['hours', 'hourly_rate', 'distance_km', 'km_rate', 'other_transport', 'meals', 'lodging'] as const
type AmountField = (typeof AMOUNT_FIELDS)[number]

interface ExpenseForm {
  amounts: Record<AmountField, string>
  notes: string
  member: { qualite: string; address: string; postal_code: string; city: string; iban: string; bic: string }
}

function toInput(value: number | null | undefined): string {
  return value ? String(value).replace('.', ',') : ''
}

function maskIban(iban?: string | null): string {
  if (!iban) return ''
  const clean = iban.replace(/\s+/g, '')
  return clean.length > 8 ? `${clean.slice(0, 4)} •••• ${clean.slice(-4)}` : clean
}

interface JuryExpensesProps {
  sessionId: string
  sessionJury: SessionJury[]
  sessionData: {
    name?: string | null
    location?: string | null
    exam_date?: string | null
    formations?: { name?: string | null } | null
  } | null
}

export function JuryExpenses({ sessionId, sessionJury, sessionData }: JuryExpensesProps) {
  const supabase = createClient()
  const { user } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const [editing, setEditing] = useState<SessionJury | null>(null)
  const [form, setForm] = useState<ExpenseForm | null>(null)
  const [busy, setBusy] = useState<{ id: string; action: 'pdf' | 'sign' } | null>(null)
  const [templateId, setTemplateId] = useState<string>('')

  const { data: expenses = [] } = useQuery<JuryExpense[]>({
    queryKey: ['jury-expenses', sessionId],
    queryFn: () => juryExpenseService.getBySession(sessionId),
    enabled: !!sessionId,
    // Suivi de la signature : rafraîchi tant qu'une attestation attend
    refetchInterval: (query) => ((query.state.data as JuryExpense[] | undefined)?.some((e) => e.status === 'sent') ? 10_000 : false),
  })

  const { data: templates = [] } = useQuery<DocumentTemplate[]>({
    queryKey: ['attestation-defraiement-templates', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return documentTemplateService.getAllTemplates(user.organization_id, { type: DOC_TYPE, isActive: true }) as Promise<DocumentTemplate[]>
    },
    enabled: !!user?.organization_id,
  })

  const { data: org } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const { data } = await supabase.from('organizations').select('*').eq('id', user.organization_id).single()
      return data
    },
    enabled: !!user?.organization_id,
  })

  const expenseByAssignment = useMemo(() => new Map(expenses.map((e) => [e.session_jury_id, e])), [expenses])
  const grandTotal = expenses.reduce((sum, e) => sum + Number(e.total ?? 0), 0)

  // ─── Saisie ─────────────────────────────────────────────────────────────────

  const openEditor = (sj: SessionJury) => {
    const expense = expenseByAssignment.get(sj.id)
    const m = sj.jury_members
    setEditing(sj)
    setForm({
      amounts: Object.fromEntries(AMOUNT_FIELDS.map((f) => [f, toInput(expense?.[f])])) as Record<AmountField, string>,
      notes: expense?.notes ?? '',
      member: {
        qualite: m?.qualite ?? '',
        address: m?.address ?? '',
        postal_code: m?.postal_code ?? '',
        city: m?.city ?? '',
        iban: m?.iban ?? '',
        bic: m?.bic ?? '',
      },
    })
  }

  const preview = form ? computeExpense(form.amounts) : null

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editing || !form) return null
      const member = editing.jury_members
      if (member) {
        await juryService.updateJuryMember(member.id, {
          qualite: form.member.qualite.trim() || null,
          address: form.member.address.trim() || null,
          postal_code: form.member.postal_code.trim() || null,
          city: form.member.city.trim() || null,
          iban: form.member.iban.replace(/\s+/g, '').toUpperCase() || null,
          bic: form.member.bic.trim().toUpperCase() || null,
        })
      }
      return juryExpenseService.save({
        session_jury_id: editing.id,
        notes: form.notes,
        ...Object.fromEntries(AMOUNT_FIELDS.map((f) => [f, form.amounts[f].replace(',', '.') || '0'])),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jury-expenses', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['session-jury', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['jury-members', user?.organization_id] })
      // Charges de la session (onglet Finances)
      queryClient.invalidateQueries({ queryKey: ['session-charges', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['session-charges-summary', sessionId] })
      setEditing(null)
      setForm(null)
      addToast({ type: 'success', title: 'Défraiement enregistré', description: 'Le montant est reporté dans les charges de la session.' })
    },
    onError: (e) => addToast({ type: 'error', title: 'Erreur', description: (e as Error).message }),
  })

  // ─── Attestation ────────────────────────────────────────────────────────────

  async function resolveTemplate(): Promise<DocumentTemplate> {
    if (!user?.organization_id) throw new Error('Organisation manquante')
    if (templateId) {
      const t = await documentTemplateService.getTemplateById(templateId)
      if (t) return t as DocumentTemplate
    }
    let template = await documentTemplateService.getDefaultTemplate(user.organization_id, DOC_TYPE)
    if (!template) {
      // Première attestation de l'organisation : on crée le modèle par défaut
      // (modifiable ensuite dans Réglages → Modèles de documents).
      const res = await fetch('/api/document-templates/reset-defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ types: [DOC_TYPE] }),
      })
      if (!res.ok) throw new Error('Impossible de créer le modèle d\'attestation de défraiement')
      template = await documentTemplateService.getDefaultTemplate(user.organization_id, DOC_TYPE)
      queryClient.invalidateQueries({ queryKey: ['attestation-defraiement-templates', user.organization_id] })
    }
    if (!template) throw new Error('Aucun modèle d\'attestation de défraiement trouvé')
    return template as DocumentTemplate
  }

  async function generatePdf(sj: SessionJury, expense: JuryExpense): Promise<Blob> {
    const member = sj.jury_members as JuryMember
    const template = await resolveTemplate()
    const variables = extractDefraiementVariables({
      organization: org ?? undefined,
      juryMember: member,
      session: {
        name: sessionData?.name,
        exam_date: sessionData?.exam_date,
        location: sessionData?.location,
        formation_name: sessionData?.formations?.name,
      },
      expense,
    })
    const res = await fetch('/api/documents/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template, variables, organizationId: user?.organization_id }),
    })
    if (!res.ok) throw new Error('Erreur lors de la génération du PDF')
    return res.blob()
  }

  async function handleDownload(sj: SessionJury, expense: JuryExpense) {
    setBusy({ id: sj.id, action: 'pdf' })
    try {
      const blob = await generatePdf(sj, expense)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attestation-defraiement-${expense.reference ?? ''}-${(sj.jury_members?.last_name ?? 'jury').toLowerCase()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      addToast({ type: 'error', title: 'Erreur', description: (e as Error).message })
    } finally {
      setBusy(null)
    }
  }

  async function handleSendForSignature(sj: SessionJury, expense: JuryExpense) {
    const member = sj.jury_members
    if (!member?.email) return
    setBusy({ id: sj.id, action: 'sign' })
    try {
      const blob = await generatePdf(sj, expense)
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = () => reject(new Error('Lecture du PDF impossible'))
        reader.readAsDataURL(blob)
      })

      const name = juryMemberFullName(member)
      const examLabel = sessionData?.formations?.name || sessionData?.name || 'l\'examen'
      const res = await fetch('/api/signature-requests/send-from-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          documentTitle: `Attestation de défraiement ${expense.reference ?? ''} — ${name}`.replace(/\s+/g, ' '),
          type: DOC_TYPE,
          sessionId,
          recipientEmail: member.email,
          recipientName: `${member.first_name} ${member.last_name}`,
          // Pas de recipientId : le membre du jury n'est ni apprenant ni prospect
          recipientType: 'other',
          metadata: { jury_expense_id: expense.id, session_jury_id: sj.id },
          subject: `Attestation de défraiement à signer — ${examLabel}`,
          message: `Bonjour ${member.first_name},\n\nMerci pour votre participation au jury de ${examLabel}. Vous trouverez ci-joint votre attestation de défraiement d'un montant de ${formatAmount(expense.total)} €. Merci de la signer afin que nous puissions procéder au règlement.`,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.document?.id) throw new Error(json?.error || 'Erreur lors de l\'envoi pour signature')

      await juryExpenseService.markSent(expense.id, json.document.id, json.signatureRequest?.id ?? null)
      queryClient.invalidateQueries({ queryKey: ['jury-expenses', sessionId] })
      addToast({ type: 'success', title: 'Demande de signature envoyée', description: `Un email a été envoyé à ${member.email}.` })
    } catch (e) {
      addToast({ type: 'error', title: 'Erreur', description: (e as Error).message })
    } finally {
      setBusy(null)
    }
  }

  if (sessionJury.length === 0) return null

  return (
    <GlassCard variant="premium" className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-xl">
            <Wallet className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Défraiements du jury</h3>
            <p className="text-sm text-gray-500 mt-0.5">Vacations, transport, repas et hébergement — attestation à signer électroniquement</p>
          </div>
        </div>
        {templates.length > 1 && (
          <div className="flex items-center gap-2 text-sm">
            <Label htmlFor="defraiement-template" className="text-gray-600 whitespace-nowrap">Modèle</Label>
            <select
              id="defraiement-template"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="h-9 rounded-lg border border-gray-200 px-2 text-sm"
            >
              <option value="">Modèle par défaut</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {sessionJury.map((sj) => {
          const member = sj.jury_members
          const expense = expenseByAssignment.get(sj.id)
          const status = expense ? STATUS[expense.status] : null
          const StatusIcon = status?.icon
          const signedUrl = expense?.documents?.signed_file_url
          const canSend = !!expense && Number(expense.total) > 0 && !!member?.email
          const isBusy = busy?.id === sj.id

          return (
            <div key={sj.id} className="flex flex-col md:flex-row md:items-center gap-3 p-4 rounded-xl border border-gray-100 bg-white">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{juryMemberFullName(member)}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-gray-500">
                  {expense?.reference && <span className="font-mono">{expense.reference}</span>}
                  {expense ? (
                    <span>
                      {formatAmount(expense.fees)} € vacations · {formatAmount(expense.transport)} € transport ·{' '}
                      {formatAmount(Number(expense.meals) + Number(expense.lodging))} € repas/hébergement
                    </span>
                  ) : (
                    <span>Aucun défraiement saisi</span>
                  )}
                  {member?.iban && <span title="IBAN">IBAN {maskIban(member.iban)}</span>}
                  {expense?.status === 'sent' && expense.sent_at && <span>Envoyée le {formatDate(expense.sent_at)}</span>}
                  {expense?.status === 'signed' && expense.signed_at && (
                    <span className="text-green-700 font-medium">Signée le {formatDate(expense.signed_at)}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                {expense && (
                  <span className="text-base font-semibold tabular-nums text-gray-900 mr-1">{formatAmount(expense.total)} €</span>
                )}
                {status && StatusIcon && (
                  <Badge variant="outline" className={`text-xs ${status.className} flex items-center gap-1`}>
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                )}
                <Button size="sm" variant="outline" className="h-8" onClick={() => openEditor(sj)}>
                  <Pencil className="h-3 w-3 mr-1" />
                  {expense ? 'Modifier' : 'Saisir le défraiement'}
                </Button>
                {expense && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => handleDownload(sj, expense)}
                    disabled={isBusy}
                    title="Télécharger l'attestation de défraiement"
                  >
                    {isBusy && busy?.action === 'pdf' ? <Loader2 className="h-3 w-3 animate-spin" /> : <><FileDown className="h-3 w-3 mr-1" />Attestation</>}
                  </Button>
                )}
                {expense && expense.status !== 'signed' && (
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={() => handleSendForSignature(sj, expense)}
                    disabled={!canSend || isBusy}
                    title={
                      !member?.email
                        ? 'Le membre du jury n\'a pas d\'email'
                        : Number(expense.total) <= 0
                          ? 'Le montant du défraiement est nul'
                          : 'Envoyer l\'attestation en signature électronique'
                    }
                  >
                    {isBusy && busy?.action === 'sign' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : expense.status === 'sent' ? (
                      <><RefreshCw className="h-3 w-3 mr-1" />Renvoyer</>
                    ) : (
                      <><PenLine className="h-3 w-3 mr-1" />Envoyer en signature</>
                    )}
                  </Button>
                )}
                {signedUrl && (
                  <Button size="sm" variant="outline" className="h-8" asChild>
                    <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />PDF signé
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {expenses.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4">
          <p className="flex items-center gap-1.5 text-xs text-gray-500">
            <Info className="h-3.5 w-3.5" />
            Inclus dans les charges de la session (onglet Finances, catégorie « Jury »).
          </p>
          <p className="text-sm text-gray-700">
            Total jury : <span className="text-lg font-bold tabular-nums text-gray-900">{formatAmount(grandTotal)} €</span>
          </p>
        </div>
      )}

      {/* Saisie du défraiement */}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) { setEditing(null); setForm(null) } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Défraiement — {juryMemberFullName(editing?.jury_members)}</DialogTitle>
            <DialogDescription>Montants repris dans l&apos;attestation de défraiement et dans les charges de la session.</DialogDescription>
          </DialogHeader>

          {form && preview && (
            <div className="space-y-5">
              <section className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Vacations</h4>
                <div className="grid grid-cols-2 gap-3">
                  <AmountInput label="Nombre d'heures" suffix="h" value={form.amounts.hours} onChange={(v) => setForm({ ...form, amounts: { ...form.amounts, hours: v } })} />
                  <AmountInput label="Taux de vacation" suffix="€/h" value={form.amounts.hourly_rate} onChange={(v) => setForm({ ...form, amounts: { ...form.amounts, hourly_rate: v } })} />
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Transport</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <AmountInput label="Distance aller-retour" suffix="km" value={form.amounts.distance_km} onChange={(v) => setForm({ ...form, amounts: { ...form.amounts, distance_km: v } })} />
                  <AmountInput label="Indemnité kilométrique" suffix="€/km" value={form.amounts.km_rate} onChange={(v) => setForm({ ...form, amounts: { ...form.amounts, km_rate: v } })} />
                  <AmountInput label="Autres (train, péage, parking)" suffix="€" value={form.amounts.other_transport} onChange={(v) => setForm({ ...form, amounts: { ...form.amounts, other_transport: v } })} />
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Repas et hébergement</h4>
                <div className="grid grid-cols-2 gap-3">
                  <AmountInput label="Repas" suffix="€" value={form.amounts.meals} onChange={(v) => setForm({ ...form, amounts: { ...form.amounts, meals: v } })} />
                  <AmountInput label="Hébergement" suffix="€" value={form.amounts.lodging} onChange={(v) => setForm({ ...form, amounts: { ...form.amounts, lodging: v } })} />
                </div>
              </section>

              <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-sm">
                <div className="flex justify-between text-gray-600"><span>Vacations</span><span className="tabular-nums">{formatAmount(preview.fees)} €</span></div>
                <div className="flex justify-between text-gray-600"><span>Transport</span><span className="tabular-nums">{formatAmount(preview.transport)} €</span></div>
                <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 mt-2 pt-2">
                  <span>Total</span><span className="tabular-nums">{formatAmount(preview.total)} €</span>
                </div>
              </div>

              <div>
                <Label htmlFor="defraiement-notes">Notes (reprises dans l&apos;attestation)</Label>
                <Textarea id="defraiement-notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              <section className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Coordonnées du membre du jury</h4>
                <p className="text-xs text-gray-500">Enregistrées sur sa fiche et reprises dans l&apos;attestation (virement).</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TextInput label="Qualité / fonction" value={form.member.qualite} onChange={(v) => setForm({ ...form, member: { ...form.member, qualite: v } })} placeholder="Ex : Professionnel du secteur" />
                  <TextInput label="Adresse" value={form.member.address} onChange={(v) => setForm({ ...form, member: { ...form.member, address: v } })} />
                  <TextInput label="Code postal" value={form.member.postal_code} onChange={(v) => setForm({ ...form, member: { ...form.member, postal_code: v } })} />
                  <TextInput label="Ville" value={form.member.city} onChange={(v) => setForm({ ...form, member: { ...form.member, city: v } })} />
                  <TextInput label="IBAN" value={form.member.iban} onChange={(v) => setForm({ ...form, member: { ...form.member, iban: v } })} placeholder="FR76 …" />
                  <TextInput label="BIC" value={form.member.bic} onChange={(v) => setForm({ ...form, member: { ...form.member, bic: v } })} />
                </div>
              </section>

              {expenseByAssignment.get(editing?.id ?? '')?.status && expenseByAssignment.get(editing?.id ?? '')?.status !== 'draft' && (
                <p className="flex items-start gap-1.5 text-xs text-amber-700">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  L&apos;attestation a déjà été envoyée : après modification, renvoyez-la en signature pour que le membre du jury signe les nouveaux montants.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditing(null); setForm(null) }}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement…</> : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GlassCard>
  )
}

function AmountInput({ label, suffix, value, onChange }: { label: string; suffix: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs text-gray-600">{label}</Label>
      <div className="relative mt-1">
        <Input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ''))}
          placeholder="0"
          className="pr-12 tabular-nums"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{suffix}</span>
      </div>
    </div>
  )
}

function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs text-gray-600">{label}</Label>
      <Input className="mt-1" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}
