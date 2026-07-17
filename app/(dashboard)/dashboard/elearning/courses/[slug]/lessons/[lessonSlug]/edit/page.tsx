'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/lib/hooks/use-auth'
import { elearningService } from '@/lib/services/elearning.service.client'
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
  ChevronDown,
  ChevronUp,
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
  Code2,
  Info,
  Lightbulb,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
type ContentBlockType = 'text' | 'media' | 'quiz' | 'poll' | 'code' | 'callout' | 'accordion'

interface ContentBlock {
  id: string
  type: ContentBlockType
  data: {
    content?: string
    mediaType?: 'image' | 'video' | 'audio' | 'file'
    mediaUrl?: string
    caption?: string
    required_percentage?: number
    question?: string
    options?: { id: string; text: string; isCorrect: boolean }[]
    explanation?: string
    points?: number
    pollQuestion?: string
    pollOptions?: { id: string; text: string }[]
    language?: string
    quizType?: 'multiple_choice' | 'true_false'
    correctAnswer?: string
    calloutType?: 'info' | 'tip' | 'warning' | 'danger'
    calloutTitle?: string
    items?: { id: string; title: string; content: string }[]
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
  {
    type: 'code' as const,
    label: 'Code',
    description: 'Bloc de code avec syntaxe',
    icon: Code2,
    color: 'from-violet-500 to-purple-600',
    bgColor: 'bg-violet-50',
    textColor: 'text-violet-600',
  },
  {
    type: 'callout' as const,
    label: 'Encadré',
    description: 'Info, astuce, avertissement',
    icon: Info,
    color: 'from-sky-500 to-blue-600',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-600',
  },
  {
    type: 'accordion' as const,
    label: 'Accordéon',
    description: 'Sections repliables',
    icon: ChevronDown,
    color: 'from-teal-500 to-emerald-600',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-600',
  },
]

function SortableBlockShell({
  id,
  children,
}: {
  id: string
  children: (handle: Record<string, unknown>) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-50 z-50 relative' : 'relative'}
    >
      {children({ ...attributes, ...listeners })}
    </div>
  )
}

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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setContentBlocks((blocks) => {
        const oldIndex = blocks.findIndex((b) => b.id === active.id)
        const newIndex = blocks.findIndex((b) => b.id === over.id)
        return arrayMove(blocks, oldIndex, newIndex)
      })
    }
  }

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= contentBlocks.length) return
    setContentBlocks((blocks) => arrayMove(blocks, index, newIndex))
  }

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
    const id = Math.random().toString(36).substr(2, 9)
    let data: ContentBlock['data'] = {}
    if (type === 'text') data = { content: '' }
    else if (type === 'media') data = { mediaType: 'image' }
    else if (type === 'quiz') data = {
      question: '',
      options: [
        { id: Math.random().toString(36).substr(2, 9), text: '', isCorrect: false },
        { id: Math.random().toString(36).substr(2, 9), text: '', isCorrect: false },
      ],
      points: 1,
    }
    else if (type === 'poll') data = {
      pollQuestion: '',
      pollOptions: [
        { id: Math.random().toString(36).substr(2, 9), text: '' },
        { id: Math.random().toString(36).substr(2, 9), text: '' },
      ],
    }
    else if (type === 'code') data = { content: '', language: 'javascript' }
    else if (type === 'callout') data = { calloutType: 'info', calloutTitle: '', content: '' }
    else if (type === 'accordion') data = {
      items: [{ id: Math.random().toString(36).substr(2, 9), title: '', content: '' }],
    }
    setContentBlocks([...contentBlocks, { id, type, data }])
    setShowBlockSelector(false)
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

  // Uploader un fichier (image ou document) pour un bloc média
  const uploadBlockMedia = async (blockId: string, file: File) => {
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
        title: 'Upload terminé',
        description: 'Le fichier a été uploadé avec succès.',
      })
    } catch (error: any) {
      logger.error("Erreur lors de l'upload:", error)
      addToast({
        type: 'error',
        title: "Erreur d'upload",
        description: error?.message || "Une erreur est survenue lors de l'upload du fichier.",
      })
    } finally {
      setUploadingImages((prev) => ({ ...prev, [blockId]: false }))
    }
  }

  const handleImageUpload = (blockId: string, file: File) => uploadBlockMedia(blockId, file)
  const handleFileUpload = (blockId: string, file: File) => uploadBlockMedia(blockId, file)

  // Handle media drop
  const handleMediaDrop = (blockId: string, e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingMedia(null)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    const block = contentBlocks.find((b) => b.id === blockId)
    if (block?.data.mediaType === 'file') {
      handleFileUpload(blockId, file)
    } else if (file.type.startsWith('image/')) {
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
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-blue via-brand-blue-dark to-brand-blue-darker">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-brand-cyan to-brand-cyan-light rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-brand-blue-light to-brand-cyan-dark rounded-full blur-3xl" />
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
                      ? "text-brand-blue"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {tab.id === 'content' && contentBlocks.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-brand-blue-ghost text-brand-blue rounded-full">
                      {contentBlocks.length}
                    </span>
                  )}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeLessonTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-blue to-brand-cyan"
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
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
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={contentBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                    {contentBlocks.map((block, index) => {
                      const config = getBlockConfig(block.type)
                      return (
                        <SortableBlockShell key={block.id} id={block.id}>
                          {(dragHandleProps) => (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(index * 0.05, 0.3) }}
                        >
                          <GlassCard variant="premium" className="overflow-hidden border border-gray-200/50 shadow-xl shadow-gray-200/20 group">
                            {/* Block Header */}
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-white to-gray-50/50">
                              <div className="flex items-center gap-3">
                                <div
                                  className="p-1.5 text-gray-400 cursor-grab active:cursor-grabbing hover:text-gray-600 transition-colors touch-none"
                                  {...dragHandleProps}
                                >
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
                                    {block.type === 'code' && block.data.language && (
                                      <span className="ml-2 text-xs font-mono text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                                        {block.data.language}
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-500">Bloc #{index + 1}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => moveBlock(index, 'up')}
                                  disabled={index === 0}
                                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Monter"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveBlock(index, 'down')}
                                  disabled={index === contentBlocks.length - 1}
                                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Descendre"
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeBlock(block.id)}
                                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
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

                                  {block.data.mediaType === 'file' && (
                                    <div>
                                      <label className="block text-sm font-semibold text-gray-700 mb-2">Document (PDF)</label>
                                      {block.data.mediaUrl ? (
                                        <div className="flex items-center gap-3 p-4 border-2 border-gray-100 rounded-xl">
                                          <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <File className="h-6 w-6 text-pink-500" />
                                          </div>
                                          <a
                                            href={block.data.mediaUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 text-sm font-medium text-indigo-600 hover:underline truncate"
                                          >
                                            {decodeURIComponent(block.data.mediaUrl.split('/').pop() || 'Document')}
                                          </a>
                                          <label className="p-2.5 bg-gray-100 rounded-xl cursor-pointer hover:bg-gray-200 transition-colors">
                                            <Upload className="h-4 w-4 text-gray-700" />
                                            <input
                                              type="file"
                                              accept="application/pdf,.pdf"
                                              className="hidden"
                                              onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) handleFileUpload(block.id, file)
                                              }}
                                              disabled={uploadingImages[block.id]}
                                            />
                                          </label>
                                          <button
                                            type="button"
                                            onClick={() => updateBlock(block.id, { mediaUrl: '' })}
                                            className="p-2.5 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors flex-shrink-0"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
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
                                                <File className="h-7 w-7 text-pink-500" />
                                              </div>
                                              <p className="text-gray-700 font-medium mb-1">Glissez un PDF ici</p>
                                              <p className="text-gray-500 text-sm mb-4">ou</p>
                                              <label className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-lg hover:from-pink-600 hover:to-rose-700 transition-all cursor-pointer shadow-lg shadow-pink-500/25 text-sm font-medium">
                                                <Upload className="h-4 w-4" />
                                                Parcourir
                                                <input
                                                  type="file"
                                                  accept="application/pdf,.pdf"
                                                  className="hidden"
                                                  onChange={(e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) handleFileUpload(block.id, file)
                                                  }}
                                                />
                                              </label>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {block.data.mediaType !== 'image' && block.data.mediaType !== 'file' && (
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

                                  {/* Seuil de visionnage obligatoire (vidéo uniquement) */}
                                  {block.data.mediaType === 'video' && (
                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                                      <label className="block text-sm font-semibold text-amber-800">
                                        Seuil de visionnage obligatoire
                                      </label>
                                      <div className="flex items-center gap-3">
                                        <input
                                          type="number"
                                          min={0}
                                          max={100}
                                          value={block.data.required_percentage ?? 0}
                                          onChange={(e) => updateBlock(block.id, { required_percentage: Number(e.target.value) })}
                                          className="w-24 px-3 py-2 border-2 border-amber-300 rounded-xl text-sm focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all bg-white"
                                        />
                                        <span className="text-sm text-amber-700">%</span>
                                        <p className="text-xs text-amber-600 flex-1">
                                          {(block.data.required_percentage ?? 0) > 0
                                            ? `L'apprenant doit regarder ${block.data.required_percentage}% avant de continuer.`
                                            : 'Aucun seuil — la vidéo ne bloque pas la progression.'}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Quiz Block */}
                              {block.type === 'quiz' && (
                                <div className="space-y-5">
                                  {/* Type de question */}
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Type de question</label>
                                    <div className="flex gap-2">
                                      {[
                                        { value: 'multiple_choice', label: 'Choix multiple' },
                                        { value: 'true_false', label: 'Vrai / Faux' },
                                      ].map((t) => (
                                        <button
                                          key={t.value}
                                          type="button"
                                          onClick={() => updateBlock(block.id, { quizType: t.value as 'multiple_choice' | 'true_false' })}
                                          className={cn(
                                            'flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-all',
                                            (block.data.quizType || 'multiple_choice') === t.value
                                              ? 'border-amber-500 bg-amber-50 text-amber-700'
                                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                          )}
                                        >
                                          {t.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

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

                                  {/* Vrai / Faux */}
                                  {(block.data.quizType || 'multiple_choice') === 'true_false' ? (
                                    <div>
                                      <label className="block text-sm font-semibold text-gray-700 mb-2">Bonne réponse</label>
                                      <div className="flex gap-3">
                                        {['vrai', 'faux'].map((val) => (
                                          <button
                                            key={val}
                                            type="button"
                                            onClick={() => updateBlock(block.id, { correctAnswer: val })}
                                            className={cn(
                                              'flex-1 py-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all',
                                              block.data.correctAnswer === val
                                                ? val === 'vrai'
                                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                  : 'border-rose-500 bg-rose-50 text-rose-700'
                                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                            )}
                                          >
                                            {val === 'vrai' ? '✓ Vrai' : '✗ Faux'}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
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
                                  )}

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

                              {/* Code Block */}
                              {block.type === 'code' && (
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Langage</label>
                                    <select
                                      value={block.data.language || 'javascript'}
                                      onChange={(e) => updateBlock(block.id, { language: e.target.value })}
                                      className="w-full max-w-xs px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all"
                                    >
                                      {['javascript', 'typescript', 'python', 'html', 'css', 'sql', 'bash', 'json', 'java', 'php', 'rust', 'go', 'c', 'cpp', 'markdown'].map((lang) => (
                                        <option key={lang} value={lang}>{lang}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Code</label>
                                    <textarea
                                      value={block.data.content || ''}
                                      onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                                      rows={10}
                                      spellCheck={false}
                                      className="w-full px-4 py-3.5 border-2 border-violet-200 rounded-xl focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all font-mono text-sm bg-gray-900 text-green-400 resize-y"
                                      placeholder="// Votre code ici..."
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Callout Block */}
                              {block.type === 'callout' && (
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Type d'encadré</label>
                                    <div className="grid grid-cols-4 gap-2">
                                      {[
                                        { value: 'info' as const, label: 'Info', icon: Info, active: 'border-sky-500 bg-sky-50 text-sky-600' },
                                        { value: 'tip' as const, label: 'Astuce', icon: Lightbulb, active: 'border-emerald-500 bg-emerald-50 text-emerald-600' },
                                        { value: 'warning' as const, label: 'Attention', icon: AlertTriangle, active: 'border-amber-500 bg-amber-50 text-amber-600' },
                                        { value: 'danger' as const, label: 'Danger', icon: AlertCircle, active: 'border-rose-500 bg-rose-50 text-rose-600' },
                                      ].map((t) => (
                                        <button
                                          key={t.value}
                                          type="button"
                                          onClick={() => updateBlock(block.id, { calloutType: t.value })}
                                          className={cn(
                                            'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all',
                                            block.data.calloutType === t.value ? t.active : 'border-gray-200 hover:border-gray-300 text-gray-500'
                                          )}
                                        >
                                          <t.icon className="h-5 w-5" />
                                          <span className="text-xs font-medium">{t.label}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Titre (optionnel)</label>
                                    <input
                                      type="text"
                                      value={block.data.calloutTitle || ''}
                                      onChange={(e) => updateBlock(block.id, { calloutTitle: e.target.value })}
                                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all hover:border-gray-300"
                                      placeholder="Titre de l'encadré..."
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Contenu</label>
                                    <textarea
                                      value={block.data.content || ''}
                                      onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                                      rows={4}
                                      className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all resize-none hover:border-gray-300"
                                      placeholder="Contenu de l'encadré (Markdown supporté)..."
                                    />
                                  </div>
                                  {(block.data.calloutTitle || block.data.content) && (
                                    <div className={cn(
                                      'border-l-4 rounded-r-xl p-4',
                                      block.data.calloutType === 'tip' ? 'border-l-emerald-500 bg-emerald-50' :
                                      block.data.calloutType === 'warning' ? 'border-l-amber-500 bg-amber-50' :
                                      block.data.calloutType === 'danger' ? 'border-l-rose-500 bg-rose-50' :
                                      'border-l-sky-500 bg-sky-50'
                                    )}>
                                      <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Aperçu</p>
                                      {block.data.calloutTitle && <p className="font-semibold text-gray-900 mb-1">{block.data.calloutTitle}</p>}
                                      {block.data.content && <p className="text-sm text-gray-700">{block.data.content}</p>}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Accordion Block */}
                              {block.type === 'accordion' && (
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <label className="block text-sm font-semibold text-gray-700">Items de l'accordéon</label>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newItem = { id: Math.random().toString(36).substr(2, 9), title: '', content: '' }
                                        updateBlock(block.id, { items: [...(block.data.items || []), newItem] })
                                      }}
                                      className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                                    >
                                      <Plus className="h-4 w-4" />
                                      Ajouter un item
                                    </button>
                                  </div>
                                  <div className="space-y-3">
                                    {(block.data.items || []).map((item, itemIndex) => (
                                      <div key={item.id} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                                        <div className="flex items-center gap-3 p-3 bg-gray-50 border-b border-gray-200">
                                          <div className="w-6 h-6 bg-teal-100 rounded-lg flex items-center justify-center text-teal-600 font-bold text-xs shrink-0">
                                            {itemIndex + 1}
                                          </div>
                                          <input
                                            type="text"
                                            value={item.title}
                                            onChange={(e) => {
                                              const newItems = block.data.items?.map((i) =>
                                                i.id === item.id ? { ...i, title: e.target.value } : i
                                              )
                                              updateBlock(block.id, { items: newItems })
                                            }}
                                            className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-sm"
                                            placeholder={`Titre de l'item ${itemIndex + 1}...`}
                                          />
                                          {(block.data.items?.length || 0) > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newItems = block.data.items?.filter((i) => i.id !== item.id)
                                                updateBlock(block.id, { items: newItems })
                                              }}
                                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                            >
                                              <X className="h-4 w-4" />
                                            </button>
                                          )}
                                        </div>
                                        <div className="p-3">
                                          <textarea
                                            value={item.content}
                                            onChange={(e) => {
                                              const newItems = block.data.items?.map((i) =>
                                                i.id === item.id ? { ...i, content: e.target.value } : i
                                              )
                                              updateBlock(block.id, { items: newItems })
                                            }}
                                            rows={3}
                                            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all resize-none text-sm"
                                            placeholder="Contenu de cet item (Markdown supporté)..."
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </GlassCard>
                        </motion.div>
                          )}
                        </SortableBlockShell>
                      )
                    })}

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
                  </SortableContext>
                </DndContext>
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
