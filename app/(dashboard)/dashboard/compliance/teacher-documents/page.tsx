'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Download,
  CheckCircle2,
  Clock,
  GraduationCap,
  Briefcase,
  FileCheck,
  Users,
  Search,
  Filter,
} from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import { motion } from '@/components/ui/motion'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { logger, sanitizeError } from '@/lib/utils/logger'

type TeacherDocument = {
  id: string
  teacher_id: string
  title: string
  description: string | null
  document_type: 'diploma' | 'administrative' | 'certification' | 'identity' | 'other'
  file_url: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  uploaded_at: string
  verified: boolean
  verified_at: string | null
  verified_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
  teachers?: {
    id: string
    full_name: string | null
    email: string
  }
}

const documentTypeLabels = {
  diploma: 'Diplôme',
  administrative: 'Document administratif',
  certification: 'Certification',
  identity: 'Pièce d\'identité',
  other: 'Autre',
}

const documentTypeIcons = {
  diploma: GraduationCap,
  administrative: Briefcase,
  certification: FileCheck,
  identity: FileText,
  other: FileText,
}

export default function ComplianceTeacherDocumentsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all')
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all')
  const [verificationFilter, setVerificationFilter] = useState<string>('all')

  // Récupérer tous les enseignants de l'organisation
  const { data: teachers } = useQuery({
    queryKey: ['organization-teachers', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('organization_id', user.organization_id)
        .eq('role', 'teacher')
        .eq('is_active', true)
        .order('full_name', { ascending: true })
      
      if (error) {
        logger.error('Erreur récupération enseignants', error)
        return []
      }
      
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer tous les documents des enseignants
  const { data: documents, isLoading } = useQuery({
    queryKey: ['all-teacher-documents', user?.organization_id, selectedTeacherId, documentTypeFilter, verificationFilter],
    queryFn: async () => {
      if (!user?.organization_id) return []
      
      // Construire la requête avec les filtres
      // Utiliser une approche simplifiée pour éviter l'inférence de type trop profonde
      const queryParams: any = {
        organization_id: user.organization_id,
      }
      
      if (selectedTeacherId !== 'all') {
        queryParams.teacher_id = selectedTeacherId
      }
      
      if (documentTypeFilter !== 'all') {
        queryParams.document_type = documentTypeFilter
      }
      
      if (verificationFilter !== 'all') {
        queryParams.verified = verificationFilter === 'verified'
      }
      
      // Construire la requête avec les filtres (utiliser as any pour éviter les problèmes de typage Supabase)
      // @ts-ignore - teacher_documents table not in Supabase types
      let query: any = (supabase as any)
        // @ts-ignore - teacher_documents table not in Supabase types
        .from('teacher_documents')
        .select('*')
        .eq('organization_id', queryParams.organization_id)
      
      if (queryParams.teacher_id) {
        query = query.eq('teacher_id', queryParams.teacher_id)
      }
      if (queryParams.document_type) {
        query = query.eq('document_type', queryParams.document_type)
      }
      if (queryParams.verified !== undefined) {
        query = query.eq('verified', queryParams.verified)
      }
      
      const { data: documentsData, error } = await query.order('uploaded_at', { ascending: false })
      
      // Récupérer les informations des enseignants séparément
      const teacherIds = Array.from(new Set((documentsData || []).map((d: any) => d.teacher_id)))
      let teachersMap = new Map()
      
      if (teacherIds.length > 0) {
        // @ts-ignore - Type inference issue with .in() method
        const { data: teachersData } = await (supabase as any)
          .from('users')
          .select('id, full_name, email')
          .in('id', teacherIds)
        
        teachersMap = new Map((teachersData || []).map((t: any) => [t.id, t]))
      }
      
      // Combiner les données
      const data = (documentsData || []).map((doc: any) => ({
        ...doc,
        teachers: teachersMap.get(doc.teacher_id) || null,
      }))
      
      if (error) {
        logger.error('Erreur récupération documents enseignants', error)
        return []
      }
      
      // Filtrer par recherche côté client
      let filtered = (data || []) as TeacherDocument[]
      if (search) {
        const searchLower = search.toLowerCase()
        filtered = filtered.filter(doc => 
          doc.title.toLowerCase().includes(searchLower) ||
          doc.description?.toLowerCase().includes(searchLower) ||
          doc.teachers?.full_name?.toLowerCase().includes(searchLower) ||
          doc.teachers?.email?.toLowerCase().includes(searchLower)
        )
      }
      
      return filtered
    },
    enabled: !!user?.organization_id,
  })

  // Grouper les documents par enseignant
  const documentsByTeacher = documents?.reduce((acc, doc) => {
    const teacherId = doc.teacher_id
    if (!acc[teacherId]) {
      acc[teacherId] = {
        teacher: doc.teachers,
        documents: [],
      }
    }
    acc[teacherId].documents.push(doc)
    return acc
  }, {} as Record<string, { teacher: TeacherDocument['teachers'], documents: TeacherDocument[] }>) || {}

  const handleDownload = async (doc: TeacherDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('teacher-documents')
        .download(doc.file_url)
      
      if (error) throw error
      
      const url = window.URL.createObjectURL(data)
      const a = window.document.createElement('a')
      a.href = url
      a.download = doc.file_name
      window.document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      window.document.body.removeChild(a)
    } catch (error) {
      logger.error('Erreur téléchargement document', error)
    }
  }

  const verifyMutation = useMutation({
    mutationFn: async ({ documentId, verified }: { documentId: string; verified: boolean }) => {
      // Utiliser as any pour éviter les problèmes de typage Supabase avec teacher_documents
      const { error } = await (supabase as any)
        .from('teacher_documents')
        .update({
          verified,
          verified_at: verified ? new Date().toISOString() : null,
          verified_by: verified ? user?.id : null,
        })
        .eq('id', documentId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-teacher-documents'] })
    },
    onError: (error: Error) => {
      logger.error('Erreur vérification document', error)
    },
  })

  const handleVerify = (documentId: string, verified: boolean) => {
    verifyMutation.mutate({ documentId, verified })
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header Premium */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-brand-subtle rounded-lg blur opacity-75"></div>
          <div className="relative bg-white/80 backdrop-blur-sm rounded-lg px-6 py-4 border border-brand-blue/10 shadow-lg">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent mb-2">
              Documents des formateurs
            </h1>
            <p className="text-gray-600 font-medium">
              Consultez les documents administratifs et diplômes de tous les formateurs
            </p>
          </div>
        </div>
      </motion.div>

      {/* Filtres */}
      <GlassCard variant="premium" className="p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les formateurs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les formateurs</SelectItem>
              {teachers?.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.full_name || teacher.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(documentTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={verificationFilter} onValueChange={setVerificationFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="verified">Vérifiés</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      {/* Documents par formateur */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-blue border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500">Chargement des documents...</p>
        </div>
      ) : Object.keys(documentsByTeacher).length === 0 ? (
        <GlassCard variant="premium" className="p-12 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun document</h3>
          <p className="text-gray-600">
            Aucun document n'a été uploadé par les formateurs.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-8">
          {Object.entries(documentsByTeacher).map(([teacherId, { teacher, documents: teacherDocs }]) => (
            <motion.div
              key={teacherId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card variant="premium" className="overflow-hidden">
                <CardHeader className="bg-gradient-brand-subtle border-b border-brand-blue/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand-blue/10 rounded-lg border border-brand-blue/20">
                        <Users className="h-5 w-5 text-brand-blue" />
                      </div>
                      <div>
                        <CardTitle className="text-brand-blue">
                          {teacher?.full_name || teacher?.email || 'Formateur inconnu'}
                        </CardTitle>
                        <CardDescription>
                          {teacher?.email || 'Email non disponible'} • {teacherDocs.length} document{teacherDocs.length > 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teacherDocs.map((doc) => {
                      const Icon = documentTypeIcons[doc.document_type]
                      return (
                        <GlassCard
                          key={doc.id}
                          variant="premium"
                          hoverable
                          className="p-5 relative overflow-hidden group"
                        >
                          <div className="absolute inset-0 bg-gradient-brand-subtle opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          
                          <div className="relative z-10">
                            <div className="flex items-start justify-between mb-3">
                              <div className="p-2 bg-brand-blue/10 rounded-lg border border-brand-blue/20">
                                <Icon className="h-5 w-5 text-brand-blue" />
                              </div>
                              {doc.verified ? (
                                <Badge className="bg-green-100 text-green-700 border-green-300">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Vérifié
                                </Badge>
                              ) : (
                                <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
                                  <Clock className="h-3 w-3 mr-1" />
                                  En attente
                                </Badge>
                              )}
                            </div>
                            
                            <h4 className="font-semibold text-gray-900 mb-1 line-clamp-2">{doc.title}</h4>
                            <p className="text-xs text-gray-600 mb-2">{documentTypeLabels[doc.document_type]}</p>
                            
                            {doc.description && (
                              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{doc.description}</p>
                            )}
                            
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                              <span>{formatFileSize(doc.file_size)}</span>
                              <span>•</span>
                              <span>{formatDate(doc.uploaded_at)}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(doc)}
                                className="flex-1"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Télécharger
                              </Button>
                              {!doc.verified && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleVerify(doc.id, true)}
                                  className="bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Vérifier
                                </Button>
                              )}
                            </div>
                          </div>
                        </GlassCard>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
