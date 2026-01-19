'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { invoiceService } from '@/lib/services/invoice.service.client'
import { paymentService } from '@/lib/services/payment.service.client'
import { documentTemplateService } from '@/lib/services/document-template.service.client'
import { sessionChargesService, type SessionChargeWithCategory } from '@/lib/services/session-charges.service'
import { generateHTML } from '@/lib/utils/document-generation/html-generator'
import { extractDocumentVariables } from '@/lib/utils/document-generation/variable-extractor'
import { generatePDFFromHTML } from '@/lib/utils/pdf-generator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import Link from 'next/link'
import { 
  Download, FileText, Plus, Receipt, DollarSign, 
  FileCheck, FileX, Eye, CreditCard, ChevronDown, ChevronUp,
  Trash2, Edit, TrendingDown
} from 'lucide-react'
import type { EnrollmentWithRelations, StudentWithRelations, InvoiceWithRelations } from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'
import type { SessionWithRelations } from '@/lib/types/query-types'

type Payment = TableRow<'payments'>

interface GestionFinancesProps {
  enrollments?: EnrollmentWithRelations[]
  payments?: Payment[]
  sessionId?: string
  sessionData?: SessionWithRelations
  organization?: TableRow<'organizations'>
}

export function GestionFinances({
  enrollments = [],
  payments = [],
  sessionId,
  sessionData,
  organization,
}: GestionFinancesProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [showQuoteForm, setShowQuoteForm] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState<string | null>(null)
  const [showCharges, setShowCharges] = useState(false)
  const [showChargeForm, setShowChargeForm] = useState(false)
  const [editingCharge, setEditingCharge] = useState<SessionChargeWithCategory | null>(null)

  // Récupérer les factures et devis pour tous les étudiants de la session
  const studentIds = enrollments.map((e) => e.student_id).filter(Boolean)
  const { data: invoices } = useQuery({
    queryKey: ['session-invoices', sessionId, studentIds],
    queryFn: async () => {
      if (!user?.organization_id || studentIds.length === 0) return []
      const allInvoices: any[] = []
      for (const studentId of studentIds) {
        if (!studentId) continue
        const studentInvoices = await invoiceService.getAll(user.organization_id, {
          studentId,
        })
        allInvoices.push(...studentInvoices)
      }
      return allInvoices
    },
    enabled: !!user?.organization_id && studentIds.length > 0,
  })

  // Récupérer l'organisation
  const { data: organizationData } = useQuery({
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

  const org = organization || organizationData

  // Récupérer l'année académique
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

  // Récupérer les templates
  const { data: invoiceTemplate } = useQuery({
    queryKey: ['invoice-template', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const templates = await documentTemplateService.getTemplatesByType('facture', user.organization_id)
      return templates.length > 0 ? templates[0] : null
    },
    enabled: !!user?.organization_id,
  })

  const { data: quoteTemplate } = useQuery({
    queryKey: ['quote-template', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const templates = await documentTemplateService.getTemplatesByType('devis', user.organization_id)
      return templates.length > 0 ? templates[0] : null
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les charges de la session
  const { data: charges, refetch: refetchCharges } = useQuery({
    queryKey: ['session-charges', sessionId],
    queryFn: async () => {
      if (!sessionId) return []
      return sessionChargesService.getBySession(sessionId)
    },
    enabled: !!sessionId,
  })

  // Récupérer le résumé des charges
  const { data: chargesSummary } = useQuery({
    queryKey: ['session-charges-summary', sessionId],
    queryFn: async () => {
      if (!sessionId) return null
      return sessionChargesService.getSessionSummary(sessionId)
    },
    enabled: !!sessionId,
  })

  // Récupérer les catégories de charges
  const { data: chargeCategories } = useQuery({
    queryKey: ['charge-categories', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      // Initialiser les catégories par défaut si nécessaire
      const categories = await sessionChargesService.getCategories(user.organization_id)
      if (categories.length === 0) {
        await sessionChargesService.initDefaultCategories(user.organization_id)
        return sessionChargesService.getCategories(user.organization_id)
      }
      return categories
    },
    enabled: !!user?.organization_id,
  })

  // Formulaire de charge
  const [chargeForm, setChargeForm] = useState({
    description: '',
    amount: '',
    currency: 'EUR',
    charge_date: new Date().toISOString().split('T')[0],
    category_id: '',
    payment_method: '',
    payment_status: 'pending' as 'pending' | 'paid' | 'cancelled',
    vendor: '',
    vendor_invoice_number: '',
    vendor_invoice_date: '',
    notes: '',
  })

  // Formulaire de paiement
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    currency: 'EUR',
    payment_method: 'cash' as 'cash' | 'card' | 'bank_transfer' | 'sepa',
    transaction_id: '',
    notes: '',
  })

  // Formulaire de facture/devis
  const [invoiceForm, setInvoiceForm] = useState({
    amount: '',
    tax_amount: '0',
    currency: 'EUR',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
  })
  // Fonction pour télécharger une facture ou un devis
  const handleDownloadDocument = async (invoice: any, type: 'invoice' | 'quote') => {
    if (!org || !invoice) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Données manquantes pour la génération du document.',
      })
      return
    }

    const template = type === 'invoice' ? invoiceTemplate : quoteTemplate
    if (!template) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: `Aucun modèle de ${type === 'invoice' ? 'facture' : 'devis'} trouvé.`,
      })
      return
    }

    setIsDownloading(invoice.id)

    try {
      const student = invoice.students as StudentWithRelations | undefined
      const invoiceData = invoice as InvoiceWithRelations

      const variables = extractDocumentVariables({
        student,
        organization: org as any,
        session: sessionData,
        invoice: invoiceData,
        academicYear,
        language: 'fr',
        issueDate: invoice.issue_date,
      })

      const result = await generateHTML(template, variables, undefined, user?.organization_id || undefined)
      const filename = `${type === 'invoice' ? 'facture' : 'devis'}_${invoice.invoice_number}.pdf`

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

      const parser = new DOMParser()
      const doc = parser.parseFromString(result.html, 'text/html')
      const bodyContent = doc.body.innerHTML
      tempDiv.innerHTML = bodyContent

      let element = tempDiv.querySelector('.document-container') || tempDiv.querySelector('[id$="-document"]') || tempDiv.firstElementChild
      if (!element || !(element instanceof HTMLElement)) {
        element = tempDiv
      }

      const elementId = `temp-pdf-${type}-${invoice.id}-${Date.now()}`
      if (element instanceof HTMLElement) {
        element.id = elementId
        if (!element.style.width) element.style.width = '794px'
        if (!element.style.minHeight) element.style.minHeight = '1123px'
        element.style.backgroundColor = '#ffffff'
      }

      await new Promise((resolve) => setTimeout(resolve, 1000))

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
        title: 'Document téléchargé',
        description: `Le ${type === 'invoice' ? 'facture' : 'devis'} a été généré et téléchargé avec succès.`,
      })
    } catch (error) {
      console.error('Erreur lors de la génération du document:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la génération du document.',
      })
    } finally {
      setIsDownloading(null)
      const tempDivs = document.querySelectorAll(`[id^="temp-pdf-${type}-"]`)
      tempDivs.forEach((div) => {
        if (div.parentNode === document.body) {
          document.body.removeChild(div)
        }
      })
    }
  }

  // Mutation pour créer une facture
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!user?.organization_id) throw new Error('Données manquantes')
      if (!selectedEnrollmentId) {
        throw new Error('Veuillez sélectionner un étudiant depuis la liste ci-dessus.')
      }
      const enrollment = enrollments.find((e) => e.id === selectedEnrollmentId)
      if (!enrollment || !enrollment.students) throw new Error('Inscription non trouvée')

      const amount = parseFloat(invoiceForm.amount) || 0
      const taxAmount = parseFloat(invoiceForm.tax_amount) || 0
      const totalAmount = amount + taxAmount

      return invoiceService.create({
        organization_id: user.organization_id,
        student_id: enrollment.student_id,
        invoice_number: '',
        type: 'tuition',
        document_type: 'invoice',
        issue_date: invoiceForm.issue_date,
        due_date: invoiceForm.due_date,
        amount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        currency: invoiceForm.currency,
        status: 'sent',
        notes: invoiceForm.notes,
      })
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Facture créée',
        description: 'La facture a été créée avec succès.',
      })
      setShowInvoiceForm(false)
      setInvoiceForm({
        amount: '',
        tax_amount: '0',
        currency: 'EUR',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
      })
      queryClient.invalidateQueries({ queryKey: ['session-invoices', sessionId] })
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error?.message || 'Erreur lors de la création de la facture.',
      })
    },
  })

  // Mutation pour créer un devis
  const createQuoteMutation = useMutation({
    mutationFn: async () => {
      if (!user?.organization_id) throw new Error('Données manquantes')
      if (!selectedEnrollmentId) {
        throw new Error('Veuillez sélectionner un étudiant depuis la liste ci-dessus.')
      }
      const enrollment = enrollments.find((e) => e.id === selectedEnrollmentId)
      if (!enrollment || !enrollment.students) throw new Error('Inscription non trouvée')

      const amount = parseFloat(invoiceForm.amount) || 0
      const taxAmount = parseFloat(invoiceForm.tax_amount) || 0
      const totalAmount = amount + taxAmount

      return invoiceService.create({
        organization_id: user.organization_id,
        student_id: enrollment.student_id,
        invoice_number: '',
        type: 'tuition',
        document_type: 'quote',
        issue_date: invoiceForm.issue_date,
        due_date: invoiceForm.due_date,
        amount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        currency: invoiceForm.currency,
        status: 'draft',
        notes: invoiceForm.notes,
      })
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Devis créé',
        description: 'Le devis a été créé avec succès.',
      })
      setShowQuoteForm(false)
      setInvoiceForm({
        amount: '',
        tax_amount: '0',
        currency: 'EUR',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
      })
      queryClient.invalidateQueries({ queryKey: ['session-invoices', sessionId] })
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error?.message || 'Erreur lors de la création du devis.',
      })
    },
  })

  // Mutation pour enregistrer un paiement
  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEnrollmentId || !user?.organization_id) throw new Error('Données manquantes')
      const enrollment = enrollments.find((e) => e.id === selectedEnrollmentId)
      if (!enrollment || !enrollment.students) throw new Error('Inscription non trouvée')

      const amountNumber = parseFloat(paymentForm.amount)
      if (isNaN(amountNumber) || amountNumber <= 0) {
        throw new Error('Montant de paiement invalide')
      }

      // Trouver la facture associée si possible
      const relatedInvoice = invoices?.find(
        (inv: any) => inv.student_id === enrollment.student_id && inv.document_type === 'invoice'
      )

      return paymentService.create({
        organization_id: user.organization_id,
        invoice_id: relatedInvoice?.id || null,
        student_id: enrollment.student_id,
        amount: amountNumber,
        currency: paymentForm.currency,
        payment_method: paymentForm.payment_method,
        payment_provider: paymentForm.payment_method === 'card' || paymentForm.payment_method === 'sepa' ? 'stripe' : null,
        transaction_id: paymentForm.transaction_id || null,
        status: paymentForm.payment_method === 'cash' ? 'completed' : 'pending',
        paid_at: paymentForm.payment_method === 'cash' ? new Date().toISOString() : null,
        metadata: {
          notes: paymentForm.notes,
        },
      })
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Paiement enregistré',
        description: 'Le paiement a été enregistré avec succès.',
      })
      setShowPaymentForm(false)
      setPaymentForm({
        amount: '',
        currency: 'EUR',
        payment_method: 'cash',
        transaction_id: '',
        notes: '',
      })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error?.message || 'Erreur lors de l\'enregistrement du paiement.',
      })
    },
  })

  const totalRevenue = enrollments.reduce((sum, e) => sum + Number(e.total_amount || 0), 0)
  const totalPaid = enrollments.reduce((sum, e) => sum + Number(e.paid_amount || 0), 0)
  const totalRemaining = enrollments.reduce((sum, e) => {
    const total = Number(e.total_amount || 0)
    const paid = Number(e.paid_amount || 0)
    return sum + (total - paid)
  }, 0)
  const paymentsViaPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const enrollmentsWithBalance = enrollments.filter((e) => {
    const total = Number(e.total_amount || 0)
    const paid = Number(e.paid_amount || 0)
    return total - paid > 0
  })

  // Obtenir les factures et devis pour un étudiant
  const getInvoicesForStudent = (studentId: string) => {
    return invoices?.filter((inv: any) => inv.student_id === studentId) || []
  }

  // Mutation pour créer une charge
  const createChargeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.organization_id || !sessionId) throw new Error('Données manquantes')
      if (!chargeForm.description || !chargeForm.amount) {
        throw new Error('La description et le montant sont requis')
      }

      return sessionChargesService.create(
        user.organization_id,
        sessionId,
        {
          description: chargeForm.description,
          amount: parseFloat(chargeForm.amount),
          currency: chargeForm.currency,
          charge_date: chargeForm.charge_date,
          category_id: chargeForm.category_id || null,
          payment_method: chargeForm.payment_method || null,
          payment_status: chargeForm.payment_status,
          paid_at: chargeForm.payment_status === 'paid' ? new Date().toISOString() : null,
          vendor: chargeForm.vendor || null,
          vendor_invoice_number: chargeForm.vendor_invoice_number || null,
          vendor_invoice_date: chargeForm.vendor_invoice_date || null,
          notes: chargeForm.notes || null,
        }
      )
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Charge créée',
        description: 'La charge a été créée avec succès.',
      })
      setShowChargeForm(false)
      setChargeForm({
        description: '',
        amount: '',
        currency: 'EUR',
        charge_date: new Date().toISOString().split('T')[0],
        category_id: '',
        payment_method: '',
        payment_status: 'pending',
        vendor: '',
        vendor_invoice_number: '',
        vendor_invoice_date: '',
        notes: '',
      })
      refetchCharges()
      queryClient.invalidateQueries({ queryKey: ['session-charges-summary', sessionId] })
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error?.message || 'Erreur lors de la création de la charge.',
      })
    },
  })

  // Mutation pour mettre à jour une charge
  const updateChargeMutation = useMutation({
    mutationFn: async () => {
      if (!editingCharge) throw new Error('Aucune charge sélectionnée')
      if (!chargeForm.description || !chargeForm.amount) {
        throw new Error('La description et le montant sont requis')
      }

      return sessionChargesService.update(editingCharge.id, {
        description: chargeForm.description,
        amount: parseFloat(chargeForm.amount),
        currency: chargeForm.currency,
        charge_date: chargeForm.charge_date,
        category_id: chargeForm.category_id || null,
        payment_method: chargeForm.payment_method || null,
        payment_status: chargeForm.payment_status,
        paid_at: chargeForm.payment_status === 'paid' ? (editingCharge.paid_at || new Date().toISOString()) : null,
        vendor: chargeForm.vendor || null,
        vendor_invoice_number: chargeForm.vendor_invoice_number || null,
        vendor_invoice_date: chargeForm.vendor_invoice_date || null,
        notes: chargeForm.notes || null,
      })
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Charge mise à jour',
        description: 'La charge a été mise à jour avec succès.',
      })
      setShowChargeForm(false)
      setEditingCharge(null)
      setChargeForm({
        description: '',
        amount: '',
        currency: 'EUR',
        charge_date: new Date().toISOString().split('T')[0],
        category_id: '',
        payment_method: '',
        payment_status: 'pending',
        vendor: '',
        vendor_invoice_number: '',
        vendor_invoice_date: '',
        notes: '',
      })
      refetchCharges()
      queryClient.invalidateQueries({ queryKey: ['session-charges-summary', sessionId] })
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error?.message || 'Erreur lors de la mise à jour de la charge.',
      })
    },
  })

  // Mutation pour supprimer une charge
  const deleteChargeMutation = useMutation({
    mutationFn: async (chargeId: string) => {
      await sessionChargesService.delete(chargeId)
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Charge supprimée',
        description: 'La charge a été supprimée avec succès.',
      })
      refetchCharges()
      queryClient.invalidateQueries({ queryKey: ['session-charges-summary', sessionId] })
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error?.message || 'Erreur lors de la suppression de la charge.',
      })
    },
  })

  const handleEditCharge = (charge: SessionChargeWithCategory) => {
    setEditingCharge(charge)
    setChargeForm({
      description: charge.description,
      amount: String(charge.amount),
      currency: charge.currency,
      charge_date: charge.charge_date,
      category_id: charge.category_id || '',
      payment_method: charge.payment_method || '',
      payment_status: charge.payment_status as 'pending' | 'paid' | 'cancelled',
      vendor: charge.vendor || '',
      vendor_invoice_number: charge.vendor_invoice_number || '',
      vendor_invoice_date: charge.vendor_invoice_date || '',
      notes: charge.notes || '',
    })
    setShowChargeForm(true)
  }

  const handleNewCharge = () => {
    setEditingCharge(null)
    setChargeForm({
      description: '',
      amount: '',
      currency: 'EUR',
      charge_date: new Date().toISOString().split('T')[0],
      category_id: '',
      payment_method: '',
      payment_status: 'pending',
      vendor: '',
      vendor_invoice_number: '',
      vendor_invoice_date: '',
      notes: '',
    })
    setShowChargeForm(true)
  }

  return (
    <div className="space-y-6">
      {/* Statistiques financières */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Revenu total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-brand-blue">
              {formatCurrency(totalRevenue, 'EUR')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {enrollments.length} inscription{enrollments.length > 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Montant payé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalPaid, 'EUR')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(paymentsViaPayments, 'EUR')} via paiements
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Reste à payer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(totalRemaining, 'EUR')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {enrollmentsWithBalance.length} inscription{enrollmentsWithBalance.length > 1 ? 's' : ''} avec solde
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Charges totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(chargesSummary?.total_amount || 0, 'EUR')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {chargesSummary?.charge_count || 0} charge{(chargesSummary?.charge_count || 0) > 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Section Charges */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Charges de la session</CardTitle>
              {chargesSummary && chargesSummary.charge_count > 0 && (
                <span className="text-sm text-muted-foreground">
                  ({formatCurrency(chargesSummary.total_amount, 'EUR')})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewCharge}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle charge
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCharges(!showCharges)}
              >
                {showCharges ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showCharges && (
          <CardContent>
            {charges && charges.length > 0 ? (
              <div className="space-y-3">
                {charges.map((charge) => (
                  <div key={charge.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{charge.description}</h4>
                          {charge.charge_categories && (
                            <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                              {charge.charge_categories.name}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Montant:</span>{' '}
                            <span className="text-red-600 font-bold">
                              {formatCurrency(Number(charge.amount), charge.currency)}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Date:</span>{' '}
                            {new Date(charge.charge_date).toLocaleDateString('fr-FR')}
                          </div>
                          {charge.vendor && (
                            <div>
                              <span className="font-medium">Fournisseur:</span> {charge.vendor}
                            </div>
                          )}
                          <div>
                            <span className={`px-2 py-1 rounded text-xs ${
                              charge.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                              charge.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {charge.payment_status === 'paid' ? 'Payé' :
                               charge.payment_status === 'pending' ? 'En attente' : 'Annulé'}
                            </span>
                          </div>
                        </div>
                        {charge.notes && (
                          <p className="text-sm text-muted-foreground mt-2">{charge.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditCharge(charge)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Êtes-vous sûr de vouloir supprimer cette charge ?')) {
                              deleteChargeMutation.mutate(charge.id)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {chargesSummary && (
                  <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-lg font-bold text-red-600">
                        {formatCurrency(chargesSummary.total_amount, 'EUR')}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Payé</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(chargesSummary.paid_amount, 'EUR')}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">En attente</p>
                      <p className="text-lg font-bold text-yellow-600">
                        {formatCurrency(chargesSummary.pending_amount, 'EUR')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune charge enregistrée pour cette session.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={handleNewCharge}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une charge
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Répartition par statut de paiement */}
      <Card>
        <CardHeader>
          <CardTitle>Répartition par statut de paiement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {enrollments.filter((e) => e.payment_status === 'pending').length}
              </p>
              <p className="text-sm text-muted-foreground mt-1">En attente</p>
            </div>
            <div className="text-center p-4 bg-brand-cyan-ghost rounded-lg">
              <p className="text-2xl font-bold text-brand-cyan">
                {enrollments.filter((e) => e.payment_status === 'partial').length}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Partiel</p>
            </div>
            <div className="text-center p-4 bg-brand-blue-ghost rounded-lg">
              <p className="text-2xl font-bold text-brand-blue">
                {enrollments.filter((e) => e.payment_status === 'paid').length}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Payé</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                {enrollments.filter((e) => e.payment_status === 'overdue').length}
              </p>
              <p className="text-sm text-muted-foreground mt-1">En retard</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des inscriptions avec détails financiers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Détails des inscriptions</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedEnrollmentId(null)
                  setShowQuoteForm(true)
                  setShowInvoiceForm(false)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouveau devis
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedEnrollmentId(null)
                  setShowInvoiceForm(true)
                  setShowQuoteForm(false)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle facture
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {enrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucune inscription pour le moment
              </p>
            ) : (
              enrollments.map((enrollment) => {
                const student = enrollment.students
                if (!student) return null

                const total = Number(enrollment.total_amount || 0)
                const paid = Number(enrollment.paid_amount || 0)
                const remaining = total - paid
                const studentInvoices = enrollment.student_id ? getInvoicesForStudent(enrollment.student_id) : []
                const studentInvoicesList = studentInvoices.filter((inv: any) => inv.document_type === 'invoice')
                const studentQuotesList = studentInvoices.filter((inv: any) => inv.document_type === 'quote')

                return (
                  <div key={enrollment.id} className="border rounded-lg p-4 hover:bg-gray-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{student.first_name} {student.last_name}</p>
                        <p className="text-sm text-muted-foreground">{student.student_number}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm">
                          Total: <span className="font-medium">{formatCurrency(total, 'EUR')}</span>
                        </p>
                        <p className="text-sm">
                          Payé: <span className="font-medium text-blue-600">{formatCurrency(paid, 'EUR')}</span>
                        </p>
                        {remaining > 0 && (
                          <p className="text-sm">
                            Reste: <span className="font-medium text-orange-600">{formatCurrency(remaining, 'EUR')}</span>
                          </p>
                        )}
                        <span className={`text-xs px-2 py-1 rounded inline-block mt-2 ${
                          enrollment.payment_status === 'paid' ? 'bg-brand-blue-ghost text-brand-blue' :
                          enrollment.payment_status === 'partial' ? 'bg-brand-cyan-ghost text-brand-cyan' :
                          enrollment.payment_status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {enrollment.payment_status === 'paid' ? 'Payé' :
                           enrollment.payment_status === 'partial' ? 'Partiel' :
                           enrollment.payment_status === 'overdue' ? 'En retard' : 'En attente'}
                        </span>
                      </div>
                    </div>

                    {/* Actions rapides */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedEnrollmentId(enrollment.id)
                          setInvoiceForm({
                            ...invoiceForm,
                            amount: enrollment.total_amount ? String(enrollment.total_amount) : '',
                          })
                          setShowQuoteForm(true)
                          setShowInvoiceForm(false)
                        }}
                      >
                        <FileText className="mr-2 h-3 w-3" />
                        Créer devis
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedEnrollmentId(enrollment.id)
                          setInvoiceForm({
                            ...invoiceForm,
                            amount: enrollment.total_amount ? String(enrollment.total_amount) : '',
                          })
                          setShowInvoiceForm(true)
                          setShowQuoteForm(false)
                        }}
                      >
                        <Receipt className="mr-2 h-3 w-3" />
                        Créer facture
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedEnrollmentId(enrollment.id)
                          setShowPaymentForm(true)
                        }}
                      >
                        <DollarSign className="mr-2 h-3 w-3" />
                        Saisir paiement
                      </Button>
                    </div>

                    {/* Liste des factures et devis */}
                    {(studentInvoicesList.length > 0 || studentQuotesList.length > 0) && (
                      <div className="pt-2 border-t space-y-2">
                        {studentQuotesList.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Devis :</p>
                            <div className="flex flex-wrap gap-2">
                              {studentQuotesList.map((quote: any) => (
                                <div key={quote.id} className="flex items-center gap-2 text-xs">
                                  <span className="text-muted-foreground">{quote.invoice_number}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2"
                                    onClick={() => handleDownloadDocument(quote, 'quote')}
                                    disabled={isDownloading === quote.id}
                                  >
                                    {isDownloading === quote.id ? (
                                      '...'
                                    ) : (
                                      <Download className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {studentInvoicesList.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Factures :</p>
                            <div className="flex flex-wrap gap-2">
                              {studentInvoicesList.map((invoice: any) => (
                                <div key={invoice.id} className="flex items-center gap-2 text-xs">
                                  <span className="text-muted-foreground">{invoice.invoice_number}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2"
                                    onClick={() => handleDownloadDocument(invoice, 'invoice')}
                                    disabled={isDownloading === invoice.id}
                                  >
                                    {isDownloading === invoice.id ? (
                                      '...'
                                    ) : (
                                      <Download className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Link href={`/dashboard/payments/${invoice.id}`}>
                                    <Button variant="ghost" size="sm" className="h-6 px-2">
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                  </Link>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Paiements récents */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Paiements récents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payments.slice(0, 10).map((payment) => {
                const student = (payment as any).students
                return (
                  <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <p className="font-medium">
                        {student ? `${student.first_name} ${student.last_name}` : 'Apprenant'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {payment.paid_at && new Date(payment.paid_at).toLocaleDateString('fr-FR')}
                        {payment.payment_method && ` • ${payment.payment_method}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-brand-blue">
                        {formatCurrency(Number(payment.amount || 0), payment.currency || 'EUR')}
                      </p>
                      <p className={`text-xs px-2 py-1 rounded inline-block mt-1 ${
                        payment.status === 'completed' ? 'bg-brand-blue-ghost text-brand-blue' :
                        payment.status === 'pending' ? 'bg-brand-cyan-ghost text-brand-cyan' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {payment.status === 'completed' ? 'Complété' :
                         payment.status === 'pending' ? 'En attente' : 'Échoué'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulaire de paiement */}
      {showPaymentForm && selectedEnrollmentId && (
        <Card>
          <CardHeader>
            <CardTitle>Enregistrer un paiement</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createPaymentMutation.mutate()
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
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Méthode de paiement *</label>
                <select
                  required
                  value={paymentForm.payment_method}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      payment_method: e.target.value as 'cash' | 'card' | 'bank_transfer' | 'sepa',
                    })
                  }
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="cash">Espèces</option>
                  <option value="card">Carte bancaire</option>
                  <option value="bank_transfer">Virement bancaire</option>
                  <option value="sepa">Virement SEPA</option>
                </select>
              </div>

              {paymentForm.payment_method !== 'cash' && (
                <div>
                  <label className="block text-sm font-medium mb-2">ID de transaction</label>
                  <input
                    type="text"
                    value={paymentForm.transaction_id}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, transaction_id: e.target.value })
                    }
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="ID de la transaction"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Notes supplémentaires..."
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowPaymentForm(false)
                    setSelectedEnrollmentId(null)
                  }}
                >
                  Annuler
                </Button>
                <Button type="submit" className="flex-1" disabled={createPaymentMutation.isPending}>
                  {createPaymentMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Formulaire de facture */}
      {showInvoiceForm && (
        <Card>
          <CardHeader>
            <CardTitle>Créer une facture</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedEnrollmentId && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Veuillez sélectionner un étudiant depuis la liste ci-dessus avant de créer la facture.
                </p>
              </div>
            )}
            {selectedEnrollmentId && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Étudiant sélectionné : {enrollments.find((e) => e.id === selectedEnrollmentId)?.students?.first_name} {enrollments.find((e) => e.id === selectedEnrollmentId)?.students?.last_name}
                </p>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createInvoiceMutation.mutate()
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-2">Montant HT *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  value={invoiceForm.amount}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">TVA</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={invoiceForm.tax_amount}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, tax_amount: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Date d'émission *</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.issue_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, issue_date: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date d'échéance *</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.due_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Notes supplémentaires..."
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowInvoiceForm(false)
                    setSelectedEnrollmentId(null)
                  }}
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={createInvoiceMutation.isPending || !selectedEnrollmentId}
                >
                  {createInvoiceMutation.isPending ? 'Création...' : 'Créer la facture'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Formulaire de devis */}
      {showQuoteForm && (
        <Card>
          <CardHeader>
            <CardTitle>Créer un devis</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedEnrollmentId && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Veuillez sélectionner un étudiant depuis la liste ci-dessus avant de créer le devis.
                </p>
              </div>
            )}
            {selectedEnrollmentId && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Étudiant sélectionné : {enrollments.find((e) => e.id === selectedEnrollmentId)?.students?.first_name} {enrollments.find((e) => e.id === selectedEnrollmentId)?.students?.last_name}
                </p>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createQuoteMutation.mutate()
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-2">Montant HT *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  value={invoiceForm.amount}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">TVA</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={invoiceForm.tax_amount}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, tax_amount: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Date d'émission *</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.issue_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, issue_date: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date d'échéance *</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.due_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Notes supplémentaires..."
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowQuoteForm(false)
                    setSelectedEnrollmentId(null)
                  }}
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={createQuoteMutation.isPending || !selectedEnrollmentId}
                >
                  {createQuoteMutation.isPending ? 'Création...' : 'Créer le devis'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Formulaire de charge */}
      {showChargeForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingCharge ? 'Modifier la charge' : 'Nouvelle charge'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (editingCharge) {
                  updateChargeMutation.mutate()
                } else {
                  createChargeMutation.mutate()
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-2">Description *</label>
                <input
                  type="text"
                  required
                  value={chargeForm.description}
                  onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ex: Location de salle pour la formation"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Montant *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0.01"
                    value={chargeForm.amount}
                    onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Devise</label>
                  <select
                    value={chargeForm.currency}
                    onChange={(e) => setChargeForm({ ...chargeForm, currency: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="XOF">XOF</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Date *</label>
                  <input
                    type="date"
                    required
                    value={chargeForm.charge_date}
                    onChange={(e) => setChargeForm({ ...chargeForm, charge_date: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Catégorie</label>
                  <select
                    value={chargeForm.category_id}
                    onChange={(e) => setChargeForm({ ...chargeForm, category_id: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {chargeCategories?.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Méthode de paiement</label>
                  <select
                    value={chargeForm.payment_method}
                    onChange={(e) => setChargeForm({ ...chargeForm, payment_method: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Non spécifié</option>
                    <option value="cash">Espèces</option>
                    <option value="bank_transfer">Virement bancaire</option>
                    <option value="card">Carte bancaire</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="check">Chèque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Statut de paiement</label>
                  <select
                    value={chargeForm.payment_status}
                    onChange={(e) => setChargeForm({ ...chargeForm, payment_status: e.target.value as 'pending' | 'paid' | 'cancelled' })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="pending">En attente</option>
                    <option value="paid">Payé</option>
                    <option value="cancelled">Annulé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Fournisseur</label>
                <input
                  type="text"
                  value={chargeForm.vendor}
                  onChange={(e) => setChargeForm({ ...chargeForm, vendor: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Nom du fournisseur/prestataire"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">N° facture fournisseur</label>
                  <input
                    type="text"
                    value={chargeForm.vendor_invoice_number}
                    onChange={(e) => setChargeForm({ ...chargeForm, vendor_invoice_number: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="N° de facture"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Date facture fournisseur</label>
                  <input
                    type="date"
                    value={chargeForm.vendor_invoice_date}
                    onChange={(e) => setChargeForm({ ...chargeForm, vendor_invoice_date: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  value={chargeForm.notes}
                  onChange={(e) => setChargeForm({ ...chargeForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Notes supplémentaires..."
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowChargeForm(false)
                    setEditingCharge(null)
                  }}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createChargeMutation.isPending || updateChargeMutation.isPending}
                >
                  {createChargeMutation.isPending || updateChargeMutation.isPending
                    ? 'Enregistrement...'
                    : editingCharge
                    ? 'Mettre à jour'
                    : 'Créer la charge'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

