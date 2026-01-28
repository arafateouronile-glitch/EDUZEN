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
import { ArrowLeft, GraduationCap, Save, Upload, X, Plus, Pencil, Trash2, BookOpen, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import { logger, sanitizeError } from '@/lib/utils/logger'

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
    formState: { errors },
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

  if (loadingCourse || !course) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p>Chargement...</p>
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-8 max-w-5xl mx-auto p-6"
    >
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/elearning/courses/${course.slug}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-blue-ghost rounded-xl">
            <GraduationCap className="h-6 w-6 text-brand-blue" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Modifier la séquence</h1>
            <p className="text-gray-500 mt-1">{course.title}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <GlassCard variant="premium" className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Informations principales</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Titre de la séquence *</label>
              <input
                type="text"
                {...register('title')}
                onChange={handleTitleChange}
                className={cn(
                  'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all',
                  errors.title ? 'border-red-500' : 'border-gray-200'
                )}
                placeholder="Ex: Introduction à React"
              />
              {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Slug (URL) *</label>
              <input
                type="text"
                {...register('slug')}
                className={cn(
                  'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all bg-gray-50',
                  errors.slug ? 'border-red-500' : 'border-gray-200'
                )}
                placeholder="introduction-a-react"
              />
              {errors.slug && <p className="text-sm text-red-600 mt-1">{errors.slug.message}</p>}
              <p className="text-xs text-gray-500 mt-1">URL : /courses/[slug]</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description courte</label>
              <textarea
                {...register('short_description')}
                rows={2}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description complète</label>
              <textarea
                {...register('description')}
                rows={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all resize-none"
              />
            </div>
          </div>
        </GlassCard>

        <GlassCard variant="premium" className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Paramètres</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Niveau de difficulté</label>
              <select
                {...register('difficulty_level')}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
              >
                <option value="beginner">Débutant</option>
                <option value="intermediate">Intermédiaire</option>
                <option value="advanced">Avancé</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Durée estimée (heures)</label>
              <input
                type="number"
                {...register('estimated_duration_hours', { valueAsNumber: true })}
                min="0"
                step="0.5"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prix</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  {...register('price', { valueAsNumber: true })}
                  min="0"
                  step="0.01"
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                />
                <select
                  {...register('currency')}
                  className="w-24 px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                >
                  <option value="XOF">XOF</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Enseignant</label>
              <select
                {...register('instructor_id')}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Formation associée (optionnel)</label>
              <select
                {...register('formation_id')}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
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
        </GlassCard>

        <GlassCard variant="premium" className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Miniature</h2>

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
                    // Ne supprime pas la miniature en base automatiquement; l'utilisateur peut en re-uploader une.
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

        <GlassCard variant="premium" className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Options de publication</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('is_published')}
                className="w-5 h-5 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
              />
              <div>
                <span className="font-medium text-gray-900">Visible pour les apprenants</span>
                <p className="text-sm text-gray-500">Publier la séquence sur le catalogue apprenant</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('is_featured')}
                className="w-5 h-5 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
              />
              <div>
                <span className="font-medium text-gray-900">Mettre en vedette</span>
                <p className="text-sm text-gray-500">Afficher dans la sélection du moment</p>
              </div>
            </label>
          </div>
        </GlassCard>

        <div className="flex justify-end gap-4">
          <Link href={`/dashboard/elearning/courses/${course.slug}`}>
            <Button variant="ghost" type="button">
              Annuler
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-brand-blue hover:bg-brand-blue/90 text-white shadow-lg shadow-brand-blue/20"
          >
            {updateMutation.isPending ? (
              <>Enregistrement...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Contenu (sections + leçons) */}
      <GlassCard variant="premium" className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Contenu de la séquence</h2>
            <p className="text-sm text-gray-500">Gérez les sections et les leçons en défilant sur cette même page.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setShowCreateSection(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle section
            </Button>
            <Link href={`/dashboard/elearning/courses/${course.slug}/lessons/new`}>
              <Button type="button" className="bg-brand-blue hover:bg-brand-blue/90 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle leçon
              </Button>
            </Link>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sectionsSorted.length === 0 && lessonsSorted.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
              <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">Aucune section / leçon pour le moment</p>
              <p className="text-sm text-gray-500 mt-1">Crée une section puis ajoute des leçons.</p>
            </div>
          ) : (
            <>
              {sectionsSorted.map((section: any) => {
                const sectionLessons = lessonsBySectionId[section.id] || []
                return (
                  <div key={section.id} className="border border-gray-200 rounded-xl bg-white">
                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 truncate">{section.title}</p>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">{sectionLessons.length} leçon(s)</span>
                        </div>
                        {section.description ? (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{section.description}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
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
                          <Pencil className="h-4 w-4 mr-2" />
                          Modifier
                        </Button>
                        <Link href={`/dashboard/elearning/courses/${course.slug}/lessons/new`}>
                          <Button type="button" variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            Ajouter une leçon
                          </Button>
                        </Link>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-red-200 text-red-700 hover:bg-red-50"
                          onClick={() => {
                            const ok = window.confirm(`Supprimer la section "${section.title}" ? Les leçons seront conservées (sans section).`)
                            if (ok) deleteSectionMutation.mutate(section.id)
                          }}
                          disabled={deleteSectionMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      {sectionLessons.length === 0 ? (
                        <p className="text-sm text-gray-500">Aucune leçon dans cette section.</p>
                      ) : (
                        sectionLessons.map((lesson: any) => (
                          <div key={lesson.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 p-3 border rounded-lg">
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{lesson.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Type: {lesson.lesson_type || 'text'} • Ordre: {lesson.order_index ?? 0}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Link href={`/dashboard/elearning/courses/${course.slug}/lessons/${lesson.slug}`}>
                                <Button type="button" variant="outline" size="sm">
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Ouvrir
                                </Button>
                              </Link>
                              <Link href={`/dashboard/elearning/courses/${course.slug}/lessons/${lesson.slug}/edit`}>
                                <Button type="button" variant="outline" size="sm">
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Modifier la leçon
                                </Button>
                              </Link>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-red-200 text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  const ok = window.confirm(`Supprimer la leçon "${lesson.title}" ?`)
                                  if (ok) deleteLessonMutation.mutate(lesson.id)
                                }}
                                disabled={deleteLessonMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Leçons sans section */}
              {lessonsBySectionId['no-section']?.length ? (
                <div className="border border-gray-200 rounded-xl bg-white">
                  <div className="p-4 border-b border-gray-100">
                    <p className="font-semibold text-gray-900">Sans section</p>
                    <p className="text-sm text-gray-500 mt-1">Leçons non rattachées à une section.</p>
                  </div>
                  <div className="p-4 space-y-2">
                    {lessonsBySectionId['no-section'].map((lesson: any) => (
                      <div key={lesson.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 p-3 border rounded-lg">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{lesson.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Type: {lesson.lesson_type || 'text'} • Ordre: {lesson.order_index ?? 0}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/dashboard/elearning/courses/${course.slug}/lessons/${lesson.slug}`}>
                            <Button type="button" variant="outline" size="sm">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Ouvrir
                            </Button>
                          </Link>
                          <Link href={`/dashboard/elearning/courses/${course.slug}/lessons/${lesson.slug}/edit`}>
                            <Button type="button" variant="outline" size="sm">
                              <Pencil className="h-4 w-4 mr-2" />
                              Modifier la leçon
                            </Button>
                          </Link>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-700 hover:bg-red-50"
                            onClick={() => {
                              const ok = window.confirm(`Supprimer la leçon "${lesson.title}" ?`)
                              if (ok) deleteLessonMutation.mutate(lesson.id)
                            }}
                            disabled={deleteLessonMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </GlassCard>

      {/* Dialog - créer section */}
      <Dialog open={showCreateSection} onOpenChange={setShowCreateSection}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Nouvelle section</DialogTitle>
            <DialogDescription>Ajoute une section pour organiser les leçons.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="section-title">Titre *</Label>
              <Input
                id="section-title"
                value={sectionForm.title}
                onChange={(e) => setSectionForm((s) => ({ ...s, title: e.target.value }))}
                placeholder="Ex: Module 1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="section-desc">Description</Label>
              <Textarea
                id="section-desc"
                value={sectionForm.description}
                onChange={(e) => setSectionForm((s) => ({ ...s, description: e.target.value }))}
                placeholder="Description de la section..."
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
            >
              {createSectionMutation.isPending ? 'Création...' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog - modifier section */}
      <Dialog open={showEditSection} onOpenChange={setShowEditSection}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Modifier la section</DialogTitle>
            <DialogDescription>Met à jour le titre et la description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="section-title-edit">Titre *</Label>
              <Input
                id="section-title-edit"
                value={sectionForm.title}
                onChange={(e) => setSectionForm((s) => ({ ...s, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="section-desc-edit">Description</Label>
              <Textarea
                id="section-desc-edit"
                value={sectionForm.description}
                onChange={(e) => setSectionForm((s) => ({ ...s, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="section-order">Ordre</Label>
              <Input
                id="section-order"
                type="number"
                value={sectionForm.order_index}
                onChange={(e) => setSectionForm((s) => ({ ...s, order_index: Number(e.target.value || 0) }))}
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
            >
              {updateSectionMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}


