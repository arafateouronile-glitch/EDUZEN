'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { studentService } from '@/lib/services/student.service'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid'
import { Plus, Search, Download, Filter, Mail, Phone, Calendar, Users, UserCheck, UserX, Sparkles, SlidersHorizontal, ArrowUpRight, Link as LinkIcon, Copy, Check, FileSpreadsheet, FileText, Upload } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { exportData, prepareStudentsExport, type ExportFormat } from '@/lib/utils/export'
import { Pagination } from '@/components/ui/pagination'
import { useToast } from '@/components/ui/toast'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { Avatar } from '@/components/ui/avatar'
import type { StudentWithRelations } from '@/lib/types/query-types'
import { useVocabulary } from '@/lib/hooks/use-vocabulary'
import { CardTitle } from '@/components/ui/card'
import { RoleGuard, ADMIN_ROLES } from '@/components/auth/role-guard'
import { SkeletonBentoGrid } from '@/components/ui/skeleton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { StudentImportDialog } from '@/components/students/student-import-dialog'

export default function StudentsPage() {
  return (
    <RoleGuard allowedRoles={ADMIN_ROLES}>
      <StudentsPageContent />
    </RoleGuard>
  )
}

function StudentsPageContent() {
  const { user } = useAuth()
  const supabase = createClient()
  const { addToast } = useToast()
  const vocab = useVocabulary()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sessionFilter, setSessionFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12) // Réduit pour Bento Grid
  const [copiedLinks, setCopiedLinks] = useState<Record<string, boolean>>({})
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  // Récupérer les sessions pour le filtre
  const { data: sessions } = useQuery({
    queryKey: ['sessions-for-filter', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name, start_date, formations!inner(id, name, organization_id, programs(id, name))')
        .eq('formations.organization_id', user.organization_id)
        .order('start_date', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['students', user?.organization_id, search, statusFilter, sessionFilter, currentPage],
    queryFn: async () => {
      if (!user?.organization_id) {
        return { data: [], total: 0, page: 1, limit: itemsPerPage, totalPages: 0 }
      }
      
      const result = await studentService.getAll(user.organization_id, {
        search,
        status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
        classId: sessionFilter !== 'all' ? sessionFilter : undefined,
        page: currentPage,
        limit: itemsPerPage,
      })

      return result
    },
    enabled: !!user?.organization_id,
  })

  // Pagination côté serveur
  const students = studentsData?.data || []
  const totalItems = studentsData?.total || 0
  const totalPages = studentsData?.totalPages || 0
  const paginatedStudents = students

  // Réinitialiser à la page 1 quand les filtres changent
  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, sessionFilter])

  // Calculer les statistiques (nécessite une requête séparée pour le total)
  const { data: stats } = useQuery({
    queryKey: ['students-stats', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      
      const [allResult, activeResult, inactiveResult] = await Promise.all([
        studentService.getAll(user.organization_id, { limit: 1 }),
        studentService.getAll(user.organization_id, { status: 'active', limit: 1 }),
        studentService.getAll(user.organization_id, { status: 'inactive', limit: 1 }),
      ])

      return {
        total: allResult.total || 0,
        active: activeResult.total || 0,
        inactive: inactiveResult.total || 0,
      }
    },
    enabled: !!user?.organization_id,
  })

  const [exportFormat, setExportFormat] = useState<ExportFormat>('xlsx')

  const handleExport = async (format: ExportFormat = 'xlsx') => {
    if (!students || students.length === 0) {
      addToast({
        type: 'warning',
        title: `Aucun ${vocab.student.toLowerCase()}`,
        description: `Aucun ${vocab.student.toLowerCase()} à exporter.`,
      })
      return
    }

    try {
      const exportDataPrepared = prepareStudentsExport(students as StudentWithRelations[])
      await exportData(exportDataPrepared, {
        filename: `eleves_${new Date().toISOString().split('T')[0]}`,
        sheetName: vocab.students,
        format,
        entityType: 'students',
        organizationId: user?.organization_id || undefined,
        userId: user?.id,
      })

      addToast({
        type: 'success',
        title: 'Export réussi',
        description: `${students.length} ${vocab.student.toLowerCase()}(s) exporté(s) en ${format.toUpperCase()} avec succès.`,
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur d\'export',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'export.',
      })
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }
    }
  }

  return (
    <motion.div 
      className="space-y-8 pb-8 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Premium */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl shadow-lg">
              <Users className="h-7 w-7 text-white" />
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">
                {vocab.students}
              </h1>
              <span className="px-3 py-1 bg-gradient-to-r from-brand-blue-ghost to-brand-cyan-ghost text-brand-blue rounded-full text-sm font-medium border border-brand-blue/20">
                {totalItems} total
              </span>
            </div>
          </div>
          <p className="text-gray-600 text-sm lg:text-base ml-1">
            Gérez tous vos {vocab.students.toLowerCase()} et leurs informations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="hover:bg-brand-blue-ghost hover:border-brand-blue/30 hover:text-brand-blue transition-all">
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleExport('xlsx')} className="cursor-pointer">
                <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                <span>Excel (.xlsx)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')} className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4 text-brand-blue" />
                <span>CSV (.csv)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            onClick={() => setImportDialogOpen(true)}
            className="hover:bg-brand-cyan-ghost hover:border-brand-cyan/30 hover:text-brand-cyan transition-all"
          >
            <Upload className="mr-2 h-4 w-4" />
            Importer
          </Button>
          <Link href="/dashboard/students/new">
            <Button className="bg-gradient-to-r from-brand-blue to-brand-cyan hover:from-brand-blue-dark hover:to-brand-cyan shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau {vocab.student}
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Statistiques Premium */}
      {stats && (
        <BentoGrid columns={3} gap="md">
          {[
            {
              title: 'Total',
              value: stats.total,
              icon: Users,
              color: 'text-brand-blue',
              bg: 'bg-gradient-to-br from-brand-blue-ghost to-brand-blue-ghost/50',
              borderColor: 'border-brand-blue/20',
              desc: `Tous les ${vocab.students.toLowerCase()}`
            },
            {
              title: 'Actifs',
              value: stats.active,
              icon: UserCheck,
              color: 'text-brand-cyan',
              bg: 'bg-gradient-to-br from-brand-cyan-ghost to-brand-cyan-ghost/50',
              borderColor: 'border-brand-cyan/20',
              desc: 'En cours de formation'
            },
            {
              title: 'Inactifs',
              value: stats.inactive,
              icon: UserX,
              color: 'text-gray-500',
              bg: 'bg-gradient-to-br from-gray-50 to-gray-100',
              borderColor: 'border-gray-200',
              desc: 'Archives ou suspendus'
            },
          ].map((stat, index) => (
            <BentoCard key={stat.title} span={1}>
              <GlassCard
                variant="premium"
                hoverable
                className={cn("h-full p-6 border-2 transition-all duration-300", stat.borderColor)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{stat.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.desc}</p>
                  </div>
                  <motion.div
                    className={cn("p-3 rounded-xl transition-all duration-300 border", stat.bg, stat.borderColor)}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                  </motion.div>
                </div>
                <div className={cn("text-3xl font-bold tracking-tight",
                  index === 0 ? "text-brand-blue" :
                  index === 1 ? "text-brand-cyan" :
                  "text-gray-600")}>
                  {stat.value}
                </div>
              </GlassCard>
            </BentoCard>
          ))}
        </BentoGrid>
      )}

      {/* Barre de recherche et filtres */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="default" className="p-2 border-2 border-brand-blue/20 bg-gradient-to-br from-brand-blue-ghost/20 to-brand-cyan-ghost/20">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-blue group-focus-within:text-brand-cyan transition-colors" />
              <input
                type="text"
                placeholder={`Rechercher un ${vocab.student.toLowerCase()}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border-2 border-brand-blue/20 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all outline-none text-sm"
              />
            </div>

            <Button
              variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "gap-2 transition-all",
                showFilters ? "bg-gradient-to-r from-brand-blue-ghost to-brand-cyan-ghost text-brand-blue border-2 border-brand-blue/30" : "text-gray-600 hover:bg-brand-blue-ghost hover:text-brand-blue"
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtres
              {(statusFilter !== 'all' || sessionFilter !== 'all') && (
                <span className="w-5 h-5 bg-gradient-to-r from-brand-blue to-brand-cyan text-white text-[10px] font-bold flex items-center justify-center rounded-full ml-1">
                  !
                </span>
              )}
            </Button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-brand-blue/20 mt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-brand-blue uppercase tracking-wider">Statut</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border-2 border-brand-blue/20 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none text-sm transition-all"
                    >
                      <option value="all">Tous les statuts</option>
                      <option value="active">Actif</option>
                      <option value="inactive">Inactif</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-brand-cyan uppercase tracking-wider">Session</label>
                    <select
                      value={sessionFilter}
                      onChange={(e) => setSessionFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border-2 border-brand-cyan/20 focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/10 outline-none text-sm transition-all"
                    >
                      <option value="all">Toutes les sessions</option>
                      {(sessions as any[])?.map((session) => (
                        <option key={session.id} value={session.id}>
                          {session.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>

      {/* Liste des étudiants (Grid Layout) */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <SkeletonBentoGrid items={8} />
        ) : paginatedStudents.length === 0 ? (
          <GlassCard variant="default" className="p-12 text-center border-2 border-brand-blue/20 bg-gradient-to-br from-brand-blue-ghost/30 to-brand-cyan-ghost/30">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost rounded-full opacity-50 blur-2xl"></div>
              </div>
              <div className="relative p-6 bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost rounded-2xl inline-block">
                <Users className="h-16 w-16 mx-auto text-brand-blue" />
              </div>
            </div>
            <div className="space-y-2 mb-6">
              <h3 className="text-xl font-bold text-gray-900">Aucun {vocab.student.toLowerCase()} trouvé</h3>
              <p className="text-gray-600">
                {search || statusFilter !== 'all' || sessionFilter !== 'all'
                  ? 'Essayez de modifier vos filtres de recherche.'
                  : 'Commencez par ajouter votre premier élève.'}
              </p>
            </div>
            {!search && statusFilter === 'all' && sessionFilter === 'all' && (
              <Link href="/dashboard/students/new">
                <Button className="bg-gradient-to-r from-brand-blue to-brand-cyan hover:from-brand-blue-dark hover:to-brand-cyan shadow-md hover:shadow-lg transition-all">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un élève
                </Button>
              </Link>
            )}
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {paginatedStudents.map((student, index) => {
                const s = student as StudentWithRelations
                return (
                  <motion.div
                    key={s.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <GlassCard
                      variant="default"
                      hoverable
                      className="h-full p-5 group flex flex-col justify-between border-2 border-brand-blue/10 hover:border-brand-blue/30 bg-gradient-to-br from-white to-brand-blue-ghost/10 hover:shadow-lg transition-all duration-300"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-4">
                          <Link href={`/dashboard/students/${s.id}`}>
                            <motion.div whileHover={{ scale: 1.05 }} className="cursor-pointer relative">
                              <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/20 to-brand-cyan/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                              <Avatar
                                fallback={`${s.first_name || ''} ${s.last_name || ''}`}
                                userId={s.id}
                                size="lg"
                                variant="auto"
                                className="shadow-md rounded-2xl ring-2 ring-brand-blue/20 group-hover:ring-brand-blue/40 transition-all relative"
                              />
                            </motion.div>
                          </Link>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-brand-blue-ghost transition-all"
                              onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                const accessLink = `${window.location.origin}/learner/access/${s.id}`
                                navigator.clipboard.writeText(accessLink).then(() => {
                                  setCopiedLinks(prev => ({ ...prev, [s.id]: true }))
                                  addToast({
                                    title: 'Lien copié',
                                    description: `Lien d'accès pour ${s.first_name} ${s.last_name} copié`,
                                    type: 'success',
                                  })
                                  setTimeout(() => {
                                    setCopiedLinks(prev => {
                                      const newState = { ...prev }
                                      delete newState[s.id]
                                      return newState
                                    })
                                  }, 2000)
                                }).catch(() => {
                                  addToast({
                                    title: 'Erreur',
                                    description: 'Impossible de copier le lien',
                                    type: 'error',
                                  })
                                })
                              }}
                              title="Copier le lien d'accès"
                            >
                              {copiedLinks[s.id] ? (
                                <Check className="h-4 w-4 text-brand-cyan" />
                              ) : (
                                <LinkIcon className="h-4 w-4 text-gray-400 group-hover:text-brand-blue" />
                              )}
                            </Button>
                            <span className={cn(
                              'px-2.5 py-1 rounded-lg text-xs font-semibold border-2',
                              s.status === 'active'
                                ? 'bg-gradient-to-br from-brand-cyan-ghost to-brand-cyan-ghost/50 text-brand-cyan border-brand-cyan/30'
                                : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-600 border-gray-200'
                            )}>
                              {s.status === 'active' ? 'Actif' : 'Inactif'}
                            </span>
                          </div>
                        </div>

                        <Link href={`/dashboard/students/${s.id}`}>
                          <div className="mb-4">
                            <h3 className="font-bold text-gray-900 truncate text-lg group-hover:text-brand-blue transition-colors">
                              {s.first_name} {s.last_name}
                            </h3>
                            <p className="text-sm text-gray-500 font-mono mt-1">
                              #{s.student_number || '---'}
                            </p>
                          </div>
                        </Link>

                        <div className="space-y-2.5 text-sm">
                          {s.email && (
                            <div className="flex items-center gap-2 truncate group/email">
                              <div className="p-1.5 rounded-lg bg-brand-blue-ghost group-hover/email:bg-brand-blue/20 transition-colors">
                                <Mail className="h-3.5 w-3.5 flex-shrink-0 text-brand-blue" />
                              </div>
                              <span className="truncate text-gray-600">{s.email}</span>
                            </div>
                          )}
                          {s.phone && (
                            <div className="flex items-center gap-2 truncate group/phone">
                              <div className="p-1.5 rounded-lg bg-brand-cyan-ghost group-hover/phone:bg-brand-cyan/20 transition-colors">
                                <Phone className="h-3.5 w-3.5 flex-shrink-0 text-brand-cyan" />
                              </div>
                              <span className="truncate text-gray-600">{s.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <Link href={`/dashboard/students/${s.id}`}>
                        <div className="mt-5 pt-4 border-t border-gray-100 group-hover:border-brand-blue/20 flex items-center justify-between text-xs font-semibold text-gray-400 group-hover:text-brand-blue transition-all cursor-pointer">
                          <span>Voir le dossier</span>
                          <ArrowUpRight className="h-4 w-4 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </div>
                      </Link>
                    </GlassCard>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Pagination Premium */}
      {totalPages > 1 && (
        <motion.div
          variants={itemVariants}
          className="flex justify-center pt-4"
        >
          <GlassCard variant="default" className="px-4 py-2 inline-flex">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={totalItems}
            />
          </GlassCard>
        </motion.div>
      )}

      {/* Dialog d'import */}
      <StudentImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
    </motion.div>
  )
}
