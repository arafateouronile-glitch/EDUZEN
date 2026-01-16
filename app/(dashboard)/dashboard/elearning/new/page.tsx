'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/lib/hooks/use-auth'
import { elearningService } from '@/lib/services/elearning.service'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { ArrowLeft, GraduationCap, Save, Upload, X } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

// Schéma de validation
const courseSchema = z.object({
  title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères'),
  slug: z.string().min(3, 'Le slug doit contenir au moins 3 caractères').regex(/^[a-z0-9-]+$/, 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets'),
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

export default function NewCoursePage() {
  const router = useRouter()
  const { user } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)

  // Récupérer les enseignants
  const { data: teachers } = useQuery<Array<{ id: string; full_name?: string; email?: string; [key: string]: any }>>({
    queryKey: ['teachers', user?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('organization_id', user?.organization_id || '')
        .eq('role', 'teacher')
        .eq('is_active', true)
      if (error) throw error
      return (data || []) as Array<{ id: string; full_name?: string; email?: string; [key: string]: any }>
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les formations
  const { data: formations } = useQuery<Array<{ id: string; name?: string; code?: string; [key: string]: any }>>({
    queryKey: ['formations', user?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formations')
        .select('id, name, code')
        .eq('organization_id', user?.organization_id || '')
        .eq('is_active', true)
      if (error) throw error
      return (data || []) as Array<{ id: string; name?: string; code?: string; [key: string]: any }>
    },
    enabled: !!user?.organization_id,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
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

  // Gérer l'upload de la miniature
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setThumbnailFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const createMutation = useMutation({
    mutationFn: async (data: CourseFormData) => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')

      // Upload de la miniature si présente
      let thumbnailUrl: string | null = null
      if (thumbnailFile) {
        const fileExt = thumbnailFile.name.split('.').pop()
        const fileName = `${user.organization_id}/courses/thumbnails/${Date.now()}.${fileExt}`

        // Bucket principal + fallbacks (au cas où le bucket n'existe pas encore en environnement)
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
          console.error('Erreur upload miniature (storage):', lastError)
          throw new Error(
            lastError?.message ||
              "Erreur lors de l'upload de la miniature (bucket course-thumbnails/elearning-media/course-media)."
          )
        }
      }

      return elearningService.createCourse({
        organization_id: user.organization_id,
        title: data.title,
        slug: data.slug,
        short_description: data.short_description || null,
        description: data.description || null,
        difficulty_level: data.difficulty_level,
        estimated_duration_hours: data.estimated_duration_hours || null,
        price: data.price || null,
        currency: data.currency,
        is_published: data.is_published,
        is_featured: data.is_featured,
        instructor_id: data.instructor_id || user.id,
        formation_id: data.formation_id || null,
        thumbnail_url: thumbnailUrl,
        total_lessons: 0,
        total_students: 0,
      })
    },
    onSuccess: (course) => {
      addToast({
        type: 'success',
        title: 'Séquence créée avec succès',
        description: 'Votre séquence e-learning a été créée. Créez maintenant votre première leçon avec du contenu.',
      })
      // Rediriger vers la création d'une leçon pour cette séquence
      router.push(`/dashboard/elearning/courses/${(course as any).slug}/lessons/new`)
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la création de la séquence',
      })
    },
  })

  const onSubmit = (data: CourseFormData) => {
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
        <Link href="/dashboard/elearning">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-blue-ghost rounded-xl">
            <GraduationCap className="h-6 w-6 text-brand-blue" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nouvelle séquence e-learning</h1>
            <p className="text-gray-500 mt-1">Créez une nouvelle séquence de formation en ligne</p>
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
                Titre de la séquence *
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
              <p className="text-xs text-gray-500 mt-1">L'URL de votre séquence sera : /courses/[slug]</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description courte
              </label>
              <textarea
                {...register('short_description')}
                rows={2}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all resize-none"
                placeholder="Une brève description qui apparaîtra dans les listes..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description complète
              </label>
              <textarea
                {...register('description')}
                rows={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all resize-none"
                placeholder="Décrivez en détail le contenu de cette séquence..."
              />
            </div>
          </div>
        </GlassCard>

        {/* Paramètres */}
        <GlassCard variant="premium" className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Paramètres</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Niveau de difficulté
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Durée estimée (heures)
              </label>
              <input
                type="number"
                {...register('estimated_duration_hours', { valueAsNumber: true })}
                min="0"
                step="0.5"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                placeholder="10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prix
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  {...register('price', { valueAsNumber: true })}
                  min="0"
                  step="0.01"
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                  placeholder="0"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enseignant
              </label>
              <select
                {...register('instructor_id')}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
              >
                <option value="">Moi-même</option>
                {teachers?.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.full_name} ({teacher.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Formation associée (optionnel)
              </label>
              <select
                {...register('formation_id')}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
              >
                <option value="">Aucune</option>
                {formations?.map((formation) => (
                  <option key={formation.id} value={formation.id}>
                    {formation.name} ({formation.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </GlassCard>

        {/* Miniature */}
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
          
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('is_published')}
                className="w-5 h-5 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
              />
              <div>
                <span className="font-medium text-gray-900">Publier immédiatement</span>
                <p className="text-sm text-gray-500">La séquence sera visible par tous les utilisateurs</p>
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
                <p className="text-sm text-gray-500">La séquence apparaîtra dans la section "Sélection du moment"</p>
              </div>
            </label>
          </div>
        </GlassCard>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href="/dashboard/elearning">
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
                Créer la séquence
              </>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  )
}

