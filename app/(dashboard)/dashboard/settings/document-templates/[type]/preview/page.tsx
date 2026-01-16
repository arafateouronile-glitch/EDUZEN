'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { documentTemplateService } from '@/lib/services/document-template.service'
import { studentService } from '@/lib/services/student.service'
import { invoiceService } from '@/lib/services/invoice.service'
import { paymentService } from '@/lib/services/payment.service'
import type { DocumentTemplate, DocumentVariables } from '@/lib/types/document-templates'
import {
  mapStudentToVariables,
  mapInvoiceToVariables,
  mapPaymentToVariables,
  mapSessionToVariables,
} from '@/lib/utils/document-generation/variable-mapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { GlassCard } from '@/components/ui/glass-card'
import { ArrowLeft, Download, Eye, FileDown, User, FileText, CreditCard, Calendar } from 'lucide-react'
import Link from 'next/link'
import { SkeletonLoader } from '../edit/components/skeleton-loader'
import { getDocumentTypeConfig } from '../edit/utils/document-type-config'
import type { StudentWithRelations } from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'

type Organization = TableRow<'organizations'>
type Invoice = TableRow<'invoices'>
type Session = TableRow<'sessions'>
type Payment = TableRow<'payments'>

export default function DocumentTemplatePreviewPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const supabase = createClient()
  const documentType = params.type as string
  const docConfig = getDocumentTypeConfig(documentType as any)
  const templateIdParam = searchParams.get('template_id')

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<'sample' | 'real'>('real')
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('')
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('')
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')

  // Charger le template
  const { data: template, isLoading } = useQuery({
    queryKey: ['document-template', user?.organization_id, documentType, templateIdParam],
    queryFn: async () => {
      if (!user?.organization_id) return null
      
      // Si un template_id est fourni, charger ce template spécifique
      if (templateIdParam) {
        try {
          const specificTemplate = await documentTemplateService.getTemplateById(templateIdParam)
          // Vérifier que le template correspond au type de document
          if (specificTemplate.type === documentType) {
            return specificTemplate
          }
        } catch (error) {
          console.error('Erreur lors du chargement du template spécifique:', error)
          // Continuer avec le chargement du template par défaut
        }
      }
      
      // Sinon, charger le template par défaut
      return documentTemplateService.getDefaultTemplate(user.organization_id, documentType as any)
    },
    enabled: !!user?.organization_id,
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

  // Récupérer les étudiants
  const { data: students } = useQuery({
    queryKey: ['students', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return studentService.getAll(user.organization_id)
    },
    enabled: !!user?.organization_id && dataSource === 'real',
  })

  // Récupérer les factures
  const { data: invoices } = useQuery({
    queryKey: ['invoices', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return invoiceService.getAll(user.organization_id, {})
    },
    enabled: !!user?.organization_id && dataSource === 'real',
  })

  // Récupérer les paiements
  const { data: payments } = useQuery({
    queryKey: ['payments', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      try {
        // Essayer d'abord avec le service
        const allPayments = await paymentService.getAll(user.organization_id)
        return allPayments.slice(0, 50)
      } catch (error: any) {
        // Si le service échoue (relations manquantes), essayer une requête simple sans relations
        const errorCode = error?.code || error?.originalError?.code || error?.status
        const errorMessage = error?.message || error?.originalError?.message || String(error)
        const errorDetails = error?.details || error?.hint || ''
        
        // Si c'est une erreur de relation ou 400, essayer une requête simple
        const isRelationError = 
          errorCode === 'PGRST116' || 
          errorCode === '42P01' || 
          errorCode === 'PGRST200' ||
          errorCode === 'PGRST301' ||
          errorCode === '400' ||
          error?.status === 400 ||
          errorMessage?.toLowerCase().includes('relation') ||
          errorMessage?.toLowerCase().includes('relationship') ||
          errorMessage?.toLowerCase().includes('does not exist') ||
          errorMessage?.toLowerCase().includes('schema cache') ||
          errorMessage?.toLowerCase().includes('invalid query') ||
          errorDetails?.toLowerCase().includes('relation') ||
          errorDetails?.toLowerCase().includes('relationship')
        
        if (isRelationError) {
          console.warn('Relations non disponibles, récupération des paiements sans relations:', {
            errorCode,
            errorMessage,
            errorDetails,
          })
          try {
            // Requête simple sans relations
            const { data, error: simpleError } = await supabase
              .from('payments')
              .select('*')
              .eq('organization_id', user.organization_id)
              .order('created_at', { ascending: false })
              .limit(50)
            
            if (simpleError) {
              console.warn('Erreur lors de la récupération simple des paiements:', simpleError)
              return []
            }
            return data || []
          } catch (fallbackError: any) {
            console.warn('Erreur lors de la récupération de fallback des paiements:', fallbackError)
            return []
          }
        }
        // Pour les autres erreurs, logger et retourner un tableau vide
        console.error('Erreur lors de la récupération des paiements:', error)
        return []
      }
    },
    enabled: !!user?.organization_id && dataSource === 'real',
    retry: false, // Ne pas réessayer automatiquement pour éviter les erreurs répétées
  })

  // Récupérer les sessions
  const { data: sessions } = useQuery({
    queryKey: ['sessions', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('sessions')
        .select('*, formations(*)')
        .eq('organization_id', user.organization_id)
        .order('start_date', { ascending: false })
        .limit(50)
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id && dataSource === 'real',
  })

  // Récupérer l'étudiant sélectionné
  const { data: selectedStudent } = useQuery({
    queryKey: ['student', selectedStudentId],
    queryFn: async () => {
      if (!selectedStudentId) return null
      const student = await studentService.getById(selectedStudentId)
      // Récupérer la session/classe
      if (student?.class_id) {
        const { data: session } = await supabase
          .from('sessions')
          .select('*, formations(*)')
          .eq('id', student.class_id)
          .single()
        return { ...student, session }
      }
      return student
    },
    enabled: !!selectedStudentId && dataSource === 'real',
  })

  // Récupérer la facture sélectionnée
  const { data: selectedInvoice } = useQuery({
    queryKey: ['invoice', selectedInvoiceId],
    queryFn: async () => {
      if (!selectedInvoiceId) return null
      const invoice = await invoiceService.getById(selectedInvoiceId)
      if (invoice?.student_id) {
        const student = await studentService.getById(invoice.student_id)
        return { ...invoice, student }
      }
      return invoice
    },
    enabled: !!selectedInvoiceId && dataSource === 'real',
  })

  // Générer les variables selon la source de données
  const getVariables = (): DocumentVariables => {
    if (dataSource === 'sample') {
      // Données fictives
      return {
        ecole_nom: 'École Moderne de Dakar',
        ecole_logo: '',
        ecole_adresse: '123 Avenue de l\'Education, Dakar, Sénégal',
        ecole_ville: 'Dakar',
        ecole_telephone: '+221 77 123 45 67',
        ecole_email: 'contact@ecolemoderne.sn',
        ecole_site_web: 'www.ecolemoderne.sn',
        eleve_nom: 'DIALLO',
        eleve_prenom: 'Amadou',
        eleve_numero: 'LYC001',
        eleve_date_naissance: '15/03/2007',
        eleve_classe: 'Terminale A',
        formation_nom: 'Formation en Développement Web',
        formation_code: 'DEV-WEB-2024',
        formation_duree: '6 mois',
        formation_prix: '500 000 XOF',
        session_nom: 'Session Janvier 2024',
        session_debut: '01/01/2024',
        session_fin: '30/06/2024',
        date_jour: new Date().toLocaleDateString('fr-FR'),
        date_emission: new Date().toLocaleDateString('fr-FR'),
        annee_scolaire: '2024-2025',
        numero_document: '2025-001',
        date_generation: new Date().toLocaleDateString('fr-FR'),
        numero_page: 1,
        total_pages: 1,
      }
    }

    // Données réelles
    if (selectedStudentId && selectedStudent) {
      return mapStudentToVariables(
        selectedStudent,
        organization,
        (selectedStudent as any).session,
        (selectedStudent as any).session?.formations
      )
    }

    if (selectedInvoiceId && selectedInvoice) {
      return mapInvoiceToVariables(
        selectedInvoice,
        (selectedInvoice as any).student,
        organization
      )
    }

    if (selectedPaymentId && payments) {
      const payment = payments.find((p: any) => p.id === selectedPaymentId)
      if (payment) {
        // Les relations peuvent être dans invoices (array) ou invoice (single), et students (array) ou student (single)
        const invoice = Array.isArray((payment as any).invoices) 
          ? (payment as any).invoices[0] 
          : (payment as any).invoices || (payment as any).invoice
        const student = Array.isArray((payment as any).students)
          ? (payment as any).students[0]
          : (payment as any).students || (payment as any).student
        return mapPaymentToVariables(
          payment,
          invoice,
          student,
          organization
        )
      }
    }

    if (selectedSessionId && sessions) {
      const session = sessions.find((s: any) => s.id === selectedSessionId)
      if (session) {
        return mapSessionToVariables(
          session,
          (session as any).formations,
          organization
        )
      }
    }

    // Par défaut, utiliser le premier étudiant disponible
    if (students && students.length > 0) {
      return mapStudentToVariables(students[0] as StudentWithRelations, organization)
    }

    // Fallback: données minimales
    return {
      ecole_nom: organization?.name || '',
      date_jour: new Date().toLocaleDateString('fr-FR'),
      date_emission: new Date().toLocaleDateString('fr-FR'),
      numero_document: 'DOC_001',
      date_generation: new Date().toLocaleDateString('fr-FR'),
      numero_page: 1,
      total_pages: 1,
    }
  }

  // Générer la prévisualisation
  useEffect(() => {
    if (template) {
      const variables = getVariables()
      generatePreview(template, variables).then((url) => {
        setPreviewUrl(url)
      })
    }
  }, [template, dataSource, selectedStudentId, selectedInvoiceId, selectedPaymentId, selectedSessionId, organization, students, invoices, payments, sessions])

  const generatePreview = async (template: DocumentTemplate, variables: DocumentVariables) => {
    try {
      // Appeler l'API de génération
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Inclure les cookies pour l'authentification
        body: JSON.stringify({
          template_id: template.id,
          format: 'PDF',
          variables,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `Erreur ${response.status}: ${response.statusText}`
        const errorStack = errorData.stack
        console.error('Erreur API:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          stack: errorStack,
          fullError: errorData
        })
        throw new Error(errorMessage)
      }

      const data = await response.json()
      return data.downloadUrl
    } catch (error) {
      console.error('Erreur lors de la génération du preview:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      // Afficher l'erreur à l'utilisateur
      alert(`Erreur lors de la génération: ${errorMessage}`)
      return null
    }
  }

  if (isLoading || !template) {
    return <SkeletonLoader />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings/document-templates">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <docConfig.icon className="h-6 w-6" style={{ color: docConfig.color }} />
              Prévisualisation - {docConfig.name}
            </h1>
            <p className="text-sm text-text-tertiary mt-1">
              Aperçu du document avec données réelles ou fictives
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/settings/document-templates/${documentType}/edit`}>
            <Button variant="outline">
              Modifier
            </Button>
          </Link>
          {previewUrl && (
            <a href={previewUrl} download={`${docConfig.name}_preview.pdf`}>
              <Button variant="default">
                <Download className="h-4 w-4 mr-2" />
                Télécharger PDF
              </Button>
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sélecteur de données */}
        <div className="lg:col-span-1">
          <GlassCard variant="premium" className="p-6">
            <h3 className="font-semibold text-text-primary mb-4">Source de données</h3>
            
            <div className="space-y-4">
              <div>
                <Label>Type de données</Label>
                <select
                  value={dataSource}
                  onChange={(e) => {
                    setDataSource(e.target.value as 'sample' | 'real')
                    setSelectedStudentId('')
                    setSelectedInvoiceId('')
                    setSelectedPaymentId('')
                    setSelectedSessionId('')
                  }}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  <option value="real">Données réelles</option>
                  <option value="sample">Données fictives</option>
                </select>
              </div>

              {dataSource === 'real' && (
                <>
                  {/* Sélection étudiant */}
                  {['attestation_reussite', 'certificat_scolarite', 'releve_notes', 'attestation_entree', 'attestation_assiduite'].includes(documentType) && (
                    <div>
                      <Label htmlFor="student" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Étudiant
                      </Label>
                      <select
                        id="student"
                        value={selectedStudentId}
                        onChange={(e) => {
                          setSelectedStudentId(e.target.value)
                          setSelectedInvoiceId('')
                          setSelectedPaymentId('')
                          setSelectedSessionId('')
                        }}
                        className="w-full mt-1 px-3 py-2 border rounded-lg"
                      >
                        <option value="">Sélectionner un étudiant</option>
                        {students?.map((student: any) => (
                          <option key={student.id} value={student.id}>
                            {student.last_name} {student.first_name} ({student.student_number})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Sélection facture */}
                  {documentType === 'facture' && (
                    <div>
                      <Label htmlFor="invoice" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Facture
                      </Label>
                      <select
                        id="invoice"
                        value={selectedInvoiceId}
                        onChange={(e) => {
                          setSelectedInvoiceId(e.target.value)
                          setSelectedStudentId('')
                          setSelectedPaymentId('')
                          setSelectedSessionId('')
                        }}
                        className="w-full mt-1 px-3 py-2 border rounded-lg"
                      >
                        <option value="">Sélectionner une facture</option>
                        {invoices?.map((invoice: any) => (
                          <option key={invoice.id} value={invoice.id}>
                            {invoice.invoice_number} - {(invoice.students as any)?.first_name} {(invoice.students as any)?.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Sélection paiement */}
                  {documentType === 'recu_paiement' && (
                    <div>
                      <Label htmlFor="payment" className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Paiement
                      </Label>
                      <select
                        id="payment"
                        value={selectedPaymentId}
                        onChange={(e) => {
                          setSelectedPaymentId(e.target.value)
                          setSelectedStudentId('')
                          setSelectedInvoiceId('')
                          setSelectedSessionId('')
                        }}
                        className="w-full mt-1 px-3 py-2 border rounded-lg"
                      >
                        <option value="">Sélectionner un paiement</option>
                        {payments?.map((payment: any) => {
                          // Gérer les relations qui peuvent être un array ou un objet
                          const student = Array.isArray(payment.students) 
                            ? payment.students[0] 
                            : payment.students || payment.student
                          const studentName = student 
                            ? `${student.first_name || ''} ${student.last_name || ''}`.trim()
                            : 'N/A'
                          return (
                            <option key={payment.id} value={payment.id}>
                              {payment.payment_number || payment.id} - {studentName}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  )}

                  {/* Sélection session */}
                  {['certificat_scolarite'].includes(documentType) && (
                    <div>
                      <Label htmlFor="session" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Session
                      </Label>
                      <select
                        id="session"
                        value={selectedSessionId}
                        onChange={(e) => {
                          setSelectedSessionId(e.target.value)
                          setSelectedStudentId('')
                          setSelectedInvoiceId('')
                          setSelectedPaymentId('')
                        }}
                        className="w-full mt-1 px-3 py-2 border rounded-lg"
                      >
                        <option value="">Sélectionner une session</option>
                        {sessions?.map((session: any) => (
                          <option key={session.id} value={session.id}>
                            {session.name} - {(session.formations as any)?.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Prévisualisation */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Aperçu du document</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[800px] border-0"
                  title="Prévisualisation du document"
                />
              ) : (
                <div className="flex items-center justify-center h-96 text-text-tertiary">
                  <div className="text-center">
                    <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Génération de la prévisualisation...</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


