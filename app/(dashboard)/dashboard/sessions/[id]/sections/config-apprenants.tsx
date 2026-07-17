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

  const [showEntityReservationForm, setShowEntityReservationForm] = useState(false)
  const [entityReservationForm, setEntityReservationForm] = useState({
    entity_id: '',
    entity_name: '',
    expected_count: '',
    billing_mode: '',
    billing_quantity: '',
    enrollment_date: new Date().toISOString().split('T')[0],
    status: 'confirmed' as 'pending' | 'confirmed',
    payment_status: 'pending' as 'pending' | 'partial' | 'paid',
    total_amount: '',
    paid_amount: '0',
    funding_type_id: '',
  })

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

  // Récupérer les candidats ayant postulé à cette session : depuis le catalogue public
  // (public_enrollments) ET depuis le formulaire d'inscription public (/s/[slug]/[token],
  // qui crée directement une ligne enrollments avec source='enrollment_form').
  //
  // public_enrollments.session_id n'est jamais renseigné à la candidature (un candidat
  // postule à une FORMATION, pas à une session précise — l'affectation se fait ici, à la
  // main, via le bouton "Inscrire") : on retrouve donc les candidats par formation_id
  // plutôt que par session_id, en excluant ceux déjà affectés à une AUTRE session.
  const { data: formationCandidates } = useQuery({
    queryKey: ['session-public-candidates', sessionId, formationId],
    queryFn: async () => {
      if (!sessionId) return []

      const [catalogResult, formResult] = await Promise.all([
        formationId
          ? supabase
              .from('public_enrollments')
              .select('id, first_name, last_name, email, phone, status, created_at, candidate_notes, public_formations!inner(formation_id)')
              .eq('public_formations.formation_id', formationId)
              .in('status', ['pending', 'confirmed'])
              .or(`session_id.is.null,session_id.eq.${sessionId}`)
              .order('created_at', { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('enrollments')
          .select('id, status, created_at, students(id, first_name, last_name, email, phone)')
          .eq('session_id', sessionId)
          .eq('source', 'enrollment_form')
          .order('created_at', { ascending: true }),
      ])

      if (catalogResult.error) throw catalogResult.error
      if (formResult.error) throw formResult.error

      const catalogCandidates = (catalogResult.data || []).map((c: any) => ({
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email,
        phone: c.phone,
        status: c.status,
        created_at: c.created_at,
        candidate_notes: c.candidate_notes,
        source: 'catalog' as const,
      }))

      // Les candidats formulaire ont déjà une vraie ligne enrollments : on utilise
      // l'id de l'étudiant (pas celui de l'enrollment) pour que la dé-duplication avec
      // la liste des étudiants existants (basée sur student.id) reste cohérente.
      const formCandidates = (formResult.data || [])
        .filter((e: any) => e.students)
        .map((e: any) => ({
          id: e.students.id,
          first_name: e.students.first_name,
          last_name: e.students.last_name,
          email: e.students.email,
          phone: e.students.phone,
          status: e.status,
          created_at: e.created_at,
          candidate_notes: null as string | null,
          source: 'enrollment_form' as const,
        }))

      return [...catalogCandidates, ...formCandidates]
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

  // Entreprises/organismes inscrits à la session sans liste nominative
  // (effectif prévisionnel saisi quand l'entité n'a pas encore communiqué les noms)
  const { data: entityReservations } = useQuery({
    queryKey: ['session-entity-reservations', sessionId],
    queryFn: async () => {
      if (!sessionId) return []
      const { data, error } = await supabase
        .from('session_entity_reservations')
        .select('*, external_entities(name, type)')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!sessionId,
  })

  const saveReservationMutation = useMutation({
    mutationFn: async (payload: {
      entityId: string
      isNew: boolean
      expectedCount: number
      billingMode: string | null
      billingQuantity: number | null
      enrollmentDate: string
      status: string
      paymentStatus: string
      totalAmount: number
      paidAmount: number
      fundingTypeId: string | null
    }) => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')
      const { error } = await supabase
        .from('session_entity_reservations')
        .upsert(
          {
            organization_id: user.organization_id,
            session_id: sessionId,
            entity_id: payload.entityId,
            expected_count: payload.expectedCount,
            billing_mode: payload.billingMode,
            billing_quantity: payload.billingQuantity,
            enrollment_date: payload.enrollmentDate,
            status: payload.status,
            payment_status: payload.paymentStatus,
            total_amount: payload.totalAmount,
            paid_amount: payload.paidAmount,
            funding_type_id: payload.fundingTypeId,
          },
          { onConflict: 'session_id,entity_id' }
        )
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['session-entity-reservations', sessionId] })
      setShowEntityReservationForm(false)
      addToast({
        type: 'success',
        title: variables.isNew ? 'Entreprise inscrite à la session' : 'Effectif mis à jour',
      })
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
      })
    },
  })

  const removeReservationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('session_entity_reservations').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-entity-reservations', sessionId] })
      addToast({ type: 'success', title: 'Entreprise retirée de la session' })
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
      })
    },
  })

  const getReservationForEntity = (entityId: string) =>
    entityReservations?.find((r: { entity_id: string }) => r.entity_id === entityId)

  // L'effectif (expected_count) est toujours un nombre d'apprenants, quel que
  // soit le mode de facturation — nommés (student_entities) et/ou en nombre.
  // La quantité facturée (billing_quantity) est un concept séparé, propre aux
  // modes per_group/per_client/per_hour (ex: 2 groupes facturés pour un
  // effectif réel de 12 apprenants). En mode per_student (ou non défini), la
  // quantité facturée est directement l'effectif.
  const billingQuantityRequired = (billingMode: string) =>
    billingMode === 'per_group' || billingMode === 'per_client' || billingMode === 'per_hour'

  const getBillingQuantityFieldLabel = (billingMode: string) => {
    if (billingMode === 'per_group') return 'Nombre de groupes facturés *'
    if (billingMode === 'per_client') return 'Nombre de clients facturés *'
    if (billingMode === 'per_hour') return 'Nombre d\'heures facturées *'
    return 'Quantité facturée'
  }

  const getBillingQuantityUnitLabel = (billingMode: string | null | undefined, count: number) => {
    const plural = count > 1 ? 's' : ''
    if (billingMode === 'per_group') return `groupe${plural}`
    if (billingMode === 'per_client') return `client${plural}`
    if (billingMode === 'per_hour') return `heure${plural}`
    return `apprenant${plural}`
  }

  // Note optionnelle affichée à côté de l'effectif quand la quantité facturée en diffère
  const getBillingQuantityNote = (reservation: { billing_mode?: string | null; billing_quantity?: number | null }) => {
    if (!reservation.billing_mode || !billingQuantityRequired(reservation.billing_mode) || !reservation.billing_quantity) {
      return ''
    }
    return ` · facturé : ${reservation.billing_quantity} ${getBillingQuantityUnitLabel(reservation.billing_mode, reservation.billing_quantity)}`
  }

  const handleOpenEntityReservation = (
    entity: { id: string; name?: string | null },
    existing?: ReturnType<typeof getReservationForEntity>
  ) => {
    setEntityReservationForm({
      entity_id: entity.id,
      entity_name: entity.name ?? '',
      expected_count: existing ? String(existing.expected_count) : '',
      billing_mode: existing?.billing_mode ?? '',
      billing_quantity: existing?.billing_quantity != null ? String(existing.billing_quantity) : '',
      enrollment_date: existing?.enrollment_date ?? new Date().toISOString().split('T')[0],
      status: (existing?.status as 'pending' | 'confirmed') ?? 'confirmed',
      payment_status: (existing?.payment_status as 'pending' | 'partial' | 'paid') ?? 'pending',
      total_amount: existing?.total_amount != null ? String(existing.total_amount) : defaultAmount.toString(),
      paid_amount: existing?.paid_amount != null ? String(existing.paid_amount) : '0',
      funding_type_id: existing?.funding_type_id ?? '',
    })
    setShowEntityReservationForm(true)
  }

  const handleSubmitEntityReservation = () => {
    const existing = getReservationForEntity(entityReservationForm.entity_id)
    saveReservationMutation.mutate({
      entityId: entityReservationForm.entity_id,
      isNew: !existing,
      expectedCount: Number(entityReservationForm.expected_count),
      billingMode: entityReservationForm.billing_mode || null,
      billingQuantity: billingQuantityRequired(entityReservationForm.billing_mode) && entityReservationForm.billing_quantity
        ? Number(entityReservationForm.billing_quantity)
        : null,
      enrollmentDate: entityReservationForm.enrollment_date,
      status: entityReservationForm.status,
      paymentStatus: entityReservationForm.payment_status,
      totalAmount: parseFloat(entityReservationForm.total_amount) || 0,
      paidAmount: parseFloat(entityReservationForm.paid_amount) || 0,
      fundingTypeId: entityReservationForm.funding_type_id || null,
    })
  }

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

  // Filtrer les entités externes par recherche textuelle uniquement — une entité
  // sans apprenant disponible doit rester visible (le bloc de rendu affiche déjà
  // "Aucun apprenant disponible rattaché à cette entité" dans ce cas), sinon une
  // entreprise pourtant listée sur /dashboard/entities semble introuvable ici.
  const filteredEntities = useMemo(() => {
    if (!externalEntities || !Array.isArray(externalEntities)) return []
    if (!searchQuery) return externalEntities

    const query = searchQuery.toLowerCase()
    return externalEntities.filter((entity) => {
      const e = entity as { name?: string | null; code?: string | null; siret?: string | null; email?: string | null; activity_sector?: string | null }
      return e.name?.toLowerCase().includes(query) ||
        e.code?.toLowerCase().includes(query) ||
        e.siret?.toLowerCase().includes(query) ||
        e.email?.toLowerCase().includes(query) ||
        e.activity_sector?.toLowerCase().includes(query)
    })
  }, [externalEntities, searchQuery])

  // Candidats catalogue non encore inscrits (par email). Les candidats venus du
  // formulaire d'inscription ont déjà une vraie ligne enrollments pour CETTE session
  // (on les a récupérés via session_id) : ils vont toujours dans "déjà inscrits", sans
  // dépendre de l'email (souvent absent — le formulaire ne le rend pas obligatoire).
  const availableCandidates = useMemo(
    () => filteredCandidates.filter((c) => c.source !== 'enrollment_form' && !enrolledStudentEmails.has((c.email || '').toLowerCase())),
    [filteredCandidates, enrolledStudentEmails]
  )

  // Candidats catalogue déjà inscrits (par email, ou par origine formulaire)
  const enrolledCandidates = useMemo(
    () => filteredCandidates.filter((c) => c.source === 'enrollment_form' || enrolledStudentEmails.has((c.email || '').toLowerCase())),
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
    mutationFn: async (candidate: { id: string; first_name: string; last_name: string; email: string | null; phone: string | null }) => {
      if (!user?.organization_id) throw new Error('Organisation manquante')

      let studentId: string

      // Chercher un étudiant existant par email dans l'organisation
      const existingByEmail = candidate.email
        ? await supabase
            .from('students')
            .select('id')
            .eq('organization_id', user.organization_id)
            .eq('email', candidate.email)
            .maybeSingle()
        : null

      if (existingByEmail?.data) {
        studentId = existingByEmail.data.id
      } else {
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
        studentId = created.id
      }

      // Réserve le candidat pour cette session (évite qu'il reste "disponible" dans
      // les autres sessions de la même formation une fois pris en charge ici).
      await supabase
        .from('public_enrollments')
        .update({ session_id: sessionId, status: 'confirmed' })
        .eq('id', candidate.id)

      return studentId
    },
    onSuccess: (studentId) => {
      queryClient.invalidateQueries({ queryKey: ['students', user?.organization_id] })
      queryClient.invalidateQueries({ queryKey: ['session-public-candidates', sessionId, formationId] })
      handleEnrollCandidate(studentId)
    },
    onError: (error) => {
      addToast({ type: 'error', title: 'Erreur', description: error instanceof Error ? error.message : 'Une erreur est survenue.' })
    },
  })

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
                router.push(`/dashboard/students/new?sessionId=${sessionId}`)
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
                                onClick={() => enrollPublicCandidateMutation.mutate({ id: candidate.id, first_name: firstName, last_name: lastName, email: candidate.email, phone: candidate.phone })}
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
                      const enrollment = enrollments.find((e) =>
                        candidate.source === 'enrollment_form'
                          ? (e as EnrollmentWithRelations).student_id === candidate.id
                          : (e as EnrollmentWithRelations).students?.email?.toLowerCase() === email.toLowerCase()
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
                                  <Badge variant="outline" className="text-xs border-purple-200 text-purple-600">
                                    {candidate.source === 'enrollment_form' ? 'Formulaire' : 'Catalogue'}
                                  </Badge>
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
                        {(() => {
                          const reservation = getReservationForEntity(e.id)
                          return (
                            <div className="space-y-2 text-center">
                              <p className="text-xs text-gray-500">
                                {reservation
                                  ? `Entreprise inscrite : ${reservation.expected_count} apprenant${reservation.expected_count > 1 ? 's' : ''} (noms non communiqués)${getBillingQuantityNote(reservation)}`
                                  : 'Aucun apprenant nommé rattaché à cette entité'}
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenEntityReservation({ id: e.id, name: e.name }, reservation)}
                              >
                                <Building2 className="h-3 w-3 mr-1" />
                                {reservation ? "Modifier l'inscription" : "Inscrire l'entreprise"}
                              </Button>
                            </div>
                          )
                        })()}
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

      {/* Entreprises/organismes inscrits à la session (effectif sans liste nominative) */}
      {entityReservations && entityReservations.length > 0 && (
        <GlassCard variant="premium" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-orange-600" />
                Entreprises inscrites
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {entityReservations.length} entreprise{entityReservations.length > 1 ? 's' : ''} inscrite{entityReservations.length > 1 ? 's' : ''} à cette session avec un effectif prévisionnel
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {entityReservations.map((reservation) => {
              const r = reservation as {
                id: string
                entity_id: string
                expected_count: number
                billing_mode?: string | null
                billing_quantity?: number | null
                total_amount?: number | null
                external_entities?: { name?: string | null; type?: string | null } | null
              }
              const billingModeLabels: Record<string, string> = {
                per_client: 'Par client',
                per_group: 'Par groupe',
                per_student: 'Par apprenant',
                per_hour: 'Par heures',
              }
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-orange-50/50 border border-orange-200 hover:bg-orange-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {r.external_entities?.name ?? 'Entreprise'}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-gray-500">
                          {r.expected_count} apprenant{r.expected_count > 1 ? 's' : ''} prévu{r.expected_count > 1 ? 's' : ''} (noms non communiqués){getBillingQuantityNote(r)}
                        </span>
                        {r.billing_mode && (
                          <Badge variant="outline" className="text-xs">
                            {billingModeLabels[r.billing_mode] ?? r.billing_mode}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    {r.total_amount != null && r.total_amount > 0 && (
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {formatCurrency(r.total_amount)}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                      onClick={() =>
                        handleOpenEntityReservation(
                          { id: r.entity_id, name: r.external_entities?.name },
                          reservation
                        )
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => removeReservationMutation.mutate(r.id)}
                      disabled={removeReservationMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

      <AnimatePresence>
        {showEntityReservationForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <GlassCard variant="premium" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {getReservationForEntity(entityReservationForm.entity_id) ? "Modifier l'inscription" : 'Inscrire une entreprise'}
                  </h3>
                  {entityReservationForm.entity_name && (
                    <p className="text-sm text-gray-500 mt-0.5">{entityReservationForm.entity_name}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowEntityReservationForm(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="entity_expected_count">Effectif (nombre d'apprenants) *</Label>
                    <Input
                      id="entity_expected_count"
                      type="number"
                      min={1}
                      value={entityReservationForm.expected_count}
                      onChange={(e) =>
                        setEntityReservationForm({ ...entityReservationForm, expected_count: e.target.value })
                      }
                      placeholder="Ex: 12"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Nombre réel d'apprenants de cette entité, en plus de ceux inscrits nominativement.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="entity_billing_mode">Mode de facturation</Label>
                    <select
                      id="entity_billing_mode"
                      value={entityReservationForm.billing_mode}
                      onChange={(e) =>
                        setEntityReservationForm({ ...entityReservationForm, billing_mode: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                    >
                      <option value="">Non défini</option>
                      <option value="per_client">Par client</option>
                      <option value="per_group">Par groupe</option>
                      <option value="per_student">Par apprenant</option>
                      <option value="per_hour">Par heures</option>
                    </select>
                  </div>
                </div>

                {billingQuantityRequired(entityReservationForm.billing_mode) && (
                  <div>
                    <Label htmlFor="entity_billing_quantity">
                      {getBillingQuantityFieldLabel(entityReservationForm.billing_mode)}
                    </Label>
                    <Input
                      id="entity_billing_quantity"
                      type="number"
                      min={1}
                      value={entityReservationForm.billing_quantity}
                      onChange={(e) =>
                        setEntityReservationForm({ ...entityReservationForm, billing_quantity: e.target.value })
                      }
                      placeholder="Ex: 2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Quantité utilisée pour calculer le montant du devis/de la facture — distincte de l'effectif.
                      Laissé vide, l'effectif sera utilisé par défaut.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="entity_enrollment_date">Date d'inscription *</Label>
                    <Input
                      id="entity_enrollment_date"
                      type="date"
                      value={entityReservationForm.enrollment_date}
                      onChange={(e) =>
                        setEntityReservationForm({ ...entityReservationForm, enrollment_date: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="entity_status">Statut *</Label>
                    <select
                      id="entity_status"
                      value={entityReservationForm.status}
                      onChange={(e) =>
                        setEntityReservationForm({
                          ...entityReservationForm,
                          status: e.target.value as 'pending' | 'confirmed',
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
                    <Label htmlFor="entity_total_amount">Montant total</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="entity_total_amount"
                        type="number"
                        step="0.01"
                        value={entityReservationForm.total_amount}
                        onChange={(e) =>
                          setEntityReservationForm({ ...entityReservationForm, total_amount: e.target.value })
                        }
                        className="pl-10"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="entity_paid_amount">Montant payé</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="entity_paid_amount"
                        type="number"
                        step="0.01"
                        value={entityReservationForm.paid_amount}
                        onChange={(e) =>
                          setEntityReservationForm({ ...entityReservationForm, paid_amount: e.target.value })
                        }
                        className="pl-10"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="entity_payment_status">Statut de paiement</Label>
                  <select
                    id="entity_payment_status"
                    value={entityReservationForm.payment_status}
                    onChange={(e) =>
                      setEntityReservationForm({
                        ...entityReservationForm,
                        payment_status: e.target.value as 'pending' | 'partial' | 'paid',
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
                  <Label htmlFor="entity_funding_type_id">Type de financement</Label>
                  <select
                    id="entity_funding_type_id"
                    value={entityReservationForm.funding_type_id}
                    onChange={(e) =>
                      setEntityReservationForm({ ...entityReservationForm, funding_type_id: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                  >
                    <option value="">Aucun</option>
                    {fundingTypes && fundingTypes.length > 0 &&
                      fundingTypes.map((type) => {
                        const ft = type as { id?: string; name?: string; code?: string }
                        return (
                          <option key={ft.id} value={ft.id ?? ''}>
                            {ft.name ?? ''} {ft.code ? `(${ft.code})` : ''}
                          </option>
                        )
                      })}
                  </select>
                </div>

                {saveReservationMutation.error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    <p className="text-sm text-red-600">
                      {saveReservationMutation.error instanceof Error
                        ? saveReservationMutation.error.message
                        : 'Une erreur est survenue'}
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowEntityReservationForm(false)}>
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSubmitEntityReservation}
                    disabled={
                      saveReservationMutation.isPending ||
                      !entityReservationForm.expected_count ||
                      Number(entityReservationForm.expected_count) <= 0
                    }
                    className="shadow-lg shadow-brand-blue/20"
                  >
                    {saveReservationMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Building2 className="h-4 w-4 mr-2" />
                        {getReservationForEntity(entityReservationForm.entity_id) ? 'Mettre à jour' : "Inscrire l'entreprise"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

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
