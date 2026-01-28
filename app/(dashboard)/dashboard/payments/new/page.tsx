'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
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

export default function NewInvoicePage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  // Récupérer les élèves
  const { data: students } = useQuery({
    queryKey: ['students', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_number, classes(name)')
        .eq('organization_id', user.organization_id)
        .eq('status', 'active')
        .order('last_name')
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les classes pour génération en masse
  const { data: classes } = useQuery({
    queryKey: ['classes', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('organization_id', user.organization_id)
        .order('name')
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  const [invoiceType, setInvoiceType] = useState<'single' | 'bulk'>('single')
  const [documentType, setDocumentType] = useState<'quote' | 'invoice'>('quote') // Par défaut, créer un devis

  // React Hook Form avec validation Zod
  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    mode: 'onChange',
    defaultValues: {
      student_id: '',
      document_type: 'quote',
      type: 'tuition',
      amount: '',
      tax_amount: '',
      currency: 'EUR',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +30 jours
      notes: '',
      status: 'draft',
    },
  })

  const formData = watch()

  // Synchroniser document_type avec le state
  const handleDocumentTypeChange = (type: 'quote' | 'invoice') => {
    setDocumentType(type)
    setValue('document_type', type)
  }

  const createMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')

      // Pour l'instant, on gère seulement les factures individuelles avec Zod
      // La génération en masse nécessiterait un schéma séparé
      if (invoiceType === 'bulk') {
        // NOTE: Fonctionnalité prévue - Créer un schéma pour la génération en masse de paiements
        // Permettra de créer plusieurs paiements à la fois pour une facture ou plusieurs factures
        throw new Error('La génération en masse n\'est pas encore validée avec Zod')
      } else {
        // Facture individuelle
        const amount = parseFloat(data.amount) || 0
        const taxAmount = parseFloat(data.tax_amount || '0') || 0
        const totalAmount = amount + taxAmount

        return invoiceService.create({
          organization_id: user.organization_id,
          student_id: data.student_id,
          invoice_number: '', // Sera généré par la fonction SQL
          type: data.type,
          document_type: data.document_type || 'invoice',
          issue_date: data.issue_date,
          due_date: data.due_date,
          amount: amount,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          currency: data.currency,
          status: data.status || 'draft',
          items: [],
          notes: data.notes || null,
        } as any) // Type assertion nécessaire car document_type n'est pas encore dans les types générés
      }
    },
    onSuccess: (result) => {
      if (invoiceType === 'bulk') {
        router.push('/dashboard/payments')
      } else {
        router.push(`/dashboard/payments/${result.id}`)
      }
    },
  })

  const handleSubmit = handleFormSubmit((data) => {
    createMutation.mutate(data)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/payments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {documentType === 'quote' ? 'Nouveau devis' : 'Nouvelle facture'}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Créez un {documentType === 'quote' ? 'devis' : 'facture'} individuel{documentType === 'quote' ? 'le' : 'le'} ou en masse
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Type de document</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-6">
            <button
              type="button"
              onClick={() => handleDocumentTypeChange('quote')}
              className={`flex-1 p-4 border-2 rounded-lg transition-colors ${
                documentType === 'quote'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold">Devis</div>
              <div className="text-sm text-muted-foreground mt-1">
                Estimation avant formation
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleDocumentTypeChange('invoice')}
              className={`flex-1 p-4 border-2 rounded-lg transition-colors ${
                documentType === 'invoice'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold">Facture</div>
              <div className="text-sm text-muted-foreground mt-1">
                Facture après formation
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Type de facturation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-6">
            <button
              type="button"
              onClick={() => setInvoiceType('single')}
              className={`flex-1 p-4 border-2 rounded-lg transition-colors ${
                invoiceType === 'single'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold">{documentType === 'quote' ? 'Devis individuel' : 'Facture individuelle'}</div>
              <div className="text-sm text-muted-foreground mt-1">
                Pour un élève spécifique
              </div>
            </button>
            <button
              type="button"
              onClick={() => setInvoiceType('bulk')}
              className={`flex-1 p-4 border-2 rounded-lg transition-colors ${
                invoiceType === 'bulk'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold">{documentType === 'quote' ? 'Génération en masse' : 'Facturation en masse'}</div>
              <div className="text-sm text-muted-foreground mt-1">
                Pour toute une classe
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informations du {documentType === 'quote' ? 'devis' : 'facture'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {invoiceType === 'bulk' && (
              <div className="bg-warning-bg border border-warning-border rounded-lg p-4 mb-6">
                <p className="text-sm text-warning-primary">
                  La génération en masse n'est pas encore validée avec Zod. Veuillez utiliser "Facture individuelle" pour bénéficier de la validation complète.
                </p>
              </div>
            )}

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
                {errors.type && (
                  <p className="text-sm text-danger-primary mt-1">{errors.type.message}</p>
                )}
              </div>

              {invoiceType === 'single' ? (
                <div>
                  <label className="block text-sm font-medium mb-2">Élève *</label>
                  <select
                    {...register('student_id')}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target ${
                      errors.student_id ? 'border-danger-primary' : ''
                    }`}
                  >
                    <option value="">Sélectionner un élève</option>
                    {students?.map((student: any) => (
                      <option key={student.id} value={student.id}>
                        {student.first_name} {student.last_name} ({student.student_number})
                      </option>
                    ))}
                  </select>
                  {errors.student_id && (
                    <p className="text-sm text-danger-primary mt-1">{errors.student_id.message}</p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-2">Classe *</label>
                  <div className="bg-warning-bg border border-warning-border rounded-lg p-4">
                    <p className="text-sm text-warning-primary">
                      La génération en masse n'est pas encore validée avec Zod. Veuillez utiliser "Facture individuelle".
                    </p>
                  </div>
                </div>
              )}
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
                {errors.amount && (
                  <p className="text-sm text-danger-primary mt-1">{errors.amount.message}</p>
                )}
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
                  <option value="XOF">XOF (Franc CFA Ouest)</option>
                  <option value="XAF">XAF (Franc CFA Centre)</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="USD">USD (Dollar)</option>
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

            {invoiceType === 'single' && (
              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Notes supplémentaires..."
                />
              </div>
            )}

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

            {createMutation.error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : 'Une erreur est survenue'}
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-4">
              <Link href="/dashboard/payments">
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </Link>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending
                  ? 'Création...'
                  : invoiceType === 'bulk'
                  ? (documentType === 'quote' ? 'Générer les devis' : 'Générer les factures')
                  : (documentType === 'quote' ? 'Créer le devis' : 'Créer la facture')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

