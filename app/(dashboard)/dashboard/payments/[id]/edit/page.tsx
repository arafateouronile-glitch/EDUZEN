'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { invoiceService } from '@/lib/services/invoice.service.client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { invoiceSchema, type InvoiceFormData } from '@/lib/validations/schemas'
import type { InvoiceWithRelations } from '@/lib/types/query-types'

export default function EditInvoicePage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const invoiceId = params.id as string
  const { user } = useAuth()
  const supabase = createClient()

  const { data: invoice, isLoading } = useQuery<InvoiceWithRelations>({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoiceService.getById(invoiceId) as Promise<InvoiceWithRelations>,
    enabled: !!invoiceId,
  })

  // Ce formulaire ne gère que l'édition des devis — la conversion en facture
  // se fait via l'action dédiée "Convertir en facture", pas ici.
  useEffect(() => {
    if (invoice && invoice.document_type !== 'quote') {
      router.replace(`/dashboard/payments/${invoiceId}`)
    }
  }, [invoice, invoiceId, router])

  const { data: programs } = useQuery({
    queryKey: ['programs-for-invoice', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .eq('organization_id', user.organization_id)
        .order('name')
      if (error) throw error
      return (data || []) as { id: string; name: string }[]
    },
    enabled: !!user?.organization_id,
  })

  const { data: formations } = useQuery({
    queryKey: ['formations-for-invoice', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('formations')
        .select('id, name, program_id')
        .eq('organization_id', user.organization_id)
        .order('name')
      if (error) throw error
      return (data || []) as { id: string; name: string; program_id: string | null }[]
    },
    enabled: !!user?.organization_id,
  })

  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    mode: 'onChange',
  })

  // Le formulaire de création part d'un état vide, mais ici les données
  // arrivent de façon asynchrone (TanStack Query) : on ne peut préremplir
  // qu'une fois le devis chargé.
  useEffect(() => {
    if (!invoice) return
    reset({
      student_id: invoice.student_id || '',
      entity_id: (invoice as unknown as { entity_id?: string | null }).entity_id || '',
      session_id: '',
      program_id: invoice.program_id || '',
      formation_id: invoice.formation_id || '',
      expected_count: '1',
      document_type: 'quote',
      invoice_number: invoice.invoice_number || '',
      type: (invoice.type as InvoiceFormData['type']) || 'tuition',
      amount: invoice.amount != null ? String(invoice.amount) : '',
      tax_amount: invoice.tax_amount != null ? String(invoice.tax_amount) : '',
      currency: invoice.currency || 'EUR',
      issue_date: invoice.issue_date || '',
      due_date: invoice.due_date || '',
      notes: invoice.notes || '',
      mentions_libres: invoice.mentions_libres || '',
      status: (invoice.status as InvoiceFormData['status']) || 'draft',
    })
  }, [invoice, reset])

  const formData = watch()

  const recipientName = invoice?.student_id
    ? `${invoice.students?.first_name ?? ''} ${invoice.students?.last_name ?? ''}`.trim()
    : invoice?.external_entities?.name || '—'

  const updateMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      const amount = parseFloat(data.amount) || 0
      const taxAmount = parseFloat(data.tax_amount || '0') || 0
      const totalAmount = amount + taxAmount

      return invoiceService.update(invoiceId, {
        // Le numéro ne doit jamais partir vide (colonne NOT NULL + unique) —
        // on retombe sur le numéro existant si le champ a été vidé.
        invoice_number: data.invoice_number?.trim() || invoice?.invoice_number,
        type: data.type,
        program_id: data.program_id || null,
        formation_id: data.formation_id || null,
        amount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        currency: data.currency,
        issue_date: data.issue_date,
        due_date: data.due_date,
        status: data.status,
        notes: data.notes || null,
        mentions_libres: data.mentions_libres || null,
        // Volontairement omis : student_id, entity_id, document_type,
        // organization_id — le destinataire et le type ne se modifient pas
        // depuis ce formulaire.
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      router.push(`/dashboard/payments/${invoiceId}`)
    },
  })

  const handleSubmit = handleFormSubmit((data) => {
    updateMutation.mutate(data)
  })

  if (isLoading || !invoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/payments/${invoiceId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Chargement…</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/payments/${invoiceId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Modifier le devis {invoice.invoice_number}
          </h1>
          <p className="mt-2 text-sm text-gray-600">{recipientName}</p>
        </div>
      </div>

      {invoice.status !== 'draft' && (
        <div className="bg-warning-bg border border-warning-border rounded-lg p-4">
          <p className="text-sm text-warning-primary">
            Ce devis n'est plus à l'état brouillon (statut actuel : {invoice.status}). Vos
            modifications seront visibles sur le prochain PDF téléchargé, mais pas sur une copie
            déjà envoyée par email.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informations du devis</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Destinataire</label>
                <div className="w-full px-4 py-3 border rounded-lg bg-gray-50 text-gray-700 min-touch-target">
                  {recipientName}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Le destinataire ne peut pas être modifié ici.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Numéro de devis</label>
                <input
                  type="text"
                  {...register('invoice_number')}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-mono min-touch-target"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Type *</label>
                <select
                  {...register('type')}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target ${
                    errors.type ? 'border-danger-primary' : ''
                  }`}
                >
                  <option value="tuition">Scolarité</option>
                  <option value="registration">Inscription</option>
                  <option value="other">Autre</option>
                </select>
                {errors.type && <p className="text-sm text-danger-primary mt-1">{errors.type.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Statut</label>
                <select
                  {...register('status')}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                >
                  <option value="draft">Brouillon</option>
                  <option value="sent">Envoyé</option>
                  <option value="partial">Partiel</option>
                  <option value="paid">Payé</option>
                  <option value="overdue">En retard</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Programme</label>
                <select
                  {...register('program_id')}
                  onChange={(e) => {
                    setValue('program_id', e.target.value)
                    const currentFormation = formations?.find((f) => f.id === watch('formation_id'))
                    if (currentFormation && currentFormation.program_id !== (e.target.value || null)) {
                      setValue('formation_id', '')
                    }
                  }}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                >
                  <option value="">Aucun programme précis</option>
                  {programs?.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Formation</label>
                <select
                  {...register('formation_id')}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                >
                  <option value="">Aucune formation précise</option>
                  {(watch('program_id')
                    ? formations?.filter((f) => f.program_id === watch('program_id'))
                    : formations
                  )?.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Montant *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('amount')}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target ${
                    errors.amount ? 'border-danger-primary' : ''
                  }`}
                  placeholder="0.00"
                />
                {errors.amount && <p className="text-sm text-danger-primary mt-1">{errors.amount.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">TVA</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('tax_amount')}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target ${
                    errors.tax_amount ? 'border-danger-primary' : ''
                  }`}
                  placeholder="0.00"
                />
                {errors.tax_amount && (
                  <p className="text-sm text-danger-primary mt-1">{errors.tax_amount.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Devise</label>
                <select
                  {...register('currency')}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                >
                  <option value="EUR">EUR (Euro)</option>
                  <option value="USD">USD (Dollar)</option>
                  <option value="XOF">XOF (Franc CFA Ouest)</option>
                  <option value="XAF">XAF (Franc CFA Centre)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date d'émission *</label>
                <input
                  type="date"
                  {...register('issue_date')}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target ${
                    errors.issue_date ? 'border-danger-primary' : ''
                  }`}
                />
                {errors.issue_date && (
                  <p className="text-sm text-danger-primary mt-1">{errors.issue_date.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Date d'échéance *</label>
                <input
                  type="date"
                  {...register('due_date')}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target ${
                    errors.due_date ? 'border-danger-primary' : ''
                  }`}
                />
                {errors.due_date && (
                  <p className="text-sm text-danger-primary mt-1">{errors.due_date.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Notes supplémentaires..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Mentions libres</label>
              <textarea
                {...register('mentions_libres')}
                rows={3}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Texte qui apparaîtra tel quel sur le devis..."
              />
              <p className="text-sm text-muted-foreground mt-1">
                Apparaît sur le PDF si votre modèle de document inclut la variable {'{mentions_libres}'}.
              </p>
            </div>

            {formData.amount && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Montant HT:</span>
                  <span className="font-medium">{formData.amount} {formData.currency}</span>
                </div>
                {formData.tax_amount && parseFloat(formData.tax_amount) > 0 && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-muted-foreground">TVA:</span>
                    <span className="font-medium">{formData.tax_amount} {formData.currency}</span>
                  </div>
                )}
                <div className="flex justify-between items-center mt-2 pt-2 border-t">
                  <span className="font-semibold">Total TTC:</span>
                  <span className="font-bold text-lg">
                    {(
                      parseFloat(formData.amount || '0') +
                      parseFloat(formData.tax_amount || '0')
                    ).toFixed(2)}{' '}
                    {formData.currency}
                  </span>
                </div>
              </div>
            )}

            {updateMutation.error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                {updateMutation.error instanceof Error
                  ? updateMutation.error.message
                  : 'Une erreur est survenue'}
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-4">
              <Link href={`/dashboard/payments/${invoiceId}`}>
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </Link>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
