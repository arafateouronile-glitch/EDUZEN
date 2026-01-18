'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoiceService } from '@/lib/services/invoice.service'
import { paymentService } from '@/lib/services/payment.service'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Plus, DollarSign, Calendar, FileText, CheckCircle, XCircle, Clock, CreditCard, Building2, Download, Receipt } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { useState } from 'react'
import { useToast } from '@/components/ui/toast'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { documentTemplateService } from '@/lib/services/document-template.service'
import { generateHTML } from '@/lib/utils/document-generation/html-generator'
import { extractDocumentVariables, mapDocumentTypeToTemplateType } from '@/lib/utils/document-generation/variable-extractor'
import { generatePDFFromHTML } from '@/lib/utils/pdf-generator'
import type { StudentWithRelations, InvoiceWithRelations } from '@/lib/types/query-types'

type Payment = TableRow<'payments'>

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const invoiceId = params.id as string
  const { user } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [showStripeForm, setShowStripeForm] = useState(false)
  const [showSEPAForm, setShowSEPAForm] = useState(false)
  const [showCreditNoteForm, setShowCreditNoteForm] = useState(false)
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false)

  // Récupérer la facture
  const { data: invoice, isLoading, refetch } = useQuery<InvoiceWithRelations>({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoiceService.getById(invoiceId) as Promise<InvoiceWithRelations>,
  })

  // Récupérer les paiements
  const { data: payments, refetch: refetchPayments } = useQuery({
    queryKey: ['payments', invoiceId],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return paymentService.getAll(user.organization_id, { invoiceId })
    },
    enabled: !!invoiceId && !!user?.organization_id,
  })

  // Récupérer l'organisation
  const { data: organization } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', user.organization_id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer l'année académique actuelle
  const { data: academicYear } = useQuery({
    queryKey: ['academic-year', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .eq('organization_id', user.organization_id)
        .eq('is_current', true)
        .maybeSingle()
      if (error) {
        console.warn('Erreur lors de la récupération de l\'année académique:', error)
        return null
      }
      return data || null
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer le template de facture par défaut
  const { data: invoiceTemplate } = useQuery({
    queryKey: ['invoice-template', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const templates = await documentTemplateService.getTemplatesByType(
        'facture',
        user.organization_id
      )
      return templates.length > 0 ? templates[0] : null
    },
    enabled: !!user?.organization_id,
  })

  // Formulaire de paiement
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    currency: invoice?.currency || 'EUR',
    payment_method: 'cash' as 'cash' | 'card' | 'bank_transfer' | 'sepa',
    payment_provider: 'stripe' as 'stripe' | 'sepa',
    transaction_id: '',
    notes: '',
  })

  // Formulaire d'avoir
  const [creditNoteForm, setCreditNoteForm] = useState({
    amount: '',
    reason: '',
    notes: '',
  })

  // Calculer remainingAmount (doit être fait avant les hooks useMutation)
  const totalPaid =
    payments
      ?.filter((p: any) => p.status === 'completed')
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0
  const remainingAmount = invoice ? Number(invoice.total_amount) - totalPaid : 0

  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!invoice) throw new Error('Facture non trouvée')

      const amountNumber = parseFloat(paymentForm.amount)

      if (isNaN(amountNumber) || amountNumber <= 0) {
        throw new Error('Montant de paiement invalide')
      }

      // Recalculer remainingAmount dans la fonction pour être sûr
      const currentTotalPaid =
        payments
          ?.filter((p: any) => p.status === 'completed')
          .reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0
      const currentRemainingAmount = Number(invoice.total_amount) - currentTotalPaid

      if (amountNumber > currentRemainingAmount) {
        throw new Error("Le montant du paiement ne peut pas dépasser le reste à payer")
      }

      const isCompleted = paymentForm.payment_method === 'cash'
      const paidAt = isCompleted ? new Date().toISOString() : null
      
      return paymentService.create({
        organization_id: invoice.organization_id,
        invoice_id: invoiceId,
        student_id: invoice.student_id,
        amount: amountNumber,
        currency: paymentForm.currency,
        payment_method: paymentForm.payment_method,
        payment_provider:
          paymentForm.payment_method === 'card' || paymentForm.payment_method === 'sepa'
            ? paymentForm.payment_provider
            : null,
        transaction_id: paymentForm.transaction_id || null,
        status: isCompleted ? 'completed' : 'pending',
        paid_at: paidAt,
        metadata: {
          notes: paymentForm.notes,
        },
      })
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Paiement enregistré',
        description: 'Le paiement a bien été enregistré et les totaux ont été mis à jour.',
      })
      setShowPaymentForm(false)
      setPaymentForm({
        amount: '',
        currency: invoice?.currency || 'EUR',
        payment_method: 'cash',
        payment_provider: 'stripe',
        transaction_id: '',
        notes: '',
      })
      
      refetch()
      refetchPayments()
      
      // Forcer le rafraîchissement immédiat des queries du tableau de bord pour synchroniser les revenus
      queryClient.refetchQueries({ queryKey: ['dashboard-stats', user?.organization_id] })
      queryClient.refetchQueries({ queryKey: ['revenue-evolution', user?.organization_id] })
      queryClient.refetchQueries({ queryKey: ['payment-stats', user?.organization_id] })
      
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['overdue-invoices'] })
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Erreur lors de lenregistrement du paiement',
        description: error?.message || 'Veuillez vérifier les informations saisies.',
      })
    },
  })

  // Mutation pour créer un avoir (doit être avant les returns conditionnels)
  const createCreditNoteMutation = useMutation({
    mutationFn: async () => {
      if (!invoice) throw new Error('Facture non trouvée')

      const amountNumber = parseFloat(creditNoteForm.amount)

      if (isNaN(amountNumber) || amountNumber <= 0) {
        throw new Error('Montant de l\'avoir invalide')
      }

      if (amountNumber > Number(invoice.total_amount)) {
        throw new Error("Le montant de l'avoir ne peut pas dépasser le montant total de la facture")
      }

      // Créer un avoir (pour l'instant, on le stocke comme une facture avec un type spécial)
      // TODO: Créer une table credit_notes dans la base de données
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          organization_id: invoice.organization_id,
          student_id: invoice.student_id,
          invoice_number: `AVOIR-${invoice.invoice_number}`,
          type: 'credit_note',
          document_type: 'invoice',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: new Date().toISOString().split('T')[0],
          amount: -amountNumber, // Montant négatif pour un avoir
          tax_amount: 0,
          total_amount: -amountNumber,
          currency: invoice.currency,
          status: 'sent',
          notes: `Avoir pour la facture ${invoice.invoice_number}. Raison: ${creditNoteForm.reason}. ${creditNoteForm.notes}`,
          metadata: {
            original_invoice_id: invoice.id,
            reason: creditNoteForm.reason,
            notes: creditNoteForm.notes,
          },
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Avoir créé',
        description: 'L\'avoir a été créé avec succès.',
      })
      setShowCreditNoteForm(false)
      setCreditNoteForm({
        amount: '',
        reason: '',
        notes: '',
      })
      refetch()
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Erreur lors de la création de l\'avoir',
        description: error?.message || 'Veuillez vérifier les informations saisies.',
      })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-muted-foreground">Chargement...</div>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-muted-foreground">Facture non trouvée</div>
          <Link href="/dashboard/payments">
            <Button className="mt-4">Retour à la liste</Button>
          </Link>
        </div>
      </div>
    )
  }

  // remainingAmount est déjà calculé avant les returns conditionnels

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-success-bg text-success-primary'
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      case 'partial':
        return 'bg-warning-bg text-warning-primary'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Payée'
      case 'sent':
        return 'Envoyée'
      case 'partial':
        return 'Partielle'
      case 'overdue':
        return 'En retard'
      case 'draft':
        return 'Brouillon'
      default:
        return status
    }
  }

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-success-primary" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'pending':
      case 'processing':
        return <Clock className="h-5 w-5 text-warning-primary" />
      default:
        return null
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Espèces'
      case 'card':
        return 'Carte bancaire'
      case 'bank_transfer':
        return 'Virement bancaire'
      case 'sepa':
        return 'Virement SEPA'
      default:
        return method
    }
  }

  // Fonction pour télécharger la facture
  const handleDownloadInvoice = async () => {
    if (!invoice || !organization || !invoiceTemplate) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Impossible de générer la facture. Données manquantes.',
      })
      return
    }

    setIsDownloadingInvoice(true)

    try {
      // Extraire les variables
      const student = invoice.students as StudentWithRelations | undefined
      const invoiceData = invoice as InvoiceWithRelations

      const variables = extractDocumentVariables({
        student,
        organization: organization as any,
        session: undefined,
        invoice: invoiceData,
        academicYear,
        language: 'fr',
        issueDate: invoice.issue_date ?? undefined,
      })

      // Générer le HTML avec le template
      const result = await generateHTML(
        invoiceTemplate,
        variables,
        undefined,
        user?.organization_id
      )

      // Générer le nom de fichier
      const filename = `facture_${invoice.invoice_number}.pdf`

      // Créer un élément temporaire avec les bonnes dimensions pour la génération PDF
      const tempDiv = document.createElement('div')
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.top = '0'
      tempDiv.style.width = '794px'
      tempDiv.style.minHeight = '1123px'
      tempDiv.style.backgroundColor = '#ffffff'
      tempDiv.style.overflow = 'visible'
      tempDiv.style.fontFamily = 'Arial, sans-serif'
      document.body.appendChild(tempDiv)

      // Extraire le contenu du body
      const parser = new DOMParser()
      const doc = parser.parseFromString(result.html, 'text/html')
      const bodyContent = doc.body.innerHTML
      tempDiv.innerHTML = bodyContent

      // Trouver l'élément principal du document
      let element = tempDiv.querySelector('.document-container') || tempDiv.querySelector('[id$="-document"]') || tempDiv.firstElementChild

      if (!element || !(element instanceof HTMLElement)) {
        element = tempDiv
      }

      const elementId = `temp-pdf-invoice-${Date.now()}`
      if (element instanceof HTMLElement) {
        element.id = elementId
        if (!element.style.width) {
          element.style.width = '794px'
        }
        if (!element.style.minHeight) {
          element.style.minHeight = '1123px'
        }
        element.style.backgroundColor = '#ffffff'
      }

      // Attendre que le DOM soit mis à jour
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Vérifier que l'élément est visible
      if (element instanceof HTMLElement) {
        const rect = element.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) {
          element = tempDiv
          tempDiv.id = elementId
          tempDiv.style.width = '794px'
          tempDiv.style.minHeight = '1123px'
        }
      }

      await generatePDFFromHTML(elementId, filename)

      addToast({
        type: 'success',
        title: 'Facture téléchargée',
        description: 'La facture a été générée et téléchargée avec succès.',
      })
    } catch (error) {
      console.error('Erreur lors de la génération de la facture:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la génération de la facture.',
      })
    } finally {
      setIsDownloadingInvoice(false)
      // Nettoyer l'élément temporaire
      const tempDivs = document.querySelectorAll('[id^="temp-pdf-invoice-"]')
      tempDivs.forEach((div) => {
        if (div.parentNode === document.body) {
          document.body.removeChild(div)
        }
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/payments">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Facture {invoice.invoice_number}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {invoice.students?.first_name} {invoice.students?.last_name}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleDownloadInvoice}
            disabled={isDownloadingInvoice || !invoiceTemplate}
          >
            <Download className="mr-2 h-4 w-4" />
            {isDownloadingInvoice ? 'Génération...' : 'Télécharger la facture'}
          </Button>
          {remainingAmount > 0 && (
            <>
              <Button onClick={() => setShowPaymentForm(!showPaymentForm)}>
                <Plus className="mr-2 h-4 w-4" />
                Enregistrer un paiement
              </Button>
              <Button variant="outline" onClick={() => setShowStripeForm(!showStripeForm)}>
                <CreditCard className="mr-2 h-4 w-4" />
                Payer par carte
              </Button>
              <Button variant="outline" onClick={() => setShowSEPAForm(!showSEPAForm)}>
                <Building2 className="mr-2 h-4 w-4" />
                Virement SEPA
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => setShowCreditNoteForm(!showCreditNoteForm)}>
            <Receipt className="mr-2 h-4 w-4" />
            Créer un avoir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations principales */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Détails de la facture</CardTitle>
                <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(invoice.status)}`}>
                  {getStatusLabel(invoice.status)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground flex items-center mb-2">
                    <FileText className="mr-2 h-4 w-4" />
                    Numéro
                  </p>
                  <p className="font-medium">{invoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center mb-2">
                    <Calendar className="mr-2 h-4 w-4" />
                    Type
                  </p>
                  <p className="font-medium capitalize">{invoice.type}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Date d'émission</p>
                  <p className="font-medium">{formatDate(invoice.issue_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date d'échéance</p>
                  <p className={`font-medium ${invoice.due_date < new Date().toISOString().split('T')[0] && invoice.status !== 'paid' ? 'text-red-600' : ''}`}>
                    {formatDate(invoice.due_date)}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Montant HT:</span>
                  <span className="font-medium">{formatCurrency(Number(invoice.amount), invoice.currency)}</span>
                </div>
                {Number(invoice.tax_amount) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TVA:</span>
                    <span className="font-medium">{formatCurrency(Number(invoice.tax_amount), invoice.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Total TTC:</span>
                  <span className="font-bold text-lg">{formatCurrency(Number(invoice.total_amount), invoice.currency)}</span>
                </div>
                {totalPaid > 0 && (
                  <>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-muted-foreground">Total payé:</span>
                      <span className="font-medium text-success-primary">{formatCurrency(totalPaid, invoice.currency)}</span>
                    </div>
                    {remainingAmount > 0 && (
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-semibold">Reste à payer:</span>
                        <span className="font-bold text-lg text-red-600">
                          {formatCurrency(remainingAmount, invoice.currency)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {invoice.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Notes</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historique des paiements */}
          <Card>
            <CardHeader>
              <CardTitle>Historique des paiements</CardTitle>
            </CardHeader>
            <CardContent>
              {payments && payments.length > 0 ? (
                <div className="space-y-4">
                  {payments.map((payment: any) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        {getPaymentStatusIcon(payment.status)}
                        <div>
                          <p className="font-semibold">
                            {formatCurrency(Number(payment.amount), payment.currency)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {getPaymentMethodLabel(payment.payment_method)}
                            {payment.payment_provider && ` - ${payment.payment_provider.toUpperCase()}`}
                          </p>
                          {payment.transaction_id && (
                            <p className="text-xs text-muted-foreground">
                              Transaction: {payment.transaction_id}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {payment.paid_at
                            ? formatDateTime(payment.paid_at)
                            : formatDateTime(payment.created_at)}
                        </p>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs mt-1 ${
                            payment.status === 'completed'
                              ? 'bg-success-bg text-success-primary'
                              : payment.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-warning-bg text-warning-primary'
                          }`}
                        >
                          {payment.status === 'completed'
                            ? 'Complété'
                            : payment.status === 'failed'
                            ? 'Échoué'
                            : payment.status === 'pending'
                            ? 'En attente'
                            : payment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun paiement enregistré
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Formulaire de paiement */}
        {showPaymentForm && remainingAmount > 0 && (
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Enregistrer un paiement</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    recordPaymentMutation.mutate()
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium mb-2">Montant *</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0.01"
                      max={remainingAmount}
                      value={paymentForm.amount}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, amount: e.target.value })
                      }
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                      placeholder={remainingAmount.toString()}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Reste à payer: {formatCurrency(remainingAmount, invoice.currency)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Méthode de paiement *</label>
                    <select
                      required
                      value={paymentForm.payment_method || ''}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          payment_method: e.target.value as 'cash' | 'card' | 'bank_transfer' | 'sepa',
                        })
                      }
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                    >
                      <option value="cash">Espèces</option>
                      <option value="card">Carte bancaire (Stripe)</option>
                      <option value="sepa">Virement SEPA</option>
                      <option value="bank_transfer">Virement bancaire</option>
                    </select>
                  </div>

                  {paymentForm.payment_method === 'card' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Fournisseur *</label>
                      <select
                        required
                        value={paymentForm.payment_provider || ''}
                        onChange={(e) =>
                          setPaymentForm({
                            ...paymentForm,
                            payment_provider: (e.target.value || 'stripe') as 'sepa' | 'stripe',
                          })
                        }
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                      >
                        <option value="stripe">Stripe</option>
                      </select>
                    </div>
                  )}
                  
                  {paymentForm.payment_method === 'sepa' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Fournisseur *</label>
                      <select
                        required
                        value={paymentForm.payment_provider || ''}
                        onChange={(e) =>
                          setPaymentForm({
                            ...paymentForm,
                            payment_provider: (e.target.value || 'stripe') as 'sepa' | 'stripe',
                          })
                        }
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                      >
                        <option value="sepa">SEPA</option>
                      </select>
                    </div>
                  )}

                  {paymentForm.payment_method !== 'cash' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">ID de transaction</label>
                      <input
                        type="text"
                        value={paymentForm.transaction_id}
                        onChange={(e) =>
                          setPaymentForm({ ...paymentForm, transaction_id: e.target.value })
                        }
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                        placeholder="ID de la transaction"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2">Notes</label>
                    <textarea
                      value={paymentForm.notes}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, notes: e.target.value })
                      }
                      rows={2}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Notes supplémentaires..."
                    />
                  </div>

                  {recordPaymentMutation.error && (
                    <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                      {recordPaymentMutation.error instanceof Error
                        ? recordPaymentMutation.error.message
                        : 'Une erreur est survenue'}
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowPaymentForm(false)}
                    >
                      Annuler
                    </Button>
                    <Button type="submit" className="flex-1" disabled={recordPaymentMutation.isPending}>
                      {recordPaymentMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Formulaire d'avoir */}
        {showCreditNoteForm && (
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Créer un avoir</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    createCreditNoteMutation.mutate()
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium mb-2">Montant de l'avoir *</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0.01"
                      max={Number(invoice.total_amount)}
                      value={creditNoteForm.amount}
                      onChange={(e) =>
                        setCreditNoteForm({ ...creditNoteForm, amount: e.target.value })
                      }
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Montant total de la facture: {formatCurrency(Number(invoice.total_amount), invoice.currency)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Raison de l'avoir *</label>
                    <select
                      required
                      value={creditNoteForm.reason}
                      onChange={(e) =>
                        setCreditNoteForm({ ...creditNoteForm, reason: e.target.value })
                      }
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                    >
                      <option value="">Sélectionner une raison</option>
                      <option value="retour_produit">Retour de produit/service</option>
                      <option value="erreur_facturation">Erreur de facturation</option>
                      <option value="remise_commerciale">Remise commerciale</option>
                      <option value="annulation">Annulation de commande</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Notes</label>
                    <textarea
                      value={creditNoteForm.notes}
                      onChange={(e) =>
                        setCreditNoteForm({ ...creditNoteForm, notes: e.target.value })
                      }
                      rows={3}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Notes supplémentaires sur l'avoir..."
                    />
                  </div>

                  {createCreditNoteMutation.error && (
                    <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                      {createCreditNoteMutation.error instanceof Error
                        ? createCreditNoteMutation.error.message
                        : 'Une erreur est survenue'}
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowCreditNoteForm(false)
                        setCreditNoteForm({
                          amount: '',
                          reason: '',
                          notes: '',
                        })
                      }}
                    >
                      Annuler
                    </Button>
                    <Button type="submit" className="flex-1" disabled={createCreditNoteMutation.isPending}>
                      {createCreditNoteMutation.isPending ? 'Création...' : 'Créer l\'avoir'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

