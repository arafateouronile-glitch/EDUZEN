'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { learningPortfolioService, type LearningPortfolio } from '@/lib/services/learning-portfolio.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { GlassCard } from '@/components/ui/glass-card'
import {
  BookOpen, Plus, Search, FileText, Users, Calendar,
  CheckCircle2, Clock, Edit, Eye, Download, MoreVertical,
  Trash2, Copy, Send, Filter, ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { motion } from '@/components/ui/motion'
import { formatDate, cn } from '@/lib/utils'
import { logger, sanitizeError } from '@/lib/utils/logger'

export default function PortfoliosPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sessionFilter, setSessionFilter] = useState<string>('all')

  const isTeacher = user?.role === 'teacher'

  // Récupérer les sessions assignées à l'enseignant (pour les enseignants)
  const { data: teacherSessionIds } = useQuery({
    queryKey: ['teacher-session-ids-portfolios', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data, error } = await supabase
        .from('session_teachers')
        .select('session_id')
        .eq('teacher_id', user.id)
      if (error) {
        logger.error('Erreur récupération sessions enseignant', sanitizeError(error))
        return []
      }
      return (data?.map((st) => st.session_id).filter((id): id is string => id != null)) ?? []
    },
    enabled: !!user?.id && isTeacher,
  })

  // Récupérer les livrets
  // Pour les enseignants, filtrer uniquement les livrets des sessions assignées
  const { data: portfolios, isLoading } = useQuery({
    queryKey: ['learning-portfolios', user?.organization_id, user?.id, isTeacher, teacherSessionIds, statusFilter, sessionFilter],
    queryFn: async () => {
      if (!user?.organization_id) return []
      
      let query = supabase
        .from('learning_portfolios')
        .select(`
          *,
          template:learning_portfolio_templates(id, name, description, primary_color),
          student:students(id, first_name, last_name, email, photo_url),
          session:sessions(id, name, start_date, end_date, formations(id, name))
        `)
        .eq('organization_id', user.organization_id)
        .order('updated_at', { ascending: false })

      // Pour les enseignants, filtrer uniquement les livrets des sessions assignées
      if (isTeacher) {
        if (!teacherSessionIds || teacherSessionIds.length === 0) {
          // Si l'enseignant n'a pas de sessions, retourner un tableau vide
          return []
        }
        // Filtrer les livrets qui ont une session assignée à l'enseignant OU qui n'ont pas de session (livrets indépendants)
        // Note: On garde les livrets sans session pour permettre à l'enseignant de voir ses propres livrets créés
        const ids = teacherSessionIds.filter((id): id is string => typeof id === 'string')
        query = query.or(`session_id.in.(${ids.join(',')}),session_id.is.null`)
      }

      const { data, error } = await query

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          logger.debug('Table learning_portfolios n\'existe pas encore')
          return []
        }
        logger.error('Erreur récupération portfolios:', error)
        return []
      }
      
      // Pour les enseignants, filtrer aussi côté client pour s'assurer que seuls les livrets des sessions assignées sont inclus
      if (isTeacher && teacherSessionIds && teacherSessionIds.length > 0) {
        const ids = teacherSessionIds.filter((id): id is string => typeof id === 'string')
        return (data || []).filter((p: { session_id?: string | null }) => 
          !p.session_id || (typeof p.session_id === 'string' && ids.includes(p.session_id))
        )
      }
      
      return data || []
    },
    enabled: !!user?.organization_id && (!isTeacher || (isTeacher && teacherSessionIds !== undefined)),
  })

  // Récupérer les sessions pour le filtre
  // Pour les enseignants, filtrer uniquement par leurs sessions assignées
  const { data: sessions } = useQuery({
    queryKey: ['sessions-filter-portfolios', user?.organization_id, isTeacher, teacherSessionIds],
    queryFn: async () => {
      if (!user?.organization_id) return []
      
      let query = supabase
        .from('sessions')
        .select('id, name, formations!inner(organization_id)')
        .eq('formations.organization_id', user.organization_id)
        .order('start_date', { ascending: false })
      
      // Filtrer par les sessions de l'enseignant si applicable
      if (isTeacher && teacherSessionIds && teacherSessionIds.length > 0) {
        const ids = teacherSessionIds.filter((id): id is string => typeof id === 'string')
        query = query.in('id', ids)
      } else if (isTeacher) {
        // Si l'enseignant n'a pas de sessions, retourner un tableau vide
        return []
      }
      
      const { data, error } = await query
      if (error) return []
      return data || []
    },
    enabled: !!user?.organization_id && (!isTeacher || (isTeacher && teacherSessionIds !== undefined)),
  })

  // Récupérer les templates
  const { data: templates } = useQuery({
    queryKey: ['portfolio-templates', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('learning_portfolio_templates')
        .select('*')
        .eq('organization_id', user.organization_id)
        .eq('is_active', true)
      if (error) {
        logger.debug('Table learning_portfolio_templates n\'existe pas encore')
        return []
      }
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  // Filtrer les portfolios
  const filteredPortfolios = portfolios?.filter((p) => {
    const matchesSearch = 
      p.student?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.student?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.template?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || (p as { status?: string | null }).status === statusFilter
    const matchesSession = sessionFilter === 'all' || (p as { session_id?: string | null }).session_id === sessionFilter
    return matchesSearch && matchesStatus && matchesSession
  })

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      draft: { label: 'Brouillon', variant: 'secondary' },
      in_progress: { label: 'En cours', variant: 'default' },
      completed: { label: 'Terminé', variant: 'outline' },
      validated: { label: 'Validé', variant: 'default' },
    }
    const config = statusConfig[status] || statusConfig.draft
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const stats = {
    total: portfolios?.length || 0,
    draft: portfolios?.filter((p) => (p as { status?: string }).status === 'draft').length || 0,
    inProgress: portfolios?.filter((p) => (p as { status?: string }).status === 'in_progress').length || 0,
    completed: portfolios?.filter((p) => { const s = (p as { status?: string }).status; return s === 'completed' || s === 'validated'; }).length || 0,
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { 
        duration: 0.5, 
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number] as [number, number, number, number]
      }
    }
  }

  return (
    <motion.div
      className="space-y-6 pb-8 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* En-tête */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-blue rounded-2xl shadow-md">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900 tracking-tight">
              Livrets d'apprentissage
            </h1>
            <p className="text-gray-500 font-medium mt-0.5">
              Gérez et suivez les livrets d'apprentissage de vos apprenants
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/evaluations/portfolios/templates">
            <Button variant="outline" className="border-brand-blue/20 hover:border-brand-blue text-brand-blue font-semibold">
              <FileText className="h-4 w-4 mr-2" />
              Modèles
            </Button>
          </Link>
          <Link href="/dashboard/evaluations/portfolios/new">
            <Button className="bg-brand-blue hover:bg-brand-blue-dark text-white font-semibold shadow-md">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau livret
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total livrets', value: stats.total,      icon: BookOpen,    iconCls: 'bg-brand-blue text-white',      accent: 'bg-brand-blue' },
          { label: 'Brouillons',   value: stats.draft,       icon: Edit,        iconCls: 'bg-gray-500 text-white',         accent: 'bg-gray-400' },
          { label: 'En cours',     value: stats.inProgress,  icon: Clock,       iconCls: 'bg-brand-cyan-dark text-white',  accent: 'bg-brand-cyan' },
          { label: 'Complétés',    value: stats.completed,   icon: CheckCircle2,iconCls: 'bg-brand-blue-dark text-white',  accent: 'bg-brand-blue-dark' },
        ].map((stat, i) => (
          <motion.div key={stat.label} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className={cn('p-2.5 rounded-xl', stat.iconCls)}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <span className="text-3xl font-display font-bold text-gray-900">{stat.value}</span>
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{stat.label}</p>
              <div className={cn('h-1 rounded-full opacity-60', stat.accent)} />
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Filtres */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="premium" className="p-5 border border-gray-100">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un apprenant ou un modèle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 border-gray-200 focus:border-brand-blue rounded-xl"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 hover:border-brand-blue/40 focus:border-brand-blue rounded-xl text-sm font-medium text-gray-700 transition-colors h-10 bg-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="draft">Brouillon</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminé</option>
              <option value="validated">Validé</option>
            </select>
            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 hover:border-brand-blue/40 focus:border-brand-blue rounded-xl text-sm font-medium text-gray-700 transition-colors h-10 bg-white"
            >
              <option value="all">Toutes les sessions</option>
              {sessions?.map((s: { id: string; name?: string }) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </GlassCard>
      </motion.div>

      {/* Liste des livrets */}
      {isLoading ? (
        <motion.div variants={itemVariants} className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-brand-blue mb-4" />
            <p className="text-gray-500 font-medium">Chargement des livrets...</p>
          </div>
        </motion.div>
      ) : filteredPortfolios?.length === 0 ? (
        <motion.div variants={itemVariants}>
          <GlassCard variant="premium" className="py-16 text-center border border-gray-100">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-display font-bold text-gray-900 mb-2">
              Aucun livret d'apprentissage
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {templates?.length === 0
                ? 'Commencez par créer un modèle de livret, puis créez des livrets pour vos apprenants.'
                : 'Créez un nouveau livret pour commencer à suivre la progression de vos apprenants.'}
            </p>
            {templates?.length === 0 ? (
              <Link href="/dashboard/evaluations/portfolios/templates/new">
                <Button className="bg-brand-blue hover:bg-brand-blue-dark text-white font-semibold shadow-md px-6">
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un modèle
                </Button>
              </Link>
            ) : (
              <Link href="/dashboard/evaluations/portfolios/new">
                <Button className="bg-brand-blue hover:bg-brand-blue-dark text-white font-semibold shadow-md px-6">
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un livret
                </Button>
              </Link>
            )}
          </GlassCard>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPortfolios?.map((portfolio, index) => {
            const p = portfolio as typeof portfolio & { progress_percentage?: number; updated_at?: string; is_visible_to_student?: boolean; pdf_url?: string; template?: { name?: string; primary_color?: string } }
            return (
              <motion.div
                key={portfolio.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                whileHover={{ y: -4 }}
              >
                <GlassCard variant="premium" className="h-full border border-gray-100 hover:border-brand-blue/25 transition-all duration-300 shadow-sm hover:shadow-md">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                          style={{ backgroundColor: p.template?.primary_color || '#274472' }}
                        >
                          {portfolio.student?.first_name?.[0]}{portfolio.student?.last_name?.[0]}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 hover:text-brand-blue transition-colors text-sm leading-tight">
                            {portfolio.student?.first_name} {portfolio.student?.last_name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {portfolio.template?.name}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(portfolio.status ?? 'draft')}
                    </div>

                    {portfolio.session && (
                      <div className="flex items-center gap-2 text-xs text-gray-600 mb-4 bg-brand-blue-ghost rounded-lg px-3 py-2">
                        <Calendar className="h-3.5 w-3.5 text-brand-blue shrink-0" />
                        <span className="font-medium truncate">{portfolio.session.name}</span>
                      </div>
                    )}

                    {/* Barre de progression */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-1.5">
                        <span>Progression</span>
                        <span className="text-brand-blue">{Math.round(p.progress_percentage ?? 0)}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-brand-blue rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${p.progress_percentage ?? 0}%` }}
                          transition={{ duration: 0.7, ease: "easeOut" }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                      <span>Modifié le {formatDate(p.updated_at ?? '')}</span>
                      {p.is_visible_to_student && (
                        <span className="flex items-center gap-1 text-brand-blue font-semibold">
                          <Eye className="h-3 w-3" />
                          Visible
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      <Link href={`/dashboard/evaluations/portfolios/${portfolio.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full border-gray-200 hover:border-brand-blue hover:text-brand-blue font-semibold text-xs">
                          <Edit className="h-3.5 w-3.5 mr-1.5" />
                          Modifier
                        </Button>
                      </Link>
                      <Link href={`/dashboard/evaluations/portfolios/${portfolio.id}/preview`}>
                        <Button variant="ghost" size="sm" className="hover:bg-brand-blue-ghost hover:text-brand-blue">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {p.pdf_url && (
                        <a href={p.pdf_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="hover:bg-brand-blue-ghost hover:text-brand-blue">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

