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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft, Save, Upload, Plus, Pencil, Trash2, BookOpen, ExternalLink,
  Clock, Eye, EyeOff, FileText, Settings, Image as ImageIcon,
  PlayCircle, FileQuestion, Layers, Check, AlertCircle, Star
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
  currency: z.string().default('EUR'),
  is_published: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  instructor_id: z.string().optional(),
  formation_id: z.string().optional(),
})

type CourseFormData = z.infer<typeof courseSchema>

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
      currency: 'EUR',
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
      currency: course.currency || 'EUR',
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement de la séquence...</p>
        </div>
      </div>
    )
  }

  // Premium Not Found state
  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Séquence introuvable</h2>
          <p className="text-gray-500 mb-6">Cette séquence n'existe pas ou a été supprimée.</p>
          <Link href="/dashboard/elearning">
            <Button className="bg-brand-blue hover:bg-brand-blue-dark text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux séquences
            </Button>
          </Link>
        </div>
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
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      {/* Header Compact */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/elearning" className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="h-6 w-px bg-gray-200" />
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight truncate max-w-md">{watchedValues.title || 'Nouveau cours'}</h1>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className={cn("inline-flex items-center gap-1", course.is_published ? "text-emerald-600" : "text-amber-600")}>
                  <div className={cn("w-1.5 h-1.5 rounded-full", course.is_published ? "bg-emerald-500" : "bg-amber-500")} />
                  {course.is_published ? 'Publié' : 'Brouillon'}
                </span>
                <span>•</span>
                <span>{sectionsSorted.length} sections</span>
                <span>•</span>
                <span>{totalLessons} leçons</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href={`/dashboard/elearning/courses/${course.slug}`}>
              <Button variant="ghost" size="sm" className="text-gray-600">
                <ExternalLink className="h-4 w-4 mr-2" />
                Aperçu
              </Button>
            </Link>
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={updateMutation.isPending || !isDirty}
              size="sm"
              className={cn(
                "min-w-[120px] transition-all",
                isDirty ? "bg-brand-blue hover:bg-brand-blue-dark text-white shadow-md" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
              )}
            >
              {updateMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Sauvegarde...
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
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Colonne Gauche : Structure du cours (Principal) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Layers className="h-5 w-5 text-gray-400" />
                Structure du cours
              </h2>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowCreateSection(true)}
                  variant="outline"
                  size="sm"
                  className="bg-white hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Section
                </Button>
                <Link href={`/dashboard/elearning/courses/${course.slug}/lessons/new`}>
                  <Button size="sm" className="bg-brand-blue hover:bg-brand-blue-dark text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Leçon
                  </Button>
                </Link>
              </div>
            </div>

            {/* Liste des sections et leçons */}
            <div className="space-y-4">
              {sectionsSorted.length === 0 && lessonsSorted.length === 0 ? (
                <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Le cours est vide</h3>
                  <p className="text-gray-500 mb-6">Commencez par ajouter une section pour structurer votre contenu.</p>
                  <Button onClick={() => setShowCreateSection(true)} variant="outline">
                    Créer la première section
                  </Button>
                </div>
              ) : (
                <>
                  {sectionsSorted.map((section: any, index) => {
                    const sectionLessons = lessonsBySectionId[section.id] || []
                    return (
                      <div key={section.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="bg-gray-50/50 px-4 py-3 border-b border-gray-200 flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-6 h-6 rounded bg-gray-200 text-gray-600 text-xs font-bold">
                              {index + 1}
                            </span>
                            <h3 className="font-semibold text-gray-900">{section.title}</h3>
                            <span className="text-xs text-gray-400 font-normal">
                              {sectionLessons.length} leçon{sectionLessons.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-gray-700"
                              onClick={() => {
                                setSectionForm({
                                  id: section.id,
                                  title: section.title || '',
                                  description: section.description || '',
                                  order_index: Number(section.order_index ?? 0),
                                })
                                setShowEditSection(true)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-red-600"
                              onClick={() => {
                                if (confirm('Supprimer cette section ?')) deleteSectionMutation.mutate(section.id)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="divide-y divide-gray-100">
                          {sectionLessons.length > 0 ? (
                            sectionLessons.map((lesson: any) => (
                              <div key={lesson.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "p-1.5 rounded-md",
                                    lesson.lesson_type === 'video' ? "bg-purple-100 text-purple-600" :
                                    lesson.lesson_type === 'quiz' ? "bg-amber-100 text-amber-600" :
                                    "bg-blue-100 text-blue-600"
                                  )}>
                                    {getLessonTypeIcon(lesson.lesson_type)}
                                  </div>
                                  <span className="text-sm font-medium text-gray-700">{lesson.title}</span>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Link href={`/dashboard/elearning/courses/${course.slug}/lessons/${lesson.slug}/edit`}>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-gray-500">Éditer</Button>
                                  </Link>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-8 text-center">
                              <p className="text-sm text-gray-400 mb-3">Aucune leçon dans cette section</p>
                              <Link href={`/dashboard/elearning/courses/${course.slug}/lessons/new`}>
                                <Button variant="outline" size="sm" className="text-xs h-7">
                                  <Plus className="h-3 w-3 mr-1" /> Ajouter une leçon
                                </Button>
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {/* Leçons orphelines */}
                  {lessonsBySectionId['no-section']?.length > 0 && (
                    <div className="bg-amber-50 rounded-xl border border-amber-200 overflow-hidden">
                      <div className="px-4 py-3 border-b border-amber-200 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <h3 className="font-semibold text-amber-800 text-sm">Leçons non classées</h3>
                      </div>
                      <div className="divide-y divide-amber-200/50">
                        {lessonsBySectionId['no-section'].map((lesson: any) => (
                          <div key={lesson.id} className="px-4 py-3 flex items-center justify-between hover:bg-amber-100/50">
                            <span className="text-sm font-medium text-amber-900">{lesson.title}</span>
                            <Link href={`/dashboard/elearning/courses/${course.slug}/lessons/${lesson.slug}/edit`}>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-amber-700 hover:text-amber-900 hover:bg-amber-200/50">Éditer</Button>
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Colonne Droite : Paramètres (Sidebar) */}
          <div className="lg:col-span-4 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-400" />
              Paramètres du cours
            </h2>

            {/* Bloc Image */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-3">Image de couverture</label>
              <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200 group">
                {thumbnailPreview ? (
                  <img src={thumbnailPreview} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <ImageIcon className="h-8 w-8 mb-2" />
                    <span className="text-xs">Aucune image</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <label className="cursor-pointer p-2 bg-white rounded-md hover:bg-gray-100 transition-colors">
                    <Upload className="h-4 w-4 text-gray-700" />
                    <input type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
                  </label>
                  {thumbnailPreview && (
                    <button 
                      onClick={() => { setThumbnailFile(null); setThumbnailPreview(null) }}
                      className="p-2 bg-white rounded-md hover:bg-red-50 text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Bloc Infos Générales */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                <Input {...register('title')} onChange={handleTitleChange} className="h-9" />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug URL</label>
                <div className="flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-xs">/courses/</span>
                  <Input {...register('slug')} className="rounded-l-none h-9 font-mono text-xs" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description courte</label>
                <Textarea {...register('short_description')} className="h-20 resize-none text-sm" placeholder="Résumé pour la carte..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix & Devise</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input 
                      type="number" 
                      {...register('price', { valueAsNumber: true })} 
                      className="h-9 pl-8" 
                      placeholder="0"
                    />
                    <span className="absolute left-3 top-2.5 text-gray-500 text-xs">€</span>
                  </div>
                  <select 
                    {...register('currency')}
                    className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-brand-blue focus:outline-none"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="XOF">XOF</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bloc Publication */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Visibilité</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-50 rounded-lg -mx-2 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded", watchedValues.is_published ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-500")}>
                      <Eye className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Publié</span>
                  </div>
                  <input type="checkbox" {...register('is_published')} className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue" />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-50 rounded-lg -mx-2 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded", watchedValues.is_featured ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-500")}>
                      <Star className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">En vedette</span>
                  </div>
                  <input type="checkbox" {...register('is_featured')} className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue" />
                </label>
              </div>
            </div>

            {/* Bloc Détails */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-medium text-gray-900">Détails avancés</h3>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Niveau</label>
                <select {...register('difficulty_level')} className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm">
                  <option value="beginner">Débutant</option>
                  <option value="intermediate">Intermédiaire</option>
                  <option value="advanced">Avancé</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Durée (heures)</label>
                <Input type="number" {...register('estimated_duration_hours', { valueAsNumber: true })} className="h-9" step="0.5" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Enseignant</label>
                <select {...register('instructor_id')} className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm">
                  <option value="">Moi-même</option>
                  {teachers?.map((t: any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Dialog - créer section */}
      <Dialog open={showCreateSection} onOpenChange={setShowCreateSection}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nouvelle section</DialogTitle>
            <DialogDescription>
              Organisez votre contenu en sections thématiques
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="section-title" className="mb-2 block">
                Titre de la section <span className="text-red-500">*</span>
              </Label>
              <Input
                id="section-title"
                value={sectionForm.title}
                onChange={(e) => setSectionForm((s) => ({ ...s, title: e.target.value }))}
                placeholder="Ex: Module 1 - Introduction"
                className="focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
              />
            </div>
            <div>
              <Label htmlFor="section-desc" className="mb-2 block">Description</Label>
              <Textarea
                id="section-desc"
                value={sectionForm.description}
                onChange={(e) => setSectionForm((s) => ({ ...s, description: e.target.value }))}
                placeholder="Décrivez brièvement le contenu de cette section..."
                className="focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowCreateSection(false)}>
              Annuler
            </Button>
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
              className="bg-brand-blue hover:bg-brand-blue-dark text-white"
            >
              {createSectionMutation.isPending ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2" />
                  Création...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer la section
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog - modifier section */}
      <Dialog open={showEditSection} onOpenChange={setShowEditSection}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier la section</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations de la section
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="section-title-edit" className="mb-2 block">
                Titre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="section-title-edit"
                value={sectionForm.title}
                onChange={(e) => setSectionForm((s) => ({ ...s, title: e.target.value }))}
                className="focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
              />
            </div>
            <div>
              <Label htmlFor="section-desc-edit" className="mb-2 block">Description</Label>
              <Textarea
                id="section-desc-edit"
                value={sectionForm.description}
                onChange={(e) => setSectionForm((s) => ({ ...s, description: e.target.value }))}
                className="focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue resize-none"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="section-order" className="mb-2 block">Ordre d'affichage</Label>
              <Input
                id="section-order"
                type="number"
                value={sectionForm.order_index}
                onChange={(e) => setSectionForm((s) => ({ ...s, order_index: Number(e.target.value || 0) }))}
                className="focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue w-24"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowEditSection(false)}>
              Annuler
            </Button>
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
              className="bg-brand-blue hover:bg-brand-blue-dark text-white"
            >
              {updateSectionMutation.isPending ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Enregistrer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
