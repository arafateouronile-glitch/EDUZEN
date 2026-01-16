'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { studentService } from '@/lib/services/student.service'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Search, Download, Filter, X, Mail, Phone, Calendar, Users, UserCheck, UserX } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { exportToExcel } from '@/lib/utils/excel-export'
import { Pagination } from '@/components/ui/pagination'
import { useToast } from '@/components/ui/toast'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { Skeleton } from '@/components/ui/skeleton'
import { BounceOnHover, PulseOnMount } from '@/components/ui/micro-interactions'
import { Avatar } from '@/components/ui/avatar'
import type { StudentWithRelations, SessionWithRelations } from '@/lib/types/query-types'
import { cn } from '@/lib/utils'

export default function StudentsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const { addToast } = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sessionFilter, setSessionFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

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

  const { data: students, isLoading } = useQuery({
    queryKey: ['students', user?.organization_id, search, statusFilter, sessionFilter],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const result = await studentService.getAll(user.organization_id, { search })
      let studentsData = result.data || []
      
      // Filtrer par statut
      if (statusFilter !== 'all') {
        studentsData = (studentsData as StudentWithRelations[]).filter((s) => s.status === statusFilter)
      }

      // Filtrer par session
      if (sessionFilter !== 'all') {
        studentsData = (studentsData as StudentWithRelations[]).filter((s) => s.class_id === sessionFilter)
      }

      return studentsData
    },
    enabled: !!user?.organization_id,
  })

  // Pagination côté client
  const totalItems = students?.length || 0
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedStudents = students?.slice(startIndex, endIndex) || []

  // Réinitialiser à la page 1 quand les filtres changent
  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, sessionFilter])

  // Calculer les statistiques (sur tous les étudiants filtrés, pas seulement la page)
  const stats = students ? {
    total: students.length,
    active: (students as StudentWithRelations[]).filter((s) => s.status === 'active').length,
    inactive: (students as StudentWithRelations[]).filter((s) => s.status === 'inactive').length,
  } : null

  const handleExport = async () => {
    if (!students || students.length === 0) {
      addToast({
        type: 'warning',
        title: 'Aucun élève',
        description: 'Aucun élève à exporter.',
      })
      return
    }

    try {
      const exportData = (students as StudentWithRelations[]).map((student) => ({
        'Numéro': student.student_number || '',
        'Prénom': student.first_name || '',
        'Nom': student.last_name || '',
        'Email': student.email || '',
        'Téléphone': student.phone || '',
        'Date de naissance': student.date_of_birth ? formatDate(student.date_of_birth) : '',
        'Statut': student.status === 'active' ? 'Actif' : 'Inactif',
        'Date d\'inscription': student.enrollment_date ? formatDate(student.enrollment_date) : '',
      }))

      await exportToExcel({
        filename: `eleves_${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Élèves',
        columns: [
          { header: 'Numéro', key: 'Numéro', width: 12 },
          { header: 'Prénom', key: 'Prénom', width: 15 },
          { header: 'Nom', key: 'Nom', width: 15 },
          { header: 'Email', key: 'Email', width: 30 },
          { header: 'Téléphone', key: 'Téléphone', width: 15 },
          { header: 'Date de naissance', key: 'Date de naissance', width: 15 },
          { header: 'Statut', key: 'Statut', width: 10 },
          { header: 'Date d\'inscription', key: 'Date d\'inscription', width: 15 },
        ],
        data: exportData,
      })

      addToast({
        type: 'success',
        title: 'Export réussi',
        description: `${students.length} élève(s) exporté(s) avec succès.`,
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Erreur lors de l\'export des données.',
      })
    }
  }

  return (
    <div className="space-y-6 p-6 fade-in">
      {/* Header Premium */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-gradient-primary mb-3">
            Élèves
          </h1>
          <p className="text-base md:text-lg text-muted-foreground font-medium">
            Gérez tous vos élèves et leurs informations
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Link href="/dashboard/students/new">
            <Button variant="gradient" size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Nouvel élève
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      {/* Statistiques Premium */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="grid grid-cols-1 gap-6 sm:grid-cols-3"
        >
          {[
            { title: 'Total', value: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
            { title: 'Actifs', value: stats.active, icon: UserCheck, color: 'text-success-primary', bg: 'bg-success-bg' },
            { title: 'Inactifs', value: stats.inactive, icon: UserX, color: 'text-red-600', bg: 'bg-red-100' },
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              whileHover={{ y: -4, scale: 1.02 }}
            >
              <Card variant="premium" hoverable className="h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                      <p className={cn('text-3xl font-bold', stat.color)}>{stat.value}</p>
                    </div>
                    <motion.div
                      animate={{ rotate: [0, -5, 5, -5, 0] }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity, 
                        repeatDelay: 3,
                        ease: "easeInOut"
                      }}
                      className={cn('p-3 rounded-xl', stat.bg)}
                    >
                      <stat.icon className={cn('h-6 w-6', stat.color)} />
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Search and Filters Premium */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card variant="premium">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Premium */}
              <motion.div
                className="flex-1 relative"
                animate={{
                  scale: [1, 1.01, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatDelay: 5,
                }}
              >
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Rechercher un élève..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50/50 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white focus:shadow-lg focus:shadow-primary/10"
                />
              </motion.div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="relative"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filtres
                  {(statusFilter !== 'all' || sessionFilter !== 'all') && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 h-5 w-5 bg-primary text-white text-xs rounded-full flex items-center justify-center"
                    >
                      1
                    </motion.span>
                  )}
                </Button>
                <Button variant="outline" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Exporter
                </Button>
              </div>
            </div>

            {/* Filters Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden mt-4 pt-4 border-t border-gray-200"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Statut</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300"
                      >
                        <option value="all">Tous</option>
                        <option value="active">Actif</option>
                        <option value="inactive">Inactif</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Session</label>
                      <select
                        value={sessionFilter}
                        onChange={(e) => setSessionFilter(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300"
                      >
                        <option value="all">Toutes</option>
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
          </CardContent>
        </Card>
      </motion.div>

      {/* Students List Premium */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Card variant="premium">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold">
                Liste des élèves ({totalItems})
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                Page {currentPage} sur {totalPages}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : paginatedStudents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Aucun élève trouvé</p>
                <p className="text-sm mt-2">
                  {search || statusFilter !== 'all' || sessionFilter !== 'all'
                    ? 'Aucun élève ne correspond à vos critères de recherche.'
                    : 'Commencez par ajouter votre premier élève.'}
                </p>
                {!search && statusFilter === 'all' && sessionFilter === 'all' && (
                  <Link href="/dashboard/students/new">
                    <Button variant="gradient" className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter un élève
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {paginatedStudents.map((student, index) => {
                    const s = student as StudentWithRelations
                    return (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        layout
                        whileHover={{ y: -4, scale: 1.01 }}
                      >
                        <Link href={`/dashboard/students/${s.id}`}>
                          <Card variant="outlined" hoverable className="cursor-pointer transition-all duration-300 hover:border-primary/50 hover:shadow-md">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4 flex-1">
                                  {/* Avatar Premium avec couleurs intelligentes */}
                                  <motion.div whileHover={{ scale: 1.05 }}>
                                    <Avatar
                                      fallback={`${s.first_name || ''} ${s.last_name || ''}`}
                                      userId={s.id}
                                      size="lg"
                                      variant="auto"
                                      className="shadow-lg rounded-xl"
                                    />
                                  </motion.div>

                                  {/* Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-semibold text-lg text-gray-900 truncate">
                                        {s.first_name} {s.last_name}
                                      </h3>
                                      <span className={cn(
                                        'px-2 py-0.5 rounded-full text-xs font-medium',
                                        s.status === 'active'
                                          ? 'bg-success-bg text-success-primary'
                                          : 'bg-gray-100 text-gray-800'
                                      )}>
                                        {s.status === 'active' ? 'Actif' : 'Inactif'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                      {s.student_number && (
                                        <span className="font-mono">#{s.student_number}</span>
                                      )}
                                      {s.email && (
                                        <div className="flex items-center gap-1">
                                          <Mail className="h-3 w-3" />
                                          <span className="truncate">{s.email}</span>
                                        </div>
                                      )}
                                      {s.phone && (
                                        <div className="flex items-center gap-1">
                                          <Phone className="h-3 w-3" />
                                          <span>{s.phone}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 ml-4">
                                  <Button variant="ghost" size="icon" onClick={(e) => {
                                    e.preventDefault()
                                    // Actions
                                  }}>
                                    <Calendar className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* Pagination Premium */}
            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6 pt-4 border-t border-gray-200"
              >
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={totalItems}
                  onItemsPerPageChange={setItemsPerPage}
                />
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
