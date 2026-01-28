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
import { generatePDFFromHTML, generatePDFBlobFromHTML } from '@/lib/utils/pdf-generator'
import { emailService } from '@/lib/services/email.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GlassCard } from '@/components/ui/glass-card'
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import Link from 'next/link'
import { 
  Download, FileText, Plus, Receipt, DollarSign, 
  FileCheck, FileX, Eye, CreditCard, ChevronDown, ChevronUp,
  Trash2, Edit, TrendingDown, ArrowRightLeft, Wallet, PieChart as PieChartIcon,
  TrendingUp, AlertCircle, CheckCircle2, Mail, PenTool, Send
} from 'lucide-react'
import { motion } from 'framer-motion'
// Lazy load recharts pour réduire le bundle initial
import {
  RechartsPieChart,
  RechartsPie,
  RechartsCell,
  RechartsResponsiveContainer,
  RechartsTooltip,
  RechartsLegend,
} from '@/components/charts/recharts-wrapper'
import type { EnrollmentWithRelations, StudentWithRelations, InvoiceWithRelations } from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'
import type { SessionWithRelations } from '@/lib/types/query-types'
import { logger, sanitizeError } from '@/lib/utils/logger'

type Payment = TableRow<'payments'>

interface GestionFinancesProps {
  enrollments?: EnrollmentWithRelations[]
  payments?: Payment[]
  sessionId?: string
  sessionData?: SessionWithRelations
  organization?: TableRow<'organizations'>
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-md border border-gray-100 p-3 rounded-xl shadow-xl z-50">
        <p className="font-semibold text-gray-800 text-sm mb-1">{payload[0].name}</p>
        <p className="text-sm font-bold" style={{ color: payload[0].fill }}>
          {payload[0].value} étudiant{payload[0].value > 1 ? 's' : ''}
        </p>
      </div>
    );
  }
  return null;
};

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
  const [selectedPaymentInvoiceId, setSelectedPaymentInvoiceId] = useState<string | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [showQuoteForm, setShowQuoteForm] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState<string | null>(null)
  const [isEmailSending, setIsEmailSending] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState<string | null>(null)
  const [convertingQuoteId, setConvertingQuoteId] = useState<string | null>(null)
  const [showCharges, setShowCharges] = useState(true)
  const [showChargeForm, setShowChargeForm] = useState(false)
  const [editingCharge, setEditingCharge] = useState<SessionChargeWithCategory | null>(null)

  type EmailPreviewState = {
    invoice: any
    type: 'invoice' | 'quote'
    to: string
    subject: string
    bodyText: string
    filename: string
    docLabel: 'Facture' | 'Devis'
    invoiceNumber: string
  }

  const [emailPreview, setEmailPreview] = useState<EmailPreviewState | null>(null)

  const [signatureRequestDialog, setSignatureRequestDialog] = useState<{
    invoice: any
    type: 'invoice' | 'quote'
  } | null>(null)

  const [signatureRequestForm, setSignatureRequestForm] = useState<{
    recipientEmail: string
    recipientName: string
    subject: string
    message: string
  } | null>(null)

  const [isSendingSignatureRequest, setIsSendingSignatureRequest] = useState(false)

  // Récupérer les factures et devis pour tous les étudiants de la session (1 requête au lieu de N)
  const studentIds = enrollments.map((e) => e.student_id).filter(Boolean) as string[]
  const { data: invoices, isLoading: isInvoicesLoading } = useQuery({
    queryKey: ['session-invoices', sessionId, studentIds],
    queryFn: async () => {
      if (!user?.organization_id || studentIds.length === 0) return []
      const { data, error } = await supabase
        .from('invoices')
        .select('*, students(id, first_name, last_name, student_number, email), payments(id, amount, status, paid_at)')
        .eq('organization_id', user.organization_id)
        .in('student_id', studentIds)
        .order('issue_date', { ascending: false })
      if (error) throw error
      return (data || []) as any[]
    },
    enabled: !!user?.organization_id && studentIds.length > 0,
    staleTime: 60 * 1000, // 1 min (invalidate après création facture/devis)
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
    staleTime: 5 * 60 * 1000, // 5 min
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
        logger.warn('Erreur lors de la récupération de l\'année académique', sanitizeError(error))
        return null
      }
      return data || null
    },
    enabled: !!user?.organization_id,
    staleTime: 5 * 60 * 1000, // 5 min
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
    staleTime: 2 * 60 * 1000, // 2 min
  })

  // Récupérer les charges de la session
  const { data: charges, refetch: refetchCharges } = useQuery({
    queryKey: ['session-charges', sessionId],
    queryFn: async () => {
      if (!sessionId) return []
      return sessionChargesService.getBySession(sessionId)
    },
    enabled: !!sessionId,
    staleTime: 60 * 1000, // 1 min
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
    staleTime: 5 * 60 * 1000, // 5 min
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

      let sessionModules: Array<{ id: string; name: string; amount: number; currency: string }> | undefined
      if (sessionData?.id) {
        const { data: mods } = await supabase.from('session_modules' as any).select('id, name, amount, currency').eq('session_id', sessionData.id).order('display_order', { ascending: true })
        sessionModules = (mods?.length ? mods : undefined) as Array<{ id: string; name: string; amount: number; currency: string }> | undefined
      }

      const variables = extractDocumentVariables({
        student,
        organization: org as any,
        session: sessionData,
        invoice: invoiceData,
        sessionModules,
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

      // IMPORTANT: le HTML généré place souvent <header>, <footer>, <main> au niveau racine.
      // Si on prend firstElementChild, on capture uniquement le header => PDF "vide".
      let element = tempDiv.querySelector('.document-container') || tempDiv.querySelector('[id$="-document"]') || tempDiv
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
      logger.error('Erreur lors de la génération du document:', error)
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

  // Génère un PDF Blob (sans téléchargement) pour prévisualisation / envoi email
  const generatePdfBlobForEmail = async (invoice: any, type: 'invoice' | 'quote'): Promise<Blob> => {
    if (!org || !invoice) throw new Error('Données manquantes pour la génération du document.')

    const student = invoice.students as (StudentWithRelations & { email?: string | null }) | undefined
    const template = type === 'invoice' ? invoiceTemplate : quoteTemplate
    if (!template) throw new Error(`Aucun modèle de ${type === 'invoice' ? 'facture' : 'devis'} trouvé.`)

    let tempContainer: HTMLDivElement | null = null

    try {
      const invoiceData = invoice as InvoiceWithRelations

      let sessionModules: Array<{ id: string; name: string; amount: number; currency: string }> | undefined
      if (sessionData?.id) {
        const { data: mods } = await supabase
          .from('session_modules' as any)
          .select('id, name, amount, currency')
          .eq('session_id', sessionData.id)
          .order('display_order', { ascending: true })
        sessionModules = (mods?.length ? mods : undefined) as Array<{ id: string; name: string; amount: number; currency: string }> | undefined
      }

      const variables = extractDocumentVariables({
        student,
        organization: org as any,
        session: sessionData,
        invoice: invoiceData,
        sessionModules,
        academicYear,
        language: 'fr',
        issueDate: invoice.issue_date,
      })

      const result = await generateHTML(template, variables, undefined, user?.organization_id || undefined)

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
      tempContainer = tempDiv

      const parser = new DOMParser()
      const doc = parser.parseFromString(result.html, 'text/html')
      tempDiv.innerHTML = doc.body.innerHTML

      let element = tempDiv.querySelector('.document-container') || tempDiv.querySelector('[id$="-document"]') || tempDiv
      if (!element || !(element instanceof HTMLElement)) {
        element = tempDiv
      }

      const elementId = `temp-email-preview-${type}-${invoice.id}-${Date.now()}`
      if (element instanceof HTMLElement) {
        element.id = elementId
        if (!element.style.width) element.style.width = '794px'
        if (!element.style.minHeight) element.style.minHeight = '1123px'
        element.style.backgroundColor = '#ffffff'
      }

      await new Promise((resolve) => setTimeout(resolve, 700))
      return await generatePDFBlobFromHTML(elementId)
    } finally {
      if (tempContainer && tempContainer.parentNode === document.body) {
        document.body.removeChild(tempContainer)
      }
    }
  }

  // Ouvrir la fenêtre d'édition avant envoi
  const handleSendDocumentByEmail = async (invoice: any, type: 'invoice' | 'quote') => {
    if (!org || !invoice) {
      addToast({ type: 'error', title: 'Erreur', description: 'Données manquantes pour l’envoi du document.' })
      return
    }

    const student = invoice.students as (StudentWithRelations & { email?: string | null }) | undefined
    const studentEmail = student?.email || null
    if (!studentEmail) {
      addToast({ type: 'error', title: 'Email manquant', description: 'Aucun email n’est renseigné pour cet apprenant.' })
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

    const docLabel: 'Facture' | 'Devis' = type === 'invoice' ? 'Facture' : 'Devis'
    const invoiceNumber = invoice.invoice_number || 'Brouillon'
    const filenameSafe = String(invoiceNumber).replace(/[^\w.-]+/g, '_')
    const filename = `${docLabel.toLowerCase()}_${filenameSafe}.pdf`

    const orgName = (org as any)?.name || 'EDUZEN'
    const sessionName = sessionData?.name ? ` – ${sessionData.name}` : ''
    const subject = `${docLabel} ${invoiceNumber}${sessionName} (${orgName})`

    const bodyText =
      `Bonjour ${student?.first_name || ''} ${student?.last_name || ''},\n\n` +
      `Veuillez trouver en pièce jointe votre ${docLabel.toLowerCase()} ${invoiceNumber}.\n\n` +
      `Cordialement,\n${orgName}\n`

    setEmailPreview({
      invoice,
      type,
      to: studentEmail,
      subject,
      bodyText,
      filename,
      docLabel,
      invoiceNumber,
    })
  }

  const handleConfirmSendFromPreview = async () => {
    if (!emailPreview) return

    setIsEmailSending(emailPreview.invoice.id)
    try {
      const pdfBlob = await generatePdfBlobForEmail(emailPreview.invoice, emailPreview.type)

      const escapeHtml = (value: string) =>
        value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')

      const htmlBody =
        `<div style="font-family: Arial, sans-serif; line-height: 1.5; white-space: normal;">` +
        `${escapeHtml(emailPreview.bodyText).replace(/\n/g, '<br/>')}` +
        `</div>`

      await emailService.sendDocument(
        emailPreview.to,
        emailPreview.subject,
        pdfBlob,
        emailPreview.filename,
        htmlBody,
        emailPreview.bodyText
      )

      addToast({
        type: 'success',
        title: 'Email envoyé',
        description: `${emailPreview.docLabel} envoyé(e) à ${emailPreview.to}.`,
      })

      setEmailPreview(null)
    } catch (error) {
      logger.error('Erreur lors de l’envoi email du document:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de l’envoi par email.',
      })
    } finally {
      setIsEmailSending(null)
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
        enrollment_id: enrollment.id,
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
    onMutate: async () => {
      const enrollment = enrollments.find((e) => e.id === selectedEnrollmentId)
      if (!enrollment?.student_id) return {}
      const key = ['session-invoices', sessionId, studentIds] as const
      const prev = queryClient.getQueryData(key)
      const optimistic = {
        id: `opt-inv-${Date.now()}`,
        student_id: enrollment.student_id,
        document_type: 'invoice',
        invoice_number: '—',
        _optimistic: true,
        students: enrollment.students,
      }
      queryClient.setQueryData(key, [optimistic, ...(Array.isArray(prev) ? prev : [])])
      return { previous: prev }
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
    onError: (error: any, _vars, ctx) => {
      if (ctx?.previous != null) {
        queryClient.setQueryData(['session-invoices', sessionId, studentIds], ctx.previous)
      }
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
        enrollment_id: enrollment.id,
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
    onMutate: async () => {
      const enrollment = enrollments.find((e) => e.id === selectedEnrollmentId)
      if (!enrollment?.student_id) return {}
      const key = ['session-invoices', sessionId, studentIds] as const
      const prev = queryClient.getQueryData(key)
      const optimistic = {
        id: `opt-quote-${Date.now()}`,
        student_id: enrollment.student_id,
        document_type: 'quote',
        invoice_number: '—',
        _optimistic: true,
        students: enrollment.students,
      }
      queryClient.setQueryData(key, [optimistic, ...(Array.isArray(prev) ? prev : [])])
      return { previous: prev }
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
    onError: (error: any, _vars, ctx) => {
      if (ctx?.previous != null) {
        queryClient.setQueryData(['session-invoices', sessionId, studentIds], ctx.previous)
      }
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error?.message || 'Erreur lors de la création du devis.',
      })
    },
  })

  // Mutation pour convertir un devis en facture
  const convertQuoteToInvoiceMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      return invoiceService.convertQuoteToInvoice(quoteId)
    },
    onMutate: async (quoteId: string) => {
      setConvertingQuoteId(quoteId)
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Devis converti',
        description: 'Le devis a été transformé en facture (brouillon).',
      })
      queryClient.invalidateQueries({ queryKey: ['session-invoices', sessionId] })
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error?.message || 'Erreur lors de la conversion du devis en facture.',
      })
    },
    onSettled: () => {
      setConvertingQuoteId(null)
    },
  })

  // Mutation pour enregistrer un paiement
  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEnrollmentId || !user?.organization_id) throw new Error('Données manquantes')
      const enrollment = enrollments.find((e) => e.id === selectedEnrollmentId)
      if (!enrollment || !enrollment.students) throw new Error('Inscription non trouvée')
      if (!selectedPaymentInvoiceId) {
        throw new Error('Veuillez sélectionner une facture pour enregistrer ce paiement.')
      }

      const amountNumber = parseFloat(paymentForm.amount)
      if (isNaN(amountNumber) || amountNumber <= 0) {
        throw new Error('Montant de paiement invalide')
      }

      return paymentService.create({
        organization_id: user.organization_id,
        invoice_id: selectedPaymentInvoiceId,
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
      setSelectedPaymentInvoiceId(null)
      setPaymentForm({
        amount: '',
        currency: 'EUR',
        payment_method: 'cash',
        transaction_id: '',
        notes: '',
      })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['session-invoices', sessionId] })
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

  const getInvoiceTotal = (inv: any) => {
    const totalAmount = inv?.total_amount != null ? Number(inv.total_amount) : null
    if (totalAmount != null && !Number.isNaN(totalAmount)) return totalAmount
    const amount = inv?.amount != null ? Number(inv.amount) : 0
    const tax = inv?.tax_amount != null ? Number(inv.tax_amount) : 0
    return (Number.isNaN(amount) ? 0 : amount) + (Number.isNaN(tax) ? 0 : tax)
  }

  const getInvoicePaid = (inv: any) => {
    const payments = Array.isArray(inv?.payments) ? inv.payments : []
    return payments
      .filter((p: any) => p?.status === 'completed')
      .reduce((sum: number, p: any) => sum + Number(p?.amount || 0), 0)
  }

  const getInvoiceRemaining = (inv: any) => {
    const remaining = getInvoiceTotal(inv) - getInvoicePaid(inv)
    return remaining > 0 ? remaining : 0
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
    setShowQuoteForm(false)
    setShowInvoiceForm(false)
    setShowPaymentForm(false)
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
    setShowQuoteForm(false)
    setShowInvoiceForm(false)
    setShowPaymentForm(false)
    setShowChargeForm(true)
  }

  // Préparer les données pour le graphique de répartition
  const paymentStatusData = [
    { name: 'Payé', value: enrollments.filter((e) => e.payment_status === 'paid').length, fill: '#10B981' },
    { name: 'Partiel', value: enrollments.filter((e) => e.payment_status === 'partial').length, fill: '#3b82f6' },
    { name: 'En attente', value: enrollments.filter((e) => e.payment_status === 'pending').length, fill: '#F59E0B' },
    { name: 'En retard', value: enrollments.filter((e) => e.payment_status === 'overdue').length, fill: '#EF4444' },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-8">
      {/* Statistiques financières - BentoGrid */}
      <BentoGrid columns={4} gap="md">
        <BentoCard span={1}>
          <GlassCard variant="premium" className="h-full flex flex-col p-6 border-2 border-transparent hover:border-brand-blue/10 transition-all duration-500 min-w-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-brand-blue/10 rounded-xl">
                <Wallet className="h-5 w-5 text-brand-blue" />
              </div>
              <h3 className="font-display font-bold text-gray-700 text-sm uppercase tracking-wider">Revenu total</h3>
            </div>
            <div className="mt-auto">
              <div className="text-3xl font-bold text-gray-900 tracking-tight">
                {formatCurrency(totalRevenue, 'EUR')}
              </div>
              <p className="text-xs text-gray-500 mt-2 font-medium">
                {enrollments.length} inscription{enrollments.length > 1 ? 's' : ''}
              </p>
            </div>
          </GlassCard>
        </BentoCard>

        <BentoCard span={1}>
          <GlassCard variant="premium" className="h-full flex flex-col p-6 border-2 border-transparent hover:border-green-500/10 transition-all duration-500 min-w-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-green-500/10 rounded-xl">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="font-display font-bold text-gray-700 text-sm uppercase tracking-wider">Encaissé</h3>
            </div>
            <div className="mt-auto">
              <div className="text-3xl font-bold text-green-600 tracking-tight">
                {formatCurrency(totalPaid, 'EUR')}
              </div>
              <p className="text-xs text-gray-500 mt-2 font-medium">
                {formatCurrency(paymentsViaPayments, 'EUR')} via paiements
              </p>
            </div>
          </GlassCard>
        </BentoCard>

        <BentoCard span={1}>
          <GlassCard variant="premium" className="h-full flex flex-col p-6 border-2 border-transparent hover:border-orange-500/10 transition-all duration-500 min-w-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-orange-500/10 rounded-xl">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <h3 className="font-display font-bold text-gray-700 text-sm uppercase tracking-wider">Reste à payer</h3>
            </div>
            <div className="mt-auto">
              <div className="text-3xl font-bold text-orange-600 tracking-tight">
                {formatCurrency(totalRemaining, 'EUR')}
              </div>
              <p className="text-xs text-gray-500 mt-2 font-medium">
                {enrollmentsWithBalance.length} solde{enrollmentsWithBalance.length > 1 ? 's' : ''} restant{enrollmentsWithBalance.length > 1 ? 's' : ''}
              </p>
            </div>
          </GlassCard>
        </BentoCard>

        <BentoCard span={1}>
          <GlassCard variant="premium" className="h-full flex flex-col p-6 border-2 border-transparent hover:border-red-500/10 transition-all duration-500 min-w-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-red-500/10 rounded-xl">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="font-display font-bold text-gray-700 text-sm uppercase tracking-wider">Charges</h3>
            </div>
            <div className="mt-auto">
              <div className="text-3xl font-bold text-red-600 tracking-tight">
                {formatCurrency(chargesSummary?.total_amount || 0, 'EUR')}
              </div>
              <p className="text-xs text-gray-500 mt-2 font-medium">
                {chargesSummary?.charge_count || 0} dépense{(chargesSummary?.charge_count || 0) > 1 ? 's' : ''}
              </p>
            </div>
          </GlassCard>
        </BentoCard>
      </BentoGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Section Inscriptions & Paiements (2/3 largeur) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Liste des inscriptions */}
          <GlassCard variant="premium" className="overflow-hidden border-2 border-transparent hover:border-brand-blue/10 transition-all duration-500">
            <div className="p-6 border-b border-gray-100/50 bg-gray-50/50 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-blue/10 rounded-lg">
                  <Receipt className="h-5 w-5 text-brand-blue" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-gray-900">Inscriptions & Facturation</h3>
                  <p className="text-sm text-gray-500">Gérez les factures, devis et paiements</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white hover:bg-gray-50 border-gray-200 text-gray-700 shadow-sm"
                  onClick={() => {
                    setSelectedEnrollmentId(null)
                    setShowPaymentForm(false)
                    setShowInvoiceForm(false)
                    setShowChargeForm(false)
                    setShowQuoteForm(true)
                  }}
                >
                  <FileText className="mr-2 h-3.5 w-3.5" />
                  Devis
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white hover:bg-gray-50 border-gray-200 text-gray-700 shadow-sm"
                  onClick={() => {
                    setSelectedEnrollmentId(null)
                    setShowPaymentForm(false)
                    setShowQuoteForm(false)
                    setShowChargeForm(false)
                    setShowInvoiceForm(true)
                  }}
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Facture
                </Button>
              </div>
            </div>
            
            <div className="p-0">
              {isInvoicesLoading && enrollments.length > 0 && (
                <div className="p-8 text-center text-muted-foreground animate-pulse">Chargement des données financières...</div>
              )}
              
              {enrollments.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Receipt className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="font-medium text-gray-900">Aucune inscription</p>
                  <p className="text-sm mt-1">Les inscriptions apparaîtront ici une fois créées.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {enrollments.map((enrollment) => {
                    const student = enrollment.students
                    if (!student) return null

                    const total = Number(enrollment.total_amount || 0)
                    const paid = Number(enrollment.paid_amount || 0)
                    const remaining = total - paid
                    const studentInvoices = enrollment.student_id ? getInvoicesForStudent(enrollment.student_id) : []
                    const studentInvoicesList = studentInvoices.filter((inv: any) => inv.document_type === 'invoice')
                    const studentQuotesList = studentInvoices.filter((inv: any) => inv.document_type === 'quote')

                    return (
                      <motion.div 
                        key={enrollment.id} 
                        className="p-5 hover:bg-gray-50/80 transition-colors group"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm shadow-sm border border-white">
                              {student.first_name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{student.first_name} {student.last_name}</p>
                              <p className="text-xs text-gray-500 font-medium">{student.student_number || 'Sans matricule'}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-right">
                              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total</p>
                              <p className="font-bold text-gray-900">{formatCurrency(total, 'EUR')}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Payé</p>
                              <p className="font-bold text-green-600">{formatCurrency(paid, 'EUR')}</p>
                            </div>
                            <div className="text-right min-w-[80px]">
                              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Statut</p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block mt-0.5 ${
                                enrollment.payment_status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                                enrollment.payment_status === 'partial' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                enrollment.payment_status === 'overdue' ? 'bg-red-50 text-red-700 border-red-200' :
                                'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {enrollment.payment_status === 'paid' ? 'PAYÉ' :
                                 enrollment.payment_status === 'partial' ? 'PARTIEL' :
                                 enrollment.payment_status === 'overdue' ? 'RETARD' : 'ATTENTE'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions et Documents */}
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pl-14">
                          <div className="flex flex-wrap gap-2">
                            {/* Devis */}
                            {studentQuotesList.map((quote: any) => (
                              <div key={quote.id} className="flex items-center bg-gray-50 border border-gray-200 rounded-md px-2 py-1">
                                <FileText className="h-3 w-3 text-gray-500 mr-1.5" />
                                <span className="text-xs font-medium text-gray-700 mr-2">{quote.invoice_number || 'Brouillon'}</span>
                                <div className="flex gap-1 border-l border-gray-200 pl-2">
                                  <button 
                                    onClick={() => handleDownloadDocument(quote, 'quote')}
                                    disabled={isDownloading === quote.id}
                                    className="text-gray-400 hover:text-brand-blue transition-colors"
                                    title="Télécharger PDF"
                                  >
                                    {isDownloading === quote.id ? <span className="animate-spin">⟳</span> : <Download className="h-3 w-3" />}
                                  </button>
                                  <button
                                    onClick={() => handleSendDocumentByEmail(quote, 'quote')}
                                    disabled={isEmailSending === quote.id}
                                    className="text-gray-400 hover:text-purple-600 transition-colors"
                                    title="Envoyer par email"
                                  >
                                    {isEmailSending === quote.id ? <span className="animate-spin">⟳</span> : <Mail className="h-3 w-3" />}
                                  </button>
                                  <button
                                    onClick={() => {
                                      const student = quote.students
                                      if (!student?.email) {
                                        addToast({
                                          type: 'error',
                                          title: 'Erreur',
                                          description: 'L\'étudiant n\'a pas d\'email enregistré.',
                                        })
                                        return
                                      }
                                      setSignatureRequestDialog({
                                        invoice: quote,
                                        type: 'quote',
                                      })
                                      setSignatureRequestForm({
                                        recipientEmail: student.email || '',
                                        recipientName: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
                                        subject: `Demande de signature : Devis ${quote.invoice_number || 'Brouillon'} - ${student.first_name} ${student.last_name}`,
                                        message: `Bonjour ${student.first_name},\n\nVeuillez trouver ci-joint votre devis ${quote.invoice_number || ''} pour la session "${sessionData?.name || ''}".\n\nMerci de bien vouloir le signer en ligne.\n\nCordialement,\n${org?.name || ''}`,
                                      })
                                    }}
                                    disabled={!quote.students?.email}
                                    className="text-gray-400 hover:text-purple-600 transition-colors"
                                    title="Envoyer en demande de signature"
                                  >
                                    <PenTool className="h-3 w-3" />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const ok = window.confirm('Transformer ce devis en facture ? (La facture sera créée en brouillon)')
                                      if (!ok) return
                                      convertQuoteToInvoiceMutation.mutate(quote.id)
                                    }}
                                    disabled={convertingQuoteId === quote.id}
                                    className="text-gray-400 hover:text-green-600 transition-colors"
                                    title="Convertir en facture"
                                  >
                                    {convertingQuoteId === quote.id ? <span className="animate-spin">⟳</span> : <ArrowRightLeft className="h-3 w-3" />}
                                  </button>
                                </div>
                              </div>
                            ))}
                            
                            {/* Factures */}
                            {studentInvoicesList.map((invoice: any) => (
                              <div key={invoice.id} className="flex items-center bg-blue-50/50 border border-blue-100 rounded-md px-2 py-1">
                                <Receipt className="h-3 w-3 text-blue-500 mr-1.5" />
                                <span className="text-xs font-medium text-blue-700 mr-2">{invoice.invoice_number || 'Brouillon'}</span>
                                <div className="flex gap-1 border-l border-blue-200 pl-2">
                                  <button 
                                    onClick={() => handleDownloadDocument(invoice, 'invoice')}
                                    disabled={isDownloading === invoice.id}
                                    className="text-blue-400 hover:text-blue-700 transition-colors"
                                    title="Télécharger PDF"
                                  >
                                    {isDownloading === invoice.id ? <span className="animate-spin">⟳</span> : <Download className="h-3 w-3" />}
                                  </button>
                                  <button
                                    onClick={() => handleSendDocumentByEmail(invoice, 'invoice')}
                                    disabled={isEmailSending === invoice.id}
                                    className="text-blue-400 hover:text-purple-600 transition-colors"
                                    title="Envoyer par email"
                                  >
                                    {isEmailSending === invoice.id ? <span className="animate-spin">⟳</span> : <Mail className="h-3 w-3" />}
                                  </button>
                                  <button
                                    onClick={() => {
                                      const student = invoice.students
                                      if (!student?.email) {
                                        addToast({
                                          type: 'error',
                                          title: 'Erreur',
                                          description: 'L\'étudiant n\'a pas d\'email enregistré.',
                                        })
                                        return
                                      }
                                      setSignatureRequestDialog({
                                        invoice: invoice,
                                        type: 'invoice',
                                      })
                                      setSignatureRequestForm({
                                        recipientEmail: student.email || '',
                                        recipientName: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
                                        subject: `Demande de signature : Facture ${invoice.invoice_number || 'Brouillon'} - ${student.first_name} ${student.last_name}`,
                                        message: `Bonjour ${student.first_name},\n\nVeuillez trouver ci-joint votre facture ${invoice.invoice_number || ''} pour la session "${sessionData?.name || ''}".\n\nMerci de bien vouloir la signer en ligne.\n\nCordialement,\n${org?.name || ''}`,
                                      })
                                    }}
                                    disabled={!invoice.students?.email}
                                    className="text-blue-400 hover:text-purple-600 transition-colors"
                                    title="Envoyer en demande de signature"
                                  >
                                    <PenTool className="h-3 w-3" />
                                  </button>
                                  <Link href={`/dashboard/payments/${invoice.id}`} className="text-blue-400 hover:text-blue-700 transition-colors" title="Voir détails">
                                    <Eye className="h-3 w-3" />
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-gray-600 hover:text-brand-blue hover:bg-brand-blue/5"
                              onClick={() => {
                                setSelectedEnrollmentId(enrollment.id)
                                setShowPaymentForm(false)
                                setShowInvoiceForm(false)
                                setShowChargeForm(false)
                                setInvoiceForm({
                                  ...invoiceForm,
                                  amount: enrollment.total_amount != null ? String(enrollment.total_amount) : '0',
                                })
                                setShowQuoteForm(true)
                              }}
                            >
                              <Plus className="mr-1 h-3 w-3" /> Devis
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-gray-600 hover:text-brand-blue hover:bg-brand-blue/5"
                              onClick={() => {
                                setSelectedEnrollmentId(enrollment.id)
                                setShowPaymentForm(false)
                                setShowQuoteForm(false)
                                setShowChargeForm(false)
                                setInvoiceForm({
                                  ...invoiceForm,
                                  amount: enrollment.total_amount != null ? String(enrollment.total_amount) : '0',
                                })
                                setShowInvoiceForm(true)
                              }}
                            >
                              <Plus className="mr-1 h-3 w-3" /> Facture
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-brand-blue hover:bg-brand-blue-dark text-white shadow-sm"
                              onClick={() => {
                                const total = Number(enrollment.total_amount || 0)
                                const paid = Number(enrollment.paid_amount || 0)
                                const remaining = total - paid
                                setSelectedEnrollmentId(enrollment.id)
                                const defaultInvoice =
                                  (studentInvoicesList || []).find((inv: any) => !inv?._optimistic && getInvoiceRemaining(inv) > 0) ||
                                  (studentInvoicesList || []).find((inv: any) => !inv?._optimistic) ||
                                  null
                                setSelectedPaymentInvoiceId(defaultInvoice?.id || null)
                                setShowQuoteForm(false)
                                setShowInvoiceForm(false)
                                setShowChargeForm(false)
                                setPaymentForm({
                                  ...paymentForm,
                                  currency: defaultInvoice?.currency || paymentForm.currency,
                                  amount: defaultInvoice ? String(getInvoiceRemaining(defaultInvoice)) : (remaining > 0 ? String(remaining) : '0'),
                                })
                                setShowPaymentForm(true)
                              }}
                            >
                              <DollarSign className="mr-1 h-3 w-3" /> Paiement
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </GlassCard>

          {/* Paiements récents */}
          {payments.length > 0 && (
            <GlassCard variant="premium" className="overflow-hidden border-2 border-transparent hover:border-brand-blue/10 transition-all duration-500">
              <div className="p-6 border-b border-gray-100/50 bg-gray-50/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <CreditCard className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-gray-900">Paiements récents</h3>
                    <p className="text-sm text-gray-500">Historique des transactions</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {payments.slice(0, 10).map((payment) => {
                  const student = (payment as any).students
                  return (
                    <div key={payment.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          payment.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                          <DollarSign className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">
                            {student ? `${student.first_name} ${student.last_name}` : 'Apprenant'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {payment.paid_at && new Date(payment.paid_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            {payment.payment_method && ` • ${payment.payment_method === 'cash' ? 'Espèces' : payment.payment_method === 'card' ? 'Carte' : 'Virement'}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          +{formatCurrency(Number(payment.amount || 0), payment.currency || 'EUR')}
                        </p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                          payment.status === 'completed' ? 'bg-green-50 text-green-700' :
                          payment.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {payment.status === 'completed' ? 'COMPLÉTÉ' :
                           payment.status === 'pending' ? 'EN ATTENTE' : 'ÉCHOUÉ'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </GlassCard>
          )}
        </div>

        {/* Section Latérale (1/3 largeur) */}
        <div className="space-y-8">
          {/* Graphique Répartition */}
          <GlassCard variant="premium" className="p-6 border-2 border-transparent hover:border-brand-blue/10 transition-all duration-500">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <PieChartIcon className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-display font-bold text-gray-900">Statut des paiements</h3>
            </div>
            
            <div className="h-[250px] w-full relative">
              {enrollments.length > 0 ? (
                <RechartsResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <RechartsPie
                      data={paymentStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      {...({} as any)}
                    >
                      {paymentStatusData.map((entry, index) => (
                        <RechartsCell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} {...({} as any)} />
                      ))}
                    </RechartsPie>
                    <RechartsTooltip content={<CustomTooltip />} {...({} as any)} />
                    <RechartsLegend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value: any) => <span className="text-xs font-medium text-gray-600 ml-1">{value}</span>}
                      {...({} as any)}
                    />
                  </RechartsPieChart>
                </RechartsResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-sm text-gray-500">
                  <PieChartIcon className="h-8 w-8 text-gray-300 mb-2" />
                  <p>Aucune donnée disponible</p>
                </div>
              )}
              {/* Total au centre */}
              {enrollments.length > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                  <div className="text-center">
                    <span className="text-2xl font-bold text-gray-900 block leading-none">{enrollments.length}</span>
                    <span className="text-[10px] text-gray-500 uppercase font-medium">Inscrits</span>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Section Charges */}
          <GlassCard variant="premium" className="overflow-hidden border-2 border-transparent hover:border-red-500/10 transition-all duration-500">
            <div className="p-6 border-b border-gray-100/50 bg-gray-50/50 backdrop-blur-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-gray-900">Charges</h3>
                  {chargesSummary && chargesSummary.charge_count > 0 && (
                    <p className="text-sm text-red-600 font-medium">
                      -{formatCurrency(chargesSummary.total_amount, 'EUR')}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-white hover:shadow-sm"
                onClick={handleNewCharge}
              >
                <Plus className="h-4 w-4 text-gray-600" />
              </Button>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-4 space-y-3">
              {charges && charges.length > 0 ? (
                charges.map((charge) => (
                  <motion.div 
                    key={charge.id} 
                    className="p-3 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all group"
                    whileHover={{ y: -2 }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm line-clamp-1">{charge.description}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">{new Date(charge.charge_date).toLocaleDateString('fr-FR')}</span>
                          {charge.charge_categories && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                              {charge.charge_categories.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-red-600 text-sm">
                          -{formatCurrency(Number(charge.amount), charge.currency)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        charge.payment_status === 'paid' ? 'bg-green-50 text-green-700' :
                        charge.payment_status === 'pending' ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {charge.payment_status === 'paid' ? 'Payé' :
                         charge.payment_status === 'pending' ? 'En attente' : 'Annulé'}
                      </span>
                      
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditCharge(charge)}
                          className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-brand-blue"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm('Êtes-vous sûr de vouloir supprimer cette charge ?')) {
                              deleteChargeMutation.mutate(charge.id)
                            }
                          }}
                          className="p-1 hover:bg-red-50 rounded text-gray-500 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Aucune charge enregistrée</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-2 text-brand-blue"
                    onClick={handleNewCharge}
                  >
                    Ajouter une charge
                  </Button>
                </div>
              )}
            </div>
            
            {chargesSummary && (
              <div className="p-4 bg-gray-50 border-t border-gray-100 grid grid-cols-2 gap-4 text-center text-xs">
                <div>
                  <span className="text-gray-500 block mb-1">Payé</span>
                  <span className="font-bold text-green-600">{formatCurrency(chargesSummary.paid_amount, 'EUR')}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">En attente</span>
                  <span className="font-bold text-amber-600">{formatCurrency(chargesSummary.pending_amount, 'EUR')}</span>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Prévisualisation email + PDF avant envoi */}
      <Dialog
        open={!!emailPreview}
        onOpenChange={(open) => {
          if (!open) setEmailPreview(null)
        }}
      >
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Envoyer par e-mail</DialogTitle>
          </DialogHeader>

          {emailPreview && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-700">
                  Document : <span className="font-semibold">{emailPreview.docLabel}</span> —{' '}
                  <span className="font-semibold">{emailPreview.invoiceNumber}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Pièce jointe : <span className="font-medium">{emailPreview.filename}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">À</label>
                <input
                  type="email"
                  value={emailPreview.to}
                  onChange={(e) => setEmailPreview((prev) => (prev ? { ...prev, to: e.target.value } : prev))}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="destinataire@exemple.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Objet</label>
                <input
                  type="text"
                  value={emailPreview.subject}
                  onChange={(e) => setEmailPreview((prev) => (prev ? { ...prev, subject: e.target.value } : prev))}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Contenu du mail</label>
                <textarea
                  value={emailPreview.bodyText}
                  onChange={(e) => setEmailPreview((prev) => (prev ? { ...prev, bodyText: e.target.value } : prev))}
                  rows={10}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Écris ton message ici..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  Le document sera généré en PDF et joint automatiquement lors de l’envoi.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEmailPreview(null)}>
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSendFromPreview}
              disabled={
                !emailPreview ||
                isEmailSending === emailPreview?.invoice?.id ||
                !emailPreview.to?.trim() ||
                !emailPreview.subject?.trim()
              }
            >
              {emailPreview && isEmailSending === emailPreview.invoice.id ? 'Envoi...' : 'Envoyer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de demande de signature */}
      <Dialog open={!!signatureRequestDialog} onOpenChange={(open) => {
        if (!open) {
          setSignatureRequestDialog(null)
          setSignatureRequestForm(null)
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white/95 backdrop-blur-xl border-white/20 shadow-2xl">
          <div className="p-6 border-b border-gray-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                <PenTool className="h-5 w-5 text-purple-600" />
                Envoyer en demande de signature
              </DialogTitle>
              <DialogDescription className="text-gray-500">
                Le document sera généré et envoyé au destinataire pour signature en ligne.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-6 space-y-6">
            {signatureRequestForm && signatureRequestDialog && (
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-700">
                    Document : <span className="font-semibold">{signatureRequestDialog.type === 'quote' ? 'Devis' : 'Facture'}</span> —{' '}
                    <span className="font-semibold">{signatureRequestDialog.invoice.invoice_number || 'Brouillon'}</span>
                  </p>
                </div>
                
                <div className="grid gap-2">
                  <label htmlFor="sig-recipient-email" className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email du destinataire</label>
                  <div className="relative">
                    <input
                      id="sig-recipient-email"
                      type="email"
                      value={signatureRequestForm.recipientEmail}
                      onChange={(e) => setSignatureRequestForm({ ...signatureRequestForm, recipientEmail: e.target.value })}
                      className="w-full pl-10 px-4 py-3 border rounded-lg focus:ring-purple-600/20 focus:border-purple-600 transition-all"
                      placeholder="email@example.com"
                    />
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <label htmlFor="sig-recipient-name" className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nom du destinataire</label>
                  <input
                    id="sig-recipient-name"
                    type="text"
                    value={signatureRequestForm.recipientName}
                    onChange={(e) => setSignatureRequestForm({ ...signatureRequestForm, recipientName: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-purple-600/20 focus:border-purple-600 transition-all font-medium"
                    placeholder="Nom complet"
                  />
                </div>
                
                <div className="grid gap-2">
                  <label htmlFor="sig-subject" className="text-xs font-bold text-gray-500 uppercase tracking-wide">Sujet</label>
                  <input
                    id="sig-subject"
                    type="text"
                    value={signatureRequestForm.subject}
                    onChange={(e) => setSignatureRequestForm({ ...signatureRequestForm, subject: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-purple-600/20 focus:border-purple-600 transition-all font-medium"
                    placeholder="Sujet de l'email"
                  />
                </div>
                
                <div className="grid gap-2">
                  <label htmlFor="sig-message" className="text-xs font-bold text-gray-500 uppercase tracking-wide">Message</label>
                  <textarea
                    id="sig-message"
                    value={signatureRequestForm.message}
                    onChange={(e) => setSignatureRequestForm({ ...signatureRequestForm, message: e.target.value })}
                    className="min-h-[200px] font-mono text-sm w-full px-4 py-3 border rounded-lg focus:ring-purple-600/20 focus:border-purple-600 transition-all"
                    placeholder="Message personnalisé"
                  />
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-100 rounded-xl text-sm text-purple-700">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <PenTool className="h-4 w-4 text-purple-600" />
                  </div>
                  <p className="font-medium">
                    Le destinataire recevra un email avec un lien sécurisé pour signer le document en ligne.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="p-6 bg-gray-50/50 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => {
                setSignatureRequestDialog(null)
                setSignatureRequestForm(null)
              }}
              className="border-gray-200 hover:bg-gray-100 hover:text-gray-900"
            >
              Annuler
            </Button>
            <Button
              onClick={async () => {
                if (!signatureRequestDialog || !signatureRequestForm) return
                
                setIsSendingSignatureRequest(true)
                try {
                  // Générer le PDF côté client
                  const pdfBlob = await generatePdfBlobForEmail(signatureRequestDialog.invoice, signatureRequestDialog.type)
                  
                  // Convertir le Blob en base64
                  const pdfBase64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      const base64 = (reader.result as string).split(',')[1]
                      resolve(base64)
                    }
                    reader.onerror = reject
                    reader.readAsDataURL(pdfBlob)
                  })
                  
                  const student = signatureRequestDialog.invoice.students
                  const documentTitle = signatureRequestDialog.type === 'quote'
                    ? `Devis ${signatureRequestDialog.invoice.invoice_number || 'Brouillon'} - ${student?.first_name || ''} ${student?.last_name || ''}`
                    : `Facture ${signatureRequestDialog.invoice.invoice_number || 'Brouillon'} - ${student?.first_name || ''} ${student?.last_name || ''}`
                  
                  const response = await fetch('/api/signature-requests/send-from-invoice', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      pdfBase64,
                      documentTitle,
                      type: signatureRequestDialog.type,
                      invoiceId: signatureRequestDialog.invoice.id,
                      sessionId: sessionId,
                      recipientEmail: signatureRequestForm.recipientEmail,
                      recipientName: signatureRequestForm.recipientName,
                      recipientId: student?.id,
                      subject: signatureRequestForm.subject,
                      message: signatureRequestForm.message,
                      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    }),
                  })

                  if (!response.ok) {
                    const error = await response.json()
                    throw new Error(error.error || 'Erreur lors de l\'envoi')
                  }

                  setSignatureRequestDialog(null)
                  setSignatureRequestForm(null)
                  
                  addToast({
                    type: 'success',
                    title: 'Demande de signature envoyée',
                    description: 'Le document a été généré et envoyé au destinataire pour signature en ligne.',
                  })
                } catch (error) {
                  logger.error('Erreur:', error)
                  addToast({
                    type: 'error',
                    title: 'Erreur',
                    description: error instanceof Error ? error.message : 'Erreur lors de l\'envoi de la demande de signature',
                  })
                } finally {
                  setIsSendingSignatureRequest(false)
                }
              }}
              disabled={!signatureRequestForm?.recipientEmail || !signatureRequestForm?.recipientName || !signatureRequestForm?.subject || isSendingSignatureRequest}
              className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200"
            >
              {isSendingSignatureRequest ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer la demande
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Formulaire de paiement (Dialog) */}
      <Dialog
        open={showPaymentForm}
        onOpenChange={(open) => {
          setShowPaymentForm(open)
          if (!open) {
            setSelectedEnrollmentId(null)
            setSelectedPaymentInvoiceId(null)
          }
        }}
      >
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
          </DialogHeader>
          {selectedEnrollmentId && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Étudiant : {enrollments.find((e) => e.id === selectedEnrollmentId)?.students?.first_name} {enrollments.find((e) => e.id === selectedEnrollmentId)?.students?.last_name}
              </p>
            </div>
          )}
          {selectedEnrollmentId && (() => {
            const enrollment = enrollments.find((e) => e.id === selectedEnrollmentId)
            const studentId = enrollment?.student_id
            const studentInvoices = studentId ? getInvoicesForStudent(studentId) : []
            const studentInvoiceList = studentInvoices.filter((inv: any) => inv.document_type === 'invoice' && !inv?._optimistic)
            if (studentInvoiceList.length === 0) {
              return (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Aucune facture trouvée pour cet apprenant. Créez d’abord une facture, puis saisissez un paiement.
                  </p>
                </div>
              )
            }
            const selected = selectedPaymentInvoiceId
              ? studentInvoiceList.find((inv: any) => inv.id === selectedPaymentInvoiceId)
              : null
            const remaining = selected ? getInvoiceRemaining(selected) : null
            return (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Facture *</label>
                  <select
                    required
                    value={selectedPaymentInvoiceId || ''}
                    onChange={(e) => {
                      const nextId = e.target.value || null
                      setSelectedPaymentInvoiceId(nextId)
                      const nextInv = nextId ? studentInvoiceList.find((inv: any) => inv.id === nextId) : null
                      if (nextInv) {
                        setPaymentForm({
                          ...paymentForm,
                          currency: nextInv.currency || paymentForm.currency,
                          amount: String(getInvoiceRemaining(nextInv)),
                        })
                      }
                    }}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Sélectionner une facture</option>
                    {studentInvoiceList.map((inv: any) => {
                      const total = getInvoiceTotal(inv)
                      const paid = getInvoicePaid(inv)
                      const rem = Math.max(total - paid, 0)
                      return (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoice_number} — Total {formatCurrency(total, inv.currency || 'EUR')} — Reste {formatCurrency(rem, inv.currency || 'EUR')}
                        </option>
                      )
                    })}
                  </select>
                  {selected && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Reste à payer sur cette facture : {formatCurrency(remaining || 0, selected.currency || 'EUR')}
                    </p>
                  )}
                </div>
              </>
            )
          })()}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              createPaymentMutation.mutate()
            }}
            className="space-y-4"
          >
            <fieldset disabled={createPaymentMutation.isPending} className="border-0 p-0 m-0 min-w-0 space-y-4">
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
            </fieldset>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowPaymentForm(false); setSelectedEnrollmentId(null); setSelectedPaymentInvoiceId(null) }}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={createPaymentMutation.isPending || !selectedEnrollmentId || !selectedPaymentInvoiceId}>
                {createPaymentMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Formulaire de facture (Dialog) */}
      <Dialog
        open={showInvoiceForm}
        onOpenChange={(open) => {
          setShowInvoiceForm(open)
          if (!open) setSelectedEnrollmentId(null)
        }}
      >
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Créer une facture</DialogTitle>
          </DialogHeader>
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
            <fieldset disabled={createInvoiceMutation.isPending} className="border-0 p-0 m-0 min-w-0 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Montant HT *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
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
            </fieldset>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowInvoiceForm(false); setSelectedEnrollmentId(null) }}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createInvoiceMutation.isPending || !selectedEnrollmentId}
              >
                {createInvoiceMutation.isPending ? 'Création...' : 'Créer la facture'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Formulaire de devis (Dialog) */}
      <Dialog
        open={showQuoteForm}
        onOpenChange={(open) => {
          setShowQuoteForm(open)
          if (!open) setSelectedEnrollmentId(null)
        }}
      >
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Créer un devis</DialogTitle>
          </DialogHeader>
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
            <fieldset disabled={createQuoteMutation.isPending} className="border-0 p-0 m-0 min-w-0 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Montant HT *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
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
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent mt-1"
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
            </fieldset>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowQuoteForm(false); setSelectedEnrollmentId(null) }}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createQuoteMutation.isPending || !selectedEnrollmentId}
              >
                {createQuoteMutation.isPending ? 'Création...' : 'Créer le devis'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Formulaire de charge (Dialog) */}
      <Dialog
        open={showChargeForm}
        onOpenChange={(open) => {
          setShowChargeForm(open)
          if (!open) setEditingCharge(null)
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editingCharge ? 'Modifier la charge' : 'Nouvelle charge'}</DialogTitle>
          </DialogHeader>
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
            <fieldset
              disabled={createChargeMutation.isPending || updateChargeMutation.isPending}
              className="border-0 p-0 m-0 min-w-0 space-y-4"
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
                    min="0"
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
            </fieldset>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowChargeForm(false); setEditingCharge(null) }}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={createChargeMutation.isPending || updateChargeMutation.isPending}
                >
                  {createChargeMutation.isPending || updateChargeMutation.isPending
                    ? 'Enregistrement...'
                    : editingCharge
                    ? 'Mettre à jour'
                    : 'Créer la charge'}
                </Button>
              </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
