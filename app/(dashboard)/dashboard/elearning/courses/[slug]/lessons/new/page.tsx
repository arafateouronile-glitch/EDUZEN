'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/lib/hooks/use-auth'
import { elearningService } from '@/lib/services/elearning.service'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import {
  ArrowLeft,
  Save,
  Plus,
  Type,
  Image,
  Video,
  FileText,
  HelpCircle,
  BarChart3,
  X,
  GripVertical,
  Upload,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import { logger, sanitizeError } from '@/lib/utils/logger'

// Schéma de validation
const lessonSchema = z.object({
  title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères'),
  slug: z.string().min(3, 'Le slug doit contenir au moins 3 caractères').regex(/^[a-z0-9-]+$/, 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets'),
  description: z.string().optional(),
  section_id: z.string().optional(),
  order_index: z.number().min(0).default(0),
})

type LessonFormData = z.infer<typeof lessonSchema>

// Types de blocs de contenu
type ContentBlockType = 'text' | 'media' | 'quiz' | 'poll'

interface ContentBlock {
  id: string
  type: ContentBlockType
  data: {
    // Pour text
    content?: string
    // Pour media
    mediaType?: 'image' | 'video' | 'audio' | 'file'
    mediaUrl?: string
    caption?: string
    // Pour quiz
    question?: string
    options?: { id: string; text: string; isCorrect: boolean }[]
    explanation?: string
    points?: number
    // Pour poll
    pollQuestion?: string
    pollOptions?: { id: string; text: string }[]
  }
}

export default function NewLessonPage() {
  const params = useParams()
  const router = useRouter()
  const courseSlug = params.slug as string
  const { user } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([])
  const [showBlockSelector, setShowBlockSelector] = useState(false)
  const [uploadingImages, setUploadingImages] = useState<Record<string, boolean>>({})

  // Récupérer le cours
  const { data: course } = useQuery<{ id: string; [key: string]: any } | null>({
    queryKey: ['course', courseSlug, user?.organization_id],
    queryFn: async () => {
      const result = await elearningService.getCourseBySlug(courseSlug, user?.organization_id || '')
      return result as any
    },
    enabled: !!courseSlug && !!user?.organization_id,
  })

  // Récupérer les sections
  const { data: sections } = useQuery<Array<{ id: string; title?: string; [key: string]: any }>>({
    queryKey: ['course-sections', course?.id],
    queryFn: async () => {
      const result = await elearningService.getCourseSections((course as any)?.id || '')
      return result as Array<{ id: string; title?: string; [key: string]: any }>
    },
    enabled: !!course?.id,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<LessonFormData>({
    resolver: zodResolver(lessonSchema),
    mode: 'onChange',
    defaultValues: {
      order_index: 0,
    },
  })

  // Générer le slug automatiquement
  const title = watch('title')
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setValue('title', newTitle)
    if (newTitle) {
      setValue('slug', generateSlug(newTitle))
    }
  }

  // Ajouter un bloc de contenu
  const addContentBlock = (type: ContentBlockType) => {
    const newBlock: ContentBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      data: {
        content: type === 'text' ? '' : undefined,
        mediaType: type === 'media' ? 'image' : undefined,
        question: type === 'quiz' ? '' : undefined,
        pollQuestion: type === 'poll' ? '' : undefined,
        options: type === 'quiz' ? [{ id: '1', text: '', isCorrect: false }] : undefined,
        pollOptions: type === 'poll' ? [{ id: '1', text: '' }] : undefined,
        points: type === 'quiz' ? 1 : undefined,
      },
    }
    setContentBlocks([...contentBlocks, newBlock])
    setShowBlockSelector(false)
  }

  // Mettre à jour un bloc
  const updateBlock = (id: string, data: Partial<ContentBlock['data']>) => {
    setContentBlocks(
      contentBlocks.map((block) =>
        block.id === id ? { ...block, data: { ...block.data, ...data } } : block
      )
    )
  }

  // Supprimer un bloc
  const removeBlock = (id: string) => {
    setContentBlocks(contentBlocks.filter((block) => block.id !== id))
  }

  // Uploader une image
  const handleImageUpload = async (blockId: string, file: File) => {
    if (!user?.organization_id) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Organisation manquante',
      })
      return
    }

    setUploadingImages((prev) => ({ ...prev, [blockId]: true }))

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.organization_id}/elearning/lessons/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      
      const tryBuckets = ['elearning-media', 'course-media', 'course-thumbnails']
      let uploadedBucket: string | null = null
      let lastError: any = null

      for (const bucket of tryBuckets) {
        const { error } = await supabase.storage.from(bucket).upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })
        if (!error) {
          uploadedBucket = bucket
          lastError = null
          break
        }
        lastError = error
      }

      if (!uploadedBucket) {
        throw lastError || new Error("Échec de l'upload sur tous les buckets disponibles.")
      }

      const { data: urlData } = supabase.storage.from(uploadedBucket).getPublicUrl(fileName)
      updateBlock(blockId, { mediaUrl: urlData.publicUrl })

      addToast({
        type: 'success',
        title: 'Image uploadée',
        description: 'L\'image a été uploadée avec succès.',
      })
    } catch (error: any) {
      logger.error('Erreur lors de l\'upload:', error)
      addToast({
        type: 'error',
        title: 'Erreur d\'upload',
        description: error?.message || 'Une erreur est survenue lors de l\'upload de l\'image.',
      })
    } finally {
      setUploadingImages((prev) => ({ ...prev, [blockId]: false }))
    }
  }

  // Ajouter une option à un quiz
  const addQuizOption = (blockId: string) => {
    const block = contentBlocks.find((b) => b.id === blockId)
    if (block && block.type === 'quiz') {
      const newOption = {
        id: Math.random().toString(36).substr(2, 9),
        text: '',
        isCorrect: false,
      }
      updateBlock(blockId, {
        options: [...(block.data.options || []), newOption],
      })
    }
  }

  // Ajouter une option à un sondage
  const addPollOption = (blockId: string) => {
    const block = contentBlocks.find((b) => b.id === blockId)
    if (block && block.type === 'poll') {
      const newOption = {
        id: Math.random().toString(36).substr(2, 9),
        text: '',
      }
      updateBlock(blockId, {
        pollOptions: [...(block.data.pollOptions || []), newOption],
      })
    }
  }

  const createMutation = useMutation({
    mutationFn: async (data: LessonFormData) => {
      if (!course?.id) throw new Error('Course ID manquant')

      // Convertir les blocs en JSON pour le stockage
      const contentJson = JSON.stringify(contentBlocks)

      return elearningService.createLesson({
        course_id: course.id,
        title: data.title,
        slug: data.slug,
        description: data.description || null,
        section_id: data.section_id || null,
        order_index: data.order_index,
        lesson_type: 'text', // Par défaut, peut être changé selon le contenu
        content: contentJson,
        video_url: null,
        video_duration_minutes: null,
        is_preview: false,
        attachments: null,
      })
    },
    onSuccess: (lesson: any) => {
      addToast({
        type: 'success',
        title: 'Leçon créée avec succès',
        description: 'Votre leçon a été créée. Vous pouvez maintenant la modifier.',
      })
      queryClient.invalidateQueries({ queryKey: ['course', courseSlug] })
      router.push(`/dashboard/elearning/courses/${courseSlug}/lessons/${(lesson as any).slug}/edit`)
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la création de la leçon',
      })
    },
  })

  const onSubmit = (data: LessonFormData) => {
    createMutation.mutate(data)
  }

  if (!course) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="text-center py-12">Chargement...</div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-8 max-w-6xl mx-auto p-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/elearning/courses/${courseSlug}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nouvelle leçon</h1>
          <p className="text-gray-500 mt-1">Ajoutez une nouvelle leçon à "{course.title}"</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Informations de base */}
        <GlassCard variant="premium" className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Informations de base</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titre de la leçon *
              </label>
              <input
                type="text"
                {...register('title')}
                onChange={handleTitleChange}
                className={cn(
                  "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all",
                  errors.title ? 'border-red-500' : 'border-gray-200'
                )}
                placeholder="Ex: Introduction à React"
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
                placeholder="introduction-a-react"
              />
              {errors.slug && (
                <p className="text-sm text-red-600 mt-1">{errors.slug.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all resize-none"
                placeholder="Description courte de la leçon..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Section (optionnel)
                </label>
                <select
                  {...register('section_id')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                >
                  <option value="">Aucune section</option>
                  {sections?.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ordre
                </label>
                <input
                  type="number"
                  {...register('order_index', { valueAsNumber: true })}
                  min="0"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Contenu de la leçon */}
        <GlassCard variant="premium" className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Contenu de la leçon</h2>
            <Button
              type="button"
              onClick={() => setShowBlockSelector(!showBlockSelector)}
              className="bg-brand-blue hover:bg-brand-blue/90 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un élément
            </Button>
          </div>

          {/* Sélecteur de type de bloc */}
          <AnimatePresence>
            {showBlockSelector && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <p className="text-sm font-medium text-gray-700 mb-3">Choisir un type de contenu :</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => addContentBlock('text')}
                    className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:border-brand-blue hover:bg-brand-blue-ghost transition-colors"
                  >
                    <Type className="h-6 w-6 text-brand-blue" />
                    <span className="text-sm font-medium">Texte</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addContentBlock('media')}
                    className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:border-brand-blue hover:bg-brand-blue-ghost transition-colors"
                  >
                    <Image className="h-6 w-6 text-brand-blue" />
                    <span className="text-sm font-medium">Média</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addContentBlock('quiz')}
                    className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:border-brand-blue hover:bg-brand-blue-ghost transition-colors"
                  >
                    <HelpCircle className="h-6 w-6 text-brand-blue" />
                    <span className="text-sm font-medium">Quiz</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addContentBlock('poll')}
                    className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:border-brand-blue hover:bg-brand-blue-ghost transition-colors"
                  >
                    <BarChart3 className="h-6 w-6 text-brand-blue" />
                    <span className="text-sm font-medium">Sondage</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Liste des blocs */}
          <div className="space-y-4">
            <AnimatePresence>
              {contentBlocks.map((block, index) => (
                <motion.div
                  key={block.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="border border-gray-200 rounded-lg p-4 bg-white"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">
                        {block.type === 'text' && 'Texte'}
                        {block.type === 'media' && 'Média'}
                        {block.type === 'quiz' && 'Quiz (évaluable)'}
                        {block.type === 'poll' && 'Sondage (non évaluable)'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Rendu du bloc selon son type */}
                  {block.type === 'text' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contenu
                      </label>
                      <textarea
                        value={block.data.content || ''}
                        onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all resize-none"
                        placeholder="Saisissez votre texte ici (Markdown supporté)..."
                      />
                    </div>
                  )}

                  {block.type === 'media' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Type de média
                        </label>
                        <select
                          value={block.data.mediaType || 'image'}
                          onChange={(e) => updateBlock(block.id, { mediaType: e.target.value as any })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                        >
                          <option value="image">Image</option>
                          <option value="video">Vidéo</option>
                          <option value="audio">Audio</option>
                          <option value="file">Fichier</option>
                        </select>
                      </div>
                      
                      {block.data.mediaType === 'image' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Uploader une image
                          </label>
                          <div className="flex items-center gap-4">
                            <label className="flex-1 cursor-pointer">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    handleImageUpload(block.id, file)
                                  }
                                }}
                                disabled={uploadingImages[block.id]}
                              />
                              <div className={cn(
                                "flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg transition-colors",
                                uploadingImages[block.id]
                                  ? "border-gray-300 bg-gray-50"
                                  : "border-brand-blue/30 hover:border-brand-blue hover:bg-brand-blue-ghost"
                              )}>
                                {uploadingImages[block.id] ? (
                                  <>
                                    <Loader2 className="h-5 w-5 text-brand-blue animate-spin" />
                                    <span className="text-sm text-gray-600">Upload en cours...</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-5 w-5 text-brand-blue" />
                                    <span className="text-sm font-medium text-brand-blue">Choisir un fichier</span>
                                  </>
                                )}
                              </div>
                            </label>
                          </div>
                          {block.data.mediaUrl && (
                            <div className="mt-3">
                              <img
                                src={block.data.mediaUrl}
                                alt="Aperçu"
                                className="max-w-full h-auto max-h-64 rounded-lg border border-gray-200"
                              />
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {block.data.mediaType === 'image' ? 'URL de l\'image (ou laisser vide si uploadée ci-dessus)' : 'URL du média'}
                        </label>
                        <input
                          type="url"
                          value={block.data.mediaUrl || ''}
                          onChange={(e) => updateBlock(block.id, { mediaUrl: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Légende (optionnel)
                        </label>
                        <input
                          type="text"
                          value={block.data.caption || ''}
                          onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                          placeholder="Légende du média..."
                        />
                      </div>
                    </div>
                  )}

                  {block.type === 'quiz' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Question *
                        </label>
                        <input
                          type="text"
                          value={block.data.question || ''}
                          onChange={(e) => updateBlock(block.id, { question: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                          placeholder="Quelle est la question ?"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Points
                        </label>
                        <input
                          type="number"
                          value={block.data.points || 1}
                          onChange={(e) => updateBlock(block.id, { points: parseInt(e.target.value) || 1 })}
                          min="1"
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Options de réponse *
                          </label>
                          <button
                            type="button"
                            onClick={() => addQuizOption(block.id)}
                            className="text-sm text-brand-blue hover:underline"
                          >
                            + Ajouter une option
                          </button>
                        </div>
                        <div className="space-y-2">
                          {block.data.options?.map((option, optIndex) => (
                            <div key={option.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={option.isCorrect}
                                onChange={(e) => {
                                  const newOptions = block.data.options?.map((opt) =>
                                    opt.id === option.id ? { ...opt, isCorrect: e.target.checked } : opt
                                  )
                                  updateBlock(block.id, { options: newOptions })
                                }}
                                className="w-4 h-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
                              />
                              <input
                                type="text"
                                value={option.text}
                                onChange={(e) => {
                                  const newOptions = block.data.options?.map((opt) =>
                                    opt.id === option.id ? { ...opt, text: e.target.value } : opt
                                  )
                                  updateBlock(block.id, { options: newOptions })
                                }}
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                                placeholder={`Option ${optIndex + 1}`}
                              />
                              {block.data.options && block.data.options.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newOptions = block.data.options?.filter((opt) => opt.id !== option.id)
                                    updateBlock(block.id, { options: newOptions })
                                  }}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Explication (optionnel)
                        </label>
                        <textarea
                          value={block.data.explanation || ''}
                          onChange={(e) => updateBlock(block.id, { explanation: e.target.value })}
                          rows={2}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all resize-none"
                          placeholder="Explication de la réponse correcte..."
                        />
                      </div>
                    </div>
                  )}

                  {block.type === 'poll' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Question du sondage *
                        </label>
                        <input
                          type="text"
                          value={block.data.pollQuestion || ''}
                          onChange={(e) => updateBlock(block.id, { pollQuestion: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                          placeholder="Quelle est votre question ?"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Options de réponse *
                          </label>
                          <button
                            type="button"
                            onClick={() => addPollOption(block.id)}
                            className="text-sm text-brand-blue hover:underline"
                          >
                            + Ajouter une option
                          </button>
                        </div>
                        <div className="space-y-2">
                          {block.data.pollOptions?.map((option, optIndex) => (
                            <div key={option.id} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={option.text}
                                onChange={(e) => {
                                  const newOptions = block.data.pollOptions?.map((opt) =>
                                    opt.id === option.id ? { ...opt, text: e.target.value } : opt
                                  )
                                  updateBlock(block.id, { pollOptions: newOptions })
                                }}
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                                placeholder={`Option ${optIndex + 1}`}
                              />
                              {block.data.pollOptions && block.data.pollOptions.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newOptions = block.data.pollOptions?.filter((opt) => opt.id !== option.id)
                                    updateBlock(block.id, { pollOptions: newOptions })
                                  }}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {contentBlocks.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500 mb-4">Aucun contenu ajouté</p>
                <Button
                  type="button"
                  onClick={() => setShowBlockSelector(true)}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter votre premier élément
                </Button>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href={`/dashboard/elearning/courses/${courseSlug}`}>
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
                Créer la leçon
              </>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  )
}





