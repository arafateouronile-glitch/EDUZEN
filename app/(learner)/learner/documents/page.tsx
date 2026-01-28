'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useLearnerContext } from '@/lib/contexts/learner-context'
import { createLearnerClient } from '@/lib/supabase/learner-client'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { motion } from '@/components/ui/motion'
import {
  FileText,
  Download,
  Eye,
  Search,
  Calendar,
  Filter,
  Award,
  ClipboardList,
  FileCheck,
  Mail,
  Receipt,
  Folder,
} from 'lucide-react'
import { useState } from 'react'
import { formatDate } from '@/lib/utils'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

const documentTypes = [
  { id: 'all', label: 'Tous', icon: Folder },
  { id: 'convocation', label: 'Convocations', icon: Mail },
  { id: 'convention', label: 'Conventions', icon: FileCheck },
  { id: 'attestation', label: 'Attestations', icon: ClipboardList },
  { id: 'certificate', label: 'Certificats', icon: Award },
  { id: 'invoice', label: 'Factures', icon: Receipt },
]

export default function LearnerDocumentsPage() {
  const { student: studentData, studentId } = useLearnerContext()
  const supabase = useMemo(() => (studentId ? createLearnerClient(studentId) : null), [studentId])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeType, setActiveType] = useState('all')

  // Fonction pour télécharger un document
  const handleDownload = async (doc: any) => {
    try {
      if (!doc.file_url) {
        logger.error('No file URL for document', { documentId: doc.id ? maskId(doc.id) : 'unknown' })
        alert('URL du fichier non disponible')
        return
      }

      // Télécharger le fichier
      const response = await fetch(doc.file_url)
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`)
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = doc.name || 'document.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      // Marquer comme téléchargé si c'est un document learner_documents
      if (doc.source === 'learner_documents' && doc.id) {
        try {
          await supabase
            ?.from('learner_documents')
            .update({ downloaded_at: new Date().toISOString() })
            .eq('id', doc.id)
        } catch (error) {
          logger.error('Error marking as downloaded', sanitizeError(error), {
            documentId: doc.id ? maskId(doc.id) : undefined,
          })
          // Ne pas bloquer le téléchargement si la mise à jour échoue
        }
      }
    } catch (error) {
      logger.error('Erreur lors du téléchargement', sanitizeError(error), {
        documentId: doc.id ? maskId(doc.id) : undefined,
      })
      alert('Erreur lors du téléchargement du document')
    }
  }

  // Fonction pour ouvrir un document dans un nouvel onglet
  const handlePreview = (doc: any) => {
    if (!doc.file_url) {
      alert('URL du fichier non disponible')
      return
    }
    window.open(doc.file_url, '_blank')
    
    // Marquer comme vu si c'est un document learner_documents
    if (doc.source === 'learner_documents' && doc.id && supabase) {
      supabase
        .from('learner_documents')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', doc.id)
        .then(({ error }) => {
          if (error) logger.error('Error marking as viewed', sanitizeError(error), {
            documentId: maskId(doc.id),
          })
        })
    }
  }

  // Récupérer les documents (utiliser generated_documents)
  const { data: documents, isLoading } = useQuery({
    queryKey: ['learner-documents-all', studentId],
    queryFn: async () => {
      if (!studentId) return []
      if (!supabase) return []
      
      try {
        // Récupérer les documents depuis les trois tables : learner_documents, generated_documents et documents
        // La RLS policy filtre déjà les documents selon l'étudiant connecté

        logger.info('Fetching documents', {
          studentId: maskId(studentId),
        })

        // 1. Récupérer depuis learner_documents (documents envoyés dans l'espace apprenant)
        const { data: learnerDocs, error: learnerError } = await supabase
          .from('learner_documents')
          .select('*')
          .order('sent_at', { ascending: false })

        logger.info('Fetched learner_documents', {
          studentId: maskId(studentId),
          count: learnerDocs?.length || 0,
          hasError: !!learnerError,
        })

        // 2. Récupérer depuis generated_documents
        const { data: generatedDocs, error: generatedError } = await supabase
          .from('generated_documents')
          .select('*')
          .order('created_at', { ascending: false })

        logger.info('Fetched generated_documents', {
          studentId: maskId(studentId),
          count: generatedDocs?.length || 0,
          hasError: !!generatedError,
        })

        // 3. Récupérer depuis documents
        const { data: regularDocs, error: regularError } = await supabase
          .from('documents')
          .select('*')
          .order('created_at', { ascending: false })

        logger.info('Fetched documents', {
          studentId: maskId(studentId),
          count: regularDocs?.length || 0,
          hasError: !!regularError,
        })
        
        // Combiner les résultats des trois tables
        const allDocs: any[] = []
        
        // Fonction helper pour normaliser les types de documents
        const normalizeDocumentType = (type: string): string => {
          if (!type) return 'other'
          
          const normalized = type.toLowerCase()
          
          // Mapping des types vers les types de filtres
          if (normalized.includes('convocation')) return 'convocation'
          if (normalized.includes('convention')) return 'convention'
          if (normalized.includes('attestation')) return 'attestation'
          if (normalized.includes('certificat') || normalized.includes('certificate')) return 'certificate'
          if (normalized.includes('facture') || normalized.includes('invoice')) return 'invoice'
          if (normalized.includes('releve') || normalized.includes('relevé')) return 'attestation'
          
          // Retourner le type tel quel s'il correspond déjà
          if (['convocation', 'convention', 'attestation', 'certificate', 'invoice'].includes(normalized)) {
            return normalized
          }
          
          return 'other'
        }
        
        // Mapper les learner_documents (priorité - documents envoyés dans l'espace apprenant)
        if (!learnerError && learnerDocs) {
          learnerDocs.forEach((doc: any) => {
            allDocs.push({
              id: doc.id,
              name: doc.title || `Document ${doc.type}`,
              type: normalizeDocumentType(doc.type),
              original_type: doc.type,
              file_url: doc.file_url,
              created_at: doc.sent_at || doc.created_at,
              metadata: doc.description ? { description: doc.description } : null,
              format: 'pdf',
              source: 'learner_documents',
            })
          })
        }
        
        // Mapper les generated_documents
        if (!generatedError && generatedDocs) {
          generatedDocs.forEach((doc: any) => {
            allDocs.push({
              id: doc.id,
              name: doc.file_name || `Document ${doc.type}`,
              type: normalizeDocumentType(doc.type),
              original_type: doc.type,
              file_url: doc.file_url,
              created_at: doc.created_at,
              metadata: doc.metadata,
              format: doc.format,
              source: 'generated_documents',
            })
          })
        }
        
        // Mapper les documents
        if (!regularError && regularDocs) {
          regularDocs.forEach((doc: any) => {
            allDocs.push({
              id: doc.id,
              name: doc.name || doc.title || `Document ${doc.type}`,
              type: normalizeDocumentType(doc.type),
              original_type: doc.type,
              file_url: doc.file_url || doc.url,
              created_at: doc.created_at,
              metadata: doc.metadata,
              format: doc.format || 'pdf',
              source: 'documents',
            })
          })
        }
        
        // Trier par date de création (plus récent en premier)
        allDocs.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime()
          const dateB = new Date(b.created_at || 0).getTime()
          return dateB - dateA
        })
        
        // Log des erreurs si nécessaire
        if (learnerError) {
          logger.error('[Documents] Error fetching learner_documents:', {
            code: learnerError.code,
            message: learnerError.message,
            details: learnerError.details,
            hint: learnerError.hint,
          })
        }
        if (generatedError) {
          logger.error('[Documents] Error fetching generated_documents:', {
            code: generatedError.code,
            message: generatedError.message,
            details: generatedError.details,
            hint: generatedError.hint,
          })
        }
        if (regularError) {
          logger.error('[Documents] Error fetching documents:', {
            code: regularError.code,
            message: regularError.message,
            details: regularError.details,
            hint: regularError.hint,
          })
        }
        
        logger.debug('[Documents] Total documents found', { count: allDocs.length })
        logger.debug('[Documents] Final documents', { documents: allDocs })
        
        return allDocs
      } catch (error: any) {
        logger.error('Unexpected error fetching documents:', error)
        return []
      }
    },
    enabled: !!studentId && !!supabase,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  // Récupérer les certificats
  const { data: certificates } = useQuery({
    queryKey: ['learner-certificates-all', studentId],
    queryFn: async () => {
      if (!studentId) return []
      if (!supabase) return []
      
      try {
        // Commencer directement sans la relation courses pour éviter les erreurs RLS
        const { data: simpleData, error: simpleError } = await supabase
          .from('course_certificates')
          .select('*')
          .order('issued_at', { ascending: false })
        
        if (simpleError) {
          // Gérer les erreurs RLS ou table inexistante
          if (
            simpleError.code === '42501' ||
            simpleError.code === 'PGRST116' ||
            simpleError.code === '42P01' ||
            simpleError.code === 'PGRST301' ||
            simpleError.code === '400' ||
            simpleError.message?.includes('permission denied') ||
            simpleError.message?.includes('does not exist')
          ) {
            logger.warn('Certificates may not be accessible (RLS or missing)', { message: simpleError.message })
            return []
          }
          logger.warn('Error fetching certificates', sanitizeError(simpleError))
          return []
        }
        
        if (!simpleData || simpleData.length === 0) {
          return []
        }
        
        // Enrichir manuellement avec les cours si possible
        const courseIds = [...new Set((simpleData || []).map((c: any) => c.course_id).filter(Boolean))]
        if (courseIds.length > 0) {
          const { data: coursesData } = await supabase
            .from('courses')
            .select('id, title, description')
            .in('id', courseIds)
          
          if (coursesData) {
            return (simpleData || []).map((cert: any) => ({
              ...cert,
              courses: coursesData.find((c: any) => c.id === cert.course_id) || null
            }))
          }
        }
        
        return simpleData || []
      } catch (error: any) {
        logger.error('Unexpected error fetching certificates:', error)
        return []
      }
    },
    enabled: !!studentId && !!supabase,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  // Combiner et filtrer les documents
  const allDocuments = [
    ...(documents || []).map((doc: any) => ({
      ...doc,
      source: 'document',
    })),
    ...(certificates || []).map((cert: any) => ({
      id: cert.id,
      name: `Certificat - ${cert.courses?.title || 'Formation'}`,
      type: 'certificate',
      created_at: cert.issued_at,
      file_url: cert.certificate_url,
      source: 'certificate',
      certificate_number: cert.certificate_number,
    })),
  ].filter((doc) => {
    const matchesSearch = doc.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = activeType === 'all' || doc.type === activeType
    return matchesSearch && matchesType
  })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'convocation': return <Mail className="h-5 w-5 text-brand-blue" />
      case 'convention': return <FileCheck className="h-5 w-5 text-brand-blue-light" />
      case 'attestation': return <ClipboardList className="h-5 w-5 text-brand-cyan" />
      case 'certificate': return <Award className="h-5 w-5 text-brand-cyan-light" />
      case 'invoice': return <Receipt className="h-5 w-5 text-gray-600" />
      default: return <FileText className="h-5 w-5 text-gray-600" />
    }
  }

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      convocation: 'bg-brand-blue-pale text-brand-blue',
      convention: 'bg-brand-blue-ghost text-brand-blue-dark',
      attestation: 'bg-brand-cyan-pale text-brand-cyan',
      certificate: 'bg-brand-cyan-ghost text-brand-cyan-dark',
      invoice: 'bg-gray-100 text-gray-700',
    }
    const labels: Record<string, string> = {
      convocation: 'Convocation',
      convention: 'Convention',
      attestation: 'Attestation',
      certificate: 'Certificat',
      invoice: 'Facture',
    }
    return (
      <Badge className={`${colors[type] || 'bg-gray-100 text-gray-700'} hover:${colors[type]}`}>
        {labels[type] || type}
      </Badge>
    )
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  }

  return (
    <motion.div
      className="space-y-6 pb-24 lg:pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Premium */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="premium" className="p-6 md:p-8 relative overflow-hidden">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan/5 via-brand-cyan-ghost/30 to-brand-cyan-pale/20" />

          {/* Floating orbs */}
          <motion.div
            animate={{ y: [0, -10, 0], x: [0, 5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-10 -right-10 w-40 h-40 bg-brand-cyan/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ y: [0, 10, 0], x: [0, -5, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-10 -left-10 w-32 h-32 bg-brand-cyan/10 rounded-full blur-3xl"
          />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <motion.div
                className="p-4 bg-gradient-to-br from-brand-cyan to-brand-cyan-dark rounded-2xl shadow-lg shadow-brand-cyan/25"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <FileText className="h-8 w-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-brand-blue to-brand-cyan bg-clip-text text-transparent">
                  Mes documents
                </h1>
                <p className="text-gray-500 mt-1">
                  Accédez à tous vos documents de formation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge className="bg-gradient-to-r from-brand-cyan/10 to-brand-cyan-pale text-brand-cyan border-0 px-4 py-2">
                <Folder className="h-4 w-4 mr-2" />
                {allDocuments?.length || 0} document{(allDocuments?.length || 0) > 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Search & Filter Premium */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="premium" className="p-5">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="search"
                placeholder="Rechercher un document..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-gray-50/50 border-gray-200/80 rounded-xl focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan/50"
              />
            </div>

            {/* Type Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
              {documentTypes.map((type) => (
                <motion.div
                  key={type.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant={activeType === type.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveType(type.id)}
                    className={`whitespace-nowrap rounded-xl h-10 ${
                      activeType === type.id
                        ? 'bg-gradient-to-r from-brand-cyan to-brand-cyan-dark border-0 shadow-lg shadow-brand-cyan/25'
                        : 'hover:border-brand-cyan hover:text-brand-cyan hover:bg-brand-cyan-pale'
                    }`}
                  >
                    <type.icon className="h-4 w-4 mr-1.5" />
                    {type.label}
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Documents List */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : allDocuments.length > 0 ? (
          <div className="grid gap-4">
            {allDocuments.map((doc: any, index: number) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard className="p-4 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className={`p-3 rounded-xl ${
                      doc.type === 'certificate' ? 'bg-brand-cyan-ghost' :
                      doc.type === 'convocation' ? 'bg-brand-blue-pale' :
                      doc.type === 'convention' ? 'bg-brand-blue-ghost' :
                      doc.type === 'attestation' ? 'bg-brand-cyan-pale' :
                      'bg-gray-50'
                    }`}>
                      {getTypeIcon(doc.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {doc.name}
                        </h3>
                        {getTypeBadge(doc.type)}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {doc.created_at && formatDate(doc.created_at)}
                        </span>
                        {doc.sessions?.formations?.name && (
                          <span className="truncate">
                            {doc.sessions.formations.name}
                          </span>
                        )}
                        {doc.certificate_number && (
                          <span className="font-mono text-xs">
                            N° {doc.certificate_number}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handlePreview(doc)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="group-hover:border-brand-blue group-hover:text-brand-blue"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        ) : (
          <GlassCard className="p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucun document trouvé
            </h3>
            <p className="text-gray-500">
              {searchQuery || activeType !== 'all'
                ? 'Essayez de modifier vos filtres de recherche'
                : 'Vos documents apparaîtront ici une fois générés'}
            </p>
          </GlassCard>
        )}
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 text-center">
          <Mail className="h-6 w-6 text-blue-600 mx-auto mb-2" />
          <div className="text-xl font-bold text-gray-900">
            {documents?.filter((d: any) => d.type === 'convocation').length || 0}
          </div>
          <p className="text-xs text-gray-500">Convocations</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <ClipboardList className="h-6 w-6 text-brand-cyan mx-auto mb-2" />
          <div className="text-xl font-bold text-gray-900">
            {documents?.filter((d: any) => d.type === 'attestation').length || 0}
          </div>
          <p className="text-xs text-gray-500">Attestations</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <Award className="h-6 w-6 text-brand-cyan-light mx-auto mb-2" />
          <div className="text-xl font-bold text-gray-900">
            {certificates?.length || 0}
          </div>
          <p className="text-xs text-gray-500">Certificats</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <Receipt className="h-6 w-6 text-gray-600 mx-auto mb-2" />
          <div className="text-xl font-bold text-gray-900">
            {documents?.filter((d: any) => d.type === 'invoice').length || 0}
          </div>
          <p className="text-xs text-gray-500">Factures</p>
        </GlassCard>
      </motion.div>
    </motion.div>
  )
}


