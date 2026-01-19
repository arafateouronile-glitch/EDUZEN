'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { documentService } from '@/lib/services/document.service'
import { signatureService } from '@/lib/services/signature.service.client'
import { createClient } from '@/lib/supabase/client'
import { studentService } from '@/lib/services/student.service'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid'
import {
  Plus, Search, FileText, Download, Upload, X, Eye, Trash2,
  Image as ImageIcon, File as FileIcon, FileCheck, Users,
  FileSpreadsheet, FileOutput, FileInput, SlidersHorizontal,
  Mail, Send, MoreVertical, PenTool
} from 'lucide-react'
import Link from 'next/link'
import { formatDate, cn } from '@/lib/utils'
import { motion, AnimatePresence } from '@/components/ui/motion'
import type { DocumentWithRelations, StudentWithRelations } from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { SkeletonList } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'

type Document = TableRow<'documents'>

export default function DocumentsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [previewDocument, setPreviewDocument] = useState<DocumentWithRelations | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<DocumentWithRelations | null>(null)
  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: '',
    message: '',
  })
  const [sendingEmail, setSendingEmail] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    title: '',
    type: 'other' as string,
    studentId: '' as string | undefined,
    file: null as File | null,
  })
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const documentTypes = [
    { value: 'all', label: 'Tous les documents', icon: FileText },
    { value: 'attestation', label: 'Attestations de scolarité', icon: FileCheck },
    { value: 'certificate', label: 'Certificats de formation', icon: FileCheck },
    { value: 'transcript', label: 'Relevés de notes', icon: FileText },
    { value: 'report_card', label: 'Bulletins scolaires', icon: FileSpreadsheet },
    { value: 'invoice', label: 'Factures', icon: FileOutput },
    { value: 'receipt', label: 'Reçus de paiement', icon: FileInput },
    { value: 'convocation', label: 'Convocations', icon: FileText },
    { value: 'contract', label: 'Contrats de scolarité', icon: FileText },
  ]

  // Récupérer les documents existants avec pagination
  const { data: documentsData, isLoading } = useQuery({
    queryKey: ['documents', user?.organization_id, search, typeFilter, currentPage],
    queryFn: async () => {
      if (!user?.organization_id) {
        return { data: [], total: 0, page: 1, limit: itemsPerPage, totalPages: 0 }
      }
      
      const result = await documentService.getAll(user.organization_id, {
        type: typeFilter !== 'all' ? (typeFilter as Document['type']) : undefined,
        page: currentPage,
        limit: itemsPerPage,
      })
      
      // Filtrer par recherche côté client (si search est fourni)
      if (search && result.data) {
        const filtered = (result.data as DocumentWithRelations[])?.filter((doc) =>
          doc.title?.toLowerCase().includes(search.toLowerCase()) ||
          doc.type?.toLowerCase().includes(search.toLowerCase()) ||
          doc.students?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
          doc.students?.last_name?.toLowerCase().includes(search.toLowerCase())
        ) || []
        
        return {
          ...result,
          data: filtered,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / itemsPerPage),
        }
      }
      
      return result
    },
    enabled: !!user?.organization_id,
  })

  const documents = documentsData?.data || []
  const totalItems = documentsData?.total || 0
  const totalPages = documentsData?.totalPages || 0

  // Réinitialiser à la page 1 quand les filtres changent
  useEffect(() => {
    setCurrentPage(1)
  }, [search, typeFilter])

  // Récupérer les sessions en cours avec leurs étudiants pour générer les documents attendus
  const { data: expectedDocuments } = useQuery({
    queryKey: ['expected-documents', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      
      // Récupérer les sessions en cours ou récentes (moins de 3 mois après la fin)
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          id,
          name,
          start_date,
          end_date,
          status,
          formations!inner(
            id,
            name,
            organization_id,
            programs(id, name)
          )
        `)
        .eq('formations.organization_id', user.organization_id)
        .or(`status.eq.ongoing,status.eq.completed,end_date.gte.${threeMonthsAgo.toISOString().split('T')[0]}`)
        .order('end_date', { ascending: false })
      
      if (sessionsError) {
        console.error('Erreur lors de la récupération des sessions:', sessionsError)
        return []
      }
      
      if (!sessions || sessions.length === 0) return []
      
      // Pour chaque session, récupérer les étudiants inscrits
      const expectedDocs: Array<{
        id: string
        title: string
        type: Document['type']
        student_id: string
        student: { first_name: string; last_name: string; student_number: string }
        session_id: string
        session_name: string
        isGenerated: boolean
        document_id?: string
        created_at?: string
      }> = []
      
      for (const session of (sessions as Array<{ id: string; [key: string]: any }>)) {
        // Récupérer les inscriptions à cette session
        const sessionId = (session as { id: string }).id
        const enrollmentsResult = await supabase
          .from('enrollments')
          .select(`
            student_id,
            status,
            students!inner(id, first_name, last_name, student_number)
          `)
          .eq('session_id', sessionId)
          .in('status', ['confirmed', 'completed'])
        
        const enrollments = (enrollmentsResult.data as Array<{ student_id: string; status: string; students?: { id: string; first_name?: string; last_name?: string; student_number?: string } | null }>) || null
        const enrollmentsError = enrollmentsResult.error
        
        if (enrollmentsError) {
          console.error('Erreur lors de la récupération des inscriptions:', enrollmentsError)
          continue
        }
        
        if (!enrollments || enrollments.length === 0) continue
        
        // Pour chaque étudiant, créer les documents attendus
        for (const enrollment of (enrollments as Array<{ students?: any; [key: string]: any }>)) {
          const student = enrollment.students as any
          if (!student) continue
          
          // Vérifier si un certificat existe déjà pour cet étudiant et cette session
          const existingCert = (documents as DocumentWithRelations[])?.find(
            (doc) => doc.type === 'certificate' && 
                     doc.student_id === student.id &&
                     (doc as any).session_id === session.id
          )
          
          // Certificat de formation (pour les sessions terminées ou en cours)
          expectedDocs.push({
            id: `expected-cert-${session.id}-${student.id}`,
            title: `Certificat de formation - ${student.first_name} ${student.last_name}`,
            type: 'certificate',
            student_id: student.id,
            student: {
              first_name: student.first_name,
              last_name: student.last_name,
              student_number: student.student_number,
            },
            session_id: session.id,
            session_name: session.name,
            isGenerated: !!existingCert,
            document_id: existingCert?.id || undefined,
            created_at: existingCert?.created_at || undefined,
          })
          
          // Attestation de scolarité (pour les sessions en cours)
          if (session.status === 'ongoing' || new Date(session.end_date) >= new Date()) {
            const existingAttestation = (documents as DocumentWithRelations[])?.find(
              (doc) => doc.type === 'attestation' && 
                       doc.student_id === student.id &&
                       (doc as any).session_id === session.id
            )
            
            expectedDocs.push({
              id: `expected-attest-${session.id}-${student.id}`,
              title: `Attestation de scolarité - ${student.first_name} ${student.last_name}`,
              type: 'attestation',
              student_id: student.id,
              student: {
                first_name: student.first_name,
                last_name: student.last_name,
                student_number: student.student_number,
              },
              session_id: session.id,
              session_name: session.name,
              isGenerated: !!existingAttestation,
              document_id: existingAttestation?.id || undefined,
              created_at: existingAttestation?.created_at || undefined,
            })
          }
        }
      }
      
      return expectedDocs
    },
    enabled: !!user?.organization_id,
  })
  
  // Combiner les documents existants et attendus
  const allDocuments = [
    ...(documents || []).map((doc: any) => ({ ...doc, isExpected: false })),
    ...(expectedDocuments || []).map((doc: any) => ({ ...doc, isExpected: true })),
  ]
  
  // Filtrer selon le typeFilter
  const filteredDocuments = typeFilter !== 'all' 
    ? allDocuments.filter((doc: any) => doc.type === typeFilter)
    : allDocuments

  // Récupérer les étudiants pour le formulaire d'upload
  const { data: students } = useQuery({
    queryKey: ['students-all', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return studentService.getAll(user.organization_id)
    },
    enabled: !!user?.organization_id && showUploadModal,
  })

  // Mutation pour supprimer un document
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      await documentService.delete(documentId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', user?.organization_id] })
    },
  })

  // Fonction pour gérer l'upload
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadForm((prev) => ({ ...prev, file }))
    }
  }

  // Fonction pour uploader un document
  const handleUpload = async () => {
    if (!user?.organization_id || !uploadForm.file || !uploadForm.title) {
      alert('Veuillez remplir tous les champs requis')
      return
    }

    setUploading(true)

    try {
      // Générer un nom de fichier unique
      const fileExt = uploadForm.file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${user.organization_id}/${fileName}`

      // Uploader le fichier vers Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, uploadForm.file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Récupérer l'URL publique
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // Créer l'enregistrement dans la base de données
      await documentService.create({
        organization_id: user.organization_id,
        title: uploadForm.title,
        type: uploadForm.type as Document['type'],
        file_url: urlData.publicUrl,
        student_id: uploadForm.studentId || undefined,
      })

      // Réinitialiser le formulaire
      setUploadForm({
        title: '',
        type: 'other',
        studentId: '',
        file: null,
      })
      setShowUploadModal(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Rafraîchir la liste
      queryClient.invalidateQueries({ queryKey: ['documents', user?.organization_id] })
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error)
      alert('Erreur lors de l\'upload du document')
    } finally {
      setUploading(false)
    }
  }

  // Fonction pour prévisualiser un document
  const handlePreview = (document: any) => {
    setPreviewDocument(document)
  }

  // Fonction pour ouvrir le modal d'envoi par email
  const handleOpenEmailModal = (document: any) => {
    setSelectedDocument(document)

    // Pré-remplir l'email si l'étudiant est lié
    const studentEmail = document.students?.email || ''
    const subject = `${getTypeLabel(document.type)} - ${document.title}`
    const message = `Bonjour ${document.students?.first_name || ''} ${document.students?.last_name || ''},\n\nVeuillez trouver ci-joint votre ${getTypeLabel(document.type).toLowerCase()}.\n\nCordialement,\nL'équipe EDUZEN`

    setEmailForm({
      to: studentEmail,
      subject,
      message,
    })
    setShowEmailModal(true)
  }

  // Fonction pour envoyer le document par email
  const handleSendEmail = async () => {
    if (!selectedDocument || !emailForm.to) {
      alert('Veuillez renseigner l\'adresse email du destinataire')
      return
    }

    setSendingEmail(true)
    try {
      // TODO: Intégrer avec votre service d'envoi d'emails (ex: SendGrid, Resend, etc.)
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailForm.to,
          subject: emailForm.subject,
          message: emailForm.message,
          attachmentUrl: selectedDocument.file_url,
          attachmentName: selectedDocument.title,
        }),
      })

      if (!response.ok) throw new Error('Erreur lors de l\'envoi de l\'email')

      alert('Email envoyé avec succès !')
      setShowEmailModal(false)
      setSelectedDocument(null)
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
    mutationFn: async (document: any) => {
      if (!document.student_id) {
        throw new Error('Ce document n\'est pas lié à un étudiant')
      }

      // Créer une notification pour l'étudiant
      const { error } = await supabase
        .from('learner_documents')
        .insert({
          student_id: document.student_id,
          document_id: document.id,
          title: document.title,
          file_url: document.file_url,
          type: document.type,
          organization_id: user?.organization_id,
          sent_at: new Date().toISOString(),
        } as any)

      if (error) throw error
    },
    onSuccess: () => {
      alert('Document envoyé dans l\'espace apprenant avec succès !')
    },
    onError: (error: any) => {
      console.error('Erreur lors de l\'envoi vers l\'espace apprenant:', error)
      alert(error.message || 'Erreur lors de l\'envoi vers l\'espace apprenant')
    },
  })

  const getTypeLabel = (type: string) => {
    const docType = documentTypes.find((t) => t.value === type)
    return docType?.label || type
  }

  const getTypeIcon = (type: string) => {
    const docType = documentTypes.find((t) => t.value === type)
    return docType?.icon || FileText
  }

  // Calculer les statistiques
  const stats = {
    total: documents.length,
    generated: documents.filter((d: any) => d.file_path).length,
    toGenerate: expectedDocuments?.filter((d: any) => !d.isGenerated).length || 0,
    uploaded: documents.filter((d: any) => d.uploaded_by).length,
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.5, 
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
      } 
    }
  }

  return (
    <motion.div
      className="space-y-8 p-6 pb-8 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Premium */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl shadow-lg">
              <FileText className="h-7 w-7 text-white" />
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">
                Documents
              </h1>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-gradient-to-r from-brand-blue-ghost to-brand-cyan-ghost text-brand-blue rounded-full text-sm font-medium border border-brand-blue/20">
                  {filteredDocuments?.length || 0} total
                </span>
                {expectedDocuments && expectedDocuments.filter((d: any) => !d.isGenerated).length > 0 && (
                  <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full text-sm font-bold border border-amber-600 shadow-md">
                    {expectedDocuments.filter((d: any) => !d.isGenerated).length} à générer
                  </span>
                )}
              </div>
            </div>
          </div>
          <p className="text-gray-600 text-sm lg:text-base ml-1">
            Gérez, générez et organisez tous vos documents administratifs
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/settings/document-templates">
            <Button
              variant="outline"
              className="hover:bg-brand-blue-ghost hover:border-brand-blue/30 hover:text-brand-blue transition-all"
            >
              <FileText className="mr-2 h-4 w-4" />
              Templates
            </Button>
          </Link>
          <Button
            onClick={() => setShowUploadModal(true)}
            variant="outline"
            className="hover:bg-brand-cyan-ghost hover:border-brand-cyan/30 hover:text-brand-cyan transition-all"
          >
            <Upload className="mr-2 h-4 w-4" />
            Uploader
          </Button>
          <Link href="/dashboard/documents/generate">
            <Button variant="outline" className="hover:bg-brand-blue-ghost hover:border-brand-blue/30 hover:text-brand-blue transition-all">
              <Plus className="mr-2 h-4 w-4" />
              Générer
            </Button>
          </Link>
          <Link href="/dashboard/documents/generate-batch">
            <Button className="bg-gradient-to-r from-brand-blue to-brand-cyan hover:from-brand-blue-dark hover:to-brand-cyan shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <Users className="mr-2 h-4 w-4" />
              Génération en masse
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats Premium */}
      <BentoGrid columns={4} gap="md">
        {[
          {
            title: 'Total Documents',
            value: stats.total,
            icon: FileText,
            color: 'text-brand-blue',
            bg: 'bg-gradient-to-br from-brand-blue-ghost to-brand-blue-ghost/50',
            borderColor: 'border-brand-blue/20',
            desc: 'Documents existants'
          },
          {
            title: 'Documents Générés',
            value: stats.generated,
            icon: FileCheck,
            color: 'text-brand-cyan',
            bg: 'bg-gradient-to-br from-brand-cyan-ghost to-brand-cyan-ghost/50',
            borderColor: 'border-brand-cyan/20',
            desc: 'Depuis les templates'
          },
          {
            title: 'À Générer',
            value: stats.toGenerate,
            icon: FileOutput,
            color: 'text-amber-600',
            bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50',
            borderColor: 'border-amber-200',
            desc: 'Documents attendus',
            urgent: stats.toGenerate > 0
          },
          {
            title: 'Uploadés',
            value: stats.uploaded,
            icon: Upload,
            color: 'text-brand-blue',
            bg: 'bg-gradient-to-br from-brand-blue-ghost to-brand-blue-ghost/50',
            borderColor: 'border-brand-blue/20',
            desc: 'Importés manuellement'
          },
        ].map((stat, index) => (
          <BentoCard key={stat.title} span={1} className="min-w-[200px]">
            <GlassCard
              variant="premium"
              hoverable
              className={cn("h-full p-5 border-2 transition-all duration-300", stat.borderColor)}
            >
              <div className="flex items-center justify-between mb-3">
                <motion.div
                  className={cn("p-2.5 rounded-xl transition-all duration-300 border", stat.bg, stat.borderColor)}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </motion.div>
                <span className={cn("text-2xl font-bold",
                  index === 0 || index === 3 ? "text-brand-blue" :
                  index === 1 ? "text-brand-cyan" :
                  "text-amber-600")}>
                  {stat.value}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{stat.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.desc}</p>
              </div>
            </GlassCard>
          </BentoCard>
        ))}
      </BentoGrid>

      {/* Filtres et Recherche Premium */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="default" className="p-2 border-2 border-brand-blue/20 bg-gradient-to-br from-brand-blue-ghost/20 to-brand-cyan-ghost/20">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-blue group-focus-within:text-brand-cyan transition-colors" />
              <input
                type="text"
                placeholder="Rechercher un document..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border-2 border-brand-blue/20 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all outline-none text-sm"
              />
            </div>

            <Button
              variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "gap-2 transition-all",
                showFilters ? "bg-gradient-to-r from-brand-blue-ghost to-brand-cyan-ghost text-brand-blue border-2 border-brand-blue/30" : "text-gray-600 hover:bg-brand-blue-ghost hover:text-brand-blue"
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtres
              {typeFilter !== 'all' && (
                <span className="w-5 h-5 bg-gradient-to-r from-brand-blue to-brand-cyan text-white text-[10px] font-bold flex items-center justify-center rounded-full ml-1">
                  !
                </span>
              )}
            </Button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 border-t border-brand-blue/20 mt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-brand-blue uppercase tracking-wider">Type de document</label>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border-2 border-brand-blue/20 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none text-sm transition-all"
                    >
                      {documentTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>

      {/* Liste des documents Premium */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <SkeletonList count={5} />
        ) : documents && documents.length > 0 ? (
          <GlassCard variant="default" className="overflow-hidden p-0 border-2 border-brand-blue/10 bg-gradient-to-br from-white to-brand-blue-ghost/5">
            <div className="divide-y divide-brand-blue/10">
              {documents.map((document: any) => {
                const TypeIcon = getTypeIcon(document.type)
                return (
                  <motion.div
                    key={document.id}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="p-4 hover:bg-gradient-to-r hover:from-brand-blue-ghost/30 hover:to-brand-cyan-ghost/20 transition-all duration-300 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <motion.div
                        whileHover={{ scale: 1.05, rotate: 3 }}
                        className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost flex items-center justify-center text-brand-blue border border-brand-blue/20 shadow-sm"
                      >
                        <TypeIcon className="h-6 w-6" />
                      </motion.div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900 truncate group-hover:text-brand-blue transition-colors">
                            {document.title}
                          </h3>
                          <span className="px-2.5 py-0.5 text-xs bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost text-brand-blue rounded-lg font-semibold uppercase tracking-wide border border-brand-blue/20">
                            {getTypeLabel(document.type)}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {document.students && (
                            <div className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-brand-cyan" />
                              <span className="font-medium text-gray-700">
                                {document.students.first_name} {document.students.last_name}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-brand-blue" />
                            <span className="font-medium">Généré le {formatDate(document.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {document.file_url && (
                        <>
                          <Link href={`/dashboard/documents/${document.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-600 hover:text-brand-blue hover:bg-brand-blue-ghost transition-all"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Voir
                            </Button>
                          </Link>

                          <a
                            href={document.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                          >
                            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-brand-cyan hover:bg-brand-cyan-ghost transition-all">
                              <Download className="mr-2 h-4 w-4" />
                              Télécharger
                            </Button>
                          </a>

                          <Link href={`/dashboard/documents/${document.id}/sign`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-all"
                            >
                              <PenTool className="mr-2 h-4 w-4" />
                              Signer
                            </Button>
                          </Link>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEmailModal(document)}
                            className="text-gray-600 hover:text-brand-blue hover:bg-brand-blue-ghost transition-all"
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Email
                          </Button>

                          {document.student_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => sendToLearnerSpaceMutation.mutate(document)}
                              disabled={sendToLearnerSpaceMutation.isPending}
                              className="text-gray-600 hover:text-brand-cyan hover:bg-brand-cyan-ghost transition-all"
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Espace
                            </Button>
                          )}
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
                            deleteMutation.mutate(document.id)
                          }
                        }}
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </GlassCard>
        ) : (
          <GlassCard variant="default" className="p-12 text-center border-2 border-brand-blue/20 bg-gradient-to-br from-brand-blue-ghost/30 to-brand-cyan-ghost/30">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost rounded-full opacity-50 blur-2xl"></div>
              </div>
              <div className="relative p-6 bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost rounded-2xl inline-block">
                <FileText className="h-16 w-16 mx-auto text-brand-blue" />
              </div>
            </div>
            <div className="space-y-2 mb-6">
              <h3 className="text-xl font-bold text-gray-900">Aucun document trouvé</h3>
              <p className="text-gray-600">
                {search || typeFilter !== 'all'
                  ? 'Aucun document ne correspond à vos critères.'
                  : 'Commencez par générer ou uploader votre premier document.'}
              </p>
            </div>
            {!search && typeFilter === 'all' && (
              <Link href="/dashboard/documents/generate">
                <Button className="bg-gradient-to-r from-brand-blue to-brand-cyan hover:from-brand-blue-dark hover:to-brand-cyan shadow-md hover:shadow-lg transition-all">
                  <Plus className="mr-2 h-4 w-4" />
                  Générer un document
                </Button>
              </Link>
            )}
          </GlassCard>
        )}
      </motion.div>

      {/* Modal d'upload */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Uploader un document</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowUploadModal(false)
                    setUploadForm({
                      title: '',
                      type: 'other',
                      studentId: '',
                      file: null,
                    })
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Titre du document *</label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
                    placeholder="Ex: Certificat de formation"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Type de document *</label>
                  <select
                    value={uploadForm.type}
                    onChange={(e) => setUploadForm((prev) => ({ ...prev, type: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
                  >
                    {documentTypes.filter(t => t.value !== 'all').map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                    <option value="other">Autre</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Étudiant (optionnel)</label>
                  <select
                    value={uploadForm.studentId || ''}
                    onChange={(e) => setUploadForm((prev) => ({ ...prev, studentId: e.target.value || undefined }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
                  >
                    <option value="">Aucun étudiant spécifique</option>
                    {(students as StudentWithRelations[])?.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.first_name} {student.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Fichier *</label>
                  <div 
                    className={cn(
                      "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer hover:border-brand-blue hover:bg-brand-blue-ghost/10",
                      uploadForm.file ? "border-success-primary bg-success-bg/10" : "border-gray-300"
                    )}
                    onClick={() => !uploadForm.file && fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
                      className="hidden"
                    />
                    {uploadForm.file ? (
                      <div className="space-y-3">
                        <div className="w-12 h-12 bg-success-bg rounded-full flex items-center justify-center mx-auto">
                          <FileCheck className="h-6 w-6 text-success-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{uploadForm.file.name}</p>
                          <p className="text-sm text-gray-500">
                            {(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setUploadForm((prev) => ({ ...prev, file: null }))
                            if (fileInputRef.current) {
                              fileInputRef.current.value = ''
                            }
                          }}
                          className="mt-2"
                        >
                          Changer de fichier
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto group-hover:bg-brand-blue-ghost group-hover:text-brand-blue transition-colors">
                          <Upload className="h-6 w-6 text-gray-400 group-hover:text-brand-blue" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Cliquez pour sélectionner un fichier</p>
                          <p className="text-sm text-gray-500 mt-1">
                            PDF, Images, Word, Excel (max 10MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowUploadModal(false)
                      setUploadForm({
                        title: '',
                        type: 'other',
                        studentId: '',
                        file: null,
                      })
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={uploading || !uploadForm.file || !uploadForm.title}
                    className="shadow-lg shadow-brand-blue/20"
                  >
                    {uploading ? 'Upload en cours...' : 'Uploader'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal d'envoi par email */}
      <AnimatePresence>
        {showEmailModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Envoyer par email</h2>
                    <p className="text-sm text-gray-500">{selectedDocument?.title}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowEmailModal(false)
                    setSelectedDocument(null)
                    setEmailForm({ to: '', subject: '', message: '' })
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Destinataire *</label>
                  <input
                    type="email"
                    value={emailForm.to}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, to: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    placeholder="email@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Objet *</label>
                  <input
                    type="text"
                    value={emailForm.subject}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    placeholder="Objet de l'email"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Message</label>
                  <textarea
                    value={emailForm.message}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, message: e.target.value }))}
                    rows={6}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                    placeholder="Votre message..."
                  />
                </div>

                {selectedDocument?.file_url && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Pièce jointe</p>
                        <p className="text-xs text-gray-500">{selectedDocument.title}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowEmailModal(false)
                      setSelectedDocument(null)
                      setEmailForm({ to: '', subject: '', message: '' })
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSendEmail}
                    disabled={sendingEmail || !emailForm.to || !emailForm.subject}
                    className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                  >
                    {sendingEmail ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Envoyer
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de prévisualisation */}
      <AnimatePresence>
        {previewDocument && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-5xl h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-bold text-gray-900">{previewDocument.title}</h3>
                <div className="flex items-center space-x-2">
                  {previewDocument.file_url && (
                    <a
                      href={previewDocument.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                    >
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Télécharger
                      </Button>
                    </a>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPreviewDocument(null)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 bg-gray-100 p-4 overflow-auto flex items-center justify-center">
                {previewDocument.file_url && (
                  <div className="w-full h-full flex items-center justify-center">
                    {previewDocument.file_url.toLowerCase().endsWith('.pdf') ? (
                      <iframe
                        src={previewDocument.file_url}
                        className="w-full h-full rounded-lg shadow-lg bg-white"
                        title="Prévisualisation PDF"
                      />
                    ) : ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext =>
                        previewDocument.file_url?.toLowerCase().endsWith(`.${ext}`)
                      ) ? (
                      <img
                        src={previewDocument.file_url}
                        alt={previewDocument.title}
                        className="max-w-full max-h-full rounded-lg shadow-lg object-contain"
                      />
                    ) : (
                      <div className="text-center p-12 bg-white rounded-2xl shadow-sm max-w-md">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                          <FileIcon className="h-10 w-10 text-gray-400" />
                        </div>
                        <h4 className="text-xl font-bold text-gray-900 mb-2">Aperçu non disponible</h4>
                        <p className="text-gray-500 mb-6">
                          Ce type de fichier ne peut pas être prévisualisé directement.
                        </p>
                        <a
                          href={previewDocument.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        >
                          <Button className="shadow-lg shadow-brand-blue/20">
                            <Download className="mr-2 h-4 w-4" />
                            Télécharger pour voir
                          </Button>
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
