'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { elearningService } from '@/lib/services/elearning.service'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid'
import { useToast } from '@/components/ui/toast'
import {
  Search,
  BookOpen,
  Star,
  Users,
  Clock,
  Play,
  TrendingUp,
  Award,
  GraduationCap,
  ArrowRight,
  Filter,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate, cn } from '@/lib/utils'
import { motion, AnimatePresence } from '@/components/ui/motion'

export default function ELearningPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const canManageElearning = ['super_admin', 'admin', 'secretary'].includes(user?.role || '')
  const showLearnerView = !canManageElearning

  // Récupérer tous les cours
  const { data: allCourses, isLoading } = useQuery({
    queryKey: ['elearning-courses', user?.organization_id, searchQuery],
    queryFn: () =>
      elearningService.getCourses(user?.organization_id || '', {
        // Dashboard (staff) : voir aussi les brouillons
        // Apprenant : voir uniquement les cours publiés
        isPublished: showLearnerView ? true : undefined,
        search: searchQuery || undefined,
      }),
    enabled: !!user?.organization_id,
  })

  // Récupérer les cours en vedette
  const { data: featuredCourses } = useQuery({
    queryKey: ['featured-courses', user?.organization_id],
    queryFn: () =>
      elearningService.getCourses(user?.organization_id || '', {
        isPublished: true,
        isFeatured: true,
      }),
    enabled: !!user?.organization_id && showLearnerView,
  })

  // Récupérer mes inscriptions
  const { data: myEnrollments } = useQuery({
    queryKey: ['my-enrollments', user?.id],
    queryFn: () => elearningService.getStudentEnrollments(user?.id || ''),
    enabled: !!user?.id && showLearnerView,
  })

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-emerald-50 text-emerald-700 border-emerald-100'
      case 'intermediate': return 'bg-amber-50 text-amber-700 border-amber-100'
      case 'advanced': return 'bg-rose-50 text-rose-700 border-rose-100'
      default: return 'bg-gray-50 text-gray-600 border-gray-100'
    }
  }

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'Débutant'
      case 'intermediate': return 'Intermédiaire'
      case 'advanced': return 'Avancé'
      default: return difficulty
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  } as const

  const togglePublishMutation = useMutation({
    mutationFn: async (course: any) => {
      const nextPublished = !course.is_published
      return elearningService.updateCourse(course.id, {
        is_published: nextPublished,
        published_at: nextPublished ? new Date().toISOString() : null,
      } as any)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elearning-courses'] })
      queryClient.invalidateQueries({ queryKey: ['featured-courses'] })
      addToast({
        type: 'success',
        title: 'Visibilité mise à jour',
        description: 'La séquence a été mise à jour.',
      })
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error?.message || 'Impossible de mettre à jour la visibilité.',
      })
    },
  })

  const toggleScoresMutation = useMutation({
    mutationFn: async (course: any) => {
      const current = (course as any).scores_enabled
      const nextEnabled = current === false ? true : false
      return elearningService.updateCourse(course.id, { scores_enabled: nextEnabled } as any)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elearning-courses'] })
      addToast({
        type: 'success',
        title: 'Scores mis à jour',
        description: 'Le paramètre de scoring a été mis à jour.',
      })
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description:
          error?.message ||
          "Impossible de mettre à jour les scores (vérifie que la colonne 'scores_enabled' existe en base).",
      })
    },
  })

  const deleteCourseMutation = useMutation({
    mutationFn: async (course: any) => {
      await elearningService.deleteCourse(course.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elearning-courses'] })
      queryClient.invalidateQueries({ queryKey: ['featured-courses'] })
      addToast({
        type: 'success',
        title: 'Séquence supprimée',
        description: 'La séquence a été supprimée.',
      })
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error?.message || 'Impossible de supprimer la séquence.',
      })
    },
  })

  // Vue "gestion" pour admin/super_admin/secrétaire (pas de "Mes apprentissages")
  if (canManageElearning) {
    return (
      <motion.div
        className="space-y-8 pb-8 max-w-[1600px] mx-auto p-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl shadow-lg">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">
                  E-learning
                </h1>
                {allCourses && (
                  <span className="px-3 py-1 bg-gradient-to-r from-brand-blue-ghost to-brand-cyan-ghost text-brand-blue rounded-full text-sm font-medium border border-brand-blue/20">
                    {allCourses.length} {allCourses.length > 1 ? 'séquences' : 'séquence'}
                  </span>
                )}
              </div>
            </div>
            <p className="text-gray-600 text-sm lg:text-base ml-1">
              Gérez vos séquences : modification, suppression, publication et scores.
            </p>
          </div>
          <Link href="/dashboard/elearning/new">
            <Button className="bg-gradient-to-r from-brand-blue to-brand-cyan hover:from-brand-blue-dark hover:to-brand-cyan shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle séquence
            </Button>
          </Link>
        </motion.div>

        <motion.div variants={itemVariants}>
          <GlassCard variant="default" className="p-2 border-2 border-brand-blue/20 bg-gradient-to-br from-brand-blue-ghost/20 to-brand-cyan-ghost/20">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-blue group-focus-within:text-brand-cyan transition-colors" />
                <input
                  type="text"
                  placeholder="Rechercher une séquence..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border-2 border-brand-blue/20 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all outline-none text-sm"
                />
              </div>
              <Button variant="ghost" className="gap-2 text-gray-600 hover:bg-brand-blue-ghost hover:text-brand-blue" disabled>
                <Filter className="h-4 w-4" />
                Filtres
              </Button>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-72 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : allCourses && allCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allCourses.map((course: any) => {
                const scoresEnabled = (course as any).scores_enabled !== false
                return (
                  <GlassCard key={course.id} variant="default" hoverable className="p-0 overflow-hidden border-2 border-brand-blue/10 hover:border-brand-blue/30 bg-gradient-to-br from-white to-brand-blue-ghost/10 hover:shadow-lg transition-all duration-300">
                    <div className="relative h-40 overflow-hidden bg-gradient-to-br from-gray-50 to-brand-blue-ghost/20">
                      {course.thumbnail_url ? (
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-blue-ghost/30 to-brand-cyan-ghost/20">
                          <GraduationCap className="h-10 w-10 text-brand-blue/40" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-semibold border-2 shadow-sm bg-white/95 backdrop-blur-sm',
                            course.is_published
                              ? 'text-brand-cyan border-brand-cyan/30 bg-gradient-to-br from-brand-cyan-ghost to-brand-cyan-ghost/50'
                              : 'text-amber-700 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50'
                          )}
                        >
                          {course.is_published ? 'Publié' : 'Brouillon'}
                        </span>
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-semibold border-2 shadow-sm bg-white/95 backdrop-blur-sm',
                            scoresEnabled
                              ? 'text-brand-blue border-brand-blue/30 bg-gradient-to-br from-brand-blue-ghost to-brand-blue-ghost/50'
                              : 'text-gray-600 border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100'
                          )}
                        >
                          Scores: {scoresEnabled ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div>
                        <h3 className="font-bold text-gray-900 line-clamp-1 group-hover:text-brand-blue transition-colors">
                          {course.title}
                        </h3>
                        {course.short_description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                            {course.short_description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-brand-blue/10">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-brand-blue" />
                            <span className="font-medium">{course.estimated_duration_hours || 0}h</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5 text-brand-cyan" />
                            <span className="font-medium">{course.total_lessons || 0} leçons</span>
                          </div>
                        </div>
                        <span className="text-xs">Maj {course.updated_at ? formatDate(course.updated_at) : '-'}</span>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <Link href={`/dashboard/elearning/courses/${course.slug}`}>
                          <Button variant="outline" size="sm" className="hover:bg-brand-blue-ghost hover:border-brand-blue/30 hover:text-brand-blue transition-all">
                            <Eye className="h-4 w-4 mr-2" />
                            Ouvrir
                          </Button>
                        </Link>

                        <Link href={`/dashboard/elearning/courses/${course.slug}/edit`}>
                          <Button variant="outline" size="sm" className="hover:bg-brand-cyan-ghost hover:border-brand-cyan/30 hover:text-brand-cyan transition-all">
                            <Pencil className="h-4 w-4 mr-2" />
                            Modifier
                          </Button>
                        </Link>

                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-brand-blue-ghost hover:border-brand-blue/30 hover:text-brand-blue transition-all"
                          onClick={() => togglePublishMutation.mutate(course)}
                          disabled={togglePublishMutation.isPending}
                        >
                          {course.is_published ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-2" />
                              Dépublier
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              Publier
                            </>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-brand-cyan-ghost hover:border-brand-cyan/30 hover:text-brand-cyan transition-all"
                          onClick={() => toggleScoresMutation.mutate(course)}
                          disabled={toggleScoresMutation.isPending}
                        >
                          {scoresEnabled ? (
                            <>
                              <ToggleRight className="h-4 w-4 mr-2" />
                              Scores ON
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="h-4 w-4 mr-2" />
                              Scores OFF
                            </>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 transition-all"
                          onClick={() => {
                            const ok = window.confirm(`Supprimer la séquence "${course.title}" ? Cette action est irréversible.`)
                            if (ok) deleteCourseMutation.mutate(course)
                          }}
                          disabled={deleteCourseMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                )
              })}
            </div>
          ) : (
            <GlassCard variant="default" className="p-12 text-center border-2 border-brand-blue/20 bg-gradient-to-br from-brand-blue-ghost/30 to-brand-cyan-ghost/30">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost rounded-full opacity-50 blur-2xl"></div>
                </div>
                <div className="relative p-6 bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost rounded-2xl inline-block">
                  <GraduationCap className="h-16 w-16 mx-auto text-brand-blue" />
                </div>
              </div>
              <div className="space-y-2 mb-6">
                <h3 className="text-xl font-bold text-gray-900">Aucune séquence trouvée</h3>
                <p className="text-gray-600">
                  {searchQuery
                    ? 'Aucune séquence ne correspond à votre recherche.'
                    : 'Commencez par créer votre première séquence.'}
                </p>
              </div>
              {!searchQuery && (
                <Link href="/dashboard/elearning/new">
                  <Button className="bg-gradient-to-r from-brand-blue to-brand-cyan hover:from-brand-blue-dark hover:to-brand-cyan shadow-md hover:shadow-lg transition-all">
                    <Plus className="mr-2 h-4 w-4" />
                    Créer une séquence
                  </Button>
                </Link>
              )}
            </GlassCard>
          )}
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="space-y-8 pb-8 max-w-[1600px] mx-auto p-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Premium */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl shadow-lg">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">
              E-learning
            </h1>
          </div>
          <p className="text-gray-600 text-sm lg:text-base ml-1">
            Développez vos compétences avec nos parcours de formation en ligne
          </p>
        </div>
      </motion.div>

      {/* Onglets Premium */}
      <motion.div variants={itemVariants} className="flex gap-4 border-b-2 border-brand-blue/10 pb-1">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            "pb-3 px-4 text-sm font-semibold transition-all relative",
            activeTab === 'all'
              ? "text-brand-blue"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          Catalogue
          {activeTab === 'all' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-blue to-brand-cyan rounded-full"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('my-courses')}
          className={cn(
            "pb-3 px-4 text-sm font-semibold transition-all relative",
            activeTab === 'my-courses'
              ? "text-brand-cyan"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          Mes apprentissages
          {myEnrollments && myEnrollments.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-brand-cyan-ghost to-brand-cyan-ghost/50 text-brand-cyan text-xs font-bold rounded-full border border-brand-cyan/20">
              {myEnrollments.length}
            </span>
          )}
          {activeTab === 'my-courses' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-cyan to-brand-blue rounded-full"
            />
          )}
        </button>
      </motion.div>

      {/* Barre de recherche */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="default" className="p-2 border-2 border-brand-blue/20 bg-gradient-to-br from-brand-blue-ghost/20 to-brand-cyan-ghost/20">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-blue group-focus-within:text-brand-cyan transition-colors" />
              <input
                type="text"
                placeholder="Rechercher un cours, une compétence..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border-2 border-brand-blue/20 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all outline-none text-sm"
              />
            </div>
            <Button variant="ghost" className="gap-2 text-gray-600 hover:bg-brand-blue-ghost hover:text-brand-blue">
              <Filter className="h-4 w-4" />
              Filtres
            </Button>
          </div>
        </GlassCard>
      </motion.div>

      <AnimatePresence mode="wait">
        {activeTab === 'all' ? (
          <motion.div 
            key="all"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Cours en vedette */}
            {featuredCourses && featuredCourses.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200 shadow-sm">
                    <Star className="h-5 w-5 text-yellow-600 fill-yellow-500" />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-500 bg-clip-text text-transparent">Sélection du moment</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredCourses.map((course: any, index: number) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link href={`/dashboard/elearning/courses/${course.slug}`}>
                        <GlassCard
                          variant="default"
                          hoverable
                          className="h-full p-0 overflow-hidden group flex flex-col border-2 border-yellow-200 hover:border-yellow-300 bg-gradient-to-br from-white to-yellow-50/30 hover:shadow-xl transition-all duration-300"
                        >
                          <div className="relative h-48 overflow-hidden">
                            {course.thumbnail_url ? (
                              <img
                                src={course.thumbnail_url}
                                alt={course.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-yellow-50 to-yellow-100/50 flex items-center justify-center">
                                <BookOpen className="h-12 w-12 text-yellow-500/40" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                            <div className="absolute top-3 right-3">
                              <span className="px-3 py-1.5 bg-white/95 backdrop-blur-md rounded-full text-xs font-bold text-yellow-600 flex items-center gap-1.5 shadow-lg border border-yellow-200">
                                <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                                Populaire
                              </span>
                            </div>
                            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                              <span className={cn(
                                "px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-md border-2 shadow-sm",
                                getDifficultyColor(course.difficulty_level)
                              )}>
                                {getDifficultyLabel(course.difficulty_level)}
                              </span>
                            </div>
                          </div>

                          <div className="p-5 flex-1 flex flex-col">
                            <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-yellow-600 transition-colors">
                              {course.title}
                            </h3>

                            {course.short_description && (
                              <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">
                                {course.short_description}
                              </p>
                            )}

                            <div className="flex items-center justify-between pt-4 border-t-2 border-yellow-100 text-xs text-gray-500 mt-auto">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5 text-yellow-600" />
                                  <span className="font-medium">{course.total_students || 0}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5 text-yellow-600" />
                                  <span className="font-medium">{course.estimated_duration_hours || 0}h</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-yellow-600 font-semibold group-hover:translate-x-1 transition-transform">
                                Voir
                                <ArrowRight className="h-3.5 w-3.5" />
                              </div>
                            </div>
                          </div>
                        </GlassCard>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Tous les cours */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost rounded-xl border border-brand-blue/20 shadow-sm">
                  <BookOpen className="h-5 w-5 text-brand-blue" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">Catalogue complet</h2>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-80 bg-gray-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : allCourses && allCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allCourses.map((course: any, index: number) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link href={`/dashboard/elearning/courses/${course.slug}`}>
                        <GlassCard
                          variant="default"
                          hoverable
                          className="h-full p-0 overflow-hidden group flex flex-col border-2 border-brand-blue/10 hover:border-brand-blue/30 bg-gradient-to-br from-white to-brand-blue-ghost/10 hover:shadow-lg transition-all duration-300"
                        >
                          <div className="relative h-40 overflow-hidden bg-gradient-to-br from-gray-50 to-brand-blue-ghost/20">
                            {course.thumbnail_url ? (
                              <img
                                src={course.thumbnail_url}
                                alt={course.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-blue-ghost/30 to-brand-cyan-ghost/20">
                                <GraduationCap className="h-10 w-10 text-brand-blue/40" />
                              </div>
                            )}
                            <div className="absolute top-3 right-3">
                              <span className={cn(
                                "px-2.5 py-1 rounded-lg text-xs font-semibold border-2 shadow-sm bg-white/95 backdrop-blur-sm",
                                course.difficulty_level === 'beginner' ? "text-emerald-700 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50" :
                                course.difficulty_level === 'intermediate' ? "text-amber-700 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50" :
                                "text-rose-700 border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/50"
                              )}>
                                {getDifficultyLabel(course.difficulty_level)}
                              </span>
                            </div>
                          </div>

                          <div className="p-5 flex-1 flex flex-col">
                            <h3 className="font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-brand-blue transition-colors">
                              {course.title}
                            </h3>

                            {course.short_description && (
                              <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">
                                {course.short_description}
                              </p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-auto pt-3 border-t border-brand-blue/10">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-brand-blue" />
                                <span className="font-medium">{course.estimated_duration_hours || 0}h</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <BookOpen className="h-3.5 w-3.5 text-brand-cyan" />
                                <span className="font-medium">{course.total_lessons || 0} leçons</span>
                              </div>
                            </div>
                          </div>
                        </GlassCard>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <GlassCard variant="default" className="p-12 text-center border-2 border-brand-blue/20 bg-gradient-to-br from-brand-blue-ghost/30 to-brand-cyan-ghost/30">
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-24 h-24 bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost rounded-full opacity-50 blur-2xl"></div>
                    </div>
                    <div className="relative p-6 bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost rounded-2xl inline-block">
                      <BookOpen className="h-16 w-16 mx-auto text-brand-blue" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-gray-900">Aucun cours trouvé</h3>
                    <p className="text-gray-600">Essayez de modifier vos critères de recherche.</p>
                  </div>
                </GlassCard>
              )}
            </section>
          </motion.div>
        ) : (
          <motion.div
            key="my-courses"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {myEnrollments && myEnrollments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myEnrollments.map((enrollment: any, index: number) => {
                  const course = enrollment.course
                  const progress = Math.round(enrollment.progress_percentage || 0)
                  
                  return (
                    <motion.div
                      key={enrollment.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link href={`/dashboard/elearning/courses/${course.slug}`}>
                        <GlassCard
                          variant="default"
                          hoverable
                          className="h-full p-0 overflow-hidden group border-2 border-brand-cyan/10 hover:border-brand-cyan/30 bg-gradient-to-br from-white to-brand-cyan-ghost/10 hover:shadow-lg transition-all duration-300"
                        >
                          <div className="relative h-40 overflow-hidden">
                            {course.thumbnail_url ? (
                              <img
                                src={course.thumbnail_url}
                                alt={course.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-brand-cyan-ghost/30 to-brand-blue-ghost/20 flex items-center justify-center">
                                <BookOpen className="h-10 w-10 text-brand-cyan/40" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="bg-white/20 backdrop-blur-md p-3 rounded-full border-2 border-white/50 shadow-lg">
                                <Play className="h-6 w-6 text-white fill-white ml-1" />
                              </div>
                            </div>
                          </div>

                          <div className="p-5">
                            <div className="flex justify-between items-start mb-3">
                              <h3 className="font-bold text-gray-900 line-clamp-1 group-hover:text-brand-cyan transition-colors">
                                {course.title}
                              </h3>
                            </div>

                            <div className="mb-4">
                              <div className="flex justify-between text-xs mb-2">
                                <span className="font-semibold text-gray-700">Progression</span>
                                <span className="font-bold text-brand-cyan">{progress}%</span>
                              </div>
                              <div className="h-2.5 w-full bg-gradient-to-r from-gray-100 to-gray-50 rounded-full overflow-hidden border border-gray-200">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progress}%` }}
                                  transition={{ duration: 1, delay: 0.2 }}
                                  className={cn(
                                    "h-full rounded-full",
                                    progress === 100 ? "bg-gradient-to-r from-emerald-500 to-emerald-600" : "bg-gradient-to-r from-brand-cyan to-brand-blue"
                                  )}
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t-2 border-brand-cyan/10">
                              <span className={cn(
                                "px-2.5 py-1 rounded-lg font-semibold border-2",
                                enrollment.enrollment_status === 'completed' ? "bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-700 border-emerald-200" :
                                enrollment.enrollment_status === 'enrolled' ? "bg-gradient-to-br from-brand-cyan-ghost to-brand-cyan-ghost/50 text-brand-cyan border-brand-cyan/30" :
                                "bg-gradient-to-br from-gray-50 to-gray-100 text-gray-600 border-gray-200"
                              )}>
                                {enrollment.enrollment_status === 'completed' ? 'Terminé' :
                                 enrollment.enrollment_status === 'enrolled' ? 'En cours' : 'Archivé'}
                              </span>
                              {enrollment.last_accessed_at && (
                                <span className="font-medium">Accédé le {formatDate(enrollment.last_accessed_at)}</span>
                              )}
                            </div>
                          </div>
                        </GlassCard>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <GlassCard variant="default" className="p-12 text-center border-2 border-brand-cyan/20 bg-gradient-to-br from-brand-cyan-ghost/30 to-brand-blue-ghost/20">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-brand-cyan-ghost to-brand-blue-ghost rounded-full opacity-50 blur-2xl"></div>
                  </div>
                  <div className="relative p-6 bg-gradient-to-br from-brand-cyan-ghost to-brand-blue-ghost rounded-2xl inline-block">
                    <GraduationCap className="h-16 w-16 mx-auto text-brand-cyan" />
                  </div>
                </div>
                <div className="space-y-2 mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Commencez votre apprentissage</h3>
                  <p className="text-gray-600">Vous n'êtes inscrit à aucun cours pour le moment.</p>
                </div>
                <Button
                  onClick={() => setActiveTab('all')}
                  className="bg-gradient-to-r from-brand-cyan to-brand-blue hover:from-brand-cyan-dark hover:to-brand-blue-dark shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Parcourir le catalogue
                </Button>
              </GlassCard>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
