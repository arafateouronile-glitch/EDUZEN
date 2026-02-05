'use client'

import { useState, useEffect } from 'react'
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
  Image as ImageIcon,
  Video,
  FileText,
  HelpCircle,
  BarChart3,
  X,
  GripVertical,
  Upload,
  Loader2,
  ChevronRight,
  BookOpen,
  Settings,
  Layers,
  Check,
  AlertCircle,
  Sparkles,
  Play,
  Music,
  File,
  Trash2,
  Eye,
  Clock,
  Hash,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Award,
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'

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
    content?: string
    mediaType?: 'image' | 'video' | 'audio' | 'file'
    mediaUrl?: string
    caption?: string
    question?: string
    options?: { id: string; text: string; isCorrect: boolean }[]
    explanation?: string
    points?: number
    pollQuestion?: string
    pollOptions?: { id: string; text: string }[]
  }
}

// Tabs
const tabs = [
  { id: 'info', label: 'Informations', icon: FileText },
  { id: 'content', label: 'Contenu', icon: Layers },
]

// Block type config
const blockTypes = [
  {
    type: 'text' as const,
    label: 'Texte',
    description: 'Paragraphe, titre, liste...',
    icon: Type,
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  {
    type: 'media' as const,
    label: 'Média',
    description: 'Image, vidéo, audio',
    icon: ImageIcon,
    color: 'from-pink-500 to-rose-600',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-600',
  },
  {
    type: 'quiz' as const,
    label: 'Quiz',
    description: 'Question évaluable',
    icon: HelpCircle,
    color: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-600',
  },
  {
    type: 'poll' as const,
    label: 'Sondage',
    description: 'Question non évaluable',
    icon: BarChart3,
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
  },
]

export default function EditLessonPage() {
  const params = useParams()
  const router = useRouter()
  const courseSlug = params.slug as string
  const lessonSlug = params.lessonSlug as string
  const { user } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([])
  const [showBlockSelector, setShowBlockSelector] = useState(false)
  const [uploadingImages, setUploadingImages] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState('info')
  const [isDraggingMedia, setIsDraggingMedia] = useState<string | null>(null)

  // Récupérer le cours
  const { data: course } = useQuery<{ id: string; title?: string; [key: string]: any } | null>({
    queryKey: ['course', courseSlug, user?.organization_id],
    queryFn: async () => {
      const result = await elearningService.getCourseBySlug(courseSlug, user?.organization_id || '')
      return result as { id: string; title?: string; [key: string]: any } | null
    },
    enabled: !!courseSlug && !!user?.organization_id,
  })

  // Récupérer la leçon existante
  const { data: lesson, isLoading: lessonLoading } = useQuery<{
    id?: string;
    title: string;
    slug: string;
    description?: string;
    section_id?: string;
    order_index?: number;
    content?: string;
    [key: string]: any;
  } | null>({
    queryKey: ['lesson', lessonSlug, course?.id],
    queryFn: async () => {
      if (!course?.id) throw new Error('Course ID manquant')
      const result = await elearningService.getLessonBySlug(lessonSlug, (course as any).id)
      return result as any
    },
    enabled: !!lessonSlug && !!course?.id,
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
    formState: { errors, isDirty },
    watch,
    setValue,
    reset,
  } = useForm<LessonFormData>({
    resolver: zodResolver(lessonSchema),
    mode: 'onChange',
    defaultValues: {
      order_index: 0,
    },
  })

  const watchedTitle = watch('title')

  // Pré-remplir le formulaire avec les données de la leçon
  useEffect(() => {
    if (lesson) {
      reset({
        title: lesson.title,
        slug: lesson.slug,
        description: lesson.description || '',
        section_id: lesson.section_id || '',
        order_index: lesson.order_index || 0,
      })

      // Parser le contenu JSON pour charger les blocs
      if (lesson.content) {
        try {
          const parsedContent = JSON.parse(lesson.content)
          if (Array.isArray(parsedContent)) {
            setContentBlocks(parsedContent)
          }
        } catch (error) {
          logger.error('Erreur lors du parsing du contenu:', error)
          if (lesson.content) {
            setContentBlocks([
              {
                id: Math.random().toString(36).substr(2, 9),
                type: 'text',
                data: { content: lesson.content },
              },
            ])
          }
        }
      }
    }
  }, [lesson, reset])

  // Générer le slug automatiquement
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
    // Switch to content tab after adding
    setActiveTab('content')
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
        description: "L'image a été uploadée avec succès.",
      })
    } catch (error: any) {
      logger.error("Erreur lors de l'upload:", error)
      addToast({
        type: 'error',
        title: "Erreur d'upload",
        description: error?.message || "Une erreur est survenue lors de l'upload de l'image.",
      })
    } finally {
      setUploadingImages((prev) => ({ ...prev, [blockId]: false }))
    }
  }

  // Handle media drop
  const handleMediaDrop = (blockId: string, e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingMedia(null)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(blockId, file)
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

  const updateMutation = useMutation({
    mutationFn: async (data: LessonFormData) => {
      if (!lesson?.id) throw new Error('Lesson ID manquant')

      const contentJson = JSON.stringify(contentBlocks)

      return elearningService.updateLesson(lesson.id, {
        title: data.title,
        slug: data.slug,
        description: data.description || null,
        section_id: data.section_id || null,
        order_index: data.order_index,
        content: contentJson,
      })
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Leçon mise à jour',
        description: 'Votre leçon a été mise à jour avec succès.',
      })
      queryClient.invalidateQueries({ queryKey: ['course', courseSlug] })
      queryClient.invalidateQueries({ queryKey: ['lesson', lessonSlug] })
      router.push(`/dashboard/elearning/courses/${courseSlug}/edit`)
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la mise à jour de la leçon',
      })
    },
  })

  const onSubmit = (data: LessonFormData) => {
    updateMutation.mutate(data)
  }

  // Loading state
  if (lessonLoading || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Chargement de la leçon...</p>
        </div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Leçon introuvable</p>
          <Link href={`/dashboard/elearning/courses/${courseSlug}`}>
            <Button variant="outline" className="mt-4">
              Retour au cours
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Count quiz points
  const totalQuizPoints = contentBlocks
    .filter(b => b.type === 'quiz')
    .reduce((sum, b) => sum + (b.data.points || 0), 0)

  // Get block config
  const getBlockConfig = (type: ContentBlockType) => blockTypes.find(b => b.type === type)!

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-pink-400 to-rose-300 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
          {/* Navigation */}
          <div className="flex items-center gap-4 mb-8">
            <Link href={`/dashboard/elearning/courses/${courseSlug}/edit`}>
              <Button variant="ghost" size="icon" className="text-white/80 hover:text-white hover:bg-white/10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2 text-white/60 text-sm flex-wrap">
              <Link href="/dashboard/elearning" className="hover:text-white transition-colors">E-Learning</Link>
              <ChevronRight className="h-4 w-4" />
              <Link href={`/dashboard/elearning/courses/${courseSlug}`} className="hover:text-white transition-colors truncate max-w-[150px]">
                {course.title}
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-white truncate max-w-[200px]">{lesson.title}</span>
            </div>
          </div>

          {/* Lesson Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                <BookOpen className="h-10 w-10 text-white" />
              </div>
              <div>
                <p className="text-white/60 text-sm font-medium mb-1">Édition de leçon</p>
                <h1 className="text-3xl font-bold text-white">{watchedTitle || lesson.title}</h1>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/10">
                <Layers className="h-4 w-4 text-white/70" />
                <span className="text-white text-sm font-medium">{contentBlocks.length} bloc{contentBlocks.length > 1 ? 's' : ''}</span>
              </div>
              {contentBlocks.filter(b => b.type === 'quiz').length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 backdrop-blur-sm rounded-full border border-amber-400/30">
                  <Award className="h-4 w-4 text-amber-300" />
                  <span className="text-amber-100 text-sm font-medium">{totalQuizPoints} point{totalQuizPoints > 1 ? 's' : ''}</span>
                </div>
              )}
              {sections?.find(s => s.id === lesson.section_id) && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/10">
                  <Hash className="h-4 w-4 text-white/70" />
                  <span className="text-white text-sm font-medium truncate max-w-[150px]">
                    {sections.find(s => s.id === lesson.section_id)?.title}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 -mt-6 relative z-20 pb-32">
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Tabs Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 mb-6 overflow-hidden"
          >
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2.5 px-6 py-4 text-sm font-medium transition-all relative",
                    activeTab === tab.id
                      ? "text-indigo-600"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {tab.id === 'content' && contentBlocks.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-indigo-100 text-indigo-600 rounded-full">
                      {contentBlocks.length}
                    </span>
                  )}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeLessonTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-600"
                    />
                  )}
                </button>
              ))}
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {/* Tab: Informations */}
            {activeTab === 'info' && (
              <motion.div
                key="info"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <GlassCard variant="premium" className="overflow-hidden border border-gray-200/50 shadow-xl shadow-gray-200/20">
                  <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white via-indigo-50/30 to-white">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">Informations de base</h2>
                        <p className="text-sm text-gray-500">Titre, description et paramètres de la leçon</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Titre de la leçon <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...register('title')}
                        onChange={handleTitleChange}
                        className={cn(
                          'w-full px-4 py-3.5 border-2 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-lg',
                          errors.title ? 'border-rose-300 bg-rose-50/50' : 'border-gray-200 hover:border-gray-300'
                        )}
                        placeholder="Ex: Introduction à React"
                      />
                      {errors.title && (
                        <p className="text-sm text-rose-600 mt-2 flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4" />
                          {errors.title.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Slug (URL) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">/lessons/</span>
                        <input
                          type="text"
                          {...register('slug')}
                          className={cn(
                            'w-full pl-20 pr-4 py-3.5 border-2 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all bg-gray-50',
                            errors.slug ? 'border-rose-300' : 'border-gray-200'
                          )}
                          placeholder="introduction-a-react"
                        />
                      </div>
                      {errors.slug && (
                        <p className="text-sm text-rose-600 mt-2 flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4" />
                          {errors.slug.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                      <textarea
                        {...register('description')}
                        rows={3}
                        className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none hover:border-gray-300"
                        placeholder="Description courte de la leçon..."
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Section</label>
                        <select
                          {...register('section_id')}
                          className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all hover:border-gray-300"
                        >
                          <option value="">Aucune section</option>
                          {sections?.map((section: any) => (
                            <option key={section.id} value={section.id}>
                              {section.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Ordre d'affichage</label>
                        <input
                          type="number"
                          {...register('order_index', { valueAsNumber: true })}
                          min="0"
                          className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all hover:border-gray-300"
                        />
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {/* Quick add content CTA */}
                {contentBlocks.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-8 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl border-2 border-dashed border-indigo-200 text-center"
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/25">
                      <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Ajoutez du contenu à votre leçon</h3>
                    <p className="text-gray-600 mb-6">Créez une expérience d'apprentissage riche avec du texte, des médias et des quiz</p>
                    <Button
                      type="button"
                      onClick={() => setActiveTab('content')}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter du contenu
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Tab: Contenu */}
            {activeTab === 'content' && (
              <motion.div
                key="content"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* Block Selector */}
                <GlassCard variant="premium" className="overflow-hidden border border-gray-200/50 shadow-xl shadow-gray-200/20">
                  <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-white via-purple-50/30 to-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-lg shadow-purple-500/20">
                          <Plus className="h-4 w-4 text-white" />
                        </div>
                        <h3 className="font-bold text-gray-900">Ajouter un élément</h3>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {blockTypes.map((blockType) => (
                        <motion.button
                          key={blockType.type}
                          type="button"
                          onClick={() => addContentBlock(blockType.type)}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex flex-col items-center gap-3 p-5 bg-white border-2 border-gray-100 rounded-2xl hover:border-gray-200 hover:shadow-lg transition-all group"
                        >
                          <div className={cn(
                            "p-3 rounded-xl bg-gradient-to-br shadow-lg",
                            blockType.color
                          )}>
                            <blockType.icon className="h-6 w-6 text-white" />
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-gray-900">{blockType.label}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{blockType.description}</p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </GlassCard>

                {/* Content Blocks */}
                <div className="space-y-4">
                  <AnimatePresence>
                    {contentBlocks.map((block, index) => {
                      const config = getBlockConfig(block.type)
                      return (
                        <motion.div
                          key={block.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20, scale: 0.95 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <GlassCard variant="premium" className="overflow-hidden border border-gray-200/50 shadow-xl shadow-gray-200/20 group">
                            {/* Block Header */}
                            <div className={cn(
                              "p-4 border-b border-gray-100 flex items-center justify-between",
                              `bg-gradient-to-r from-white via-${config.bgColor.replace('bg-', '')}/30 to-white`
                            )}>
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 text-gray-400 cursor-grab hover:text-gray-600 transition-colors">
                                  <GripVertical className="h-5 w-5" />
                                </div>
                                <div className={cn("p-2 rounded-lg", config.bgColor)}>
                                  <config.icon className={cn("h-4 w-4", config.textColor)} />
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    {config.label}
                                    {block.type === 'quiz' && block.data.points && (
                                      <span className="ml-2 text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                                        {block.data.points} pt{block.data.points > 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-500">Bloc #{index + 1}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeBlock(block.id)}
                                className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Block Content */}
                            <div className="p-5">
                              {/* Text Block */}
                              {block.type === 'text' && (
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">Contenu</label>
                                  <textarea
                                    value={block.data.content || ''}
                                    onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                                    rows={8}
                                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none hover:border-gray-300 font-mono text-sm"
                                    placeholder="Saisissez votre texte ici (Markdown supporté)..."
                                  />
                                  <p className="text-xs text-gray-400 mt-2">Supporte le format Markdown : **gras**, *italique*, # titres, - listes...</p>
                                </div>
                              )}

                              {/* Media Block */}
                              {block.type === 'media' && (
                                <div className="space-y-5">
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Type de média</label>
                                    <div className="grid grid-cols-4 gap-2">
                                      {[
                                        { value: 'image', icon: ImageIcon, label: 'Image' },
                                        { value: 'video', icon: Play, label: 'Vidéo' },
                                        { value: 'audio', icon: Music, label: 'Audio' },
                                        { value: 'file', icon: File, label: 'Fichier' },
                                      ].map((type) => (
                                        <button
                                          key={type.value}
                                          type="button"
                                          onClick={() => updateBlock(block.id, { mediaType: type.value as any })}
                                          className={cn(
                                            "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                                            block.data.mediaType === type.value
                                              ? "border-pink-500 bg-pink-50 text-pink-600"
                                              : "border-gray-200 hover:border-gray-300 text-gray-500"
                                          )}
                                        >
                                          <type.icon className="h-5 w-5" />
                                          <span className="text-xs font-medium">{type.label}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {block.data.mediaType === 'image' && (
                                    <div>
                                      <label className="block text-sm font-semibold text-gray-700 mb-2">Image</label>
                                      {block.data.mediaUrl ? (
                                        <div className="relative group/img">
                                          <img
                                            src={block.data.mediaUrl}
                                            alt="Aperçu"
                                            className="w-full h-64 object-cover rounded-xl border-2 border-gray-100"
                                          />
                                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-all rounded-xl flex items-center justify-center gap-3">
                                            <label className="p-3 bg-white rounded-xl cursor-pointer hover:bg-gray-100 transition-colors shadow-lg">
                                              <Upload className="h-5 w-5 text-gray-700" />
                                              <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                  const file = e.target.files?.[0]
                                                  if (file) handleImageUpload(block.id, file)
                                                }}
                                                disabled={uploadingImages[block.id]}
                                              />
                                            </label>
                                            <button
                                              type="button"
                                              onClick={() => updateBlock(block.id, { mediaUrl: '' })}
                                              className="p-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors shadow-lg"
                                            >
                                              <Trash2 className="h-5 w-5" />
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div
                                          onDragOver={(e) => { e.preventDefault(); setIsDraggingMedia(block.id) }}
                                          onDragLeave={() => setIsDraggingMedia(null)}
                                          onDrop={(e) => handleMediaDrop(block.id, e)}
                                          className={cn(
                                            "border-2 border-dashed rounded-xl p-10 text-center transition-all",
                                            isDraggingMedia === block.id
                                              ? "border-pink-500 bg-pink-50 scale-[1.01]"
                                              : "border-gray-200 hover:border-pink-400 hover:bg-pink-50/50"
                                          )}
                                        >
                                          {uploadingImages[block.id] ? (
                                            <div className="flex flex-col items-center">
                                              <Loader2 className="h-10 w-10 text-pink-500 animate-spin mb-3" />
                                              <p className="text-gray-600 font-medium">Upload en cours...</p>
                                            </div>
                                          ) : (
                                            <>
                                              <div className="w-14 h-14 bg-pink-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                                                <Upload className="h-7 w-7 text-pink-500" />
                                              </div>
                                              <p className="text-gray-700 font-medium mb-1">Glissez une image ici</p>
                                              <p className="text-gray-500 text-sm mb-4">ou</p>
                                              <label className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-lg hover:from-pink-600 hover:to-rose-700 transition-all cursor-pointer shadow-lg shadow-pink-500/25 text-sm font-medium">
                                                <Upload className="h-4 w-4" />
                                                Parcourir
                                                <input
                                                  type="file"
                                                  accept="image/*"
                                                  className="hidden"
                                                  onChange={(e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) handleImageUpload(block.id, file)
                                                  }}
                                                />
                                              </label>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {block.data.mediaType !== 'image' && (
                                    <div>
                                      <label className="block text-sm font-semibold text-gray-700 mb-2">URL du média</label>
                                      <input
                                        type="url"
                                        value={block.data.mediaUrl || ''}
                                        onChange={(e) => updateBlock(block.id, { mediaUrl: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all hover:border-gray-300"
                                        placeholder="https://..."
                                      />
                                    </div>
                                  )}

                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Légende (optionnel)</label>
                                    <input
                                      type="text"
                                      value={block.data.caption || ''}
                                      onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all hover:border-gray-300"
                                      placeholder="Légende du média..."
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Quiz Block */}
                              {block.type === 'quiz' && (
                                <div className="space-y-5">
                                  <div className="grid md:grid-cols-4 gap-4">
                                    <div className="md:col-span-3">
                                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Question <span className="text-rose-500">*</span>
                                      </label>
                                      <input
                                        type="text"
                                        value={block.data.question || ''}
                                        onChange={(e) => updateBlock(block.id, { question: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all hover:border-gray-300"
                                        placeholder="Quelle est la question ?"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-semibold text-gray-700 mb-2">Points</label>
                                      <input
                                        type="number"
                                        value={block.data.points || 1}
                                        onChange={(e) => updateBlock(block.id, { points: parseInt(e.target.value) || 1 })}
                                        min="1"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all hover:border-gray-300"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <div className="flex items-center justify-between mb-3">
                                      <label className="block text-sm font-semibold text-gray-700">
                                        Options de réponse <span className="text-rose-500">*</span>
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => addQuizOption(block.id)}
                                        className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                                      >
                                        <Plus className="h-4 w-4" />
                                        Ajouter
                                      </button>
                                    </div>
                                    <div className="space-y-2">
                                      {block.data.options?.map((option, optIndex) => (
                                        <motion.div
                                          key={option.id}
                                          initial={{ opacity: 0, x: -10 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl group/opt"
                                        >
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newOptions = block.data.options?.map((opt) =>
                                                opt.id === option.id ? { ...opt, isCorrect: !opt.isCorrect } : opt
                                              )
                                              updateBlock(block.id, { options: newOptions })
                                            }}
                                            className={cn(
                                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
                                              option.isCorrect
                                                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                                                : "bg-white border-2 border-gray-200 text-gray-400 hover:border-emerald-400"
                                            )}
                                          >
                                            {option.isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                                          </button>
                                          <input
                                            type="text"
                                            value={option.text}
                                            onChange={(e) => {
                                              const newOptions = block.data.options?.map((opt) =>
                                                opt.id === option.id ? { ...opt, text: e.target.value } : opt
                                              )
                                              updateBlock(block.id, { options: newOptions })
                                            }}
                                            className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all"
                                            placeholder={`Option ${optIndex + 1}`}
                                          />
                                          {block.data.options && block.data.options.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newOptions = block.data.options?.filter((opt) => opt.id !== option.id)
                                                updateBlock(block.id, { options: newOptions })
                                              }}
                                              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover/opt:opacity-100"
                                            >
                                              <X className="h-4 w-4" />
                                            </button>
                                          )}
                                        </motion.div>
                                      ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                      Cliquez sur le cercle pour marquer la bonne réponse
                                    </p>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Explication (optionnel)</label>
                                    <textarea
                                      value={block.data.explanation || ''}
                                      onChange={(e) => updateBlock(block.id, { explanation: e.target.value })}
                                      rows={2}
                                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all resize-none hover:border-gray-300"
                                      placeholder="Explication de la réponse correcte..."
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Poll Block */}
                              {block.type === 'poll' && (
                                <div className="space-y-5">
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                      Question du sondage <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={block.data.pollQuestion || ''}
                                      onChange={(e) => updateBlock(block.id, { pollQuestion: e.target.value })}
                                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all hover:border-gray-300"
                                      placeholder="Quelle est votre question ?"
                                    />
                                  </div>

                                  <div>
                                    <div className="flex items-center justify-between mb-3">
                                      <label className="block text-sm font-semibold text-gray-700">
                                        Options <span className="text-rose-500">*</span>
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => addPollOption(block.id)}
                                        className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                                      >
                                        <Plus className="h-4 w-4" />
                                        Ajouter
                                      </button>
                                    </div>
                                    <div className="space-y-2">
                                      {block.data.pollOptions?.map((option, optIndex) => (
                                        <motion.div
                                          key={option.id}
                                          initial={{ opacity: 0, x: -10 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          className="flex items-center gap-3 group/opt"
                                        >
                                          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0 text-emerald-600 font-bold text-sm">
                                            {optIndex + 1}
                                          </div>
                                          <input
                                            type="text"
                                            value={option.text}
                                            onChange={(e) => {
                                              const newOptions = block.data.pollOptions?.map((opt) =>
                                                opt.id === option.id ? { ...opt, text: e.target.value } : opt
                                              )
                                              updateBlock(block.id, { pollOptions: newOptions })
                                            }}
                                            className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                                            placeholder={`Option ${optIndex + 1}`}
                                          />
                                          {block.data.pollOptions && block.data.pollOptions.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newOptions = block.data.pollOptions?.filter((opt) => opt.id !== option.id)
                                                updateBlock(block.id, { pollOptions: newOptions })
                                              }}
                                              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover/opt:opacity-100"
                                            >
                                              <X className="h-4 w-4" />
                                            </button>
                                          )}
                                        </motion.div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </GlassCard>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>

                  {contentBlocks.length === 0 && (
                    <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                      <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Layers className="h-10 w-10 text-gray-300" />
                      </div>
                      <p className="text-gray-700 font-semibold text-lg mb-2">Aucun contenu</p>
                      <p className="text-gray-500 mb-6">Utilisez les boutons ci-dessus pour ajouter du contenu</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sticky Save Bar */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-200 shadow-2xl shadow-gray-900/10 z-50"
          >
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {(isDirty || contentBlocks.length > 0) && (
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full text-sm font-medium">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    Modifications non enregistrées
                  </div>
                )}
                <div className="hidden sm:flex items-center gap-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-4 w-4" />
                    {contentBlocks.length} bloc{contentBlocks.length > 1 ? 's' : ''}
                  </span>
                  {totalQuizPoints > 0 && (
                    <span className="flex items-center gap-1.5 text-amber-600">
                      <Award className="h-4 w-4" />
                      {totalQuizPoints} pt{totalQuizPoints > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/dashboard/elearning/courses/${courseSlug}/edit`}>
                  <Button type="button" variant="ghost" className="text-gray-600">
                    Annuler
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 px-6"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Enregistrer
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </form>
      </div>
    </div>
  )
}
