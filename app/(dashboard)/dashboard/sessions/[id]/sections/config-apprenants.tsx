'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from '@/components/ui/motion'
import {
  Users,
  UserPlus,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  User,
  Mail,
  Phone,
  DollarSign,
  Loader2,
  Building2,
  MapPin,
  Pencil,
  Trash2,
  MoreVertical,
  UserCog,
  Clock,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GlassCard } from '@/components/ui/glass-card'
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDate, formatCurrency } from '@/lib/utils'
import { enrollmentSchema } from '@/lib/validations/schemas'
import type { EnrollmentWithRelations, StudentWithRelations } from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'

type Enrollment = TableRow<'enrollments'>

interface SessionModule {
  id: string
  name: string
  amount: number
  currency: string
}

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
  sessionModules?: SessionModule[]
}

export function ConfigApprenants({
  sessionId,
  formationId,
  enrollments = [],
  students: _students = [],
  enrollmentForm,
  onEnrollmentFormChange,
  onCreateEnrollment,
  createEnrollmentMutation,
  formationPrice,
  sessionModules = [],
}: ConfigApprenantsProps) {
  // Calculer le total des modules de la session
  const sessionModulesTotal = useMemo(() =>
    sessionModules.reduce((sum, m) => sum + Number(m.amount || 0), 0),
    [sessionModules]
  )

  // Montant par défaut: modules > prix formation
  const defaultAmount = sessionModulesTotal > 0 ? sessionModulesTotal : (formationPrice || 0)
  const { user } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState('')
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false)
  const [showNewStudentForm, setShowNewStudentForm] = useState(false)
  const [newStudentForm, setNewStudentForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
  })
  const [searchMode, setSearchMode] = useState<'all' | 'students' | 'entities'>('all')
  const [editingEnrollment, setEditingEnrollment] = useState<EnrollmentWithRelations | null>(null)
  const [editForm, setEditForm] = useState<{
    enrollment_date: string
    status: Enrollment['status']
    payment_status: Enrollment['payment_status']
    total_amount: string
    paid_amount: string
    funding_type_id: string
  } | null>(null)
  const [deletingEnrollmentId, setDeletingEnrollmentId] = useState<string | null>(null)

  // Récupérer les types de financement
  const { data: fundingTypes } = useQuery({
    queryKey: ['funding-types', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('funding_types')
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

  // Récupérer les candidats ayant postulé à cette session depuis le catalogue public
  const { data: formationCandidates } = useQuery({
    queryKey: ['session-public-candidates', sessionId],
    queryFn: async () => {
      if (!sessionId) return []

      const { data, error } = await supabase
        .from('public_enrollments')
        .select('id, first_name, last_name, email, phone, status, created_at, candidate_notes')
        .eq('session_id', sessionId)
        .in('status', ['pending', 'confirmed'])
        .order('created_at', { ascending: true })

      if (error) throw error
      return data || []
    },
    enabled: !!sessionId,
  })

  // Recherche server-side dans TOUTE la base quand l'utilisateur tape (bypass la pagination de 50)
  const { data: searchStudentsResult, isFetching: isSearching } = useQuery({
    queryKey: ['students-search', user?.organization_id, searchQuery],
    queryFn: async () => {
      if (!user?.organization_id || searchQuery.length < 1) return []
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('organization_id', user.organization_id)
        .eq('status', 'active')
        .or(
          `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,student_number.ilike.%${searchQuery}%`
        )
        .order('last_name', { ascending: true })
        .limit(100)
      if (error) throw error
      return (data || []) as StudentWithRelations[]
    },
    enabled: !!user?.organization_id && searchQuery.length >= 1,
  })

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
      
      const entityIds = externalEntities.map((e: { id: string }) => e.id)
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

  // Emails des étudiants déjà inscrits (pour détecter si un candidat catalogue est déjà inscrit)
  const enrolledStudentEmails = useMemo(
    () => new Set(
      enrollments
        ?.map((e) => (e as EnrollmentWithRelations).students?.email)
        .filter((email): email is string => !!email)
        .map((email) => email.toLowerCase())
    ),
    [enrollments]
  )

  // Filtrer les candidats catalogue
  const filteredCandidates = useMemo(() => {
    if (!formationCandidates) return []
    if (!searchQuery) return formationCandidates

    const query = searchQuery.toLowerCase()
    return formationCandidates.filter(
      (c) =>
        c.first_name?.toLowerCase().includes(query) ||
        c.last_name?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.phone?.toLowerCase().includes(query) ||
        `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(query)
    )
  }, [formationCandidates, searchQuery])

  // Tous les candidats (y compris ceux déjà inscrits pour l'affichage)
  const allCandidates = useMemo(() => filteredCandidates, [filteredCandidates])

  const filteredAllStudents = useMemo(() => {
    if (!searchQuery || searchQuery.length < 1) return []
    return searchStudentsResult || []
  }, [searchQuery, searchStudentsResult])

  // IDs des étudiants déjà inscrits
  const enrolledStudentIds = useMemo(
    () => new Set(enrollments?.map((e) => e.student_id) || []),
    [enrollments]
  )

  // Obtenir les apprenants rattachés à une entité
  const getStudentsForEntity = (entityId: string) => {
    if (!studentEntities) return []
    return studentEntities
      .filter((se: { entity_id: string; students?: unknown }) => se.entity_id === entityId && se.students)
      .map((se: { students?: { id: string } }) => se.students)
      .filter((s): s is { id: string } => s != null && !enrolledStudentIds.has(s.id))
  }

  // Filtrer les entités externes
  const filteredEntities = useMemo(() => {
    if (!externalEntities || !Array.isArray(externalEntities)) return []
    
    // Filtrer par recherche textuelle
    let filtered = externalEntities
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = externalEntities.filter((entity) => {
        const e = entity as { name?: string | null; code?: string | null; siret?: string | null; email?: string | null; activity_sector?: string | null }
        return e.name?.toLowerCase().includes(query) ||
          e.code?.toLowerCase().includes(query) ||
          e.siret?.toLowerCase().includes(query) ||
          e.email?.toLowerCase().includes(query) ||
          e.activity_sector?.toLowerCase().includes(query)
      })
    }
    return filtered.filter((entity) => {
      const id = (entity as { id?: string }).id
      if (!id) return false
      const students = getStudentsForEntity(id)
      return students.length > 0
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps -- getStudentsForEntity reads from state, deps sufficient
  }, [externalEntities, searchQuery, studentEntities, enrolledStudentIds])

  // Candidats catalogue non encore inscrits (par email)
  const availableCandidates = useMemo(
    () => filteredCandidates.filter((c) => !enrolledStudentEmails.has((c.email || '').toLowerCase())),
    [filteredCandidates, enrolledStudentEmails]
  )

  // Candidats catalogue déjà inscrits (par email)
  const enrolledCandidates = useMemo(
    () => filteredCandidates.filter((c) => enrolledStudentEmails.has((c.email || '').toLowerCase())),
    [filteredCandidates, enrolledStudentEmails]
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

  // Gérer l'inscription depuis un student_id connu
  const handleEnrollCandidate = (studentId: string) => {
    onEnrollmentFormChange({
      ...enrollmentForm,
      student_id: studentId,
      enrollment_date: new Date().toISOString().split('T')[0],
      total_amount: defaultAmount.toString(),
      funding_type_id: enrollmentForm.funding_type_id || '',
    })
    setShowEnrollmentForm(true)
  }

  // Inscrire un candidat catalogue : trouver ou créer le student par email puis ouvrir le formulaire
  const enrollPublicCandidateMutation = useMutation({
    mutationFn: async (candidate: { first_name: string; last_name: string; email: string | null; phone: string | null }) => {
      if (!user?.organization_id) throw new Error('Organisation manquante')

      // Chercher un étudiant existant par email dans l'organisation
      if (candidate.email) {
        const { data: existing } = await supabase
          .from('students')
          .select('id')
          .eq('organization_id', user.organization_id)
          .eq('email', candidate.email)
          .maybeSingle()
        if (existing) return existing.id
      }

      // Créer un nouvel étudiant depuis les données du candidat
      const { data: created, error } = await supabase
        .from('students')
        .insert({
          first_name: candidate.first_name,
          last_name: candidate.last_name,
          email: candidate.email || null,
          phone: candidate.phone || null,
          organization_id: user.organization_id,
          status: 'active',
          student_number: '',
        })
        .select('id')
        .single()
      if (error) throw error
      return created.id
    },
    onSuccess: (studentId) => {
      queryClient.invalidateQueries({ queryKey: ['students', user?.organization_id] })
      handleEnrollCandidate(studentId)
    },
    onError: (error) => {
      addToast({ type: 'error', title: 'Erreur', description: error instanceof Error ? error.message : 'Une erreur est survenue.' })
    },
  })

  // Mutation pour créer un nouvel apprenant puis l'inscrire
  const createStudentMutation = useMutation({
    mutationFn: async (data: { first_name: string; last_name: string; email?: string; phone?: string; date_of_birth?: string }) => {
      if (!user?.organization_id) throw new Error('Organisation manquante')
      const { data: student, error } = await supabase
        .from('students')
        .insert({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email || null,
          phone: data.phone || null,
          date_of_birth: data.date_of_birth || null,
          organization_id: user.organization_id,
          status: 'active',
          student_number: '',
        })
        .select('id')
        .single()
      if (error) throw error
      return student
    },
    onSuccess: (student) => {
      queryClient.invalidateQueries({ queryKey: ['students', user?.organization_id] })
      setShowNewStudentForm(false)
      setNewStudentForm({ first_name: '', last_name: '', email: '', phone: '', date_of_birth: '' })
      addToast({ type: 'success', title: 'Apprenant créé', description: 'L\'apprenant a été créé. Complétez l\'inscription ci-dessous.' })
      handleEnrollCandidate(student.id)
    },
    onError: (error) => {
      addToast({ type: 'error', title: 'Erreur', description: error instanceof Error ? error.message : 'Une erreur est survenue.' })
    },
  })

  const handleCreateStudent = () => {
    if (!newStudentForm.first_name.trim() || !newStudentForm.last_name.trim()) {
      addToast({ type: 'error', title: 'Champs requis', description: 'Le prénom et le nom sont obligatoires.' })
      return
    }
    createStudentMutation.mutate({
      first_name: newStudentForm.first_name.trim(),
      last_name: newStudentForm.last_name.trim(),
      email: newStudentForm.email.trim() || undefined,
      phone: newStudentForm.phone.trim() || undefined,
      date_of_birth: newStudentForm.date_of_birth || undefined,
    })
  }

  const handleSubmitEnrollment = async () => {
    try {
      enrollmentSchema.parse({
        ...enrollmentForm,
        session_id: sessionId,
      })
      onCreateEnrollment()
    } catch (error) {
      if (error instanceof Error || (error as { errors?: { path: (string | number)[]; message: string }[] }).errors) {
        const zodErrors = (error as { errors: { path: (string | number)[]; message: string }[] }).errors || []
        const errorMessages = zodErrors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
        addToast({
          type: 'error',
          title: 'Erreur de validation',
          description: errorMessages,
        })
      }
    }
  }

  // Mutation pour modifier une inscription
  const updateEnrollmentMutation = useMutation({
    mutationFn: async ({ enrollmentId, data }: {
      enrollmentId: string
      data: {
        enrollment_date: string
        status: Enrollment['status']
        payment_status: Enrollment['payment_status']
        total_amount: number
        paid_amount: number
        funding_type_id: string | null
      }
    }) => {
      const { data: updated, error } = await supabase
        .from('enrollments')
        .update(data)
        .eq('id', enrollmentId)
        .select()
        .single()
      if (error) throw error
      return updated
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-enrollments', sessionId] })
      setEditingEnrollment(null)
      setEditForm(null)
      addToast({ type: 'success', title: 'Inscription modifiée', description: 'L\'inscription a été mise à jour avec succès.' })
    },
    onError: (error) => {
      addToast({ type: 'error', title: 'Erreur', description: error instanceof Error ? error.message : 'Une erreur est survenue.' })
    },
  })

  // Mutation pour supprimer une inscription
  const deleteEnrollmentMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      // Vérifier s'il existe une facture pour cette inscription
      const { data: invoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('enrollment_id', enrollmentId)
        .eq('document_type', 'invoice')
        .maybeSingle()
      if (invoice) {
        throw new Error('Impossible de supprimer une inscription pour laquelle une facture a été émise')
      }
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('id', enrollmentId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-enrollments', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
      setDeletingEnrollmentId(null)
      addToast({ type: 'success', title: 'Inscription supprimée', description: 'L\'inscription a été supprimée.' })
    },
    onError: (error) => {
      addToast({ type: 'error', title: 'Erreur', description: error instanceof Error ? error.message : 'Une erreur est survenue.' })
      setDeletingEnrollmentId(null)
    },
  })

  const handleOpenEdit = (enrollment: EnrollmentWithRelations) => {
    setEditingEnrollment(enrollment)
    setEditForm({
      enrollment_date: enrollment.enrollment_date || new Date().toISOString().split('T')[0],
      status: enrollment.status || 'pending',
      payment_status: enrollment.payment_status || 'pending',
      total_amount: enrollment.total_amount != null ? String(enrollment.total_amount) : '0',
      paid_amount: enrollment.paid_amount != null ? String(enrollment.paid_amount) : '0',
      funding_type_id: enrollment.funding_type_id || '',
    })
  }

  const handleSubmitEdit = () => {
    if (!editingEnrollment || !editForm) return
    updateEnrollmentMutation.mutate({
      enrollmentId: editingEnrollment.id,
      data: {
        enrollment_date: editForm.enrollment_date,
        status: editForm.status,
        payment_status: editForm.payment_status,
        total_amount: parseFloat(editForm.total_amount) || 0,
        paid_amount: parseFloat(editForm.paid_amount) || 0,
        funding_type_id: editForm.funding_type_id || null,
      },
    })
  }

  // Statistiques
  const stats = useMemo(() => {
    const enrolled = enrollments?.length || 0
    const candidates = formationCandidates?.length || 0
    const available = availableCandidates.length
    const enrolledFromCandidates = enrolledCandidates.length
    return { enrolled, candidates, available, enrolledFromCandidates }
  }, [enrollments, formationCandidates, availableCandidates, enrolledCandidates])

  type PublicCandidate = NonNullable<typeof formationCandidates>[number]

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
                className="pl-10 pr-8"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
              )}
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

      {/* Candidats du catalogue public */}
      {(searchMode === 'all' || searchMode === 'students') && (
        <GlassCard variant="premium" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-purple-600" />
                Candidats du catalogue public
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Apprenants ayant postulé à cette session depuis le catalogue en ligne
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
                  : 'Aucune candidature reçue pour cette session'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Candidats disponibles (non encore inscrits) */}
              {availableCandidates.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    En attente d'inscription ({availableCandidates.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableCandidates.map((candidate: PublicCandidate) => {
                      const firstName = candidate.first_name || ''
                      const lastName = candidate.last_name || ''
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
                              size="md"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-gray-900 truncate">
                                  {firstName} {lastName}
                                </p>
                                <Badge variant="outline" className="text-xs border-purple-200 text-purple-600 flex-shrink-0">
                                  Catalogue
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
                                onClick={() => enrollPublicCandidateMutation.mutate({ first_name: firstName, last_name: lastName, email: candidate.email, phone: candidate.phone })}
                                disabled={enrollPublicCandidateMutation.isPending || createEnrollmentMutation.isPending}
                              >
                                {enrollPublicCandidateMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <UserPlus className="h-3 w-3 mr-1" />
                                )}
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
                    {enrolledCandidates.map((candidate: PublicCandidate) => {
                      const firstName = candidate.first_name || ''
                      const lastName = candidate.last_name || ''
                      const email = candidate.email || ''
                      const phone = candidate.phone || ''
                      const enrollment = enrollments.find(
                        (e) => (e as EnrollmentWithRelations).students?.email?.toLowerCase() === email.toLowerCase()
                      )

                      return (
                        <motion.div
                          key={candidate.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-lg border border-green-200 bg-green-50/30"
                        >
                          <div className="flex items-start gap-3">
                            <Avatar
                              fallback={`${firstName[0] || ''}${lastName[0] || ''}`}
                              size="md"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-gray-900 truncate">
                                  {firstName} {lastName}
                                </p>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Badge variant="outline" className="text-xs border-green-200 text-green-600">
                                    Inscrit
                                  </Badge>
                                  {enrollment && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-gray-700">
                                          <MoreVertical className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-52">
                                        <DropdownMenuItem onClick={() => handleOpenEdit(enrollment)}>
                                          <Pencil className="h-4 w-4 mr-2 text-gray-500" />
                                          Modifier l'inscription
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                          onClick={() => setDeletingEnrollmentId(enrollment.id)}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Retirer de la session
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
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
            {filteredEntities.map((entity) => {
              const e = entity as { id: string; name?: string | null; code?: string | null; type?: string | null; siret?: string | null; email?: string | null; phone?: string | null; address?: string | null }
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
                  key={e.id}
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
                          <p className="font-semibold text-gray-900">{e.name ?? ''}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {getTypeLabel(e.type ?? '')}
                            </Badge>
                            {e.siret && (
                              <span className="text-xs text-gray-500">SIRET: {e.siret}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {(e.email || e.phone || e.address) && (
                        <div className="mt-2 space-y-1 text-xs text-gray-600">
                          {e.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {e.email}
                            </div>
                          )}
                          {e.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {e.phone}
                            </div>
                          )}
                          {e.address && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {e.address}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Apprenants rattachés à cette entité */}
                  {(() => {
                    const entityStudents = getStudentsForEntity(e.id)
                    return entityStudents.length > 0 ? (
                      <div className="mt-3 pt-3 border-t border-orange-200">
                        <p className="text-xs font-medium text-gray-700 mb-2">
                          {entityStudents.length} apprenant{entityStudents.length > 1 ? 's' : ''} rattaché{entityStudents.length > 1 ? 's' : ''}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {entityStudents.map((student) => {
                            const s = student as { id: string; first_name?: string | null; last_name?: string | null; student_number?: string | null }
                            return (
                            <div
                              key={s.id}
                              className="p-2 rounded border border-gray-200 bg-white hover:border-brand-blue-300 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {s.first_name ?? ''} {s.last_name ?? ''}
                                  </p>
                                  {s.student_number && (
                                    <p className="text-xs text-gray-500 font-mono">
                                      #{s.student_number}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEnrollCandidate(s.id)}
                                  disabled={createEnrollmentMutation.isPending}
                                  className="ml-2 flex-shrink-0"
                                >
                                  <UserPlus className="h-3 w-3 mr-1" />
                                  Inscrire
                                </Button>
                              </div>
                            </div>
                          )})}
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

      {/* État de chargement / aucun résultat */}
      {searchQuery.length >= 1 && (searchMode === 'all' || searchMode === 'students') && !isSearching && allOtherStudents.length === 0 && !filteredCandidates.length && (
        <GlassCard variant="default" className="p-6">
          <div className="text-center py-4 text-gray-500">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun apprenant trouvé pour &laquo;&nbsp;{searchQuery}&nbsp;&raquo;</p>
          </div>
        </GlassCard>
      )}

      {/* Résultats de recherche — tous les apprenants de la base */}
      {searchQuery.length >= 1 && allOtherStudents.length > 0 && (searchMode === 'all' || searchMode === 'students') && (
        <GlassCard variant="default" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-blue" />
                Résultats de recherche
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Apprenants trouvés dans la base
              </p>
            </div>
            <Badge variant="outline" className="text-brand-blue border-brand-blue-200">
              {allOtherStudents.length} trouvé{allOtherStudents.length > 1 ? 's' : ''}
            </Badge>
          </div>

          <div className="space-y-4">
            {availableStudents.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableStudents.map((student) => {
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
                          <p className="font-medium text-gray-900 truncate">{firstName} {lastName}</p>
                          {studentNumber && <p className="text-xs text-gray-500 mt-0.5 font-mono">#{studentNumber}</p>}
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
            )}
            {/* Étudiants déjà inscrits dans les résultats */}
            {enrolledOtherStudents.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Déjà inscrits ({enrolledOtherStudents.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {enrolledOtherStudents.slice(0, 50).map((student) => {
                    const firstName = student.first_name || ''
                    const lastName = student.last_name || ''
                    const studentNumber = student.student_number || ''
                    const email = student.email || ''
                    const phone = student.phone || ''
                    const enrollment = enrollments.find((e) => e.student_id === student.id)

                    return (
                      <motion.div
                        key={student.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-lg border border-green-200 bg-green-50/30"
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
                                {enrollment?.status === 'pending' && (
                                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                    <Clock className="w-3 h-3" />
                                    Candidature en attente
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Badge variant="outline" className="text-xs border-green-200 text-green-600">
                                  Inscrit
                                </Badge>
                                {enrollment && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-gray-700">
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-52">
                                      <DropdownMenuItem onClick={() => router.push(`/dashboard/students/${student.id}`)}>
                                        <UserCog className="h-4 w-4 mr-2 text-gray-500" />
                                        Modifier la fiche apprenant
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleOpenEdit(enrollment)}>
                                        <Pencil className="h-4 w-4 mr-2 text-gray-500" />
                                        Modifier l'inscription
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                        onClick={() => setDeletingEnrollmentId(enrollment.id)}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Retirer de la session
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
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
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
                {enrolledOtherStudents.length > 50 && (
                  <p className="text-center text-sm text-gray-500 mt-4">
                    + {enrolledOtherStudents.length - 50} autre{enrolledOtherStudents.length - 50 > 1 ? 's' : ''} résultat{enrolledOtherStudents.length - 50 > 1 ? 's' : ''}
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
                (enrollment as EnrollmentWithRelations).students ??
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 truncate">
                          {firstName} {lastName}
                        </p>
                        {enrollment.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 whitespace-nowrap">
                            <Clock className="w-3 h-3" />
                            Candidature en attente
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                        {studentNumber && (
                          <span className="font-mono">#{studentNumber}</span>
                        )}
                        <span>Inscrit le {formatDate(enrollment.enrollment_date || '')}</span>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem
                          onClick={() => router.push(`/dashboard/students/${enrollment.student_id}`)}
                        >
                          <UserCog className="h-4 w-4 mr-2 text-gray-500" />
                          Modifier la fiche apprenant
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenEdit(enrollment)}
                        >
                          <Pencil className="h-4 w-4 mr-2 text-gray-500" />
                          Modifier l'inscription
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          onClick={() => setDeletingEnrollmentId(enrollment.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Retirer de la session
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                      total_amount: defaultAmount.toString(),
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
                      fundingTypes.map((type) => {
                        const ft = type as { id?: string; name?: string; code?: string }
                        return (
                        <option key={ft.id} value={ft.id ?? ''}>
                          {ft.name ?? ''} {ft.code ? `(${ft.code})` : ''}
                        </option>
                      )})
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
                        total_amount: defaultAmount.toString(),
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


      {/* Dialog de création d'un nouvel apprenant */}
      <Dialog open={showNewStudentForm} onOpenChange={(open) => { if (!open) { setShowNewStudentForm(false); setNewStudentForm({ first_name: '', last_name: '', email: '', phone: '', date_of_birth: '' }) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-brand-blue" />
              Créer un nouvel apprenant
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new_first_name">Prénom *</Label>
                <Input
                  id="new_first_name"
                  value={newStudentForm.first_name}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, first_name: e.target.value })}
                  placeholder="Prénom"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="new_last_name">Nom *</Label>
                <Input
                  id="new_last_name"
                  value={newStudentForm.last_name}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, last_name: e.target.value })}
                  placeholder="Nom de famille"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="new_email">Email</Label>
              <Input
                id="new_email"
                type="email"
                value={newStudentForm.email}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, email: e.target.value })}
                placeholder="email@exemple.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new_phone">Téléphone</Label>
                <Input
                  id="new_phone"
                  type="tel"
                  value={newStudentForm.phone}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, phone: e.target.value })}
                  placeholder="06 00 00 00 00"
                />
              </div>
              <div>
                <Label htmlFor="new_dob">Date de naissance</Label>
                <Input
                  id="new_dob"
                  type="date"
                  value={newStudentForm.date_of_birth}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, date_of_birth: e.target.value })}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Après création, vous pourrez compléter le profil depuis la fiche apprenant.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewStudentForm(false); setNewStudentForm({ first_name: '', last_name: '', email: '', phone: '', date_of_birth: '' }) }}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateStudent}
              disabled={createStudentMutation.isPending || !newStudentForm.first_name.trim() || !newStudentForm.last_name.trim()}
              className="shadow-lg shadow-brand-blue/20"
            >
              {createStudentMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Création...</>
              ) : (
                <><UserPlus className="h-4 w-4 mr-2" />Créer et inscrire</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de modification d'inscription */}
      <Dialog open={!!editingEnrollment} onOpenChange={(open) => { if (!open) { setEditingEnrollment(null); setEditForm(null) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier l'inscription</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_enrollment_date">Date d'inscription</Label>
                  <Input
                    id="edit_enrollment_date"
                    type="date"
                    value={editForm.enrollment_date}
                    onChange={(e) => setEditForm({ ...editForm, enrollment_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_status">Statut</Label>
                  <select
                    id="edit_status"
                    value={editForm.status || 'pending'}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Enrollment['status'] })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                  >
                    <option value="pending">En attente</option>
                    <option value="confirmed">Confirmé</option>
                    <option value="completed">Terminé</option>
                    <option value="cancelled">Annulé</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_total_amount">Montant total</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="edit_total_amount"
                      type="number"
                      step="0.01"
                      value={editForm.total_amount}
                      onChange={(e) => setEditForm({ ...editForm, total_amount: e.target.value })}
                      className="pl-10"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit_paid_amount">Montant payé</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="edit_paid_amount"
                      type="number"
                      step="0.01"
                      value={editForm.paid_amount}
                      onChange={(e) => setEditForm({ ...editForm, paid_amount: e.target.value })}
                      className="pl-10"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="edit_payment_status">Statut de paiement</Label>
                <select
                  id="edit_payment_status"
                  value={editForm.payment_status || 'pending'}
                  onChange={(e) => setEditForm({ ...editForm, payment_status: e.target.value as Enrollment['payment_status'] })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                >
                  <option value="pending">En attente</option>
                  <option value="partial">Partiel</option>
                  <option value="paid">Payé</option>
                  <option value="overdue">En retard</option>
                </select>
              </div>
              <div>
                <Label htmlFor="edit_funding_type_id">Type de financement</Label>
                <select
                  id="edit_funding_type_id"
                  value={editForm.funding_type_id || ''}
                  onChange={(e) => setEditForm({ ...editForm, funding_type_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                >
                  <option value="">Aucun (financement personnel)</option>
                  {fundingTypes?.map((type) => {
                    const ft = type as { id?: string; name?: string; code?: string }
                    return (
                      <option key={ft.id} value={ft.id ?? ''}>{ft.name ?? ''} {ft.code ? `(${ft.code})` : ''}</option>
                    )
                  })}
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingEnrollment(null); setEditForm(null) }}>
              Annuler
            </Button>
            <Button onClick={handleSubmitEdit} disabled={updateEnrollmentMutation.isPending}>
              {updateEnrollmentMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement...</>
              ) : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={!!deletingEnrollmentId} onOpenChange={(open) => { if (!open) setDeletingEnrollmentId(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer l'inscription</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            Êtes-vous sûr de vouloir supprimer définitivement cette inscription ? Cette action est irréversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingEnrollmentId(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingEnrollmentId && deleteEnrollmentMutation.mutate(deletingEnrollmentId)}
              disabled={deleteEnrollmentMutation.isPending}
            >
              {deleteEnrollmentMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Suppression...</>
              ) : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
