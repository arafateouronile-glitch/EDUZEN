'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/lib/hooks/use-auth'
import { educationalResourcesService } from '@/lib/services/educational-resources.service'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { ArrowLeft, Library, Save, Upload, X, FileText, Video, Image, Link as LinkIcon, Music } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

// Schéma de validation
const resourceSchema = z.object({
  title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères'),
  slug: z.string().min(3, 'Le slug doit contenir au moins 3 caractères').regex(/^[a-z0-9-]+$/, 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets'),
  description: z.string().optional(),
  resource_type: z.enum(['document', 'video', 'audio', 'image', 'link', 'interactive', 'other']).default('document'),
  category_id: z.string().optional(),
  external_url: z.string().url().optional().or(z.literal('')),
  tags: z.string().optional(),
  is_featured: z.boolean().default(false),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
})

type ResourceFormData = z.infer<typeof resourceSchema>

const RESOURCE_TYPE_ICONS = {
  document: FileText,
  video: Video,
  audio: Music,
  image: Image,
  link: LinkIcon,
  interactive: FileText,
  other: FileText,
}

const RESOURCE_TYPE_LABELS = {
  document: 'Document',
  video: 'Vidéo',
  audio: 'Audio',
  image: 'Image',
  link: 'Lien externe',
  interactive: 'Interactif',
  other: 'Autre',
}

export default function NewResourcePage() {
  const router = useRouter()
  const { user } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)

  // Récupérer les catégories
  const { data: categories } = useQuery({
    queryKey: ['resource-categories', user?.organization_id],
    queryFn: () => educationalResourcesService.getCategories(user?.organization_id || ''),
    enabled: !!user?.organization_id,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ResourceFormData>({
    resolver: zodResolver(resourceSchema),
    mode: 'onChange',
    defaultValues: {
      resource_type: 'document',
      status: 'published',
      is_featured: false,
    },
  })

  const resourceType = watch('resource_type')

  // Générer le slug automatiquement à partir du titre
  const title = watch('title')
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  // Mettre à jour le slug quand le titre change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setValue('title', newTitle)
    if (newTitle) {
      setValue('slug', generateSlug(newTitle))
    }
  }

  // Gérer l'upload du fichier
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setFilePreview(reader.result as string)
        }
        reader.readAsDataURL(selectedFile)
      }
    }
  }

  // Gérer l'upload de la miniature
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setThumbnailFile(selectedFile)
      const reader = new FileReader()
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const createMutation = useMutation({
    mutationFn: async (data: ResourceFormData) => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')

      // Upload du fichier si présent
      let fileUrl: string | null = null
      let fileSizeBytes: number | null = null
      if (file) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.organization_id}/resources/${Date.now()}.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('educational-resources')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('educational-resources')
          .getPublicUrl(fileName)
        fileUrl = urlData.publicUrl
        fileSizeBytes = file.size
      }

      // Upload de la miniature si présente
      let thumbnailUrl: string | null = null
      if (thumbnailFile) {
        const fileExt = thumbnailFile.name.split('.').pop()
        const fileName = `${user.organization_id}/thumbnails/${Date.now()}.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('resource-thumbnails')
          .upload(fileName, thumbnailFile)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('resource-thumbnails')
          .getPublicUrl(fileName)
        thumbnailUrl = urlData.publicUrl
      }

      // Parser les tags
      const tagsArray = data.tags
        ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : []

      return educationalResourcesService.createResource({
        organization_id: user.organization_id,
        title: data.title,
        slug: data.slug,
        description: data.description || null,
        resource_type: data.resource_type,
        category_id: data.category_id || null,
        external_url: data.external_url || null,
        file_url: fileUrl,
        thumbnail_url: thumbnailUrl,
        file_size_bytes: fileSizeBytes,
        tags: tagsArray.length > 0 ? tagsArray : null,
        is_featured: data.is_featured,
        status: data.status,
        author_id: user.id,
        view_count: 0,
        download_count: 0,
        favorite_count: 0,
      })
    },
    onSuccess: (resource) => {
      addToast({
        type: 'success',
        title: 'Ressource créée avec succès',
        description: 'Votre ressource a été ajoutée à la bibliothèque.',
      })
      router.push(`/dashboard/resources/${resource.slug}`)
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la création de la ressource',
      })
    },
  })

  const onSubmit = (data: ResourceFormData) => {
    createMutation.mutate(data)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-8 max-w-5xl mx-auto p-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/resources">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-blue-ghost rounded-xl">
            <Library className="h-6 w-6 text-brand-blue" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nouvelle ressource</h1>
            <p className="text-gray-500 mt-1">Ajoutez une ressource à la bibliothèque pédagogique</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Informations principales */}
        <GlassCard variant="premium" className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Informations principales</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titre de la ressource *
              </label>
              <input
                type="text"
                {...register('title')}
                onChange={handleTitleChange}
                className={cn(
                  "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all",
                  errors.title ? 'border-red-500' : 'border-gray-200'
                )}
                placeholder="Ex: Guide complet de React"
              />
              {errors.title && (
                <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slug (URL) *
              </label>
              <input
                type="text"
                {...register('slug')}
                className={cn(
                  "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all bg-gray-50",
                  errors.slug ? 'border-red-500' : 'border-gray-200'
                )}
                placeholder="guide-complet-react"
              />
              {errors.slug && (
                <p className="text-sm text-red-600 mt-1">{errors.slug.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de ressource
              </label>
              <select
                {...register('resource_type')}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
              >
                {Object.entries(RESOURCE_TYPE_LABELS).map(([value, label]) => {
                  const Icon = RESOURCE_TYPE_ICONS[value as keyof typeof RESOURCE_TYPE_ICONS]
                  return (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all resize-none"
                placeholder="Décrivez cette ressource en détail..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catégorie
              </label>
              <select
                {...register('category_id')}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
              >
                <option value="">Aucune catégorie</option>
                {categories?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (séparés par des virgules)
              </label>
              <input
                type="text"
                {...register('tags')}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                placeholder="Ex: react, javascript, tutoriel"
              />
              <p className="text-xs text-gray-500 mt-1">Séparez les tags par des virgules</p>
            </div>

            {resourceType === 'link' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL externe *
                </label>
                <input
                  type="url"
                  {...register('external_url')}
                  className={cn(
                    "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all",
                    errors.external_url ? 'border-red-500' : 'border-gray-200'
                  )}
                  placeholder="https://example.com"
                />
                {errors.external_url && (
                  <p className="text-sm text-red-600 mt-1">{errors.external_url.message}</p>
                )}
              </div>
            )}
          </div>
        </GlassCard>

        {/* Fichier */}
        {resourceType !== 'link' && (
          <GlassCard variant="premium" className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Fichier</h2>
            
            <div className="space-y-4">
              {filePreview ? (
                <div className="relative">
                  <img
                    src={filePreview}
                    alt="Aperçu"
                    className="w-full h-64 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null)
                      setFilePreview(null)
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : file ? (
                <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-brand-blue transition-colors">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Cliquez pour télécharger un fichier</p>
                  <p className="text-sm text-gray-500 mb-4">Tous les formats acceptés jusqu'à 100MB</p>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-block px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors cursor-pointer"
                  >
                    Choisir un fichier
                  </label>
                </div>
              )}
            </div>
          </GlassCard>
        )}

        {/* Miniature */}
        <GlassCard variant="premium" className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Miniature (optionnel)</h2>
          
          <div className="space-y-4">
            {thumbnailPreview ? (
              <div className="relative">
                <img
                  src={thumbnailPreview}
                  alt="Aperçu"
                  className="w-full h-64 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    setThumbnailFile(null)
                    setThumbnailPreview(null)
                  }}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-brand-blue transition-colors">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Cliquez pour télécharger une miniature</p>
                <p className="text-sm text-gray-500">PNG, JPG jusqu'à 5MB</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  className="hidden"
                  id="thumbnail-upload"
                />
                <label
                  htmlFor="thumbnail-upload"
                  className="mt-4 inline-block px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors cursor-pointer"
                >
                  Choisir un fichier
                </label>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Options de publication */}
        <GlassCard variant="premium" className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Options de publication</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut
              </label>
              <select
                {...register('status')}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
              >
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
                <option value="archived">Archivé</option>
              </select>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('is_featured')}
                className="w-5 h-5 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
              />
              <div>
                <span className="font-medium text-gray-900">Mettre en vedette</span>
                <p className="text-sm text-gray-500">La ressource apparaîtra dans la section "En vedette"</p>
              </div>
            </label>
          </div>
        </GlassCard>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href="/dashboard/resources">
            <Button variant="ghost" type="button">
              Annuler
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-brand-blue hover:bg-brand-blue/90 text-white shadow-lg shadow-brand-blue/20"
          >
            {createMutation.isPending ? (
              <>Création...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Créer la ressource
              </>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  )
}

