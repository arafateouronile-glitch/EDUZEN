'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from '@/components/ui/motion'
import {
  Users,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Plus,
  X,
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Loader2,
  Building2,
  Briefcase,
  MapPin,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { studentService } from '@/lib/services/student.service.client'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GlassCard } from '@/components/ui/glass-card'
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { enrollmentSchema, type EnrollmentFormData } from '@/lib/validations/schemas'
import type { EnrollmentWithRelations, StudentWithRelations } from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'

type Enrollment = TableRow<'enrollments'>

interface ConfigApprenantsProps {
  sessionId: string
  formationId?: string
  enrollments?: EnrollmentWithRelations[]
  students?: StudentWithRelations[]
  enrollmentForm: {
    student_id: string
    enrollment_date: string
    status: Enrollment['status']
    payment_status: Enrollment['payment_status']
    total_amount: string
    paid_amount: string
    funding_type_id: string
  }
  onEnrollmentFormChange: (form: ConfigApprenantsProps['enrollmentForm']) => void
  onCreateEnrollment: () => void
  createEnrollmentMutation: {
    isPending: boolean
    error: Error | null
  }
  formationPrice?: number
}

export function ConfigApprenants({
  sessionId,
  formationId,
  enrollments = [],
  students = [],
  enrollmentForm,
  onEnrollmentFormChange,
  onCreateEnrollment,
  createEnrollmentMutation,
  formationPrice,
}: ConfigApprenantsProps) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const supabase = createClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false)
  const [showNewStudentForm, setShowNewStudentForm] = useState(false)
  const [searchMode, setSearchMode] = useState<'all' | 'students' | 'entities'>('all')

  // Récupérer les types de financement
  const { data: fundingTypes } = useQuery({
    queryKey: ['funding-types', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('funding_types' as any)
        .select('id, name, code, description')
        .eq('organization_id', user.organization_id)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les candidats de la formation (étudiants inscrits à d'autres sessions de la même formation)
  const { data: formationCandidates } = useQuery({
    queryKey: ['formation-candidates', formationId, user?.organization_id],
    queryFn: async () => {
      if (!formationId || !user?.organization_id) return []

      // Récupérer toutes les sessions de cette formation
      const { data: formationSessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('formation_id', formationId)
        .eq('organization_id', user.organization_id)
        .neq('id', sessionId) // Exclure la session actuelle

      if (!formationSessions || formationSessions.length === 0) return []

      const sessionIds = formationSessions.map((s) => s.id)

      // Récupérer les inscriptions à ces sessions
      const { data: otherEnrollments } = await supabase
        .from('enrollments')
        .select('student_id')
        .in('session_id', sessionIds)
        .in('status', ['confirmed', 'pending'])

      if (!otherEnrollments || otherEnrollments.length === 0) return []

      const candidateStudentIds = [...new Set(otherEnrollments.map((e) => e.student_id).filter((id): id is string => id !== null))]

      // Récupérer les étudiants candidats avec toutes les informations
      const { data: candidates } = await supabase
        .from('students')
        .select(`
          id,
          first_name,
          last_name,
          student_number,
          email,
          phone,
          photo_url,
          date_of_birth,
          gender,
          address,
          city,
          status,
          organization_id
        `)
        .in('id', candidateStudentIds.filter((id): id is string => id !== null))
        .eq('organization_id', user.organization_id)
        .eq('status', 'active')
        .order('last_name', { ascending: true })

      return (candidates || []) as StudentWithRelations[]
    },
    enabled: !!formationId && !!user?.organization_id && !!sessionId,
  })

  // Récupérer tous les étudiants actifs (pour recherche et création)
  const { data: allStudentsResult } = useQuery<{
    data: StudentWithRelations[]
    total: number
    page: number
    limit: number
    totalPages: number
  }>({
    queryKey: ['all-students', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) {
        return { data: [], total: 0, page: 1, limit: 50, totalPages: 0 }
      }
      return studentService.getAll(user.organization_id, { status: 'active' })
    },
    enabled: !!user?.organization_id,
  })

  const allStudents = allStudentsResult?.data || []

  // Récupérer les entités externes (entreprises/organismes)
  const { data: externalEntities } = useQuery({
    queryKey: ['external-entities', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('external_entities')
        .select('*')
        .eq('organization_id', user.organization_id)
        .eq('is_active', true)
        .order('name', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les apprenants rattachés aux entités
  const { data: studentEntities } = useQuery({
    queryKey: ['student-entities-for-session', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id || !externalEntities || externalEntities.length === 0) return []
      
      const entityIds = externalEntities.map((e: any) => e.id)
      
      const { data, error } = await supabase
        .from('student_entities')
        .select('*, students(*), external_entities(*)')
        .in('entity_id', entityIds)
        .eq('is_current', true)
      
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id && !!externalEntities && externalEntities.length > 0,
  })

  // Filtrer les candidats et étudiants (inclure tous les candidats, même ceux déjà inscrits)
  const filteredCandidates = useMemo(() => {
    if (!formationCandidates) return []
    if (!searchQuery) return formationCandidates

    const query = searchQuery.toLowerCase()
    return formationCandidates.filter(
      (student) =>
        student.first_name?.toLowerCase().includes(query) ||
        student.last_name?.toLowerCase().includes(query) ||
        student.student_number?.toLowerCase().includes(query) ||
        student.email?.toLowerCase().includes(query) ||
        student.phone?.toLowerCase().includes(query) ||
        `${student.first_name || ''} ${student.last_name || ''}`.toLowerCase().includes(query)
    )
  }, [formationCandidates, searchQuery])
  
  // Tous les candidats (y compris ceux déjà inscrits pour l'affichage)
  const allCandidates = useMemo(() => {
    return filteredCandidates
  }, [filteredCandidates])

  const filteredAllStudents = useMemo(() => {
    if (!allStudents || !Array.isArray(allStudents)) return []
    if (!searchQuery) return allStudents

    const query = searchQuery.toLowerCase()
    return allStudents.filter(
      (student) =>
        student.first_name?.toLowerCase().includes(query) ||
        student.last_name?.toLowerCase().includes(query) ||
        student.student_number?.toLowerCase().includes(query) ||
        student.email?.toLowerCase().includes(query)
    )
  }, [allStudents, searchQuery])

  // IDs des étudiants déjà inscrits
  const enrolledStudentIds = useMemo(
    () => new Set(enrollments?.map((e) => e.student_id) || []),
    [enrollments]
  )

  // Obtenir les apprenants rattachés à une entité
  const getStudentsForEntity = (entityId: string) => {
    if (!studentEntities) return []
    return studentEntities
      .filter((se: any) => se.entity_id === entityId && se.students)
      .map((se: any) => se.students)
      .filter((s: any) => !enrolledStudentIds.has(s.id))
  }

  // Filtrer les entités externes
  const filteredEntities = useMemo(() => {
    if (!externalEntities || !Array.isArray(externalEntities)) return []
    
    // Filtrer par recherche textuelle
    let filtered = externalEntities
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = externalEntities.filter(
        (entity: any) =>
          entity.name?.toLowerCase().includes(query) ||
          entity.code?.toLowerCase().includes(query) ||
          entity.siret?.toLowerCase().includes(query) ||
          entity.email?.toLowerCase().includes(query) ||
          entity.activity_sector?.toLowerCase().includes(query)
      )
    }
    
    // Filtrer pour ne garder que celles qui ont des apprenants disponibles
    return filtered.filter((entity: any) => {
      const students = getStudentsForEntity(entity.id)
      return students.length > 0
    })
  }, [externalEntities, searchQuery, studentEntities, enrolledStudentIds])

  // Candidats non encore inscrits (pour les boutons d'inscription)
  const availableCandidates = useMemo(
    () => filteredCandidates.filter((c) => !enrolledStudentIds.has(c.id)),
    [filteredCandidates, enrolledStudentIds]
  )
  
  // Candidats déjà inscrits (pour l'affichage)
  const enrolledCandidates = useMemo(
    () => filteredCandidates.filter((c) => enrolledStudentIds.has(c.id)),
    [filteredCandidates, enrolledStudentIds]
  )

  // Tous les étudiants (non candidats) - inclure même ceux déjà inscrits
  const allOtherStudents = useMemo(() => {
    if (!Array.isArray(filteredAllStudents)) return []
    return filteredAllStudents.filter(
      (s) => !formationCandidates?.some((c) => c.id === s.id)
    )
  }, [filteredAllStudents, formationCandidates])
  
  // Étudiants disponibles (non candidats, non inscrits) - pour les boutons d'inscription
  const availableStudents = useMemo(() => {
    return allOtherStudents.filter((s) => !enrolledStudentIds.has(s.id))
  }, [allOtherStudents, enrolledStudentIds])
  
  // Étudiants déjà inscrits (non candidats) - pour l'affichage
  const enrolledOtherStudents = useMemo(() => {
    return allOtherStudents.filter((s) => enrolledStudentIds.has(s.id))
  }, [allOtherStudents, enrolledStudentIds])

  // Gérer l'inscription
  const handleEnrollCandidate = (studentId: string) => {
    onEnrollmentFormChange({
      ...enrollmentForm,
      student_id: studentId,
      enrollment_date: new Date().toISOString().split('T')[0],
      total_amount: formationPrice?.toString() || enrollmentForm.total_amount || '0',
      funding_type_id: enrollmentForm.funding_type_id || '',
    })
    setShowEnrollmentForm(true)
  }

  const handleSubmitEnrollment = async () => {
    try {
      enrollmentSchema.parse({
        ...enrollmentForm,
        session_id: sessionId,
      })
      onCreateEnrollment()
    } catch (error) {
      if (error instanceof Error || (error as any).errors) {
        const zodErrors = (error as any).errors || []
        const errorMessages = zodErrors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
        addToast({
          type: 'error',
          title: 'Erreur de validation',
          description: errorMessages,
        })
      }
    }
  }

  // Statistiques
  const stats = useMemo(() => {
    const enrolled = enrollments?.length || 0
    const candidates = formationCandidates?.length || 0
    const available = availableCandidates.length
    const enrolledFromCandidates = enrolledCandidates.length
    return { enrolled, candidates, available, enrolledFromCandidates }
  }, [enrollments, formationCandidates, availableCandidates, enrolledCandidates])

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <BentoGrid columns={3} gap="md">
        <BentoCard span={1}>
          <GlassCard variant="premium" hoverable className="h-full p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-brand-blue-ghost rounded-xl">
                <Users className="h-4 w-4 text-brand-blue" />
              </div>
              <span className="text-2xl font-bold text-brand-blue">{stats.enrolled}</span>
            </div>
            <p className="text-xs font-medium text-gray-600">Inscrits à la session</p>
          </GlassCard>
        </BentoCard>

        <BentoCard span={1}>
          <GlassCard variant="premium" hoverable className="h-full p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-purple-50 rounded-xl">
                <UserPlus className="h-4 w-4 text-purple-600" />
              </div>
              <span className="text-2xl font-bold text-purple-600">{stats.candidates}</span>
            </div>
            <p className="text-xs font-medium text-gray-600">Candidats de la formation</p>
          </GlassCard>
        </BentoCard>

        <BentoCard span={1}>
          <GlassCard variant="premium" hoverable className="h-full p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-green-50 rounded-xl">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-2xl font-bold text-green-600">{stats.available}</span>
            </div>
            <p className="text-xs font-medium text-gray-600">Disponibles</p>
          </GlassCard>
        </BentoCard>
      </BentoGrid>

      {/* Recherche */}
      <GlassCard variant="default" className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un apprenant, une entreprise ou un organisme..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={() => {
                setShowNewStudentForm(true)
              }}
              className="shadow-lg shadow-brand-blue/20"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvel étudiant
            </Button>
          </div>
          
          {/* Filtres de recherche */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Filtrer par :</span>
            <div className="flex gap-2">
              <Button
                variant={searchMode === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchMode('all')}
              >
                Tout
              </Button>
              <Button
                variant={searchMode === 'students' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchMode('students')}
              >
                <Users className="h-3 w-3 mr-1" />
                Apprenants
              </Button>
              <Button
                variant={searchMode === 'entities' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchMode('entities')}
              >
                <Building2 className="h-3 w-3 mr-1" />
                Entreprises/Organismes
              </Button>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Candidats de la formation */}
      {formationId && (searchMode === 'all' || searchMode === 'students') && (
        <GlassCard variant="premium" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-purple-600" />
                Candidats de la formation
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Étudiants inscrits à d'autres sessions de cette formation
              </p>
            </div>
            <Badge variant="outline" className="text-purple-600 border-purple-200">
              {allCandidates.length} candidat{allCandidates.length > 1 ? 's' : ''}
            </Badge>
          </div>

          {allCandidates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                {searchQuery
                  ? 'Aucun candidat trouvé avec ce critère'
                  : 'Aucun candidat disponible pour cette formation'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Candidats disponibles (non inscrits) */}
              {availableCandidates.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Disponibles ({availableCandidates.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableCandidates.map((candidate) => {
                      const firstName = candidate.first_name || ''
                      const lastName = candidate.last_name || ''
                      const studentNumber = candidate.student_number || ''
                      const email = candidate.email || ''
                      const phone = candidate.phone || ''

                      return (
                        <motion.div
                          key={candidate.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all bg-white"
                        >
                          <div className="flex items-start gap-3">
                            <Avatar
                              fallback={`${firstName[0] || ''}${lastName[0] || ''}`}
                              userId={candidate.id}
                              size="md"
                              src={candidate.photo_url || undefined}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate">
                                    {firstName} {lastName}
                                  </p>
                                  {studentNumber && (
                                    <p className="text-xs text-gray-500 mt-0.5 font-mono">
                                      #{studentNumber}
                                    </p>
                                  )}
                                </div>
                                <Badge variant="outline" className="text-xs border-purple-200 text-purple-600 flex-shrink-0">
                                  Candidat
                                </Badge>
                              </div>
                              <div className="mt-2 space-y-1">
                                {email && (
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Mail className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{email}</span>
                                  </div>
                                )}
                                {phone && (
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Phone className="h-3 w-3 flex-shrink-0" />
                                    <span>{phone}</span>
                                  </div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                className="w-full mt-3"
                                onClick={() => handleEnrollCandidate(candidate.id)}
                                disabled={createEnrollmentMutation.isPending}
                              >
                                <UserPlus className="h-3 w-3 mr-1" />
                                Inscrire
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )}
              
              {/* Candidats déjà inscrits */}
              {enrolledCandidates.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Déjà inscrits ({enrolledCandidates.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {enrolledCandidates.map((candidate) => {
                      const firstName = candidate.first_name || ''
                      const lastName = candidate.last_name || ''
                      const studentNumber = candidate.student_number || ''
                      const email = candidate.email || ''
                      const phone = candidate.phone || ''

                      return (
                        <motion.div
                          key={candidate.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-lg border border-gray-200 bg-gray-50 opacity-75"
                        >
                          <div className="flex items-start gap-3">
                            <Avatar
                              fallback={`${firstName[0] || ''}${lastName[0] || ''}`}
                              userId={candidate.id}
                              size="md"
                              src={candidate.photo_url || undefined}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate">
                                    {firstName} {lastName}
                                  </p>
                                  {studentNumber && (
                                    <p className="text-xs text-gray-500 mt-0.5 font-mono">
                                      #{studentNumber}
                                    </p>
                                  )}
                                </div>
                                <Badge variant="outline" className="text-xs border-green-200 text-green-600 flex-shrink-0">
                                  Inscrit
                                </Badge>
                              </div>
                              <div className="mt-2 space-y-1">
                                {email && (
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Mail className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{email}</span>
                                  </div>
                                )}
                                {phone && (
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Phone className="h-3 w-3 flex-shrink-0" />
                                    <span>{phone}</span>
                                  </div>
                                )}
                              </div>
                              <div className="mt-3 text-xs text-gray-500 text-center">
                                Déjà inscrit à cette session
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </GlassCard>
      )}

      {/* Entreprises et organismes - Afficher uniquement lors de la recherche */}
      {(searchMode === 'all' || searchMode === 'entities') && searchQuery && filteredEntities.length > 0 && (
        <GlassCard variant="premium" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-orange-600" />
                Entreprises & Organismes
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Recherche dans les entités externes
              </p>
            </div>
            <Badge variant="outline" className="text-orange-600 border-orange-200">
              {filteredEntities.length} trouvé{filteredEntities.length > 1 ? 's' : ''}
            </Badge>
          </div>

          <div className="space-y-4">
            {filteredEntities.map((entity: any) => {
              const entityStudents = getStudentsForEntity(entity.id)
              const getTypeLabel = (type: string) => {
                const labels: Record<string, string> = {
                  company: 'Entreprise',
                  organization: 'Organisme',
                  institution: 'Établissement',
                  partner: 'Partenaire',
                  other: 'Autre',
                }
                return labels[type] || type
              }

              return (
                <motion.div
                  key={entity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg border border-orange-200 bg-orange-50/30"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">{entity.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {getTypeLabel(entity.type)}
                            </Badge>
                            {entity.siret && (
                              <span className="text-xs text-gray-500">SIRET: {entity.siret}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {(entity.email || entity.phone || entity.address) && (
                        <div className="mt-2 space-y-1 text-xs text-gray-600">
                          {entity.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {entity.email}
                            </div>
                          )}
                          {entity.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {entity.phone}
                            </div>
                          )}
                          {entity.address && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {entity.address}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Apprenants rattachés à cette entité */}
                  {(() => {
                    const entityStudents = getStudentsForEntity(entity.id)
                    return entityStudents.length > 0 ? (
                      <div className="mt-3 pt-3 border-t border-orange-200">
                        <p className="text-xs font-medium text-gray-700 mb-2">
                          {entityStudents.length} apprenant{entityStudents.length > 1 ? 's' : ''} rattaché{entityStudents.length > 1 ? 's' : ''}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {entityStudents.map((student: any) => (
                            <div
                              key={student.id}
                              className="p-2 rounded border border-gray-200 bg-white hover:border-brand-blue-300 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {student.first_name} {student.last_name}
                                  </p>
                                  {student.student_number && (
                                    <p className="text-xs text-gray-500 font-mono">
                                      #{student.student_number}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEnrollCandidate(student.id)}
                                  disabled={createEnrollmentMutation.isPending}
                                  className="ml-2 flex-shrink-0"
                                >
                                  <UserPlus className="h-3 w-3 mr-1" />
                                  Inscrire
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 pt-3 border-t border-orange-200">
                        <p className="text-xs text-gray-500 text-center">
                          Aucun apprenant disponible rattaché à cette entité
                        </p>
                      </div>
                    )
                  })()}
                </motion.div>
              )
            })}
          </div>
        </GlassCard>
      )}

      {/* Autres étudiants disponibles */}
      {allOtherStudents.length > 0 && (searchMode === 'all' || searchMode === 'students') && (
        <GlassCard variant="default" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-blue" />
                Autres étudiants
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Étudiants actifs de l'organisation
              </p>
            </div>
            <Badge variant="outline" className="text-brand-blue border-brand-blue-200">
              {allOtherStudents.length} trouvé{allOtherStudents.length > 1 ? 's' : ''}
            </Badge>
          </div>

          <div className="space-y-4">
            {/* Étudiants disponibles (non inscrits) */}
            {availableStudents.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Disponibles ({availableStudents.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableStudents.slice(0, 12).map((student) => {
                    const firstName = student.first_name || ''
                    const lastName = student.last_name || ''
                    const studentNumber = student.student_number || ''
                    const email = student.email || ''
                    const phone = student.phone || ''

                    return (
                      <motion.div
                        key={student.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-lg border border-gray-200 hover:border-brand-blue-300 hover:shadow-md transition-all bg-white"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar
                            fallback={`${firstName[0] || ''}${lastName[0] || ''}`}
                            userId={student.id}
                            size="md"
                            src={student.photo_url || undefined}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {firstName} {lastName}
                                </p>
                                {studentNumber && (
                                  <p className="text-xs text-gray-500 mt-0.5 font-mono">
                                    #{studentNumber}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 space-y-1">
                              {email && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Mail className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{email}</span>
                                </div>
                              )}
                              {phone && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Phone className="h-3 w-3 flex-shrink-0" />
                                  <span>{phone}</span>
                                </div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full mt-3"
                              onClick={() => handleEnrollCandidate(student.id)}
                              disabled={createEnrollmentMutation.isPending}
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              Inscrire
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
                {availableStudents.length > 12 && (
                  <p className="text-center text-sm text-gray-500 mt-4">
                    + {availableStudents.length - 12} autre{availableStudents.length - 12 > 1 ? 's' : ''} étudiant{availableStudents.length - 12 > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}
            
            {/* Étudiants déjà inscrits */}
            {enrolledOtherStudents.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Déjà inscrits ({enrolledOtherStudents.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {enrolledOtherStudents.slice(0, 12).map((student) => {
                    const firstName = student.first_name || ''
                    const lastName = student.last_name || ''
                    const studentNumber = student.student_number || ''
                    const email = student.email || ''
                    const phone = student.phone || ''

                    return (
                      <motion.div
                        key={student.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-lg border border-gray-200 bg-gray-50 opacity-75"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar
                            fallback={`${firstName[0] || ''}${lastName[0] || ''}`}
                            userId={student.id}
                            size="md"
                            src={student.photo_url || undefined}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {firstName} {lastName}
                                </p>
                                {studentNumber && (
                                  <p className="text-xs text-gray-500 mt-0.5 font-mono">
                                    #{studentNumber}
                                  </p>
                                )}
                              </div>
                              <Badge variant="outline" className="text-xs border-green-200 text-green-600 flex-shrink-0">
                                Inscrit
                              </Badge>
                            </div>
                            <div className="mt-2 space-y-1">
                              {email && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Mail className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{email}</span>
                                </div>
                              )}
                              {phone && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Phone className="h-3 w-3 flex-shrink-0" />
                                  <span>{phone}</span>
                                </div>
                              )}
                            </div>
                            <div className="mt-3 text-xs text-gray-500 text-center">
                              Déjà inscrit à cette session
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
                {enrolledOtherStudents.length > 12 && (
                  <p className="text-center text-sm text-gray-500 mt-4">
                    + {enrolledOtherStudents.length - 12} autre{enrolledOtherStudents.length - 12 > 1 ? 's' : ''} étudiant{enrolledOtherStudents.length - 12 > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* Apprenants déjà inscrits */}
      {enrollments && enrollments.length > 0 && (
        <GlassCard variant="premium" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Apprenants inscrits
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {enrollments.length} apprenant{enrollments.length > 1 ? 's' : ''} déjà inscrit{enrollments.length > 1 ? 's' : ''} à cette session
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {enrollments.map((enrollment) => {
              // Gérer différents formats de données
              const student = 
                (enrollment as any).students ||
                null
              
              if (!student) {
                // Si pas de données étudiant, afficher au moins l'ID
                return (
                  <motion.div
                    key={enrollment.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-amber-50/50 border border-amber-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-amber-200 flex items-center justify-center">
                        <User className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          Étudiant ID: {enrollment.student_id}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>Inscrit le {formatDate(enrollment.enrollment_date || '')}</span>
                          <Badge
                            variant={
                              enrollment.status === 'confirmed'
                                ? 'default'
                                : enrollment.status === 'pending'
                                ? 'outline'
                                : 'secondary'
                            }
                            className="text-xs"
                          >
                            {enrollment.status === 'confirmed'
                              ? 'Confirmé'
                              : enrollment.status === 'pending'
                              ? 'En attente'
                              : enrollment.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {enrollment.total_amount && parseFloat(String(enrollment.total_amount)) > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {formatCurrency(parseFloat(String(enrollment.total_amount)))}
                        </Badge>
                      )}
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                    </div>
                  </motion.div>
                )
              }

              const firstName = student.first_name || ''
              const lastName = student.last_name || ''
              const studentNumber = student.student_number || ''
              const email = student.email || ''
              const phone = student.phone || ''

              return (
                <motion.div
                  key={enrollment.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-green-50/50 border border-green-200 hover:bg-green-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar
                      fallback={`${firstName[0] || ''}${lastName[0] || ''}`}
                      userId={student.id}
                      size="sm"
                      src={student.photo_url || undefined}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {firstName} {lastName}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                        {studentNumber && (
                          <span className="font-mono">#{studentNumber}</span>
                        )}
                        <span>Inscrit le {formatDate(enrollment.enrollment_date || '')}</span>
                        <Badge
                          variant={
                            enrollment.status === 'confirmed'
                              ? 'default'
                              : enrollment.status === 'pending'
                              ? 'outline'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {enrollment.status === 'confirmed'
                            ? 'Confirmé'
                            : enrollment.status === 'pending'
                            ? 'En attente'
                            : enrollment.status}
                        </Badge>
                      </div>
                      {(email || phone) && (
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                          {email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{email}</span>
                            </div>
                          )}
                          {phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span>{phone}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {enrollment.total_amount && parseFloat(String(enrollment.total_amount)) > 0 && (
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {formatCurrency(parseFloat(String(enrollment.total_amount)))}
                      </Badge>
                    )}
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </GlassCard>
      )}

      {/* Message si aucun apprenant inscrit */}
      {(!enrollments || enrollments.length === 0) && (
        <GlassCard variant="default" className="p-6">
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600 font-medium mb-2">
              Aucun apprenant inscrit
            </p>
            <p className="text-sm text-gray-500">
              Inscrivez des candidats ou des étudiants à cette session pour commencer.
            </p>
          </div>
        </GlassCard>
      )}

      {/* Formulaire d'inscription */}
      <AnimatePresence>
        {showEnrollmentForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <GlassCard variant="premium" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Inscrire un apprenant</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowEnrollmentForm(false)
                    onEnrollmentFormChange({
                      student_id: '',
                      enrollment_date: new Date().toISOString().split('T')[0],
                      status: 'confirmed',
                      payment_status: 'pending',
                      total_amount: formationPrice?.toString() || '0',
                      paid_amount: '0',
                      funding_type_id: '',
                    })
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="enrollment_date">Date d'inscription *</Label>
                    <Input
                      id="enrollment_date"
                      type="date"
                      value={enrollmentForm.enrollment_date}
                      onChange={(e) =>
                        onEnrollmentFormChange({
                          ...enrollmentForm,
                          enrollment_date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Statut *</Label>
                    <select
                      id="status"
                      value={enrollmentForm.status || 'pending'}
                      onChange={(e) =>
                        onEnrollmentFormChange({
                          ...enrollmentForm,
                          status: e.target.value as Enrollment['status'],
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                    >
                      <option value="pending">En attente</option>
                      <option value="confirmed">Confirmé</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="total_amount">Montant total</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="total_amount"
                        type="number"
                        step="0.01"
                        value={enrollmentForm.total_amount}
                        onChange={(e) =>
                          onEnrollmentFormChange({
                            ...enrollmentForm,
                            total_amount: e.target.value,
                          })
                        }
                        className="pl-10"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="paid_amount">Montant payé</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="paid_amount"
                        type="number"
                        step="0.01"
                        value={enrollmentForm.paid_amount}
                        onChange={(e) =>
                          onEnrollmentFormChange({
                            ...enrollmentForm,
                            paid_amount: e.target.value,
                          })
                        }
                        className="pl-10"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="payment_status">Statut de paiement</Label>
                  <select
                    id="payment_status"
                    value={enrollmentForm.payment_status || 'pending'}
                    onChange={(e) =>
                      onEnrollmentFormChange({
                        ...enrollmentForm,
                        payment_status: e.target.value as Enrollment['payment_status'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                  >
                    <option value="pending">En attente</option>
                    <option value="partial">Partiel</option>
                    <option value="paid">Payé</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="funding_type_id">Type de financement</Label>
                  <select
                    id="funding_type_id"
                    value={enrollmentForm.funding_type_id || ''}
                    onChange={(e) =>
                      onEnrollmentFormChange({
                        ...enrollmentForm,
                        funding_type_id: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                  >
                    <option value="">Aucun (financement personnel)</option>
                    {fundingTypes && fundingTypes.length > 0 ? (
                      fundingTypes.map((type: any) => (
                        <option key={type.id} value={type.id}>
                          {type.name} {type.code ? `(${type.code})` : ''}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        Aucun type de financement disponible
                      </option>
                    )}
                  </select>
                  {fundingTypes && fundingTypes.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Créez des types de financement dans les paramètres pour les voir apparaître ici.
                    </p>
                  )}
                </div>

                {createEnrollmentMutation.error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    <p className="text-sm text-red-600">
                      {createEnrollmentMutation.error instanceof Error
                        ? createEnrollmentMutation.error.message
                        : 'Une erreur est survenue'}
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEnrollmentForm(false)
                      onEnrollmentFormChange({
                        student_id: '',
                        enrollment_date: new Date().toISOString().split('T')[0],
                        status: 'confirmed',
                        payment_status: 'pending',
                        total_amount: formationPrice?.toString() || '0',
                        paid_amount: '0',
                        funding_type_id: '',
                      })
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSubmitEnrollment}
                    disabled={createEnrollmentMutation.isPending || !enrollmentForm.student_id}
                    className="shadow-lg shadow-brand-blue/20"
                  >
                    {createEnrollmentMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Inscription...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Inscrire
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message si pas de formation */}
      {!formationId && (
        <GlassCard variant="default" className="p-6">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-amber-500" />
            <p className="text-gray-600 font-medium mb-2">
              Aucune formation sélectionnée
            </p>
            <p className="text-sm text-gray-500">
              Veuillez d'abord sélectionner une formation dans l'onglet "Programme" pour voir les candidats.
            </p>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
