'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accessibilityService } from '@/lib/services/accessibility.service'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { Upload, File, Trash2, Eye, CheckCircle, AlertCircle, Download } from 'lucide-react'

interface DocumentUploadProps {
  organizationId: string
  studentId: string
  studentNeedId?: string
  showExisting?: boolean
}

const DOCUMENT_TYPES = [
  { value: 'mdph_certificate', label: 'Certificat MDPH' },
  { value: 'medical_certificate', label: 'Certificat médical' },
  { value: 'rqth', label: 'Reconnaissance RQTH' },
  { value: 'disability_card', label: 'Carte d\'invalidité' },
  { value: 'other', label: 'Autre' },
]

export function DocumentUpload({
  organizationId,
  studentId,
  studentNeedId,
  showExisting = true,
}: DocumentUploadProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const supabase = createClient()

  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    document_type: 'mdph_certificate',
    title: '',
    issue_date: '',
    expiry_date: '',
    issuer: '',
    reference_number: '',
    is_confidential: true,
    notes: '',
  })

  // Charger les documents existants
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['accessibility-documents', studentId],
    queryFn: async () => {
      return await accessibilityService.getDocuments(organizationId, studentId)
    },
    enabled: showExisting && !!studentId,
  })

  const uploadMutation = useMutation({
    mutationFn: async ({ file, metadata }: { file: File; metadata: any }) => {
      // 1. Upload le fichier vers Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${studentId}/${Date.now()}.${fileExt}`
      const filePath = `accessibility-documents/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('accessibility-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(`Erreur d'upload: ${uploadError.message}`)
      }

      // 2. Créer l'entrée dans la base de données
      return await accessibilityService.uploadDocument({
        organization_id: organizationId,
        student_id: studentId,
        student_need_id: studentNeedId || null,
        file_path: uploadData.path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        ...metadata,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessibility-documents'] })
      addToast({
        type: 'success',
        title: 'Document uploadé',
        description: 'Le document a été uploadé avec succès.',
      })
      // Réinitialiser le formulaire
      setFormData({
        document_type: 'mdph_certificate',
        title: '',
        issue_date: '',
        expiry_date: '',
        issuer: '',
        reference_number: '',
        is_confidential: true,
        notes: '',
      })
      setUploading(false)
    },
    onError: (error: any) => {
      setUploading(false)
      addToast({
        type: 'error',
        title: 'Erreur d\'upload',
        description: error?.message || 'Impossible d\'uploader le document.',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      // Récupérer le document pour obtenir le file_path
      const doc = documents.find((d) => d.id === documentId)
      if (doc?.file_path) {
        // Supprimer du storage
        await supabase.storage.from('accessibility-documents').remove([doc.file_path])
      }
      // Supprimer de la DB
      return await accessibilityService.deleteDocument(documentId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessibility-documents'] })
      addToast({
        type: 'success',
        title: 'Document supprimé',
        description: 'Le document a été supprimé avec succès.',
      })
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error?.message || 'Impossible de supprimer le document.',
      })
    },
  })

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validation taille (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      addToast({
        type: 'error',
        title: 'Fichier trop volumineux',
        description: 'Le fichier ne doit pas dépasser 10 MB.',
      })
      return
    }

    // Validation type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      addToast({
        type: 'error',
        title: 'Type de fichier non autorisé',
        description: 'Formats acceptés: PDF, JPG, PNG',
      })
      return
    }

    setUploading(true)
    uploadMutation.mutate({ file, metadata: formData })
  }

  const handleDownload = async (document: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('accessibility-documents')
        .download(document.file_path)

      if (error) throw error

      // Créer un lien de téléchargement
      const url = URL.createObjectURL(data)
      const a = window.document.createElement('a')
      a.href = url
      a.download = document.file_name
      a.click()
      URL.revokeObjectURL(url)
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Erreur de téléchargement',
        description: error?.message || 'Impossible de télécharger le document.',
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Non défini'
    return new Date(dateStr).toLocaleDateString('fr-FR')
  }

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false
    return new Date(expiryDate) < new Date()
  }

  return (
    <div className="space-y-6">
      {/* Formulaire d'upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Uploader un document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="document_type">Type de document *</Label>
              <select
                id="document_type"
                value={formData.document_type}
                onChange={(e) => setFormData((prev) => ({ ...prev, document_type: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Certificat MDPH 2024"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="issue_date">Date d'émission</Label>
              <Input
                id="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, issue_date: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="expiry_date">Date d'expiration</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, expiry_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="issuer">Organisme émetteur</Label>
              <Input
                id="issuer"
                value={formData.issuer}
                onChange={(e) => setFormData((prev) => ({ ...prev, issuer: e.target.value }))}
                placeholder="Ex: MDPH Paris"
              />
            </div>

            <div>
              <Label htmlFor="reference_number">Numéro de référence</Label>
              <Input
                id="reference_number"
                value={formData.reference_number}
                onChange={(e) => setFormData((prev) => ({ ...prev, reference_number: e.target.value }))}
                placeholder="Ex: MDPH-2024-12345"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="file_upload">Fichier (PDF, JPG, PNG - 10MB max) *</Label>
            <Input
              id="file_upload"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              disabled={uploading || !formData.title}
            />
            {!formData.title && (
              <p className="text-xs text-amber-600 mt-1">Veuillez d'abord renseigner un titre</p>
            )}
          </div>

          {uploading && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              Upload en cours...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Liste des documents existants */}
      {showExisting && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <File className="h-5 w-5" />
              Documents uploadés ({documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun document uploadé</p>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{doc.title}</span>
                        {doc.verified && (
                          <Badge variant="outline" className="bg-green-100 text-green-800 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Vérifié
                          </Badge>
                        )}
                        {isExpired(doc.expiry_date) && (
                          <Badge variant="outline" className="bg-red-100 text-red-800 text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Expiré
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>{doc.file_name}</span>
                        <span>{formatFileSize(doc.file_size || 0)}</span>
                        {doc.issue_date && <span>Émis le {formatDate(doc.issue_date)}</span>}
                        {doc.expiry_date && <span>Expire le {formatDate(doc.expiry_date)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(doc.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
