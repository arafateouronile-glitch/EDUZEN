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

export default function PortfoliosPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sessionFilter, setSessionFilter] = useState<string>('all')

  // Récupérer les livrets
  const { data: portfolios, isLoading } = useQuery({
    queryKey: ['learning-portfolios', user?.organization_id, statusFilter, sessionFilter],
    queryFn: async () => {
      if (!user?.organization_id) return []
      
      // Vérifier si la table existe
      const { data, error } = await supabase
        .from('learning_portfolios')
        .select(`
          *,
          template:learning_portfolio_templates(id, name, description, primary_color),
          student:students(id, first_name, last_name, email, photo_url),
          session:sessions(id, name, start_date, end_date, formations(id, name))
        `)
        .eq('organization_id', user.organization_id)
        .order('updated_at', { ascending: false })

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.log('Table learning_portfolios n\'existe pas encore')
          return []
        }
        console.error('Erreur récupération portfolios:', error)
        return []
      }
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les sessions pour le filtre
  const { data: sessions } = useQuery({
    queryKey: ['sessions-filter', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name, formations!inner(organization_id)')
        .eq('formations.organization_id', user.organization_id)
        .order('start_date', { ascending: false })
      if (error) return []
      return data || []
    },
    enabled: !!user?.organization_id,
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
        console.log('Table learning_portfolio_templates n\'existe pas encore')
        return []
      }
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  // Filtrer les portfolios
  const filteredPortfolios = portfolios?.filter((p: any) => {
    const matchesSearch = 
      p.student?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.student?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.template?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    const matchesSession = sessionFilter === 'all' || p.session_id === sessionFilter
    
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
    draft: portfolios?.filter((p: any) => p.status === 'draft').length || 0,
    inProgress: portfolios?.filter((p: any) => p.status === 'in_progress').length || 0,
    completed: portfolios?.filter((p: any) => p.status === 'completed' || p.status === 'validated').length || 0,
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
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
      }
    }
  }

  return (
    <motion.div
      className="space-y-8 pb-8 max-w-[1600px] mx-auto relative"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Animated background particles - effet subtil */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-brand-blue/15 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0, 0.4, 0],
              scale: [0, 1.2, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Hero Header Ultra-Premium avec gradient animé */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-[2rem] shadow-[0_20px_80px_-20px_rgba(51,90,207,0.4)]"
      >
        {/* Gradient de fond animé */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-brand-blue via-brand-blue-light to-brand-cyan"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{ backgroundSize: '200% 200%' }}
        />

        {/* Mesh gradient overlay */}
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: 'radial-gradient(at 40% 20%, rgba(255, 255, 255, 0.3) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(52, 185, 238, 0.4) 0px, transparent 50%)',
        }} />

        {/* Floating orbs */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            x: [-10, 10, -10],
            transition: {
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
          className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"
        />

        {/* Contenu */}
        <div className="relative z-10 p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="flex items-center gap-4"
            >
              <motion.div
                className="p-4 bg-white/15 backdrop-blur-md rounded-2xl shadow-xl border border-white/20"
                whileHover={{ scale: 1.15, rotate: 10 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <BookOpen className="h-8 w-8 text-white drop-shadow-lg" />
              </motion.div>
              <div>
                <h1 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tighter leading-none drop-shadow-2xl">
                  Livrets d'apprentissage
                </h1>
                <p className="text-white/95 text-lg font-medium tracking-tight drop-shadow-lg mt-1">
                  Gérez et suivez les livrets d'apprentissage de vos apprenants
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="flex gap-3"
            >
              <Link href="/dashboard/evaluations/portfolios/templates">
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <Button className="group relative overflow-hidden bg-white/15 backdrop-blur-xl text-white border-2 border-white/40 hover:bg-white/25 hover:border-white/60 transition-all duration-500 font-bold tracking-tight px-6 py-6 text-base shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)]">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      initial={{ x: '-100%' }}
                      whileHover={{ x: '100%' }}
                      transition={{ duration: 0.6 }}
                    />
                    <FileText className="h-5 w-5 mr-2 relative z-10" />
                    <span className="relative z-10">Modèles</span>
                  </Button>
                </motion.div>
              </Link>
              <Link href="/dashboard/evaluations/portfolios/new">
                <motion.div
                  whileHover={{ scale: 1.08, y: -5 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  <Button className="group relative overflow-hidden bg-white text-brand-blue hover:bg-white shadow-[0_20px_60px_-15px_rgba(255,255,255,0.4)] hover:shadow-[0_25px_70px_-15px_rgba(255,255,255,0.6)] transition-all duration-500 font-bold tracking-tight px-7 py-7 text-base border-2 border-white/50">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                      initial={{ x: '-100%' }}
                      whileHover={{ x: '100%' }}
                      transition={{ duration: 0.6 }}
                    />
                    <Plus className="h-5 w-5 mr-2 relative z-10" />
                    <span className="relative z-10">Nouveau livret</span>
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Stats avec animations premium */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
      >
        <motion.div
          whileHover={{ y: -8, scale: 1.03 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          <GlassCard variant="premium" className="relative overflow-hidden p-6 border-2 border-gray-100/50 hover:border-brand-blue/30 transition-all duration-500 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_60px_-15px_rgba(51,90,207,0.3)]">
            <motion.div
              className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'linear-gradient(135deg, rgba(39, 68, 114, 0.03) 0%, transparent 100%)'
              }}
            />
            <div className="relative z-10 flex items-center gap-4">
              <motion.div
                className="p-3 bg-gradient-to-br from-brand-blue to-brand-blue-dark rounded-2xl shadow-lg"
                whileHover={{ rotate: 10, scale: 1.15 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
              >
                <BookOpen className="h-6 w-6 text-white drop-shadow-md" />
              </motion.div>
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total livrets</p>
                <motion.p
                  className="text-4xl font-display font-bold text-gray-900 tracking-tight"
                  whileHover={{ scale: 1.05 }}
                >
                  {stats.total}
                </motion.p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
          whileHover={{ y: -8, scale: 1.03 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          <GlassCard variant="premium" className="relative overflow-hidden p-6 border-2 border-gray-100/50 hover:border-gray-300 transition-all duration-500 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]">
            <motion.div
              className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'linear-gradient(135deg, rgba(107, 114, 128, 0.03) 0%, transparent 100%)'
              }}
            />
            <div className="relative z-10 flex items-center gap-4">
              <motion.div
                className="p-3 bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl shadow-lg"
                whileHover={{ rotate: 10, scale: 1.15 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
              >
                <Edit className="h-6 w-6 text-white drop-shadow-md" />
              </motion.div>
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Brouillons</p>
                <motion.p
                  className="text-4xl font-display font-bold text-gray-900 tracking-tight"
                  whileHover={{ scale: 1.05 }}
                >
                  {stats.draft}
                </motion.p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
          whileHover={{ y: -8, scale: 1.03 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          <GlassCard variant="premium" className="relative overflow-hidden p-6 border-2 border-gray-100/50 hover:border-orange-200 transition-all duration-500 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_60px_-15px_rgba(249,115,22,0.2)]">
            <motion.div
              className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.03) 0%, transparent 100%)'
              }}
            />
            <div className="relative z-10 flex items-center gap-4">
              <motion.div
                className="p-3 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl shadow-lg"
                whileHover={{ rotate: 10, scale: 1.15 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
              >
                <Clock className="h-6 w-6 text-white drop-shadow-md" />
              </motion.div>
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">En cours</p>
                <motion.p
                  className="text-4xl font-display font-bold text-gray-900 tracking-tight"
                  whileHover={{ scale: 1.05 }}
                >
                  {stats.inProgress}
                </motion.p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
          whileHover={{ y: -8, scale: 1.03 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          <GlassCard variant="premium" className="relative overflow-hidden p-6 border-2 border-gray-100/50 hover:border-green-200 transition-all duration-500 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_60px_-15px_rgba(34,197,94,0.2)]">
            <motion.div
              className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.03) 0%, transparent 100%)'
              }}
            />
            <div className="relative z-10 flex items-center gap-4">
              <motion.div
                className="p-3 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl shadow-lg"
                whileHover={{ rotate: 10, scale: 1.15 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
              >
                <CheckCircle2 className="h-6 w-6 text-white drop-shadow-md" />
              </motion.div>
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Complétés</p>
                <motion.p
                  className="text-4xl font-display font-bold text-gray-900 tracking-tight"
                  whileHover={{ scale: 1.05 }}
                >
                  {stats.completed}
                </motion.p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* Filtres premium */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="premium" className="mb-6 p-6 border-2 border-gray-100/50 hover:border-brand-blue/20 transition-all duration-500 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)]">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative group">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                >
                  <Search className="h-5 w-5 text-gray-400 group-hover:text-brand-blue transition-colors" />
                </motion.div>
                <Input
                  placeholder="Rechercher un apprenant ou un modèle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 border-2 border-gray-200 hover:border-brand-blue/30 focus:border-brand-blue transition-all duration-300 rounded-xl font-medium shadow-sm"
                />
              </div>
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border-2 border-gray-200 hover:border-brand-blue/30 focus:border-brand-blue rounded-xl focus:ring-2 focus:ring-brand-blue/20 font-semibold text-gray-700 transition-all duration-300 shadow-sm h-12"
              >
                <option value="all">Tous les statuts</option>
                <option value="draft">Brouillon</option>
                <option value="in_progress">En cours</option>
                <option value="completed">Terminé</option>
                <option value="validated">Validé</option>
              </select>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <select
                value={sessionFilter}
                onChange={(e) => setSessionFilter(e.target.value)}
                className="px-4 py-3 border-2 border-gray-200 hover:border-brand-blue/30 focus:border-brand-blue rounded-xl focus:ring-2 focus:ring-brand-blue/20 font-semibold text-gray-700 transition-all duration-300 shadow-sm h-12"
              >
                <option value="all">Toutes les sessions</option>
                {sessions?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </motion.div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Liste des livrets */}
      {isLoading ? (
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-center py-12"
        >
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mb-4"></div>
            <p className="text-gray-500 font-medium">Chargement des livrets...</p>
          </div>
        </motion.div>
      ) : filteredPortfolios?.length === 0 ? (
        <motion.div variants={itemVariants}>
          <GlassCard variant="premium" className="py-16 text-center border-2 border-gray-100/50">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            </motion.div>
            <h3 className="text-2xl font-display font-bold text-gray-900 mb-3">
              Aucun livret d'apprentissage
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto font-medium">
              {templates?.length === 0
                ? 'Commencez par créer un modèle de livret, puis créez des livrets pour vos apprenants.'
                : 'Créez un nouveau livret pour commencer à suivre la progression de vos apprenants.'}
            </p>
            {templates?.length === 0 ? (
              <Link href="/dashboard/evaluations/portfolios/templates/new">
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button className="group relative overflow-hidden bg-gradient-to-r from-brand-blue to-brand-blue-dark shadow-lg shadow-brand-blue/30 hover:shadow-xl hover:shadow-brand-blue/40 transition-all duration-300 font-bold px-8 py-6">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      initial={{ x: '-100%' }}
                      whileHover={{ x: '100%' }}
                      transition={{ duration: 0.6 }}
                    />
                    <Plus className="h-5 w-5 mr-2 relative z-10" />
                    <span className="relative z-10">Créer un modèle</span>
                  </Button>
                </motion.div>
              </Link>
            ) : (
              <Link href="/dashboard/evaluations/portfolios/new">
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button className="group relative overflow-hidden bg-gradient-to-r from-brand-blue to-brand-blue-dark shadow-lg shadow-brand-blue/30 hover:shadow-xl hover:shadow-brand-blue/40 transition-all duration-300 font-bold px-8 py-6">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      initial={{ x: '-100%' }}
                      whileHover={{ x: '100%' }}
                      transition={{ duration: 0.6 }}
                    />
                    <Plus className="h-5 w-5 mr-2 relative z-10" />
                    <span className="relative z-10">Créer un livret</span>
                  </Button>
                </motion.div>
              </Link>
            )}
          </GlassCard>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPortfolios?.map((portfolio: any, index: number) => (
            <motion.div
              key={portfolio.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <Link href={`/dashboard/evaluations/portfolios/${portfolio.id}`}>
                <GlassCard variant="premium" className="relative overflow-hidden h-full border-2 border-gray-100/50 hover:border-brand-blue/30 transition-all duration-500 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_60px_-15px_rgba(51,90,207,0.3)] cursor-pointer group">
                  {/* Shine effect on hover */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100"
                    initial={{ x: '-100%', y: '-100%' }}
                    whileHover={{ x: '100%', y: '100%' }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    style={{
                      background: 'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)',
                    }}
                  />

                  <div className="relative z-10 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <motion.div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-lg"
                          style={{ backgroundColor: portfolio.template?.primary_color || '#335ACF' }}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                          {portfolio.student?.first_name?.[0]}{portfolio.student?.last_name?.[0]}
                        </motion.div>
                        <div>
                          <h3 className="font-bold text-gray-900 group-hover:text-brand-blue transition-colors">
                            {portfolio.student?.first_name} {portfolio.student?.last_name}
                          </h3>
                          <p className="text-sm text-gray-600 font-medium">
                            {portfolio.template?.name}
                          </p>
                        </div>
                      </div>
                      <motion.div whileHover={{ scale: 1.05 }}>
                        {getStatusBadge(portfolio.status)}
                      </motion.div>
                    </div>

                    {portfolio.session && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4 bg-gray-50 rounded-lg p-3">
                        <Calendar className="h-4 w-4 text-brand-blue" />
                        <span className="font-medium">{portfolio.session.name}</span>
                      </div>
                    )}

                    {/* Barre de progression premium */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm font-bold text-gray-700 mb-2">
                        <span>Progression</span>
                        <motion.span
                          className="text-brand-blue"
                          whileHover={{ scale: 1.1 }}
                        >
                          {Math.round(portfolio.progress_percentage || 0)}%
                        </motion.span>
                      </div>
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                        <motion.div
                          className="h-full bg-gradient-to-r from-brand-blue to-brand-cyan shadow-lg"
                          initial={{ width: 0 }}
                          animate={{ width: `${portfolio.progress_percentage || 0}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-4">
                      <span>Modifié le {formatDate(portfolio.updated_at)}</span>
                      {portfolio.is_visible_to_student && (
                        <motion.span
                          className="flex items-center gap-1 text-green-600 font-bold"
                          whileHover={{ scale: 1.05 }}
                        >
                          <Eye className="h-3 w-3" />
                          Visible
                        </motion.span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                      <motion.div
                        className="flex-1"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => e.preventDefault()}
                      >
                        <Link href={`/dashboard/evaluations/portfolios/${portfolio.id}`} className="block">
                          <Button variant="outline" size="sm" className="w-full border-2 hover:border-brand-blue hover:text-brand-blue font-bold">
                            <Edit className="h-4 w-4 mr-1" />
                            Modifier
                          </Button>
                        </Link>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => e.preventDefault()}
                      >
                        <Link href={`/dashboard/evaluations/portfolios/${portfolio.id}/preview`}>
                          <Button variant="ghost" size="sm" className="hover:bg-brand-blue/10 hover:text-brand-blue">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </motion.div>
                      {portfolio.pdf_url && (
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: -5 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => e.preventDefault()}
                        >
                          <a href={portfolio.pdf_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="hover:bg-green-50 hover:text-green-600">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

