'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoiceService } from '@/lib/services/invoice.service.client'
import { paymentService } from '@/lib/services/payment.service.client'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Plus, DollarSign, Calendar, FileText, CheckCircle, XCircle, Clock, CreditCard, Building2, Download, Receipt, Mail, PenTool, Send, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { useState } from 'react'
import { useToast } from '@/components/ui/toast'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { documentTemplateService } from '@/lib/services/document-template.service.client'
import { extractDocumentVariables } from '@/lib/utils/document-generation/variable-extractor'
import { emailService } from '@/lib/services/email.service'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { StudentWithRelations, InvoiceWithRelations } from '@/lib/types/query-types'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { NotificationService } from '@/lib/services/notification.service'
import { FulllInvoiceAction } from '@/components/accounting/fulll-invoice-action'

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
  const { data: payments, refetch: refetchPayments } = useQuery<Payment[]>({
    queryKey: ['payments', invoiceId],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return paymentService.getAll(user.organization_id, { invoiceId }) as Promise<Payment[]>
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
        logger.warn('Erreur lors de la récupération de l\'année académique', sanitizeError(error))
        return null
      }
      return data || null
    },
    enabled: !!user?.organization_id,
  })

  // Un devis et une facture n'utilisent pas le même modèle de document — un
  // avoir réutilise le modèle facture (aucun modèle "avoir" dédié n'existe).
  const documentTemplateType = invoice?.document_type === 'quote' ? 'devis' : 'facture'
  const documentLabel = invoice?.document_type === 'quote' ? 'devis' : invoice?.document_type === 'credit_note' ? 'avoir' : 'facture'
  const documentLabelCapitalized = documentLabel.charAt(0).toUpperCase() + documentLabel.slice(1)
  // Articles grammaticaux : "devis" est masculin, "facture" est féminin, "avoir" est masculin à voyelle
  const documentArticle = documentLabel === 'avoir' ? "l'" : documentLabel === 'facture' ? 'la ' : 'le '
  const documentArticleDe = documentLabel === 'avoir' ? "de l'" : documentLabel === 'facture' ? 'de la ' : 'du '

  // Récupérer le modèle par défaut correspondant au type de document (devis/facture)
  const { data: invoiceTemplate } = useQuery({
    queryKey: ['invoice-template', user?.organization_id, documentTemplateType],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const templates = await documentTemplateService.getTemplatesByType(
        documentTemplateType,
        user.organization_id
      )
      return templates.length > 0 ? templates[0] : null
    },
    enabled: !!user?.organization_id && !!invoice,
  })

  // Tous les modèles actifs du type courant (devis/facture), pour permettre à
  // l'utilisateur de choisir explicitement un autre modèle que le défaut avant
  // de générer le document.
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>()
  const { data: allTemplates } = useQuery({
    queryKey: ['document-templates', 'all', user?.organization_id, documentTemplateType],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return documentTemplateService.getAllTemplates(user.organization_id, { type: documentTemplateType, isActive: true })
    },
    enabled: !!user?.organization_id,
  })
  const availableTemplates = allTemplates || []
  const effectiveTemplate = selectedTemplateId
    ? availableTemplates.find((t) => t?.id === selectedTemplateId) || invoiceTemplate
    : invoiceTemplate

  // Envoi par email
  const [emailPreview, setEmailPreview] = useState<{
    to: string
    subject: string
    bodyText: string
    filename: string
  } | null>(null)
  const [isEmailSending, setIsEmailSending] = useState(false)

  // Demande de signature
  const [signatureRequestOpen, setSignatureRequestOpen] = useState(false)
  const [signatureRequestForm, setSignatureRequestForm] = useState<{
    recipientEmail: string
    recipientName: string
    subject: string
    message: string
  } | null>(null)
  const [isSendingSignatureRequest, setIsSendingSignatureRequest] = useState(false)

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
      ?.filter((p: Payment) => p.status === 'completed')
      .reduce((sum: number, p: Payment) => sum + Number(p.amount), 0) || 0
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
          ?.filter((p: Payment) => p.status === 'completed')
          .reduce((sum: number, p: Payment) => sum + Number(p.amount), 0) || 0
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
    onError: (error: unknown) => {
      addToast({
        type: 'error',
        title: 'Erreur lors de lenregistrement du paiement',
        description: error instanceof Error ? error.message : 'Veuillez vérifier les informations saisies.',
      })
    },
  })

  // Mutation pour créer un avoir (doit être avant les returns conditionnels)
  // Délègue à InvoiceService.createCreditNote : génère un numéro dédié
  // (AVO-YYYY-NNN), plafonne le montant au solde encore créditable de la
  // facture (en tenant compte des avoirs déjà émis dessus) et enregistre un
  // vrai lien vers la facture d'origine (original_invoice_id).
  const createCreditNoteMutation = useMutation({
    mutationFn: async () => {
      if (!invoice) throw new Error('Facture non trouvée')
      if (!user?.organization_id) throw new Error('Organisation manquante')

      const amountNumber = parseFloat(creditNoteForm.amount)
      if (isNaN(amountNumber) || amountNumber <= 0) {
        throw new Error('Montant de l\'avoir invalide')
      }

      return invoiceService.createCreditNote({
        organizationId: user.organization_id,
        originalInvoiceId: invoice.id,
        amount: amountNumber,
        reason: [creditNoteForm.reason, creditNoteForm.notes].filter(Boolean).join(' — ') || 'Avoir',
      })
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
    onError: (error: unknown) => {
      addToast({
        type: 'error',
        title: 'Erreur lors de la création de l\'avoir',
        description: error instanceof Error ? error.message : 'Veuillez vérifier les informations saisies.',
      })
    },
  })

  // Validation manuelle — pour les devis validés autrement que par signature
  // électronique (téléphone, email...). Alerte les coordos comme le fait la
  // signature électronique, pour qu'une session soit planifiée.
  // (doit être avant les returns conditionnels, cf. createCreditNoteMutation ci-dessus)
  const validateMutation = useMutation({
    mutationFn: async () => {
      if (!invoice || !user) return
      await invoiceService.update(invoice.id, {
        validated_at: new Date().toISOString(),
        validated_by: user.id,
      })

      if (user.organization_id) {
        const { data: coordUsers } = await supabase
          .from('users')
          .select('id')
          .eq('organization_id', user.organization_id)
          .in('role', ['super_admin', 'admin', 'secretary'])
        const coordUserIds = (coordUsers ?? []).map((u) => u.id)
        if (coordUserIds.length > 0) {
          // La policy RLS INSERT sur notifications n'autorise pas un client
          // authentifié classique à créer une notification pour un AUTRE
          // utilisateur via un simple .insert() — seule la fonction RPC
          // create_notification() (SECURITY DEFINER) le permet de manière fiable.
          const notificationService = new NotificationService(supabase)
          await Promise.all(
            coordUserIds.map((coordUserId) =>
              notificationService.create({
                user_id: coordUserId,
                organization_id: user.organization_id!,
                type: 'document',
                title: 'Devis validé',
                message: `${documentLabelCapitalized} ${invoice.invoice_number || 'Brouillon'} a été validé manuellement — une session est peut-être à planifier.`,
                data: { invoice_id: invoice.id },
                link: `/dashboard/payments/${invoice.id}`,
              })
            )
          )
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      addToast({ type: 'success', title: 'Devis marqué comme validé' })
    },
    onError: (error: unknown) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de marquer ce devis comme validé.',
      })
    },
  })

  const unvalidateMutation = useMutation({
    mutationFn: async () => {
      if (!invoice) return
      await invoiceService.update(invoice.id, { validated_at: null, validated_by: null })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      addToast({ type: 'success', title: 'Validation annulée' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await invoiceService.remove(invoiceId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      addToast({ type: 'success', title: 'Devis supprimé' })
      router.push('/dashboard/payments')
    },
    onError: (error: unknown) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de supprimer ce devis.',
      })
    },
  })

  const handleDelete = () => {
    if (!invoice) return
    const warning = invoice.validated_at || invoice.status !== 'draft'
      ? '\n\nCe devis n\'est plus à l\'état brouillon (statut ou validation déjà avancés) — la suppression restera définitive.'
      : ''
    const ok = window.confirm(`Supprimer définitivement le devis ${invoice.invoice_number || ''} ? Cette action est irréversible.${warning}`)
    if (!ok) return
    deleteMutation.mutate()
  }

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
          <div className="text-muted-foreground">Document non trouvé</div>
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

  // Génère le PDF du document (devis/facture/avoir) via le modèle sélectionné
  // (ou le modèle par défaut) en passant par la route serveur Puppeteer —
  // le même pipeline que celui utilisé pour les factures/devis de session,
  // pour garantir un rendu fidèle au modèle établi. Réutilisé par le
  // téléchargement, l'envoi par email et la demande de signature.
  const generateInvoicePdfBlob = async (): Promise<Blob> => {
    if (!invoice || !organization || !effectiveTemplate || !user?.organization_id) {
      throw new Error('Données manquantes pour la génération du document.')
    }

    const student = invoice.students as StudentWithRelations | undefined
    const invoiceData = invoice as InvoiceWithRelations

    let paymentCompany = null
    let effectif: number | undefined
    if (student?.id) {
      const { data: ce } = await supabase.from('company_employees').select('companies(*)').eq('student_id', student.id).eq('is_active', true).limit(1).maybeSingle()
      if (ce?.companies && !Array.isArray(ce.companies)) paymentCompany = ce.companies
    } else if (invoiceData.entity_id) {
      const [{ data: entityRow }, { data: reservationRow }] = await Promise.all([
        supabase.from('external_entities').select('*').eq('id', invoiceData.entity_id).single(),
        invoiceData.session_entity_reservation_id
          ? supabase.from('session_entity_reservations').select('expected_count, billing_mode, billing_quantity').eq('id', invoiceData.session_entity_reservation_id).single()
          : Promise.resolve({ data: null }),
      ])
      if (entityRow) paymentCompany = entityRow
      if (reservationRow) {
        const needsSeparateQuantity = reservationRow.billing_mode === 'per_group' || reservationRow.billing_mode === 'per_client' || reservationRow.billing_mode === 'per_hour'
        effectif = needsSeparateQuantity && reservationRow.billing_quantity ? reservationRow.billing_quantity : reservationRow.expected_count
      }
    }

    // Le programme et la formation choisis à la création du devis/facture ne
    // sont pas automatiquement liés à une session — on les récupère donc ici
    // pour alimenter les variables {programme_nom}/{formation_nom} du modèle.
    // {formation_nom} n'existe côté extracteur que via session.formations,
    // d'où l'objet "session" minimal ci-dessous ne portant que la formation.
    const [{ data: programRow }, { data: formationRow }] = await Promise.all([
      invoiceData.program_id
        ? supabase.from('programs').select('*').eq('id', invoiceData.program_id).single()
        : Promise.resolve({ data: null }),
      invoiceData.formation_id
        ? supabase.from('formations').select('*').eq('id', invoiceData.formation_id).single()
        : Promise.resolve({ data: null }),
    ])

    const variables = extractDocumentVariables({
      student,
      organization: organization as TableRow<'organizations'>,
      session: formationRow ? ({ formations: formationRow } as any) : undefined,
      invoice: invoiceData,
      academicYear,
      company: paymentCompany as any,
      program: (programRow as any) ?? undefined,
      language: 'fr',
      issueDate: invoice.issue_date ?? undefined,
      effectif,
    })

    const response = await fetch('/api/documents/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: effectiveTemplate,
        variables,
        documentId: undefined,
        organizationId: user.organization_id,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
      throw new Error(errorData.details || errorData.error || errorData.message || 'Erreur lors de la génération du PDF')
    }

    return await response.blob()
  }

  // Fonction pour télécharger le document (devis/facture/avoir)
  const handleDownloadInvoice = async () => {
    if (!invoice || !organization || !effectiveTemplate) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: `Impossible de générer ${documentArticle}${documentLabel}. Données manquantes.`,
      })
      return
    }

    setIsDownloadingInvoice(true)

    try {
      const pdfBlob = await generateInvoicePdfBlob()
      const filename = `${documentLabel}_${invoice.invoice_number}.pdf`
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      addToast({
        type: 'success',
        title: `${documentLabelCapitalized} téléchargé${documentLabel === 'facture' ? 'e' : ''}`,
        description: `${documentArticle.charAt(0).toUpperCase()}${documentArticle.slice(1)}${documentLabel} a été généré${documentLabel === 'facture' ? 'e' : ''} et téléchargé${documentLabel === 'facture' ? 'e' : ''} avec succès.`,
      })
    } catch (error) {
      logger.error(`Erreur lors de la génération ${documentArticleDe}${documentLabel}:`, error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: `Une erreur est survenue lors de la génération ${documentArticleDe}${documentLabel}.`,
      })
    } finally {
      setIsDownloadingInvoice(false)
    }
  }

  // Destinataire du devis/facture : l'apprenant nommé, ou l'entreprise externe
  // quand le document a été émis directement à une entité.
  const getInvoiceRecipient = (): { email: string | null; name: string } => {
    if (!invoice) return { email: null, name: '' }
    const student = invoice.students as (StudentWithRelations & { email?: string | null }) | undefined
    if (student) {
      return {
        email: student.email || null,
        name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
      }
    }
    const entity = invoice.external_entities
    return {
      email: entity?.email || null,
      name: entity?.name || 'Entreprise',
    }
  }

  const handleOpenEmailDialog = () => {
    if (!invoice) return
    const recipient = getInvoiceRecipient()
    if (!recipient.email) {
      addToast({ type: 'error', title: 'Email manquant', description: 'Aucun email n\'est renseigné pour ce destinataire.' })
      return
    }

    const invoiceNumber = invoice.invoice_number || 'Brouillon'
    const filenameSafe = String(invoiceNumber).replace(/[^\w.-]+/g, '_')
    const filename = `${documentLabel}_${filenameSafe}.pdf`
    const orgName = (organization as { name?: string } | null)?.name ?? 'EDUZEN'
    const subject = `${documentLabelCapitalized} ${invoiceNumber} (${orgName})`
    const bodyText =
      `Bonjour ${recipient.name},\n\n` +
      `Veuillez trouver en pièce jointe ${documentArticle}${documentLabel} ${invoiceNumber}.\n\n` +
      `Cordialement,\n${orgName}\n`

    setEmailPreview({ to: recipient.email, subject, bodyText, filename })
  }

  const handleConfirmSendEmail = async () => {
    if (!emailPreview) return

    setIsEmailSending(true)
    try {
      const pdfBlob = await generateInvoicePdfBlob()

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
        emailPreview.bodyText,
        invoice?.document_type === 'quote' ? 'devis_email' : 'facture_email',
        invoice ? { invoice_id: invoice.id } : undefined
      )

      addToast({
        type: 'success',
        title: 'Email envoyé',
        description: `${documentLabelCapitalized} envoyé${documentLabel === 'facture' ? 'e' : ''} à ${emailPreview.to}.`,
      })
      setEmailPreview(null)
    } catch (error) {
      logger.error('Erreur lors de l\'envoi email du document:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'envoi par email.',
      })
    } finally {
      setIsEmailSending(false)
    }
  }

  const handleOpenSignatureRequest = () => {
    if (!invoice) return
    const recipient = getInvoiceRecipient()
    if (!recipient.email) {
      addToast({ type: 'error', title: 'Erreur', description: 'Aucun email n\'est renseigné pour ce destinataire.' })
      return
    }
    const verb = documentLabel === 'facture' ? 'la signer' : 'le signer'
    const orgName = (organization as { name?: string } | null)?.name ?? ''
    setSignatureRequestForm({
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      subject: `Demande de signature : ${documentLabelCapitalized} ${invoice.invoice_number || 'Brouillon'} - ${recipient.name}`,
      message:
        `Bonjour ${recipient.name},\n\n` +
        `Veuillez trouver ci-joint ${documentArticle}${documentLabel} ${invoice.invoice_number || ''}.\n\n` +
        `Merci de bien vouloir ${verb} en ligne.\n\n` +
        `Cordialement,\n${orgName}`,
    })
    setSignatureRequestOpen(true)
  }

  const handleConfirmSignatureRequest = async () => {
    if (!invoice || !signatureRequestForm) return

    setIsSendingSignatureRequest(true)
    try {
      const pdfBlob = await generateInvoicePdfBlob()
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(pdfBlob)
      })

      const student = invoice.students as StudentWithRelations | undefined
      const recipientName = getInvoiceRecipient().name
      const documentTitle = `${documentLabelCapitalized} ${invoice.invoice_number || 'Brouillon'} - ${recipientName}`

      const response = await fetch('/api/signature-requests/send-from-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          documentTitle,
          type: invoice.document_type === 'quote' ? 'quote' : 'invoice',
          invoiceId: invoice.id,
          recipientEmail: signatureRequestForm.recipientEmail,
          recipientName: signatureRequestForm.recipientName,
          recipientId: student?.id,
          subject: signatureRequestForm.subject,
          message: signatureRequestForm.message,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Erreur lors de l\'envoi')
      }

      setSignatureRequestOpen(false)
      setSignatureRequestForm(null)
      addToast({
        type: 'success',
        title: 'Demande de signature envoyée',
        description: 'Le document a été généré et envoyé au destinataire pour signature en ligne.',
      })
    } catch (error) {
      logger.error('Erreur lors de l\'envoi de la demande de signature:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de l\'envoi de la demande de signature',
      })
    } finally {
      setIsSendingSignatureRequest(false)
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
              {documentLabelCapitalized} {invoice.invoice_number}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {(invoice as unknown as { entity_id?: string | null; external_entities?: { name: string } | null }).entity_id
                ? (invoice as unknown as { external_entities?: { name: string } | null }).external_entities?.name
                : `${invoice.students?.first_name ?? ''} ${invoice.students?.last_name ?? ''}`.trim()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
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
          {invoice.document_type !== 'credit_note' && invoice.document_type !== 'quote' && (
            <Button variant="outline" onClick={() => setShowCreditNoteForm(!showCreditNoteForm)}>
              <Receipt className="mr-2 h-4 w-4" />
              Créer un avoir
            </Button>
          )}
          {invoice.document_type === 'quote' && (
            <Link href={`/dashboard/payments/${invoice.id}/edit`}>
              <Button variant="outline">
                <Pencil className="mr-2 h-4 w-4" />
                Modifier
              </Button>
            </Link>
          )}
          {invoice.document_type === 'quote' && (
            invoice.validated_at ? (
              <Button
                variant="outline"
                onClick={() => unvalidateMutation.mutate()}
                disabled={unvalidateMutation.isPending}
              >
                <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" />
                Annuler la validation
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => validateMutation.mutate()}
                disabled={validateMutation.isPending}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {validateMutation.isPending ? 'Validation...' : 'Marquer comme validé'}
              </Button>
            )
          )}
          {invoice.document_type === 'quote' && (
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </Button>
          )}
        </div>
      </div>

      {/* Modèle de document + actions (téléchargement, email, signature) */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700">Modèle {documentArticleDe}{documentLabel}</Label>
            <Select
              value={selectedTemplateId || ''}
              onValueChange={(value) => setSelectedTemplateId(value || undefined)}
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Modèle par défaut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Modèle par défaut</SelectItem>
                {availableTemplates.map((template) => (
                  <SelectItem key={template?.id ?? ''} value={template?.id ?? ''}>
                    {template?.name ?? ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={handleDownloadInvoice}
            disabled={isDownloadingInvoice || !effectiveTemplate}
          >
            <Download className="mr-2 h-4 w-4" />
            {isDownloadingInvoice ? 'Génération...' : `Télécharger ${documentArticle}${documentLabel}`}
          </Button>
          <Button
            variant="outline"
            onClick={handleOpenEmailDialog}
            disabled={!effectiveTemplate}
          >
            <Mail className="mr-2 h-4 w-4" />
            Envoyer par email
          </Button>
          <Button
            variant="outline"
            onClick={handleOpenSignatureRequest}
            disabled={!effectiveTemplate}
          >
            <PenTool className="mr-2 h-4 w-4" />
            Demande de signature
          </Button>
          {invoice.document_type !== 'quote' && (
            <div className="w-full pt-2 border-t">
              <FulllInvoiceAction
                invoiceId={invoice.id}
                documentType={invoice.document_type}
                invoiceUpdatedAt={(invoice as unknown as { updated_at?: string | null }).updated_at}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations principales */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Détails {documentArticleDe}{documentLabel}</CardTitle>
                <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(invoice.status || 'pending')}`}>
                  {getStatusLabel(invoice.status || 'pending')}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {invoice.document_type === 'quote' && invoice.validated_at && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Validé manuellement le {formatDate(invoice.validated_at)}
                </div>
              )}
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
                  <p className="font-medium">{formatDate(invoice.issue_date || '')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date d'échéance</p>
                  <p className={`font-medium ${invoice.due_date && invoice.due_date < new Date().toISOString().split('T')[0] && invoice.status !== 'paid' ? 'text-red-600' : ''}`}>
                    {formatDate(invoice.due_date || '')}
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

                  {recordPaymentMutation.error != null && (
                    <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                      {recordPaymentMutation.error instanceof Error
                        ? recordPaymentMutation.error.message
                        : String((recordPaymentMutation.error as { message?: string })?.message ?? 'Une erreur est survenue')}
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
                      Montant total {documentArticleDe}{documentLabel}: {formatCurrency(Number(invoice.total_amount), invoice.currency)}
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

                  {createCreditNoteMutation.error != null && (
                    <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                      {createCreditNoteMutation.error instanceof Error
                        ? createCreditNoteMutation.error.message
                        : String((createCreditNoteMutation.error as { message?: string })?.message ?? 'Une erreur est survenue')}
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
                  Document : <span className="font-semibold">{documentLabelCapitalized}</span> —{' '}
                  <span className="font-semibold">{invoice.invoice_number}</span>
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
                  Le document sera généré en PDF et joint automatiquement lors de l'envoi.
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
              onClick={handleConfirmSendEmail}
              disabled={!emailPreview || isEmailSending || !emailPreview.to?.trim() || !emailPreview.subject?.trim()}
            >
              {isEmailSending ? 'Envoi...' : 'Envoyer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Demande de signature */}
      <Dialog
        open={signatureRequestOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSignatureRequestOpen(false)
            setSignatureRequestForm(null)
          }
        }}
      >
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
            {signatureRequestForm && (
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-700">
                    Document : <span className="font-semibold">{documentLabelCapitalized}</span> —{' '}
                    <span className="font-semibold">{invoice.invoice_number || 'Brouillon'}</span>
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
                setSignatureRequestOpen(false)
                setSignatureRequestForm(null)
              }}
              className="border-gray-200 hover:bg-gray-100 hover:text-gray-900"
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirmSignatureRequest}
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
    </div>
  )
}

