'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Upload,
  FileText,
  Download,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  GraduationCap,
  Briefcase,
  FileCheck,
  AlertCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate, cn } from '@/lib/utils'
import { motion } from '@/components/ui/motion'
import { useToast } from '@/components/ui/toast'
import { logger, sanitizeError } from '@/lib/utils/logger'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type TeacherDocument = {
  id: string
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

export default function TeacherDocumentsPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    document_type: 'other' as TeacherDocument['document_type'],
    file: null as File | null,
  })

  // Récupérer les documents de l'enseignant
  const { data: documents, isLoading } = useQuery({
    queryKey: ['teacher-documents', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      
      const { data, error } = await supabase
        .from('teacher_documents')
        .select('*')
        .eq('teacher_id', user.id)
        .order('uploaded_at', { ascending: false })
      
      if (error) {
        logger.error('Erreur récupération documents enseignant', error)
        throw error
      }
      
      return (data || []) as TeacherDocument[]
    },
    enabled: !!user?.id,
  })

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/teacher-documents/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erreur lors de l\'upload')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-documents'] })
      setShowUploadModal(false)
      setUploadForm({
        title: '',
        description: '',
        document_type: 'other',
        file: null,
      })
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      addToast({
        type: 'success',
        title: 'Document uploadé',
        description: 'Votre document a été uploadé avec succès.',
      })
    },
    onError: (error: Error) => {
      logger.error('Erreur upload document', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Impossible d\'uploader le document.',
      })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/teacher-documents/${documentId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erreur lors de la suppression')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-documents'] })
      addToast({
        type: 'success',
        title: 'Document supprimé',
        description: 'Le document a été supprimé avec succès.',
      })
    },
    onError: (error: Error) => {
      logger.error('Erreur suppression document', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer le document.',
      })
    },
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Limiter la taille à 10MB
      if (file.size > 10 * 1024 * 1024) {
        addToast({
          type: 'error',
          title: 'Fichier trop volumineux',
          description: 'La taille maximale autorisée est de 10MB.',
        })
        return
      }
      
      setUploadForm(prev => ({
        ...prev,
        file,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
      }))
    }
  }

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.title.trim()) {
      addToast({
        type: 'error',
        title: 'Champs requis',
        description: 'Veuillez sélectionner un fichier et renseigner un titre.',
      })
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', uploadForm.file)
    formData.append('title', uploadForm.title)
    formData.append('description', uploadForm.description)
    formData.append('document_type', uploadForm.document_type)

    try {
      await uploadMutation.mutateAsync(formData)
    } finally {
      setUploading(false)
    }
  }

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
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Impossible de télécharger le document.',
      })
    }
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
        <div className="flex items-center justify-between">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-brand-subtle rounded-lg blur opacity-75"></div>
            <div className="relative bg-white/80 backdrop-blur-sm rounded-lg px-6 py-4 border border-brand-blue/10 shadow-lg">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent mb-2">
                Mes documents administratifs
              </h1>
              <p className="text-gray-600 font-medium">
                Uploadez vos diplômes et documents administratifs. Ils seront visibles uniquement par l'administrateur et le secrétaire.
              </p>
            </div>
          </div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={() => setShowUploadModal(true)}
              className="bg-gradient-brand text-white shadow-lg hover:shadow-xl"
            >
              <Upload className="h-4 w-4 mr-2" />
              Uploader un document
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Documents List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-blue border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500">Chargement des documents...</p>
        </div>
      ) : !documents || documents.length === 0 ? (
        <GlassCard variant="premium" className="p-12 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun document</h3>
          <p className="text-gray-600 mb-6">
            Commencez par uploader vos documents administratifs et diplômes.
          </p>
          <Button
            onClick={() => setShowUploadModal(true)}
            className="bg-gradient-brand text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            Uploader un document
          </Button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc, index) => {
            const Icon = documentTypeIcons[doc.document_type]
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard variant="premium" hoverable className="p-6 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-brand-subtle opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-brand-blue/10 rounded-xl border border-brand-blue/20">
                        <Icon className="h-6 w-6 text-brand-blue" />
                      </div>
                      <div className="flex items-center gap-2">
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
                    </div>
                    
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{doc.title}</h3>
                    <p className="text-sm text-gray-600 mb-1">
                      {documentTypeLabels[doc.document_type]}
                    </p>
                    {doc.description && (
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2">{doc.description}</p>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>•</span>
                      <span>{formatDate(doc.uploaded_at)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
                            deleteMutation.mutate(doc.id)
                          }
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Uploader un document</DialogTitle>
            <DialogDescription>
              Uploadez vos documents administratifs ou diplômes. Taille maximale : 10MB
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="document_type">Type de document *</Label>
              <Select
                value={uploadForm.document_type}
                onValueChange={(value) => setUploadForm(prev => ({ ...prev, document_type: value as TeacherDocument['document_type'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(documentTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={uploadForm.title}
                onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Diplôme Master Informatique"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description (optionnel)</Label>
              <Textarea
                id="description"
                value={uploadForm.description}
                onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description du document..."
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="file">Fichier *</Label>
              <Input
                id="file"
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="cursor-pointer"
              />
              {uploadForm.file && (
                <p className="text-sm text-gray-500 mt-2">
                  Fichier sélectionné : {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUploadModal(false)}
              disabled={uploading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !uploadForm.file || !uploadForm.title.trim()}
              className="bg-gradient-brand text-white"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Uploader
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
