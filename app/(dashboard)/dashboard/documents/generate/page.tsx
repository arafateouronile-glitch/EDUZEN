'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { documentService } from '@/lib/services/document.service'
import { programService } from '@/lib/services/program.service'
import { generatePDFFromHTML, generateSimplePDF, generatePDFBlobFromHTML } from '@/lib/utils/pdf-generator'
import { generateHTML } from '@/lib/utils/document-generation/html-generator'
import { extractDocumentVariables, mapDocumentTypeToTemplateType } from '@/lib/utils/document-generation/variable-extractor'
import { documentTemplateService } from '@/lib/services/document-template.service.client'
import { emailTemplateService } from '@/lib/services/email-template.service.client'
import { TemplateSelector } from '@/components/document-editor/template-selector'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  ArrowLeft, Download, FileText, Receipt, FileCheck, Calendar, 
  ClipboardList, Award, GraduationCap, BookOpen, UserCheck, 
  Shield, Scale, Book, CheckCircle, Mail, Send, X, CheckCircle2
} from 'lucide-react'
import Link from 'next/link'
import type { StudentWithRelations, SessionWithRelations, InvoiceWithRelations } from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'
import type { DocumentType } from '@/lib/types/document-templates'

type Organization = TableRow<'organizations'>
type Student = TableRow<'students'>
type Session = TableRow<'sessions'>
type Invoice = TableRow<'invoices'>

export default function GenerateDocumentPage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const [documentType, setDocumentType] = useState<DocumentType | ''>('')
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('')
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('')
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [selectedProgramId, setSelectedProgramId] = useState<string>('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [language, setLanguage] = useState<'fr' | 'en'>('fr')
  const [exportFormat, setExportFormat] = useState<'pdf' | 'word'>('pdf')
  const [isGenerating, setIsGenerating] = useState(false)
  const [showShareConfirmation, setShowShareConfirmation] = useState(false)
  const [pendingDocumentData, setPendingDocumentData] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [generatedDocument, setGeneratedDocument] = useState<{
    fileUrl: string
    filename: string
    title: string
    studentId?: string
    student?: StudentWithRelations
  } | null>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: '',
    message: '',
  })
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState<string>('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const queryClient = useQueryClient()

  // Récupérer les élèves - Filtrés par session si une session est sélectionnée
  const { data: students } = useQuery<Array<{ id: string; first_name?: string; last_name?: string; student_number?: string; [key: string]: any }>>({
    queryKey: ['students', user?.organization_id, selectedSessionId],
    queryFn: async () => {
      if (!user?.organization_id) return []
      
      // Si une session est sélectionnée, récupérer les étudiants de cette session
      if (selectedSessionId) {
        // Récupérer les inscriptions à la session depuis la table enrollments
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select('student_id')
          .eq('session_id', selectedSessionId)
          .in('status', ['confirmed', 'completed', 'active'])
        
        if (enrollmentsError) {
          console.warn('Erreur lors de la récupération des inscriptions:', enrollmentsError)
          // Continuer avec tous les étudiants si erreur
        } else if (enrollments && enrollments.length > 0) {
          const studentIds = (enrollments as Array<{ student_id: string }>).map(e => e.student_id).filter(Boolean)
          if (studentIds.length > 0) {
            const { data, error } = await supabase
              .from('students')
              .select('id, first_name, last_name, student_number, date_of_birth, photo_url, class_id, classes(name)')
              .eq('organization_id', user.organization_id)
              .eq('status', 'active')
              .in('id', studentIds)
              .order('last_name')
            if (error) throw error
            return data || []
          }
        }
      }
      
      // Sinon, récupérer tous les étudiants actifs
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_number, date_of_birth, photo_url, class_id, classes(name)')
        .eq('organization_id', user.organization_id)
        .eq('status', 'active')
        .order('last_name')
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id,
  })

      // Récupérer les factures
  const { data: invoices } = useQuery({
    queryKey: ['invoices', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      
      // Essayer d'abord avec la jointure complète
      let query = supabase
        .from('invoices')
        .select('id, invoice_number, student_id, issue_date, due_date, amount, tax_amount, total_amount, currency, items, students(first_name, last_name, student_number)')
        .eq('organization_id', user.organization_id)
        .order('created_at', { ascending: false })
        .limit(100)
      
      const { data, error } = await query
      
      // Si erreur 400, réessayer sans la jointure students
      if (error && (error.code === 'PGRST116' || error.message?.includes('400') || error.message?.includes('relationship'))) {
        console.warn('Erreur récupération factures avec jointure, réessai sans jointure:', error)
        const { data: invoicesData, error: invoicesError } = await supabase
          .from('invoices')
          .select('id, invoice_number, student_id, issue_date, due_date, amount, tax_amount, total_amount, currency, items')
          .eq('organization_id', user.organization_id)
          .order('created_at', { ascending: false })
          .limit(100)
        
        if (invoicesError) {
          console.error('Erreur récupération factures:', invoicesError)
          return []
        }
        
        // Enrichir avec les données des étudiants si possible
        if (invoicesData && invoicesData.length > 0) {
          const studentIds = (invoicesData as Array<{ student_id: string }>).map(inv => inv.student_id).filter(Boolean)
          if (studentIds.length > 0) {
            const { data: studentsData } = await supabase
              .from('students')
              .select('id, first_name, last_name, student_number')
              .in('id', studentIds)
            
            if (studentsData) {
              const studentsMap = new Map((studentsData as Array<{ id: string; [key: string]: any }>).map(s => [s.id, s]))
              return (invoicesData as Array<{ id: string; student_id?: string; [key: string]: any }>).map(inv => ({
                ...inv,
                students: inv.student_id ? studentsMap.get(inv.student_id) || null : null
              })) as Array<{ id: string; students?: { id: string; [key: string]: any } | null; student_id?: string; [key: string]: any }>
            }
          }
        }
        
        return (invoicesData || []) as Array<{ id: string; students?: { id: string; [key: string]: any } | null; student_id?: string; [key: string]: any }>
      }
      
      if (error) {
        console.error('Erreur récupération factures:', error)
        return []
      }
      
      return (data || []) as Array<{ id: string; students?: { id: string; [key: string]: any } | null; student_id?: string; [key: string]: any }>
    },
    enabled: !!user?.organization_id && (documentType === 'facture' || documentType === 'devis'),
  })

  // Récupérer le rôle de l'utilisateur
  const { data: currentUser } = useQuery({
    queryKey: ['current-user', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  // Mettre à jour le rôle utilisateur quand les données changent
  useEffect(() => {
    if (currentUser) {
      setUserRole((currentUser as any).role)
    }
  }, [currentUser])

  // Récupérer l'organisation
  const { data: organization } = useQuery<{ id: string; [key: string]: any } | null>({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', user.organization_id)
        .single()
      if (error) throw error
      return data as { id: string; [key: string]: any } | null
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les programmes - Disponible pour le type "programme"
  const { data: programs } = useQuery({
    queryKey: ['programs', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return programService.getAllPrograms(user.organization_id, { isActive: true })
    },
    enabled: !!user?.organization_id && documentType === 'programme',
  })

  // Récupérer un programme avec ses formations - Pour le programme sélectionné
  const { data: selectedProgram } = useQuery({
    queryKey: ['program', selectedProgramId],
    queryFn: async () => {
      if (!selectedProgramId) return null
      return programService.getProgramById(selectedProgramId)
    },
    enabled: !!selectedProgramId && documentType === 'programme',
  })

  // Récupérer les sessions - Toujours disponible pour tous les types de documents
  const { data: sessions } = useQuery<Array<{ id: string; [key: string]: any }>>({
    queryKey: ['sessions', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name, formation_id, formations(name, duration_hours, programs(name)), start_date, end_date')
        .eq('formations.organization_id', user.organization_id)
        .order('start_date', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data || []) as Array<{ id: string; [key: string]: any }>
    },
    enabled: !!user?.organization_id && !!documentType,
  })

  const { data: sessionModules } = useQuery({
    queryKey: ['session-modules', selectedSessionId],
    queryFn: async () => {
      if (!selectedSessionId) return []
      const { data, error } = await supabase
        .from('session_modules' as any)
        .select('id, name, amount, currency, display_order')
        .eq('session_id', selectedSessionId)
        .order('display_order', { ascending: true })
      if (error) throw error
      return (data || []) as unknown as Array<{ id: string; name: string; amount: number; currency: string }>
    },
    enabled: !!selectedSessionId,
  })
  
  // Réinitialiser l'apprenant sélectionné quand la session change
  useEffect(() => {
    if (selectedSessionId && selectedStudentId) {
      // Vérifier si l'apprenant sélectionné est toujours dans la liste filtrée
      const studentStillAvailable = (students as Array<{ id: string; [key: string]: any }> | undefined)?.some(s => s.id === selectedStudentId)
      if (!studentStillAvailable) {
        setSelectedStudentId('')
      }
    }
  }, [selectedSessionId, students, selectedStudentId])

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

  // Récupérer le template sélectionné
  const { data: selectedTemplate } = useQuery({
    queryKey: ['document-template', selectedTemplateId],
    queryFn: async () => {
      if (!selectedTemplateId) return null
      return documentTemplateService.getTemplateById(selectedTemplateId)
    },
    enabled: !!selectedTemplateId,
  })


  const handleGenerate = async () => {
    if (!documentType || !organization) return
    if (!selectedTemplateId || !selectedTemplate) {
      alert('Veuillez sélectionner un modèle de document')
      return
    }

    setIsGenerating(true)

    try {
      // Extraire les données nécessaires
      let student: StudentWithRelations | undefined
      let session: SessionWithRelations | undefined
      let invoice: InvoiceWithRelations | undefined
      let program: any = null

      if (selectedStudentId) {
        student = (students as StudentWithRelations[])?.find((s) => s.id === selectedStudentId)
      }

      if (selectedSessionId) {
        session = sessions?.find((s) => s.id === selectedSessionId) as SessionWithRelations | undefined
      }

      if (selectedProgramId && selectedProgram) {
        program = selectedProgram
      }

      if (selectedInvoiceId) {
        invoice = invoices?.find((i) => i.id === selectedInvoiceId) as InvoiceWithRelations | undefined
        // Si une facture est sélectionnée, extraire l'étudiant depuis la facture si disponible
        if (invoice && (invoice as any).students && !student) {
          student = (invoice as any).students as StudentWithRelations
        }
      }

      // Extraire les variables
      const variables = extractDocumentVariables({
        student,
        organization: organization as Organization,
        session,
        invoice,
        program,
        sessionModules: sessionModules?.length ? sessionModules.map((m) => ({ id: m.id, name: m.name, amount: Number(m.amount), currency: m.currency || 'EUR' })) : undefined,
        academicYear,
        language,
        issueDate: new Date().toISOString(),
      })
      
      console.log('[Generate] Variables extraites:', {
        hasStudent: !!student,
        studentName: student ? `${student.first_name} ${student.last_name}` : 'N/A',
        hasInvoice: !!invoice,
        invoiceNumber: invoice?.invoice_number,
        hasSession: !!session,
        sessionName: session?.name,
        variablesCount: Object.keys(variables).length,
        sampleVariables: {
          eleve_nom: variables.eleve_nom,
          eleve_prenom: variables.eleve_prenom,
          numero_facture: variables.numero_facture,
          formation_nom: variables.formation_nom,
          session_nom: variables.session_nom,
        },
      })

      // Générer le nom de fichier selon le format
      const fileExtension = exportFormat === 'word' ? '.docx' : '.pdf'
      let filename = `document${fileExtension}`
      if (student) {
        filename = `${documentType}_${student.last_name}_${student.first_name}${fileExtension}`
      } else if (invoice) {
        filename = `facture_${invoice.invoice_number}${fileExtension}`
      } else {
        filename = `${documentType}_${Date.now()}${fileExtension}`
      }

      // Utiliser l'API pour générer le document (PDF ou Word)
      let documentBlob: Blob | null = null
      
      let apiEndpoint: string
      let requestBody: any
      
      if (exportFormat === 'word') {
        // Génération Word automatique (convertit HTML en DOCX automatiquement)
        // Plus besoin d'uploader un template DOCX manuellement !
        apiEndpoint = '/api/documents/generate-docx'
        requestBody = {
          templateId: selectedTemplateId,
          variables: variables,
          filename: filename,
        }
        console.log('[Generate] Génération Word automatique depuis template HTML')
      } else {
        // PDF : utiliser le générateur PDF standard
        apiEndpoint = '/api/documents/generate-pdf'
        requestBody = {
          template: selectedTemplate,
          variables: variables,
          documentId: undefined,
          organizationId: organization?.id,
        }
      }
      
      const contentType = exportFormat === 'word' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf'
      
      try {
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          // Vérifier si la réponse est du JSON ou du HTML
          const responseContentType = response.headers.get('content-type')
          if (responseContentType && responseContentType.includes('application/json')) {
            const errorData = await response.json()
            // Logger les détails complets de l'erreur pour déboguer
            console.error(`[Generate ${exportFormat.toUpperCase()}] Erreur détaillée:`, errorData)
            if (errorData.templateInfo) {
              console.error(`[Generate ${exportFormat.toUpperCase()}] Template info:`, errorData.templateInfo)
            }
            if (errorData.stack) {
              console.error(`[Generate ${exportFormat.toUpperCase()}] Stack trace:`, errorData.stack)
            }
            throw new Error(errorData.error || errorData.message || errorData.details || `Erreur lors de la génération du ${exportFormat === 'word' ? 'document Word' : 'PDF'}`)
          } else {
            // Si c'est du HTML (page d'erreur Next.js), lire le texte
            const errorText = await response.text()
            console.error('Erreur HTML reçue:', errorText.substring(0, 500))
            throw new Error(`Erreur serveur (${response.status}): ${response.statusText}`)
          }
        }

        // Télécharger le document (PDF ou Word)
        documentBlob = await response.blob()
        const url = URL.createObjectURL(documentBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
        // Sauvegarder le document dans la base de données
        if (documentBlob && user?.organization_id && selectedTemplate) {
          try {
            // Déterminer l'ID de l'étudiant pour le document généré (avant l'upload)
            const invoiceStudentId = invoice?.student_id || (invoice as any)?.students?.id
            
            // 1. Uploader le document (PDF ou Word) dans Supabase Storage
            const storagePath = `documents/${user.organization_id}/${Date.now()}_${filename}`
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('documents')
              .upload(storagePath, documentBlob, {
                cacheControl: '3600',
                upsert: false,
                contentType: contentType,
              })
            
            if (uploadError) {
              console.error('Erreur lors de l\'upload du document:', uploadError)
              // Même si l'upload échoue, on stocke le blob URL pour permettre le téléchargement
              const tempUrl = URL.createObjectURL(documentBlob)
              const docData = {
                fileUrl: tempUrl,
                filename: filename,
                title: selectedTemplate.name || filename,
                studentId: student?.id || invoiceStudentId,
                student: student || (invoiceStudentId ? (invoice as any)?.students : undefined),
              }
              setGeneratedDocument(docData)
              console.log('[Generate] Document généré stocké (upload échoué):', docData)
            } else if (uploadData) {
              // 2. Obtenir l'URL publique
              const { data: urlData } = supabase.storage
                .from('documents')
                .getPublicUrl(storagePath)
              
              // Stocker les informations du document généré pour les actions AVANT la sauvegarde
              const docData = {
                fileUrl: urlData.publicUrl,
                filename: filename,
                title: selectedTemplate.name || filename,
                studentId: student?.id || invoiceStudentId,
                student: student || (invoiceStudentId ? (invoice as any)?.students : undefined),
              }
              setGeneratedDocument(docData)
              console.log('[Generate] Document généré stocké (upload réussi):', docData)
              
              // 3. Sauvegarder dans generated_documents
              const documentData: any = {
                organization_id: user.organization_id,
                template_id: selectedTemplate.id,
                type: mapDocumentTypeToTemplateType(documentType) as any,
                file_name: filename,
                file_url: urlData.publicUrl,
                format: exportFormat,
                page_count: exportFormat === 'pdf' ? 1 : undefined, // Le nombre de pages sera calculé par Puppeteer pour PDF
                metadata: {
                  student: student ? {
                    id: student.id,
                    name: `${student.first_name} ${student.last_name}`,
                  } : null,
                  session: session ? {
                    id: session.id,
                    name: session.name,
                  } : null,
                  invoice: invoice ? {
                    id: invoice.id,
                    invoice_number: invoice.invoice_number,
                  } : null,
                  language,
                  generated_at: new Date().toISOString(),
                },
                generated_by: user.id,
              }
              
              // Déterminer si le document concerne un apprenant
              // Les factures ont un student_id, donc elles concernent toujours un apprenant
              // invoiceStudentId déjà déclaré plus haut dans le bloc try
              const documentConcernsStudent = !!(student || invoiceStudentId || session)
              
              // Définir related_entity_type et related_entity_id pour rendre le document accessible à l'apprenant
              // Priorité: student > invoice.student_id > session
              if (student) {
                documentData.related_entity_type = 'student'
                documentData.related_entity_id = student.id
              } else if (invoiceStudentId) {
                // Les factures concernent un étudiant, donc on lie directement à l'étudiant
                documentData.related_entity_type = 'student'
                documentData.related_entity_id = invoiceStudentId
              } else if (session) {
                // Les sessions sont accessibles via les enrollments (géré par RLS)
                documentData.related_entity_type = 'session'
                documentData.related_entity_id = session.id
              }
              
              // Vérifier si le document doit être partagé avec l'apprenant
              const documentTypeMapped = mapDocumentTypeToTemplateType(documentType)
              const isTranscript = documentTypeMapped === 'releve_notes'
              const userCanShare = userRole && 
                ['super_admin', 'admin', 'comptable', 'secretaire'].includes(userRole)
              
              // Si le document concerne un apprenant et que l'utilisateur a le droit de partager
              if (documentConcernsStudent && userCanShare) {
                // Pour les relevés de notes, demander confirmation
                if (isTranscript) {
                  setPendingDocumentData(documentData)
                  setShowShareConfirmation(true)
                  return // Ne pas sauvegarder maintenant, attendre la confirmation
                } else {
                  // Pour les autres documents, partager automatiquement
                  // Le document sera automatiquement visible par l'apprenant via RLS grâce à related_entity_type et related_entity_id
                  console.log('Document partagé automatiquement avec l\'apprenant')
                }
              } else if (!documentConcernsStudent) {
                // Si le document ne concerne pas un apprenant, ne pas définir related_entity_type/id
                // Cela signifie que le document ne sera pas accessible aux apprenants
                delete documentData.related_entity_type
                delete documentData.related_entity_id
              } else if (!userCanShare) {
                // Si l'utilisateur n'a pas le droit de partager, ne pas définir related_entity_type/id
                delete documentData.related_entity_type
                delete documentData.related_entity_id
              }
              
              // Sauvegarder le document
              const { error: saveError } = await supabase
                .from('generated_documents')
                .insert(documentData)

              if (saveError) {
                console.error('Erreur lors de la sauvegarde du document:', saveError)
              } else {
                console.log('Document sauvegardé avec succès dans generated_documents')
              }
            }
          } catch (saveError) {
            console.error('Erreur lors de la sauvegarde du document:', saveError)
            // Ne pas bloquer l'utilisateur si la sauvegarde échoue
          }
        }
      } catch (error) {
        console.error('Erreur lors de la génération du PDF:', error)
        alert('Une erreur est survenue lors de la génération du document')
      } finally {
        setIsGenerating(false)
      }
    } catch (error) {
      console.error('Erreur lors de la génération du document:', error)
      alert('Une erreur est survenue lors de la génération du document')
      setIsGenerating(false)
    }
  }

  // Gérer la confirmation de partage pour les relevés de notes
  const handleShareConfirmation = async (shouldShare: boolean) => {
    if (!pendingDocumentData) return

    setShowShareConfirmation(false)

    // Si l'utilisateur choisit de ne pas partager, retirer la relation avec l'étudiant
    const documentDataToSave = { ...pendingDocumentData }
    if (!shouldShare) {
      // Ne pas partager : retirer related_entity_type et related_entity_id pour l'étudiant
      // Mais garder l'information dans les métadonnées pour référence
      delete documentDataToSave.related_entity_type
      delete documentDataToSave.related_entity_id
      console.log('Document non partagé avec l\'apprenant (relevé de notes)')
    } else {
      console.log('Document partagé avec l\'apprenant')
    }

    // Sauvegarder le document
    const { error: saveError } = await supabase
      .from('generated_documents')
      .insert(documentDataToSave)
    
    if (saveError) {
      console.error('Erreur lors de la sauvegarde du document:', saveError)
      alert('Erreur lors de la sauvegarde du document')
    } else {
      console.log('Document sauvegardé avec succès dans generated_documents')
    }

    setPendingDocumentData(null)
    setIsGenerating(false)
  }

  // Réinitialiser le template sélectionné quand le type de document change
  useEffect(() => {
    setSelectedTemplateId('')
    setGeneratedDocument(null)
  }, [documentType])

  // Fonction pour télécharger le document
  const handleDownload = () => {
    if (!generatedDocument) return
    const link = document.createElement('a')
    link.href = generatedDocument.fileUrl
    link.download = generatedDocument.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Fonction pour ouvrir le modal d'envoi par email
  const handleOpenEmailModal = async () => {
    if (!generatedDocument) return
    
    let studentEmails: string[] = []
    
    // Récupérer l'email de l'étudiant depuis sa fiche
    if (generatedDocument.studentId) {
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('email, first_name, last_name')
        .eq('id', generatedDocument.studentId)
        .single()
      
      if (!studentError && studentData) {
        // Ajouter l'email de l'étudiant s'il est renseigné
        const student = studentData as { email?: string; first_name?: string; last_name?: string }
        if (student.email) {
          studentEmails.push(student.email)
        }
        
        // Récupérer les emails des tuteurs/guardians
        const { data: guardiansData, error: guardiansError } = await supabase
          .from('student_guardians')
          .select('*, guardians(email)')
          .eq('student_id', generatedDocument.studentId)
        
        if (!guardiansError && guardiansData) {
          guardiansData.forEach((sg: any) => {
            if (sg.guardians?.email) {
              studentEmails.push(sg.guardians.email)
            }
          })
        }
        
        // Dédupliquer les emails
        studentEmails = [...new Set(studentEmails)]
        
        const subject = `${generatedDocument.title}`
        const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim()
        const message = `Bonjour ${studentName || 'Madame, Monsieur'},\n\nVeuillez trouver ci-joint votre document.\n\nCordialement,\nL'équipe EDUZEN`

        setEmailForm({
          to: studentEmails.join(', '), // Joindre plusieurs emails avec des virgules
          subject,
          message,
        })
      } else {
        // Fallback si l'étudiant n'est pas trouvé
        const studentEmail = generatedDocument.student?.email || ''
        const subject = `${generatedDocument.title}`
        const message = `Bonjour ${generatedDocument.student?.first_name || ''} ${generatedDocument.student?.last_name || ''},\n\nVeuillez trouver ci-joint votre document.\n\nCordialement,\nL'équipe EDUZEN`

        setEmailForm({
          to: studentEmail,
          subject,
          message,
        })
      }
    } else {
      // Si pas d'étudiant associé, laisser vide
      setEmailForm({
        to: '',
        subject: generatedDocument.title,
        message: 'Bonjour,\n\nVeuillez trouver ci-joint votre document.\n\nCordialement,\nL\'équipe EDUZEN',
      })
    }
    
    setShowEmailModal(true)
  }

  // Fonction pour envoyer le document par email
  const handleSendEmail = async () => {
    if (!generatedDocument || !emailForm.to) {
      alert('Veuillez renseigner l\'adresse email du destinataire')
      return
    }

    setSendingEmail(true)
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailForm.to,
          subject: emailForm.subject,
          message: emailForm.message,
          attachmentUrl: generatedDocument.fileUrl,
          attachmentName: generatedDocument.filename,
        }),
      })

      if (!response.ok) throw new Error('Erreur lors de l\'envoi de l\'email')

      alert('Email envoyé avec succès !')
      setShowEmailModal(false)
      setEmailForm({ to: '', subject: '', message: '' })
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error)
      alert('Erreur lors de l\'envoi de l\'email')
    } finally {
      setSendingEmail(false)
    }
  }

  // Mutation pour envoyer le document vers l'espace apprenant
  const sendToLearnerSpaceMutation = useMutation({
    mutationFn: async () => {
      if (!generatedDocument || !generatedDocument.studentId) {
        throw new Error('Ce document n\'est pas lié à un étudiant')
      }

      if (!user?.organization_id) {
        throw new Error('Organisation ID manquant')
      }

      let fileUrl = generatedDocument.fileUrl

      // Si l'URL est une blob URL (temporaire), il faut ré-uploader le fichier
      if (fileUrl.startsWith('blob:') || fileUrl.startsWith('data:')) {
        // Télécharger le fichier depuis l'URL pour l'uploader
        const fileResponse = await fetch(generatedDocument.fileUrl)
        if (!fileResponse.ok) {
          throw new Error('Impossible de télécharger le fichier')
        }
        const fileBlob = await fileResponse.blob()
        const file = new File([fileBlob], generatedDocument.filename, { type: 'application/pdf' })

        // Uploader le fichier dans Supabase Storage
        const storagePath = `learner_documents/${user.organization_id}/${generatedDocument.studentId}/${Date.now()}_${generatedDocument.filename}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: 'application/pdf',
          })

        if (uploadError) throw uploadError

        // Obtenir l'URL publique
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(storagePath)
        
        fileUrl = urlData.publicUrl
      }

      // Mapper le type de document pour learner_documents
      const documentTypeMapped = mapDocumentTypeToTemplateType(documentType)

      // Créer une entrée dans learner_documents
      const { error } = await supabase
        .from('learner_documents')
        .insert({
          student_id: generatedDocument.studentId,
          title: generatedDocument.title,
          file_url: fileUrl,
          type: documentTypeMapped || documentType || 'other',
          organization_id: user.organization_id,
          sent_at: new Date().toISOString(),
          sent_by: user.id,
        } as any)

      if (error) {
        console.error('Erreur lors de l\'insertion dans learner_documents:', error)
        throw error
      }
    },
    onSuccess: () => {
      alert('Document envoyé dans l\'espace apprenant avec succès !')
      queryClient.invalidateQueries({ queryKey: ['learner-documents'] })
    },
    onError: (error: any) => {
      console.error('Erreur lors de l\'envoi vers l\'espace apprenant:', error)
      alert(error.message || 'Erreur lors de l\'envoi vers l\'espace apprenant')
    },
  })

  // Configuration des types de documents disponibles (même que dans la page des modèles)
  const DOCUMENT_TYPES: Array<{
    type: DocumentType
    name: string
    description: string
    icon: React.ElementType
    color: string
    requiresStudent?: boolean
    requiresSession?: boolean
    requiresInvoice?: boolean
  }> = [
    {
      type: 'convention',
      name: 'Convention de formation',
      description: 'Contrat entre l\'établissement et l\'apprenant',
      icon: FileText,
      color: '#335ACF',
      requiresStudent: true,
    },
    {
      type: 'facture',
      name: 'Facture',
      description: 'Document comptable de facturation',
      icon: Receipt,
      color: '#335ACF',
      requiresInvoice: true,
    },
    {
      type: 'devis',
      name: 'Devis',
      description: 'Estimation de prix avant formation',
      icon: FileCheck,
      color: '#34B9EE',
      requiresInvoice: true,
    },
    {
      type: 'convocation',
      name: 'Convocation',
      description: 'Invitation à une session ou examen',
      icon: Calendar,
      color: '#335ACF',
      requiresSession: true,
    },
    {
      type: 'contrat',
      name: 'Contrat de scolarité',
      description: 'Accord de scolarisation officiel',
      icon: ClipboardList,
      color: '#335ACF',
      requiresStudent: true,
    },
    {
      type: 'attestation_reussite',
      name: 'Attestation de réussite',
      description: 'Certificat de réussite à une formation',
      icon: Award,
      color: '#335ACF',
      requiresStudent: true,
      requiresSession: true,
    },
    {
      type: 'certificat_scolarite',
      name: 'Certificat de scolarité',
      description: 'Justificatif d\'inscription dans l\'établissement',
      icon: GraduationCap,
      color: '#335ACF',
      requiresStudent: true,
    },
    {
      type: 'releve_notes',
      name: 'Relevé de notes',
      description: 'Bulletin de notes et appréciations',
      icon: BookOpen,
      color: '#34B9EE',
      requiresStudent: true,
      requiresSession: true,
    },
    {
      type: 'attestation_entree',
      name: 'Attestation d\'entrée en formation',
      description: 'Certificat d\'inscription à une formation',
      icon: UserCheck,
      color: '#335ACF',
      requiresStudent: true,
      requiresSession: true,
    },
    {
      type: 'reglement_interieur',
      name: 'Règlement intérieur',
      description: 'Règles et procédures de l\'établissement',
      icon: Shield,
      color: '#335ACF',
    },
    {
      type: 'cgv',
      name: 'Conditions Générales de Vente',
      description: 'CGV et conditions d\'utilisation',
      icon: Scale,
      color: '#34B9EE',
    },
    {
      type: 'programme',
      name: 'Programme de formation',
      description: 'Détails du contenu pédagogique',
      icon: Book,
      color: '#335ACF',
    },
    {
      type: 'attestation_assiduite',
      name: 'Attestation d\'assiduité',
      description: 'Justificatif de présence aux cours',
      icon: CheckCircle,
      color: '#335ACF',
      requiresStudent: true,
      requiresSession: true,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/documents">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Générer un document</h1>
          <p className="mt-2 text-sm text-gray-600">
            Créez et téléchargez vos documents PDF
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Formulaire */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Type de document</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {DOCUMENT_TYPES.map((type) => {
                  const Icon = type.icon
                  return (
                    <button
                      key={type.type}
                      type="button"
                      onClick={() => setDocumentType(type.type)}
                      className={`p-4 border-2 rounded-lg text-left transition-colors ${
                        documentType === type.type
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${type.color}15` }}
                        >
                          <Icon className="h-5 w-5" style={{ color: type.color }} />
                        </div>
                        <div className="font-medium text-sm">{type.name}</div>
                      </div>
                      <div className="text-xs text-gray-600">{type.description}</div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {documentType && (
            <>
              {/* Sélecteur de template */}
              <TemplateSelector
                documentType={documentType}
                selectedTemplateId={selectedTemplateId}
                onTemplateSelect={setSelectedTemplateId}
                onCreateNew={() => {
                  router.push(`/dashboard/settings/document-templates/${documentType}/edit`)
                }}
                onDuplicate={async (templateId) => {
                  try {
                    const duplicated = await documentTemplateService.duplicateTemplate(templateId)
                    setSelectedTemplateId(duplicated.id)
                    alert('Modèle dupliqué avec succès')
                  } catch (error) {
                    console.error('Erreur lors de la duplication:', error)
                    alert('Erreur lors de la duplication du modèle')
                  }
                }}
              />

              {/* Sélection du programme - Pour le type "programme" */}
              {documentType === 'programme' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Programme</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <select
                      value={selectedProgramId}
                      onChange={(e) => setSelectedProgramId(e.target.value)}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                      required
                    >
                      <option value="">Sélectionner un programme</option>
                      {programs?.map((program: any) => (
                        <option key={program.id} value={program.id}>
                          {program.name} {program.code ? `(${program.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </CardContent>
                </Card>
              )}

              {/* Sélection de la session - TOUJOURS EN PREMIER et OBLIGATOIRE */}
              <Card>
                <CardHeader>
                  <CardTitle>Session de formation <span className="text-red-500">*</span></CardTitle>
                </CardHeader>
                <CardContent>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => {
                      setSelectedSessionId(e.target.value)
                      // Réinitialiser l'apprenant quand la session change
                      setSelectedStudentId('')
                    }}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                    required
                  >
                    <option value="">Sélectionner une session</option>
                    {sessions?.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.name} - {(session as SessionWithRelations).formations?.programs?.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 mt-2">
                    La sélection de la session est obligatoire pour récupérer toutes les données personnalisées.
                  </p>
                </CardContent>
              </Card>

              {/* Sélection de l'apprenant - DISPONIBLE APRÈS LA SESSION */}
              {DOCUMENT_TYPES.find(dt => dt.type === documentType)?.requiresStudent && (
                <Card>
                  <CardHeader>
                    <CardTitle>Apprenant <span className="text-red-500">*</span></CardTitle>
                  </CardHeader>
                  <CardContent>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                      required={DOCUMENT_TYPES.find(dt => dt.type === documentType)?.requiresStudent}
                      disabled={!selectedSessionId}
                    >
                      <option value="">
                        {!selectedSessionId 
                          ? 'Veuillez d\'abord sélectionner une session' 
                          : 'Sélectionner un apprenant'}
                      </option>
                      {selectedSessionId && students?.map((student: any) => (
                        <option key={student.id} value={student.id}>
                          {student.last_name} {student.first_name} ({student.student_number})
                        </option>
                      ))}
                    </select>
                    {selectedSessionId && students && students.length === 0 && (
                      <p className="text-sm text-amber-600 mt-2">
                        Aucun apprenant inscrit à cette session.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Sélection de la facture - Pour facture et devis */}
              {(documentType === 'facture' || documentType === 'devis') && (
                <Card>
                  <CardHeader>
                    <CardTitle>{documentType === 'facture' ? 'Facture' : 'Devis'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <select
                      value={selectedInvoiceId}
                      onChange={(e) => setSelectedInvoiceId(e.target.value)}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                      required
                    >
                      <option value="">Sélectionner une {documentType === 'facture' ? 'facture' : 'devis'}</option>
                      {invoices?.map((invoice: any) => (
                        <option key={invoice.id} value={invoice.id}>
                          {invoice.invoice_number} - {invoice.students?.first_name}{' '}
                          {invoice.students?.last_name}
                        </option>
                      ))}
                    </select>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Langue</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                    >
                      <option value="fr">Français</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Format d'export</label>
                    <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as 'pdf' | 'word')}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionner un format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-red-600" />
                            <span>PDF (.pdf)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="word">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <span>Word (.docx)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end space-x-4">
                <Link href="/dashboard/documents">
                  <Button variant="outline">Annuler</Button>
                </Link>
                <Button
                  onClick={handleGenerate}
                  disabled={
                    isGenerating ||
                    !selectedTemplateId ||
                    !selectedSessionId || // Session toujours obligatoire
                    (DOCUMENT_TYPES.find(dt => dt.type === documentType)?.requiresStudent && !selectedStudentId) ||
                    (DOCUMENT_TYPES.find(dt => dt.type === documentType)?.requiresInvoice && !selectedInvoiceId) ||
                    (documentType === 'programme' && !selectedProgramId)
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isGenerating ? 'Génération...' : 'Générer et télécharger'}
                </Button>
              </div>

              {/* Carte avec les actions après génération */}
              {generatedDocument && !isGenerating && (
                <Card className="border-2 border-green-200 bg-green-50/50">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-green-900">Document généré avec succès !</CardTitle>
                        <p className="text-sm text-green-700 mt-1">{generatedDocument.title}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={handleDownload}
                        variant="outline"
                        className="border-green-300 text-green-700 hover:bg-green-100"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Télécharger à nouveau
                      </Button>
                      <Button
                        onClick={handleOpenEmailModal}
                        variant="outline"
                        className="border-blue-300 text-blue-700 hover:bg-blue-100"
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Envoyer par email
                      </Button>
                      {generatedDocument.studentId && (
                        <Button
                          onClick={() => sendToLearnerSpaceMutation.mutate()}
                          disabled={sendToLearnerSpaceMutation.isPending}
                          variant="outline"
                          className="border-purple-300 text-purple-700 hover:bg-purple-100"
                        >
                          <Send className="mr-2 h-4 w-4" />
                          {sendToLearnerSpaceMutation.isPending ? 'Envoi...' : 'Espace apprenant'}
                        </Button>
                      )}
                      <Button
                        onClick={() => setGeneratedDocument(null)}
                        variant="ghost"
                        size="sm"
                        className="ml-auto"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal d'envoi par email */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Envoyer par email</DialogTitle>
            <DialogDescription>{generatedDocument?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Destinataire *</label>
              <input
                type="text"
                value={emailForm.to}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, to: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                placeholder="email@example.com, email2@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Objet *</label>
              <input
                type="text"
                value={emailForm.subject}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, subject: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                placeholder="Objet de l'email"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <textarea
                value={emailForm.message}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, message: e.target.value }))}
                rows={6}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary resize-none"
                placeholder="Votre message..."
              />
            </div>
            {generatedDocument?.fileUrl && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Pièce jointe</p>
                    <p className="text-xs text-gray-500">{generatedDocument.filename}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailModal(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={sendingEmail || !emailForm.to || !emailForm.subject}
            >
              {sendingEmail ? 'Envoi...' : 'Envoyer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue de confirmation pour le partage des relevés de notes */}
      <Dialog 
        open={showShareConfirmation} 
        onOpenChange={(open) => {
          if (!open && showShareConfirmation) {
            // Si le dialogue est fermé sans choix explicite, ne pas partager
            handleShareConfirmation(false)
          } else {
            setShowShareConfirmation(open)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Partager le relevé de notes avec l'apprenant ?</DialogTitle>
            <DialogDescription>
              Souhaitez-vous que ce relevé de notes soit visible dans l'espace personnel de l'apprenant ?
              <br />
              <br />
              Si vous choisissez "Non", le document sera sauvegardé mais ne sera pas accessible par l'apprenant.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleShareConfirmation(false)}
            >
              Non, ne pas partager
            </Button>
            <Button
              onClick={() => handleShareConfirmation(true)}
            >
              Oui, partager avec l'apprenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

