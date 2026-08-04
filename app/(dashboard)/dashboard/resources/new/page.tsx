'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/lib/hooks/use-auth'
import { educationalResourcesService } from '@/lib/services/educational-resources.service.client'
import { programService } from '@/lib/services/program.service.client'
import { formationService } from '@/lib/services/formation.service.client'
import { sessionService } from '@/lib/services/session.service.client'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { ArrowLeft, Library, Save, Upload, X, FileText, Video, Image, Link as LinkIcon, Music, Users, Check, UserCheck, Folder } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

interface SessionStudent {
  id: string
  first_name: string
  last_name: string
  email: string | null
}

const visibilityScopeEnum = z.enum(['all', 'program', 'formation', 'session'])

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
  visibility_scope: visibilityScopeEnum.default('all'),
  visibility_program_id: z.string().optional(),
  visibility_formation_id: z.string().optional(),
  visibility_session_id: z.string().optional(),
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

function resourceTypeFromExtension(filename: string): ResourceFormData['resource_type'] {
  const ext = (filename.split('.').pop() || '').toLowerCase()
  if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) return 'document'
  if (['mp4', 'webm', 'mov'].includes(ext)) return 'video'
  if (['mp3', 'wav'].includes(ext)) return 'audio'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image'
  return 'other'
}

export default function NewResourcePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<string[]>([])
  const [mode, setMode] = useState<'single' | 'folder'>(searchParams.get('mode') === 'folder' ? 'folder' : 'single')
  const [folderFiles, setFolderFiles] = useState<File[]>([])

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
      visibility_scope: 'all',
    },
  })

  const resourceType = watch('resource_type')
  const visibilityScope = watch('visibility_scope')
  const selectedSessionId = watch('visibility_session_id')

  const { data: programs } = useQuery({
    queryKey: ['programs', user?.organization_id],
    queryFn: async () => {
      const result = await programService.getAllPrograms(user?.organization_id || '')
      return Array.isArray(result) ? result : result.data
    },
    enabled: !!user?.organization_id && (visibilityScope === 'program'),
  })

  const { data: formations } = useQuery({
    queryKey: ['formations', user?.organization_id],
    queryFn: async () => {
      const result = await formationService.getAllFormations(user?.organization_id || '')
      return Array.isArray(result) ? result : result.data
    },
    enabled: !!user?.organization_id && (visibilityScope === 'formation'),
  })

  const { data: sessions } = useQuery({
    queryKey: ['sessions', user?.organization_id],
    queryFn: async () => {
      const result = await sessionService.getAllSessions(user?.organization_id || '')
      return Array.isArray(result) ? result : result.data
    },
    enabled: !!user?.organization_id && (visibilityScope === 'session'),
  })

  const { data: sessionStudents, isLoading: isLoadingStudents } = useQuery<SessionStudent[]>({
    queryKey: ['session-students', selectedSessionId],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${selectedSessionId}/students`)
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    enabled: visibilityScope === 'session' && !!selectedSessionId,
  })

  const toggleLearner = useCallback((id: string) => {
    setSelectedLearnerIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }, [])

  const toggleAllLearners = useCallback(() => {
    if (!sessionStudents) return
    setSelectedLearnerIds(prev =>
      prev.length === sessionStudents.length ? [] : sessionStudents.map(s => s.id)
    )
  }, [sessionStudents])

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

  // Gérer l'ajout de fichiers en mode dossier (sélection multiple)
  const handleFolderFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    setFolderFiles(prev => [...prev, ...selected])
    e.target.value = ''
  }

  const removeFolderFile = (index: number) => {
    setFolderFiles(prev => prev.filter((_, i) => i !== index))
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

      // Parser les tags
      const tagsArray = data.tags
        ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : []

      const visibilityScope = data.visibility_scope || 'all'
      const learnerIds = visibilityScope === 'session' && selectedLearnerIds.length > 0
        ? selectedLearnerIds
        : null

      if (mode === 'folder') {
        if (folderFiles.length === 0) throw new Error('Sélectionnez au moins un fichier pour créer le dossier')

        const collection = await educationalResourcesService.createCollection({
          organization_id: user.organization_id,
          user_id: user.id,
          name: data.title,
          description: data.description || null,
          is_public: visibilityScope === 'all',
        } as any)

        for (const currentFile of folderFiles) {
          const uploadFormData = new FormData()
          uploadFormData.set('organization_id', user.organization_id)
          uploadFormData.set('file', currentFile)

          const res = await fetch('/api/educational-resources/upload', {
            method: 'POST',
            body: uploadFormData,
          })

          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.error || err.details || `Erreur lors de l'upload de ${currentFile.name}`)
          }

          const uploadResult = await res.json()
          const fileTitle = currentFile.name.replace(/\.[^/.]+$/, '')
          const fileSlug = `${generateSlug(fileTitle)}-${Math.random().toString(36).slice(2, 8)}`

          const resource = await educationalResourcesService.createResource({
            organization_id: user.organization_id,
            title: fileTitle,
            slug: fileSlug,
            description: data.description || null,
            resource_type: resourceTypeFromExtension(currentFile.name),
            category_id: data.category_id || null,
            external_url: null,
            file_url: uploadResult.fileUrl ?? null,
            thumbnail_url: null,
            file_size_bytes: currentFile.size,
            tags: tagsArray.length > 0 ? tagsArray : null,
            is_featured: data.is_featured,
            status: data.status,
            author_id: user.id,
            view_count: 0,
            download_count: 0,
            favorite_count: 0,
            visibility_scope: visibilityScope,
            visibility_program_id: visibilityScope === 'program' ? data.visibility_program_id || null : null,
            visibility_formation_id: visibilityScope === 'formation' ? data.visibility_formation_id || null : null,
            visibility_session_id: visibilityScope === 'session' ? data.visibility_session_id || null : null,
            visibility_learner_ids: learnerIds,
          } as any)

          await educationalResourcesService.addResourceToCollection(collection.id, resource.id, user.id)
        }

        return { kind: 'folder' as const, collection }
      }

      let fileUrl: string | null = null
      let thumbnailUrl: string | null = null
      let fileSizeBytes: number | null = null

      if (file || thumbnailFile) {
        const formData = new FormData()
        formData.set('organization_id', user.organization_id)
        if (file) formData.set('file', file)
        if (thumbnailFile) formData.set('thumbnail', thumbnailFile)

        const res = await fetch('/api/educational-resources/upload', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || err.details || 'Erreur lors de l\'upload')
        }

        const uploadResult = await res.json()
        fileUrl = uploadResult.fileUrl ?? null
        thumbnailUrl = uploadResult.thumbnailUrl ?? null
        if (file) fileSizeBytes = file.size
      }

      const resource = await educationalResourcesService.createResource({
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
        visibility_scope: visibilityScope,
        visibility_program_id: visibilityScope === 'program' ? data.visibility_program_id || null : null,
        visibility_formation_id: visibilityScope === 'formation' ? data.visibility_formation_id || null : null,
        visibility_session_id: visibilityScope === 'session' ? data.visibility_session_id || null : null,
        visibility_learner_ids: learnerIds,
      } as any)

      return { kind: 'single' as const, resource }
    },
    onSuccess: (result) => {
      addToast({
        type: 'success',
        title: result.kind === 'folder' ? 'Dossier créé avec succès' : 'Ressource créée avec succès',
        description: result.kind === 'folder'
          ? 'Votre dossier a été ajouté à la bibliothèque.'
          : 'Votre ressource a été ajoutée à la bibliothèque.',
      })
      if (result.kind === 'folder') {
        router.push(`/dashboard/resources/folder/${result.collection.id}`)
      } else {
        router.push(`/dashboard/resources/${result.resource.slug}`)
      }
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
        {/* Mode : fichier unique ou dossier */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
              mode === 'single'
                ? 'bg-brand-blue text-white border-brand-blue'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-blue/40'
            )}
          >
            Fichier unique
          </button>
          <button
            type="button"
            onClick={() => setMode('folder')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-2',
              mode === 'folder'
                ? 'bg-brand-blue text-white border-brand-blue'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-blue/40'
            )}
          >
            <Folder className="h-4 w-4" />
            Dossier (plusieurs fichiers)
          </button>
        </div>

        {/* Informations principales */}
        <GlassCard variant="premium" className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Informations principales</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {mode === 'folder' ? 'Nom du dossier *' : 'Titre de la ressource *'}
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

            {mode === 'single' && (
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
            )}

            {mode === 'single' && (
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
            )}

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

            <div className="border-t pt-6 mt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Visibilité</h3>
              <p className="text-xs text-gray-500 mb-3">
                Définir qui peut voir cette ressource : tous les utilisateurs ou uniquement les apprenants d&apos;un programme, d&apos;une formation ou d&apos;une session.
              </p>
              <div className="space-y-3">
                {[
                  { value: 'all', label: 'Tous les utilisateurs' },
                  { value: 'program', label: 'Apprenants d\'un programme' },
                  { value: 'formation', label: 'Apprenants d\'une formation' },
                  { value: 'session', label: 'Apprenants d\'une session' },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      {...register('visibility_scope')}
                      value={opt.value}
                      className="rounded-full border-gray-300 text-brand-blue focus:ring-brand-blue"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
              {visibilityScope === 'program' && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Programme</label>
                  <select
                    {...register('visibility_program_id')}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue"
                  >
                    <option value="">Sélectionner un programme</option>
                    {programs?.map((p: { id: string; name: string }) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {visibilityScope === 'formation' && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Formation</label>
                  <select
                    {...register('visibility_formation_id')}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue"
                  >
                    <option value="">Sélectionner une formation</option>
                    {formations?.map((f: { id: string; name: string }) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {visibilityScope === 'session' && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Session</label>
                    <select
                      {...register('visibility_session_id')}
                      onChange={(e) => {
                        setValue('visibility_session_id', e.target.value)
                        setSelectedLearnerIds([])
                      }}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue"
                    >
                      <option value="">Sélectionner une session</option>
                      {sessions?.map((s: { id: string; name: string }) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {selectedSessionId && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">
                            Apprenants ciblés
                          </span>
                          {selectedLearnerIds.length > 0 && (
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-brand-blue text-white">
                              {selectedLearnerIds.length}
                            </span>
                          )}
                        </div>
                        {sessionStudents && sessionStudents.length > 0 && (
                          <button
                            type="button"
                            onClick={toggleAllLearners}
                            className="text-xs text-brand-blue hover:underline"
                          >
                            {selectedLearnerIds.length === sessionStudents.length
                              ? 'Tout désélectionner'
                              : 'Tout sélectionner'}
                          </button>
                        )}
                      </div>

                      {isLoadingStudents ? (
                        <p className="text-xs text-gray-500 py-2">Chargement des apprenants…</p>
                      ) : !sessionStudents || sessionStudents.length === 0 ? (
                        <p className="text-xs text-gray-500 py-2">Aucun apprenant inscrit à cette session.</p>
                      ) : (
                        <>
                          <p className="text-xs text-gray-500 mb-2">
                            {selectedLearnerIds.length === 0
                              ? 'Tous les apprenants de la session verront cette ressource.'
                              : `Seuls les apprenants cochés auront accès à cette ressource.`}
                          </p>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {sessionStudents.map((student) => {
                              const checked = selectedLearnerIds.includes(student.id)
                              return (
                                <label
                                  key={student.id}
                                  className={cn(
                                    'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors',
                                    checked
                                      ? 'bg-brand-blue/8 border border-brand-blue/20'
                                      : 'hover:bg-white border border-transparent'
                                  )}
                                >
                                  <div
                                    className={cn(
                                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                                      checked
                                        ? 'bg-brand-blue border-brand-blue'
                                        : 'border-gray-300 bg-white'
                                    )}
                                  >
                                    {checked && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                                  </div>
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={checked}
                                    onChange={() => toggleLearner(student.id)}
                                  />
                                  <div className="min-w-0">
                                    <span className="text-sm font-medium text-gray-800">
                                      {student.first_name} {student.last_name}
                                    </span>
                                    {student.email && (
                                      <span className="ml-1.5 text-xs text-gray-400">{student.email}</span>
                                    )}
                                  </div>
                                  {checked && (
                                    <UserCheck className="ml-auto h-3.5 w-3.5 shrink-0 text-brand-blue" />
                                  )}
                                </label>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
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
        {(mode === 'folder' || resourceType !== 'link') && (
          <GlassCard variant="premium" className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {mode === 'folder' ? 'Fichiers du dossier' : 'Fichier'}
            </h2>

            {mode === 'folder' ? (
              <div className="space-y-4">
                {folderFiles.length > 0 && (
                  <div className="space-y-2">
                    {folderFiles.map((f, idx) => (
                      <div key={`${f.name}-${idx}`} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-6 w-6 text-gray-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{f.name}</p>
                            <p className="text-sm text-gray-500">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFolderFile(idx)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-brand-blue transition-colors">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Cliquez pour ajouter des fichiers au dossier</p>
                  <p className="text-sm text-gray-500 mb-4">Tous les formats acceptés jusqu'à 100MB chacun</p>
                  <input
                    type="file"
                    multiple
                    onChange={handleFolderFilesChange}
                    className="hidden"
                    id="folder-files-upload"
                  />
                  <label
                    htmlFor="folder-files-upload"
                    className="inline-block px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors cursor-pointer"
                  >
                    Choisir des fichiers
                  </label>
                </div>
              </div>
            ) : (
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
            )}
          </GlassCard>
        )}

        {/* Miniature */}
        {mode === 'single' && (
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
        )}

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
            disabled={createMutation.isPending || (mode === 'folder' && folderFiles.length === 0)}
            className="bg-brand-blue hover:bg-brand-blue/90 text-white shadow-lg shadow-brand-blue/20"
          >
            {createMutation.isPending ? (
              <>Création...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {mode === 'folder' ? 'Créer le dossier' : 'Créer la ressource'}
              </>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  )
}

