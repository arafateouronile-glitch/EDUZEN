'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/lib/hooks/use-auth'
import { elearningService } from '@/lib/services/elearning.service'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft, GraduationCap, Save, Upload, X, Plus, Pencil, Trash2, BookOpen, ExternalLink,
  Clock, Users, Star, Eye, EyeOff, Sparkles, LayoutGrid, FileText, Settings, Image as ImageIcon,
  ChevronRight, GripVertical, PlayCircle, FileQuestion, Layers, Check, AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'

const courseSchema = z.object({
  title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères'),
  slug: z
    .string()
    .min(3, 'Le slug doit contenir au moins 3 caractères')
    .regex(/^[a-z0-9-]+$/, 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets'),
  short_description: z.string().optional(),
  description: z.string().optional(),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  estimated_duration_hours: z.number().min(0).optional(),
  price: z.number().min(0).optional(),
  currency: z.string().default('XOF'),
  is_published: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  instructor_id: z.string().optional(),
  formation_id: z.string().optional(),
})

type CourseFormData = z.infer<typeof courseSchema>

// Tabs pour la navigation
const tabs = [
  { id: 'general', label: 'Informations', icon: FileText },
  { id: 'settings', label: 'Paramètres', icon: Settings },
  { id: 'media', label: 'Médias', icon: ImageIcon },
  { id: 'content', label: 'Contenu', icon: Layers },
]

export default function EditCoursePage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { user } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [showCreateSection, setShowCreateSection] = useState(false)
  const [showEditSection, setShowEditSection] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [isDraggingThumbnail, setIsDraggingThumbnail] = useState(false)
  const [sectionForm, setSectionForm] = useState({
    id: '' as string,
    title: '',
    description: '',
    order_index: 0,
  })

  const { data: course, isLoading: loadingCourse } = useQuery<{ title?: string; slug?: string; short_description?: string; description?: string; [key: string]: any } | null>({
    queryKey: ['course', slug, user?.organization_id],
    queryFn: async () => {
      const result = await elearningService.getCourseBySlug(slug, user?.organization_id || '')
      return result as { title?: string; slug?: string; short_description?: string; description?: string; [key: string]: any } | null
    },
    enabled: !!slug && !!user?.organization_id,
  })

  const invalidateCourse = async () => {
    await queryClient.invalidateQueries({ queryKey: ['course', slug, user?.organization_id] })
  }

  // Récupérer les enseignants
  const { data: teachers } = useQuery({
    queryKey: ['teachers', user?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('organization_id', user?.organization_id || '')
        .eq('role', 'teacher')
        .eq('is_active', true)
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les formations
  const { data: formations } = useQuery({
    queryKey: ['formations', user?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formations')
        .select('id, name, code')
        .eq('organization_id', user?.organization_id || '')
        .eq('is_active', true)
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    setValue,
    reset,
  } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    mode: 'onChange',
    defaultValues: {
      difficulty_level: 'beginner',
      currency: 'XOF',
      is_published: false,
      is_featured: false,
    },
  })

  const watchedValues = watch()

  // Pré-remplir
  useEffect(() => {
    if (!course) return
    reset({
      title: course.title || '',
      slug: course.slug || '',
      short_description: course.short_description || '',
      description: course.description || '',
      difficulty_level: (course.difficulty_level as any) || 'beginner',
      estimated_duration_hours: course.estimated_duration_hours ? Number(course.estimated_duration_hours) : undefined,
      price: course.price ? Number(course.price) : 0,
      currency: course.currency || 'XOF',
      is_published: !!course.is_published,
      is_featured: !!course.is_featured,
      instructor_id: course.instructor_id || undefined,
      formation_id: course.formation_id || undefined,
    })
    if (course.thumbnail_url) setThumbnailPreview(course.thumbnail_url)
  }, [course, reset])

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

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setThumbnailFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setThumbnailPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleThumbnailDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingThumbnail(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setThumbnailFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setThumbnailPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const updateMutation = useMutation({
    mutationFn: async (data: CourseFormData) => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')
      if (!course?.id) throw new Error('Course ID manquant')

      // Upload miniature si remplacée
      let thumbnailUrl: string | null | undefined = course.thumbnail_url || null
      if (thumbnailFile) {
        const fileExt = thumbnailFile.name.split('.').pop()
        const fileName = `${user.organization_id}/courses/thumbnails/${Date.now()}.${fileExt}`

        const tryBuckets = ['course-thumbnails', 'elearning-media', 'course-media']
        let lastError: any = null

        for (const bucket of tryBuckets) {
          const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, thumbnailFile, {
            cacheControl: '3600',
            upsert: false,
          })
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName)
            thumbnailUrl = urlData.publicUrl
            lastError = null
            break
          }
          lastError = uploadError
        }

        if (lastError) {
          logger.error('Erreur upload miniature (storage):', lastError)
          throw new Error(
            lastError?.message ||
              "Erreur lors de l'upload de la miniature (bucket course-thumbnails/elearning-media/course-media)."
          )
        }
      }

      const nextPublishedAt = data.is_published ? (course.published_at || new Date().toISOString()) : null

      return elearningService.updateCourse(course.id, {
        title: data.title,
        slug: data.slug,
        short_description: data.short_description || null,
        description: data.description || null,
        difficulty_level: data.difficulty_level,
        estimated_duration_hours: data.estimated_duration_hours || null,
        price: data.price || 0,
        currency: data.currency,
        is_published: data.is_published,
        is_featured: data.is_featured,
        instructor_id: data.instructor_id || user.id,
        formation_id: data.formation_id || null,
        thumbnail_url: thumbnailUrl,
        published_at: nextPublishedAt,
      } as any)
    },
    onSuccess: async (updated: any) => {
      addToast({
        type: 'success',
        title: 'Séquence mise à jour',
        description: 'La séquence a été mise à jour avec succès.',
      })
      await invalidateCourse()
      // Rester sur la page d'édition (plus pratique pour gérer sections/leçons)
      if (updated?.slug && updated.slug !== slug) {
        router.replace(`/dashboard/elearning/courses/${updated.slug}/edit`)
      }
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la mise à jour',
      })
    },
  })

  const onSubmit = (data: CourseFormData) => updateMutation.mutate(data)

  const createSectionMutation = useMutation({
    mutationFn: async () => {
      if (!course?.id) throw new Error('Course ID manquant')
      const nextOrder =
        Math.max(
          0,
          ...(course.sections || []).map((s: any) => Number(s.order_index ?? 0))
        ) + 1

      return elearningService.createSection({
        course_id: course.id,
        title: sectionForm.title,
        description: sectionForm.description || null,
        order_index: sectionForm.order_index ?? nextOrder,
      } as any)
    },
    onSuccess: async () => {
      addToast({ type: 'success', title: 'Section créée', description: 'La section a été créée.' })
      setShowCreateSection(false)
      setSectionForm({ id: '', title: '', description: '', order_index: 0 })
      // refetch course
      await invalidateCourse()
    },
    onError: (error: any) => {
      addToast({ type: 'error', title: 'Erreur', description: error?.message || 'Impossible de créer la section.' })
    },
  })

  const updateSectionMutation = useMutation({
    mutationFn: async () => {
      if (!sectionForm.id) throw new Error('Section ID manquant')
      return elearningService.updateSection(sectionForm.id, {
        title: sectionForm.title,
        description: sectionForm.description || null,
        order_index: sectionForm.order_index,
      } as any)
    },
    onSuccess: async () => {
      addToast({ type: 'success', title: 'Section mise à jour', description: 'La section a été mise à jour.' })
      setShowEditSection(false)
      setSectionForm({ id: '', title: '', description: '', order_index: 0 })
      await invalidateCourse()
    },
    onError: (error: any) => {
      addToast({ type: 'error', title: 'Erreur', description: error?.message || 'Impossible de mettre à jour la section.' })
    },
  })

  const deleteSectionMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      await elearningService.deleteSection(sectionId)
    },
    onSuccess: async () => {
      addToast({ type: 'success', title: 'Section supprimée', description: 'La section a été supprimée.' })
      await invalidateCourse()
    },
    onError: (error: any) => {
      addToast({ type: 'error', title: 'Erreur', description: error?.message || 'Impossible de supprimer la section.' })
    },
  })

  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      await elearningService.deleteLesson(lessonId)
    },
    onSuccess: async () => {
      addToast({ type: 'success', title: 'Leçon supprimée', description: 'La leçon a été supprimée.' })
      await invalidateCourse()
    },
    onError: (error: any) => {
      addToast({ type: 'error', title: 'Erreur', description: error?.message || 'Impossible de supprimer la leçon.' })
    },
  })

  // Premium Loading state
  if (loadingCourse) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-50/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative w-20 h-20 mx-auto mb-6">
            {/* Outer ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-blue"
            />
            {/* Inner ring */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-2 rounded-full border-4 border-transparent border-t-brand-cyan"
            />
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-brand-blue/50" />
            </div>
          </div>
          <p className="text-gray-600 font-medium text-lg">Chargement de la séquence...</p>
          <p className="text-gray-400 text-sm mt-1">Veuillez patienter</p>
        </motion.div>
      </div>
    )
  }

  // Premium Not Found state
  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-50/50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md px-6"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-12 w-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Séquence introuvable</h2>
          <p className="text-gray-500 mb-8">Cette séquence n'existe pas ou a été supprimée.</p>
          <Link href="/dashboard/elearning">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button className="bg-gradient-to-r from-brand-blue to-brand-blue-dark text-white px-8 py-3 rounded-xl shadow-lg shadow-brand-blue/25">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux séquences
              </Button>
            </motion.div>
          </Link>
        </motion.div>
      </div>
    )
  }

  // Construire le contenu: sections + leçons
  const sectionsSorted = [...(course.sections || [])].sort(
    (a: any, b: any) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0)
  )
  const lessonsSorted = [...(course.lessons || [])].sort(
    (a: any, b: any) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0)
  )
  const lessonsBySectionId = lessonsSorted.reduce((acc: Record<string, any[]>, lesson: any) => {
    const key = lesson.section_id || 'no-section'
    acc[key] = acc[key] || []
    acc[key].push(lesson)
    return acc
  }, {})

  const totalLessons = lessonsSorted.length
  const difficultyLabels: Record<string, { label: string; color: string }> = {
    beginner: { label: 'Débutant', color: 'bg-brand-cyan/10 text-brand-cyan' },
    intermediate: { label: 'Intermédiaire', color: 'bg-brand-cyan/20 text-brand-cyan-dark' },
    advanced: { label: 'Avancé', color: 'bg-brand-cyan/30 text-brand-cyan-darker' },
  }

  const getLessonTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <PlayCircle className="h-4 w-4" />
      case 'quiz': return <FileQuestion className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/50">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-blue via-brand-blue-dark to-[#0f1a2e]">
        {/* Animated mesh gradient background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(52,185,238,0.3),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_100%_100%,rgba(139,92,246,0.15),transparent)]" />
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>

        {/* Floating orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 right-[15%] w-64 h-64 bg-brand-cyan/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ y: [0, 15, 0], x: [0, -15, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-20 left-[10%] w-80 h-80 bg-brand-purple/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 right-[30%] w-32 h-32 bg-white/5 rounded-full blur-2xl"
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
          {/* Premium Navigation */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-10"
          >
            <Link href={`/dashboard/elearning/courses/${course.slug}`}>
              <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2 text-sm">
              <Link href="/dashboard/elearning" className="text-white/50 hover:text-white/80 transition-colors duration-300">E-Learning</Link>
              <ChevronRight className="h-4 w-4 text-white/30" />
              <Link href={`/dashboard/elearning/courses/${course.slug}`} className="text-white/50 hover:text-white/80 transition-colors duration-300 max-w-[200px] truncate">
                {course.title}
              </Link>
              <ChevronRight className="h-4 w-4 text-white/30" />
              <span className="text-white/90 font-medium">Édition</span>
            </div>
          </motion.div>

          {/* Course Info Grid */}
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <div className="flex items-start gap-5">
                  <motion.div
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    className="p-4 bg-gradient-to-br from-brand-cyan to-brand-cyan-dark rounded-2xl shadow-lg shadow-brand-cyan/25 border border-white/20"
                  >
                    <GraduationCap className="h-10 w-10 text-white" />
                  </motion.div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-medium text-brand-cyan border border-brand-cyan/30">
                        Mode édition
                      </span>
                      {course.is_featured && (
                        <span className="px-3 py-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-sm rounded-full text-xs font-medium text-amber-300 border border-amber-400/30 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          En vedette
                        </span>
                      )}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{course.title}</h1>
                  </div>
                </div>

                {course.short_description && (
                  <p className="text-white/60 text-lg leading-relaxed max-w-2xl pl-[76px]">{course.short_description}</p>
                )}

                {/* Premium Stats Pills */}
                <div className="flex flex-wrap items-center gap-3 pt-2 pl-[76px]">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="flex items-center gap-2.5 px-4 py-2 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 hover:border-white/20 transition-all"
                  >
                    <div className="p-1.5 bg-brand-cyan/20 rounded-lg">
                      <Layers className="h-4 w-4 text-brand-cyan" />
                    </div>
                    <span className="text-white text-sm font-medium">{sectionsSorted.length} section{sectionsSorted.length > 1 ? 's' : ''}</span>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="flex items-center gap-2.5 px-4 py-2 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 hover:border-white/20 transition-all"
                  >
                    <div className="p-1.5 bg-brand-purple/20 rounded-lg">
                      <BookOpen className="h-4 w-4 text-brand-purple-light" />
                    </div>
                    <span className="text-white text-sm font-medium">{totalLessons} leçon{totalLessons > 1 ? 's' : ''}</span>
                  </motion.div>
                  {course.estimated_duration_hours && (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="flex items-center gap-2.5 px-4 py-2 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 hover:border-white/20 transition-all"
                    >
                      <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                        <Clock className="h-4 w-4 text-emerald-400" />
                      </div>
                      <span className="text-white text-sm font-medium">{course.estimated_duration_hours}h</span>
                    </motion.div>
                  )}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className={cn(
                      "flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                      course.is_published
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    )}
                  >
                    {course.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    <span>{course.is_published ? 'Publié' : 'Brouillon'}</span>
                  </motion.div>
                </div>
              </motion.div>
            </div>

            {/* Premium Preview Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="hidden lg:block"
            >
              <div className="relative group">
                {/* Card glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-brand-cyan/30 via-brand-purple/20 to-brand-cyan/30 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500" />

                <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden shadow-2xl">
                  {thumbnailPreview || course.thumbnail_url ? (
                    <div className="relative">
                      <img
                        src={thumbnailPreview || course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-36 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    </div>
                  ) : (
                    <div className="w-full h-36 bg-gradient-to-br from-brand-blue-light/50 via-brand-cyan/30 to-brand-purple/30 flex items-center justify-center">
                      <GraduationCap className="h-14 w-14 text-white/30" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 bg-brand-cyan rounded-full animate-pulse" />
                      <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Aperçu live</p>
                    </div>
                    <p className="text-white font-semibold text-base line-clamp-1">{watchedValues.title || course.title}</p>
                    <div className="mt-3 pt-3 border-t border-white/10">
                      {watchedValues.price ? (
                        <div className="flex items-baseline gap-1">
                          <p className="text-2xl font-bold text-white">{watchedValues.price.toLocaleString()}</p>
                          <p className="text-white/60 text-sm">{watchedValues.currency}</p>
                        </div>
                      ) : (
                        <p className="text-brand-cyan font-bold text-lg">Gratuit</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-50 to-transparent" />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-20 pb-32">
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Premium Tabs Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="relative mb-8"
          >
            {/* Tab container with premium styling */}
            <div className="bg-white rounded-2xl shadow-xl shadow-brand-blue/5 border border-gray-100/80 p-1.5 overflow-hidden">
              <div className="flex overflow-x-auto scrollbar-hide gap-1">
                {tabs.map((tab, index) => (
                  <motion.button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    className={cn(
                      "relative flex items-center gap-2.5 px-6 py-3.5 text-sm font-medium transition-all duration-300 rounded-xl whitespace-nowrap",
                      activeTab === tab.id
                        ? "text-white"
                        : "text-gray-500 hover:text-brand-blue hover:bg-brand-blue/5"
                    )}
                  >
                    {/* Active tab background */}
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTabBg"
                        className="absolute inset-0 bg-gradient-to-r from-brand-blue to-brand-blue-dark rounded-xl shadow-lg shadow-brand-blue/25"
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2.5">
                      <tab.icon className={cn("h-4 w-4 transition-transform duration-300", activeTab === tab.id && "scale-110")} />
                      {tab.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {/* Tab: Informations générales */}
            {activeTab === 'general' && (
              <motion.div
                key="general"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <div className="relative group">
                  {/* Subtle glow effect on hover */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-blue/20 via-brand-cyan/10 to-brand-purple/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden">
                    {/* Premium header with gradient accent */}
                    <div className="relative p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-purple" />
                      <div className="flex items-center gap-4">
                        <motion.div
                          whileHover={{ scale: 1.05, rotate: 5 }}
                          className="p-3 bg-gradient-to-br from-brand-blue to-brand-blue-dark rounded-xl shadow-lg shadow-brand-blue/25"
                        >
                          <FileText className="h-6 w-6 text-white" />
                        </motion.div>
                        <div>
                          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Informations principales</h2>
                          <p className="text-sm text-gray-500">Titre, description et détails de la séquence</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 space-y-8">
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-3">
                            Titre de la séquence <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative group/input">
                            <input
                              type="text"
                              {...register('title')}
                              onChange={handleTitleChange}
                              className={cn(
                                'w-full px-5 py-4 border-2 rounded-xl transition-all duration-300 text-lg font-medium',
                                'focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue focus:shadow-lg focus:shadow-brand-blue/5',
                                errors.title
                                  ? 'border-rose-300 bg-rose-50/30'
                                  : 'border-gray-200 hover:border-brand-blue/40 bg-gray-50/50 hover:bg-white'
                              )}
                              placeholder="Ex: Introduction à React"
                            />
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-blue/5 to-brand-cyan/5 opacity-0 group-hover/input:opacity-100 transition-opacity pointer-events-none" />
                          </div>
                          {errors.title && (
                            <motion.p
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-sm text-rose-600 mt-2 flex items-center gap-1.5"
                            >
                              <AlertCircle className="h-4 w-4" />
                              {errors.title.message}
                            </motion.p>
                          )}
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-3">
                            Slug (URL) <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative group/input">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-mono">/courses/</span>
                            <input
                              type="text"
                              {...register('slug')}
                              className={cn(
                                'w-full pl-24 pr-5 py-4 border-2 rounded-xl transition-all duration-300 font-mono',
                                'focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue',
                                errors.slug
                                  ? 'border-rose-300 bg-rose-50/30'
                                  : 'border-gray-200 bg-gray-50/50 hover:border-brand-blue/40 hover:bg-white'
                              )}
                              placeholder="introduction-a-react"
                            />
                          </div>
                          {errors.slug && (
                            <motion.p
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-sm text-rose-600 mt-2 flex items-center gap-1.5"
                            >
                              <AlertCircle className="h-4 w-4" />
                              {errors.slug.message}
                            </motion.p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">Description courte</label>
                        <textarea
                          {...register('short_description')}
                          rows={2}
                          className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue transition-all duration-300 resize-none hover:border-brand-blue/40 bg-gray-50/50 hover:bg-white"
                          placeholder="Une brève description qui apparaîtra dans les cartes de cours..."
                        />
                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-brand-cyan rounded-full" />
                          Apparaît sur les cartes de prévisualisation (150 caractères max recommandés)
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">Description complète</label>
                        <textarea
                          {...register('description')}
                          rows={6}
                          className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue transition-all duration-300 resize-none hover:border-brand-blue/40 bg-gray-50/50 hover:bg-white leading-relaxed"
                          placeholder="Décrivez en détail le contenu de cette séquence, les objectifs pédagogiques, les prérequis..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab: Paramètres */}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Configuration Card */}
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-blue/20 to-brand-cyan/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden">
                      <div className="relative p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-blue to-brand-cyan" />
                        <div className="flex items-center gap-3">
                          <motion.div
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            className="p-2.5 bg-gradient-to-br from-brand-blue to-brand-blue-dark rounded-xl shadow-lg shadow-brand-blue/25"
                          >
                            <Settings className="h-5 w-5 text-white" />
                          </motion.div>
                          <h3 className="font-bold text-gray-900 text-lg">Configuration</h3>
                        </div>
                      </div>
                      <div className="p-6 space-y-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-3">Niveau de difficulté</label>
                          <select
                            {...register('difficulty_level')}
                            className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue transition-all duration-300 hover:border-brand-blue/40 bg-gray-50/50 hover:bg-white appearance-none cursor-pointer"
                          >
                            <option value="beginner">🌱 Débutant</option>
                            <option value="intermediate">🌿 Intermédiaire</option>
                            <option value="advanced">🌳 Avancé</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-3">Durée estimée (heures)</label>
                          <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-brand-blue/10 rounded-lg">
                              <Clock className="h-4 w-4 text-brand-blue" />
                            </div>
                            <input
                              type="number"
                              {...register('estimated_duration_hours', { valueAsNumber: true })}
                              min="0"
                              step="0.5"
                              className="w-full pl-14 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue transition-all duration-300 hover:border-brand-blue/40 bg-gray-50/50 hover:bg-white"
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-3">Enseignant</label>
                          <select
                            {...register('instructor_id')}
                            className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue transition-all duration-300 hover:border-brand-blue/40 bg-gray-50/50 hover:bg-white appearance-none cursor-pointer"
                          >
                            <option value="">Moi-même</option>
                            {teachers?.map((teacher: any) => (
                              <option key={teacher.id} value={teacher.id}>
                                {teacher.full_name} ({teacher.email})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-3">Formation associée</label>
                          <select
                            {...register('formation_id')}
                            className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue transition-all duration-300 hover:border-brand-blue/40 bg-gray-50/50 hover:bg-white appearance-none cursor-pointer"
                          >
                            <option value="">Aucune</option>
                            {formations?.map((formation: any) => (
                              <option key={formation.id} value={formation.id}>
                                {formation.name} ({formation.code})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Tarification Card */}
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-brand-cyan/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="relative bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden">
                        <div className="relative p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white">
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-brand-cyan" />
                          <div className="flex items-center gap-3">
                            <motion.div
                              whileHover={{ scale: 1.05, rotate: 5 }}
                              className="p-2.5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/25"
                            >
                              <span className="text-white text-sm font-bold">€</span>
                            </motion.div>
                            <h3 className="font-bold text-gray-900 text-lg">Tarification</h3>
                          </div>
                        </div>
                        <div className="p-6">
                          <label className="block text-sm font-semibold text-gray-700 mb-3">Prix</label>
                          <div className="flex gap-3">
                            <div className="relative flex-1">
                              <input
                                type="number"
                                {...register('price', { valueAsNumber: true })}
                                min="0"
                                step="0.01"
                                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue transition-all duration-300 hover:border-brand-blue/40 bg-gray-50/50 hover:bg-white text-lg font-semibold"
                                placeholder="0"
                              />
                            </div>
                            <select
                              {...register('currency')}
                              className="w-28 px-3 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue transition-all font-semibold hover:border-brand-blue/40 bg-gray-50/50 hover:bg-white appearance-none cursor-pointer text-center"
                            >
                              <option value="XOF">XOF</option>
                              <option value="EUR">EUR</option>
                              <option value="USD">USD</option>
                            </select>
                          </div>
                          <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            Laissez à 0 pour un cours gratuit
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Publication Card */}
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-purple/20 to-amber-500/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="relative bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden">
                        <div className="relative p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white">
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-purple to-amber-500" />
                          <div className="flex items-center gap-3">
                            <motion.div
                              whileHover={{ scale: 1.05, rotate: 5 }}
                              className="p-2.5 bg-gradient-to-br from-brand-purple to-brand-purple-dark rounded-xl shadow-lg shadow-brand-purple/25"
                            >
                              <Eye className="h-5 w-5 text-white" />
                            </motion.div>
                            <h3 className="font-bold text-gray-900 text-lg">Publication</h3>
                          </div>
                        </div>
                        <div className="p-6 space-y-4">
                          <motion.label
                            whileHover={{ scale: 1.01 }}
                            className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-brand-blue/30 hover:bg-gradient-to-r hover:from-brand-blue/5 hover:to-transparent transition-all duration-300 cursor-pointer group/check"
                          >
                            <input
                              type="checkbox"
                              {...register('is_published')}
                              className="w-5 h-5 text-brand-blue border-2 border-gray-300 rounded-md focus:ring-brand-blue focus:ring-offset-2 transition-all"
                            />
                            <div className="flex-1">
                              <span className="font-semibold text-gray-900 flex items-center gap-2">
                                <Eye className="h-4 w-4 text-gray-400 group-hover/check:text-brand-blue transition-colors duration-300" />
                                Visible pour les apprenants
                              </span>
                              <p className="text-sm text-gray-500 mt-0.5">Publier la séquence sur le catalogue</p>
                            </div>
                          </motion.label>

                          <motion.label
                            whileHover={{ scale: 1.01 }}
                            className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-amber-400/30 hover:bg-gradient-to-r hover:from-amber-50 hover:to-transparent transition-all duration-300 cursor-pointer group/check"
                          >
                            <input
                              type="checkbox"
                              {...register('is_featured')}
                              className="w-5 h-5 text-amber-500 border-2 border-gray-300 rounded-md focus:ring-amber-500 focus:ring-offset-2 transition-all"
                            />
                            <div className="flex-1">
                              <span className="font-semibold text-gray-900 flex items-center gap-2">
                                <Star className="h-4 w-4 text-gray-400 group-hover/check:text-amber-500 transition-colors duration-300" />
                                Mettre en vedette
                              </span>
                              <p className="text-sm text-gray-500 mt-0.5">Afficher dans la sélection du moment</p>
                            </div>
                          </motion.label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab: Médias */}
            {activeTab === 'media' && (
              <motion.div
                key="media"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-purple/20 via-brand-cyan/10 to-brand-blue/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden">
                    <div className="relative p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-purple via-brand-cyan to-brand-blue" />
                      <div className="flex items-center gap-4">
                        <motion.div
                          whileHover={{ scale: 1.05, rotate: 5 }}
                          className="p-3 bg-gradient-to-br from-brand-purple to-brand-purple-dark rounded-xl shadow-lg shadow-brand-purple/25"
                        >
                          <ImageIcon className="h-6 w-6 text-white" />
                        </motion.div>
                        <div>
                          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Miniature du cours</h2>
                          <p className="text-sm text-gray-500">Image de couverture affichée dans le catalogue</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-8">
                      {thumbnailPreview ? (
                        <div className="relative group/img">
                          {/* Glow effect behind image */}
                          <div className="absolute -inset-2 bg-gradient-to-r from-brand-blue/20 via-brand-cyan/20 to-brand-purple/20 rounded-3xl blur-xl opacity-50" />

                          <div className="relative">
                            <img
                              src={thumbnailPreview}
                              alt="Aperçu"
                              className="w-full h-80 object-cover rounded-2xl border-2 border-gray-100 shadow-2xl"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover/img:opacity-100 transition-all duration-300 rounded-2xl flex items-end justify-center pb-8 gap-4">
                              <motion.label
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                className="p-4 bg-white/90 backdrop-blur-sm rounded-xl cursor-pointer hover:bg-white transition-all shadow-xl"
                              >
                                <Pencil className="h-5 w-5 text-gray-700" />
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleThumbnailChange}
                                  className="hidden"
                                />
                              </motion.label>
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  setThumbnailFile(null)
                                  setThumbnailPreview(null)
                                }}
                                className="p-4 bg-rose-500/90 backdrop-blur-sm text-white rounded-xl hover:bg-rose-500 transition-all shadow-xl"
                              >
                                <Trash2 className="h-5 w-5" />
                              </motion.button>
                            </div>

                            {/* Image info overlay */}
                            <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-lg text-white text-xs font-medium">
                              Ratio 16:9
                            </div>
                          </div>
                        </div>
                      ) : (
                        <motion.div
                          onDragOver={(e) => { e.preventDefault(); setIsDraggingThumbnail(true) }}
                          onDragLeave={() => setIsDraggingThumbnail(false)}
                          onDrop={handleThumbnailDrop}
                          animate={{ scale: isDraggingThumbnail ? 1.02 : 1 }}
                          className={cn(
                            "relative border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-300 overflow-hidden",
                            isDraggingThumbnail
                              ? "border-brand-blue bg-brand-blue/5"
                              : "border-gray-200 hover:border-brand-blue/50"
                          )}
                        >
                          {/* Animated background pattern */}
                          <div className="absolute inset-0 opacity-[0.03]">
                            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,currentColor_25%,currentColor_50%,transparent_50%,transparent_75%,currentColor_75%)] bg-[length:60px_60px]" />
                          </div>

                          <div className="relative">
                            <motion.div
                              animate={{ y: isDraggingThumbnail ? -10 : 0 }}
                              className="w-24 h-24 bg-gradient-to-br from-brand-blue/10 via-brand-cyan/10 to-brand-purple/10 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-brand-blue/20"
                            >
                              <Upload className={cn(
                                "h-12 w-12 transition-colors duration-300",
                                isDraggingThumbnail ? "text-brand-blue" : "text-gray-400"
                              )} />
                            </motion.div>
                            <p className="text-gray-800 font-semibold text-xl mb-2">
                              Glissez-déposez une image ici
                            </p>
                            <p className="text-gray-400 mb-8">ou</p>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleThumbnailChange}
                              className="hidden"
                              id="thumbnail-upload"
                            />
                            <motion.label
                              htmlFor="thumbnail-upload"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.98 }}
                              className="inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-brand-blue to-brand-blue-dark text-white rounded-xl hover:shadow-xl hover:shadow-brand-blue/25 transition-all cursor-pointer font-medium"
                            >
                              <Upload className="h-5 w-5" />
                              Parcourir les fichiers
                            </motion.label>
                            <div className="flex items-center justify-center gap-4 mt-8 text-sm text-gray-400">
                              <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-brand-blue rounded-full" />
                                PNG, JPG, WebP
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-brand-cyan rounded-full" />
                                Max 5MB
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-brand-purple rounded-full" />
                                Ratio 16:9
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab: Contenu */}
            {activeTab === 'content' && (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-cyan/20 via-brand-blue/10 to-brand-purple/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden">
                    {/* Premium header */}
                    <div className="relative p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-cyan via-brand-blue to-brand-purple" />
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <motion.div
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            className="p-3 bg-gradient-to-br from-brand-cyan to-brand-cyan-dark rounded-xl shadow-lg shadow-brand-cyan/25"
                          >
                            <Layers className="h-6 w-6 text-white" />
                          </motion.div>
                          <div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Contenu de la séquence</h2>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                                <span className="w-2 h-2 bg-brand-blue rounded-full" />
                                {sectionsSorted.length} section{sectionsSorted.length > 1 ? 's' : ''}
                              </span>
                              <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                                <span className="w-2 h-2 bg-brand-cyan rounded-full" />
                                {totalLessons} leçon{totalLessons > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowCreateSection(true)}
                              className="border-2 border-gray-200 hover:border-brand-blue/40 hover:bg-brand-blue/5 transition-all duration-300"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Nouvelle section
                            </Button>
                          </motion.div>
                          <Link href={`/dashboard/elearning/courses/${course.slug}/lessons/new`}>
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                              <Button
                                type="button"
                                className="bg-gradient-to-r from-brand-blue to-brand-blue-dark hover:shadow-xl hover:shadow-brand-blue/25 text-white transition-all duration-300"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Nouvelle leçon
                              </Button>
                            </motion.div>
                          </Link>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      {sectionsSorted.length === 0 && lessonsSorted.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl bg-gradient-to-b from-gray-50/50 to-white relative overflow-hidden"
                        >
                          {/* Background pattern */}
                          <div className="absolute inset-0 opacity-[0.02]">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,currentColor_1px,transparent_1px)] bg-[size:24px_24px]" />
                          </div>

                          <div className="relative">
                            <motion.div
                              animate={{ y: [0, -5, 0] }}
                              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                              className="w-24 h-24 bg-gradient-to-br from-brand-blue/10 via-brand-cyan/10 to-brand-purple/10 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-brand-blue/20"
                            >
                              <BookOpen className="h-12 w-12 text-brand-blue/40" />
                            </motion.div>
                            <p className="text-gray-800 font-semibold text-xl mb-2">Aucun contenu pour le moment</p>
                            <p className="text-gray-500 mb-8 max-w-md mx-auto">Commencez par créer une section pour organiser votre contenu, puis ajoutez des leçons</p>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                              <Button
                                type="button"
                                onClick={() => setShowCreateSection(true)}
                                className="bg-gradient-to-r from-brand-blue to-brand-blue-dark text-white px-8 py-3 rounded-xl shadow-lg shadow-brand-blue/25"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Créer ma première section
                              </Button>
                            </motion.div>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="space-y-5">
                          {sectionsSorted.map((section: any, sectionIndex: number) => {
                            const sectionLessons = lessonsBySectionId[section.id] || []
                            return (
                              <motion.div
                                key={section.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: sectionIndex * 0.08 }}
                                className="group/section"
                              >
                                <div className="relative border border-gray-100 rounded-2xl bg-white overflow-hidden hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300">
                                  {/* Section header */}
                                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-gray-50/80 to-white border-b border-gray-100">
                                    <div className="flex items-center gap-4 min-w-0">
                                      <motion.div
                                        whileHover={{ scale: 1.1 }}
                                        className="w-12 h-12 bg-gradient-to-br from-brand-blue to-brand-blue-dark rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-brand-blue/25"
                                      >
                                        {sectionIndex + 1}
                                      </motion.div>
                                      <div className="min-w-0">
                                        <h3 className="font-bold text-gray-900 text-lg truncate">{section.title}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                          <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                                            <BookOpen className="h-3.5 w-3.5" />
                                            {sectionLessons.length} leçon{sectionLessons.length > 1 ? 's' : ''}
                                          </span>
                                          {section.description && (
                                            <span className="text-sm text-gray-400 truncate max-w-[200px]">
                                              {section.description}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover/section:opacity-100 transition-opacity duration-300">
                                      <motion.div whileHover={{ scale: 1.1 }}>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setSectionForm({
                                              id: section.id,
                                              title: section.title || '',
                                              description: section.description || '',
                                              order_index: Number(section.order_index ?? 0),
                                            })
                                            setShowEditSection(true)
                                          }}
                                          className="text-gray-500 hover:text-brand-blue hover:bg-brand-blue/10 rounded-lg"
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      </motion.div>
                                      <motion.div whileHover={{ scale: 1.1 }}>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            const ok = window.confirm(`Supprimer la section "${section.title}" ?`)
                                            if (ok) deleteSectionMutation.mutate(section.id)
                                          }}
                                          disabled={deleteSectionMutation.isPending}
                                          className="text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </motion.div>
                                    </div>
                                  </div>

                                  {/* Section lessons */}
                                  <div className="p-4 space-y-2 bg-gradient-to-b from-gray-50/30 to-white">
                                    {sectionLessons.length === 0 ? (
                                      <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                                        <p className="text-gray-500 text-sm mb-3">Aucune leçon dans cette section</p>
                                        <Link href={`/dashboard/elearning/courses/${course.slug}/lessons/new`}>
                                          <Button type="button" variant="link" size="sm" className="text-brand-blue hover:text-brand-blue-dark">
                                            <Plus className="h-3.5 w-3.5 mr-1" />
                                            Ajouter une leçon
                                          </Button>
                                        </Link>
                                      </div>
                                    ) : (
                                      sectionLessons.map((lesson: any, lessonIndex: number) => (
                                        <motion.div
                                          key={lesson.id}
                                          initial={{ opacity: 0, x: -10 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: lessonIndex * 0.04 }}
                                          whileHover={{ x: 4 }}
                                          className="flex items-center justify-between gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-brand-blue/30 hover:shadow-lg hover:shadow-brand-blue/5 transition-all duration-300 group/lesson"
                                        >
                                          <div className="flex items-center gap-4 min-w-0">
                                            <div className={cn(
                                              "p-2.5 rounded-xl shrink-0 transition-colors duration-300",
                                              lesson.lesson_type === 'video' && "bg-brand-purple/10 text-brand-purple group-hover/lesson:bg-brand-purple/20",
                                              lesson.lesson_type === 'quiz' && "bg-amber-500/10 text-amber-600 group-hover/lesson:bg-amber-500/20",
                                              (!lesson.lesson_type || lesson.lesson_type === 'text') && "bg-brand-blue/10 text-brand-blue group-hover/lesson:bg-brand-blue/20"
                                            )}>
                                              {getLessonTypeIcon(lesson.lesson_type)}
                                            </div>
                                            <div className="min-w-0">
                                              <p className="font-medium text-gray-900 truncate">{lesson.title}</p>
                                              <p className="text-xs text-gray-500 capitalize mt-0.5">{lesson.lesson_type || 'Texte'}</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/lesson:opacity-100 transition-opacity duration-300">
                                            <Link href={`/dashboard/elearning/courses/${course.slug}/lessons/${lesson.slug}`}>
                                              <Button type="button" variant="ghost" size="sm" className="text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 rounded-lg">
                                                <ExternalLink className="h-4 w-4" />
                                              </Button>
                                            </Link>
                                            <Link href={`/dashboard/elearning/courses/${course.slug}/lessons/${lesson.slug}/edit`}>
                                              <Button type="button" variant="ghost" size="sm" className="text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 rounded-lg">
                                                <Pencil className="h-4 w-4" />
                                              </Button>
                                            </Link>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                const ok = window.confirm(`Supprimer la leçon "${lesson.title}" ?`)
                                                if (ok) deleteLessonMutation.mutate(lesson.id)
                                              }}
                                              disabled={deleteLessonMutation.isPending}
                                              className="text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </motion.div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )
                          })}

                          {/* Lessons without section */}
                          {lessonsBySectionId['no-section']?.length ? (
                            <motion.div
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="border-2 border-dashed border-amber-200 rounded-2xl bg-gradient-to-b from-amber-50/50 to-white overflow-hidden"
                            >
                              <div className="p-5 bg-amber-50/50 border-b border-amber-100">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-amber-100 rounded-lg">
                                    <AlertCircle className="h-5 w-5 text-amber-600" />
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-gray-800">Leçons sans section</h3>
                                    <p className="text-sm text-gray-500">Ces leçons ne sont rattachées à aucune section</p>
                                  </div>
                                </div>
                              </div>
                              <div className="p-4 space-y-2">
                                {lessonsBySectionId['no-section'].map((lesson: any) => (
                                  <div
                                    key={lesson.id}
                                    className="flex items-center justify-between gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-brand-blue/30 transition-all group/lesson"
                                  >
                                    <div className="flex items-center gap-4 min-w-0">
                                      <div className="p-2.5 bg-gray-100 text-gray-500 rounded-xl shrink-0">
                                        {getLessonTypeIcon(lesson.lesson_type)}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{lesson.title}</p>
                                        <p className="text-xs text-amber-600 mt-0.5">Non assignée à une section</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/lesson:opacity-100 transition-opacity">
                                      <Link href={`/dashboard/elearning/courses/${course.slug}/lessons/${lesson.slug}/edit`}>
                                        <Button type="button" variant="ghost" size="sm" className="text-gray-400 hover:text-brand-blue rounded-lg">
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      </Link>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const ok = window.confirm(`Supprimer la leçon "${lesson.title}" ?`)
                                          if (ok) deleteLessonMutation.mutate(lesson.id)
                                        }}
                                        disabled={deleteLessonMutation.isPending}
                                        className="text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Premium Sticky Save Bar */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50"
          >
            {/* Glass effect background */}
            <div className="absolute inset-0 bg-white/70 backdrop-blur-xl border-t border-gray-200/50" />

            {/* Gradient accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-purple" />

            <div className="relative max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <AnimatePresence>
                  {isDirty && (
                    <motion.div
                      initial={{ opacity: 0, x: -20, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -20, scale: 0.9 }}
                      className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-blue/10 to-brand-cyan/10 border border-brand-blue/20"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-2.5 h-2.5 bg-gradient-to-r from-brand-blue to-brand-cyan rounded-full shadow-lg shadow-brand-cyan/50"
                      />
                      <span className="text-sm font-medium text-brand-blue">Modifications non enregistrées</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-4">
                <Link href={`/dashboard/elearning/courses/${course.slug}`}>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button type="button" variant="ghost" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl px-5">
                      Annuler
                    </Button>
                  </motion.div>
                </Link>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="relative bg-gradient-to-r from-brand-blue to-brand-blue-dark hover:shadow-2xl hover:shadow-brand-blue/30 text-white px-8 py-2.5 rounded-xl transition-all duration-300 overflow-hidden group"
                  >
                    {/* Shimmer effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                    <span className="relative flex items-center gap-2">
                      {updateMutation.isPending ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                          />
                          <span>Enregistrement...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-5 w-5" />
                          <span className="font-medium">Enregistrer</span>
                        </>
                      )}
                    </span>
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </form>
      </div>

      {/* Premium Dialog - créer section */}
      <Dialog open={showCreateSection} onOpenChange={setShowCreateSection}>
        <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border-0 shadow-2xl">
          {/* Premium header with gradient */}
          <div className="relative p-8 bg-gradient-to-br from-brand-blue via-brand-blue-dark to-[#0f1a2e] overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(52,185,238,0.2),transparent)]" />
            <div className="absolute top-0 right-0 w-40 h-40 bg-brand-cyan/10 rounded-full blur-3xl" />

            <DialogHeader className="relative">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <Layers className="h-6 w-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-white text-2xl font-bold tracking-tight">Nouvelle section</DialogTitle>
                  <DialogDescription className="text-white/60 mt-1">
                    Organisez votre contenu en sections thématiques
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6">
            <div>
              <Label htmlFor="section-title" className="text-sm font-semibold text-gray-700 mb-3 block">
                Titre de la section <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="section-title"
                value={sectionForm.title}
                onChange={(e) => setSectionForm((s) => ({ ...s, title: e.target.value }))}
                placeholder="Ex: Module 1 - Introduction"
                className="border-2 border-gray-200 hover:border-brand-blue/40 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 rounded-xl py-3 transition-all duration-300"
              />
            </div>
            <div>
              <Label htmlFor="section-desc" className="text-sm font-semibold text-gray-700 mb-3 block">Description</Label>
              <Textarea
                id="section-desc"
                value={sectionForm.description}
                onChange={(e) => setSectionForm((s) => ({ ...s, description: e.target.value }))}
                placeholder="Décrivez brièvement le contenu de cette section..."
                className="border-2 border-gray-200 hover:border-brand-blue/40 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 rounded-xl py-3 transition-all duration-300 resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="px-8 py-6 bg-gray-50/80 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setShowCreateSection(false)} className="rounded-xl border-2 hover:bg-gray-100">
              Annuler
            </Button>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="button"
                onClick={() => {
                  if (!sectionForm.title.trim()) {
                    addToast({ type: 'error', title: 'Titre requis', description: 'Veuillez saisir un titre.' })
                    return
                  }
                  createSectionMutation.mutate()
                }}
                disabled={createSectionMutation.isPending}
                className="bg-gradient-to-r from-brand-blue to-brand-blue-dark hover:shadow-lg hover:shadow-brand-blue/25 rounded-xl px-6 transition-all duration-300"
              >
                {createSectionMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    Création...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Créer la section
                  </span>
                )}
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Premium Dialog - modifier section */}
      <Dialog open={showEditSection} onOpenChange={setShowEditSection}>
        <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border-0 shadow-2xl">
          {/* Premium header with gradient */}
          <div className="relative p-8 bg-gradient-to-br from-brand-blue via-brand-blue-dark to-[#0f1a2e] overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(52,185,238,0.2),transparent)]" />
            <div className="absolute top-0 right-0 w-40 h-40 bg-brand-cyan/10 rounded-full blur-3xl" />

            <DialogHeader className="relative">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <Pencil className="h-6 w-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-white text-2xl font-bold tracking-tight">Modifier la section</DialogTitle>
                  <DialogDescription className="text-white/60 mt-1">
                    Mettez à jour les informations de la section
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6">
            <div>
              <Label htmlFor="section-title-edit" className="text-sm font-semibold text-gray-700 mb-3 block">
                Titre <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="section-title-edit"
                value={sectionForm.title}
                onChange={(e) => setSectionForm((s) => ({ ...s, title: e.target.value }))}
                className="border-2 border-gray-200 hover:border-brand-blue/40 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 rounded-xl py-3 transition-all duration-300"
              />
            </div>
            <div>
              <Label htmlFor="section-desc-edit" className="text-sm font-semibold text-gray-700 mb-3 block">Description</Label>
              <Textarea
                id="section-desc-edit"
                value={sectionForm.description}
                onChange={(e) => setSectionForm((s) => ({ ...s, description: e.target.value }))}
                className="border-2 border-gray-200 hover:border-brand-blue/40 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 rounded-xl py-3 transition-all duration-300 resize-none"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="section-order" className="text-sm font-semibold text-gray-700 mb-3 block">Ordre d'affichage</Label>
              <Input
                id="section-order"
                type="number"
                value={sectionForm.order_index}
                onChange={(e) => setSectionForm((s) => ({ ...s, order_index: Number(e.target.value || 0) }))}
                className="border-2 border-gray-200 hover:border-brand-blue/40 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 rounded-xl py-3 transition-all duration-300 w-28"
              />
            </div>
          </div>

          <DialogFooter className="px-8 py-6 bg-gray-50/80 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setShowEditSection(false)} className="rounded-xl border-2 hover:bg-gray-100">
              Annuler
            </Button>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="button"
                onClick={() => {
                  if (!sectionForm.title.trim()) {
                    addToast({ type: 'error', title: 'Titre requis', description: 'Veuillez saisir un titre.' })
                    return
                  }
                  updateSectionMutation.mutate()
                }}
                disabled={updateSectionMutation.isPending}
                className="bg-gradient-to-r from-brand-blue to-brand-blue-dark hover:shadow-lg hover:shadow-brand-blue/25 rounded-xl px-6 transition-all duration-300"
              >
                {updateSectionMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    Enregistrement...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Enregistrer
                  </span>
                )}
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
