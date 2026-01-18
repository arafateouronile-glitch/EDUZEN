import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { sessionService } from '@/lib/services/session.service'
import { programService } from '@/lib/services/program.service'
import { formationService } from '@/lib/services/formation.service'
import { sessionSlotService } from '@/lib/services/session-slot.service'
import { evaluationService } from '@/lib/services/evaluation.service'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/components/ui/toast'
import { logger } from '@/lib/utils/logger'
import { sessionSchema, enrollmentSchema, type SessionFormData as SessionFormDataZod, type EnrollmentFormData as EnrollmentFormDataZod } from '@/lib/validations/schemas'
import type { 
  SessionWithRelations, 
  EnrollmentWithRelations, 
  GradeWithRelations,
  FormationWithRelations
} from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'

type Enrollment = TableRow<'enrollments'>
type Grade = TableRow<'grades'>
type User = TableRow<'users'>
type Program = TableRow<'programs'>
type Formation = TableRow<'formations'>
type Organization = TableRow<'organizations'>
type SessionSlot = TableRow<'session_slots'>

type WorkflowStep = 'configuration' | 'gestion' | 'espace_apprenant' | 'suivi'
type ConfigTab = 'initialisation' | 'dates_prix' | 'apprenants' | 'programme' | 'intervenants'
type GestionTab = 'conventions' | 'convocations' | 'evaluations' | 'finances' | 'espace_entreprise' | 'automatisation'

export interface SessionFormData {
  name: string
  type: string
  code: string
  manager1_id: string
  manager2_id: string
  inter_entreprise: boolean
  sous_traitance: boolean
  timezone: string
  formation_id: string
  program_ids: string[]
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  location: string
  capacity_max: string
  teacher_id: string
  status: 'planned' | 'ongoing' | 'completed' | 'cancelled'
}

export interface EnrollmentFormData {
  student_id: string
  enrollment_date: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'failed'
  payment_status: 'pending' | 'partial' | 'paid' | 'overdue'
  total_amount: string
  paid_amount: string
}

export interface EvaluationFormData {
  subject: string
  assessment_type: string
  student_id: string | undefined
  score: string
  max_score: string
  percentage: string
  notes: string
  graded_at: string
}

export interface SlotConfig {
  timeSlotType: 'morning' | 'afternoon' | 'both' | 'full_day'
  morningStart: string
  morningEnd: string
  afternoonStart: string
  afternoonEnd: string
}

export function useSessionDetail(sessionId: string) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { addToast } = useToast()

  // États de navigation
  const validSteps: WorkflowStep[] = ['configuration', 'gestion', 'espace_apprenant', 'suivi']
  const [activeStep, setActiveStepInternal] = useState<WorkflowStep>(() => {
    // Initialiser depuis l'URL si disponible
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const stepFromUrl = params.get('step') as WorkflowStep | null
      if (stepFromUrl && validSteps.includes(stepFromUrl)) {
        return stepFromUrl
      }
    }
    return 'configuration'
  })
  const [activeTab, setActiveTab] = useState<ConfigTab>('initialisation')
  const [activeGestionTab, setActiveGestionTab] = useState<GestionTab>('conventions')

  // Synchroniser l'état avec l'URL quand le paramètre change
  useEffect(() => {
    const stepFromUrl = searchParams.get('step') as WorkflowStep | null
    if (stepFromUrl && validSteps.includes(stepFromUrl) && stepFromUrl !== activeStep) {
      setActiveStepInternal(stepFromUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Fonction pour changer d'étape et mettre à jour l'URL
  const handleStepChange = (step: WorkflowStep) => {
    setActiveStepInternal(step)
    const params = new URLSearchParams(searchParams.toString())
    params.set('step', step)
    router.push(`/dashboard/sessions/${sessionId}?${params.toString()}`, { scroll: false })
  }

  // États pour les formulaires
  const [formData, setFormData] = useState<SessionFormData>({
    name: '',
    type: 'formation_professionnelle',
    code: '',
    manager1_id: '',
    manager2_id: '',
    inter_entreprise: true,
    sous_traitance: false,
    timezone: 'Europe/Paris',
    formation_id: '',
    program_ids: [],
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    location: '',
    capacity_max: '',
    teacher_id: '',
    status: 'planned',
  })

  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false)
  const [enrollmentForm, setEnrollmentForm] = useState<EnrollmentFormData>({
    student_id: '',
    enrollment_date: new Date().toISOString().split('T')[0],
    status: 'confirmed',
    payment_status: 'pending',
    total_amount: '',
    paid_amount: '0',
  })

  const [showEvaluationForm, setShowEvaluationForm] = useState(false)
  const [evaluationForm, setEvaluationForm] = useState<EvaluationFormData>({
    subject: '',
    assessment_type: 'evaluation_generale',
    student_id: undefined,
    score: '',
    max_score: '20',
    percentage: '',
    notes: '',
    graded_at: new Date().toISOString().split('T')[0],
  })

  const [slotConfig, setSlotConfig] = useState<SlotConfig>({
    timeSlotType: 'both',
    morningStart: '09:00',
    morningEnd: '12:00',
    afternoonStart: '14:00',
    afternoonEnd: '17:00',
  })

  // États pour la génération en masse
  const [isGeneratingZip, setIsGeneratingZip] = useState(false)
  const [zipGenerationProgress, setZipGenerationProgress] = useState({ current: 0, total: 0 })
  const [lastZipGeneration, setLastZipGeneration] = useState<Date | null>(null)

  // Queries
  const { data: session, isLoading: isSessionLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionService.getSessionById(sessionId),
    enabled: !!sessionId,
  })

  const { data: programs } = useQuery({
    queryKey: ['programs', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return programService.getAllPrograms(user.organization_id, { isActive: true })
    },
    enabled: !!user?.organization_id,
  })

  const { data: formations } = useQuery({
    queryKey: ['formations', user?.organization_id, formData.program_ids],
    queryFn: async () => {
      if (!user?.organization_id) return []
      if (!formData.program_ids || formData.program_ids.length === 0) {
        return formationService.getAllFormations(user.organization_id, { isActive: true })
      }
      const allFormations = await formationService.getAllFormations(user.organization_id, { isActive: true })
      // Mapper programs: null en programs: undefined pour correspondre à FormationWithRelations
      const mappedFormations = allFormations.map((f: any) => ({
        ...f,
        programs: f.programs || undefined,
      }))
      return mappedFormations.filter((f: any) => 
        f.program_id && formData.program_ids.includes(f.program_id)
      )
    },
    enabled: !!user?.organization_id,
  })

  const { data: sessionPrograms } = useQuery({
    queryKey: ['session-programs', sessionId],
    queryFn: async () => {
      if (!sessionId) return []
      return sessionService.getSessionPrograms(sessionId)
    },
    enabled: !!sessionId,
  })

  const { data: users } = useQuery({
    queryKey: ['users', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .eq('organization_id', user.organization_id)
        .eq('is_active', true)
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  const { data: sessionSlots, refetch: refetchSlots } = useQuery({
    queryKey: ['session-slots', sessionId],
    queryFn: async () => {
      if (!sessionId) return []
      return sessionSlotService.getBySessionId(sessionId)
    },
    enabled: !!sessionId,
  })

  const { data: enrollments, isLoading: isEnrollmentsLoading } = useQuery({
    queryKey: ['session-enrollments', sessionId],
    queryFn: async () => {
      if (!sessionId) return []
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          students (
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
          ),
          sessions (*)
        `)
        .eq('session_id', sessionId)
        .order('enrollment_date', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!sessionId,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  const { data: payments } = useQuery({
    queryKey: ['session-payments', sessionId],
    queryFn: async () => {
      if (!sessionId) return []
      const { data, error } = await supabase
        .from('payments')
        .select('*, students(*), invoices(*)')
        .eq('organization_id', user?.organization_id || '')
        .in('student_id', (enrollments as EnrollmentWithRelations[])?.map((e) => e.student_id).filter((id): id is string => id !== null) || [])
        .order('paid_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!sessionId && !!enrollments && !!user?.organization_id,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  const { data: students } = useQuery({
    queryKey: ['students', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_number, email')
        .eq('organization_id', user.organization_id)
        .eq('status', 'active')
        .order('last_name', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  const { data: attendanceStats, isLoading: isAttendanceLoading } = useQuery({
    queryKey: ['session-attendance-stats', sessionId],
    queryFn: async () => {
      if (!sessionId) return null
      const { data, error } = await supabase
        .from('attendance')
        .select('status, student_id')
        .eq('session_id', sessionId)

      if (error) throw error

      const attendanceData = (data as any[]) || []
      const stats = {
        total: attendanceData.length,
        present: attendanceData.filter((a) => a.status === 'present').length,
        absent: attendanceData.filter((a) => a.status === 'absent').length,
        late: attendanceData.filter((a) => a.status === 'late').length,
        excused: attendanceData.filter((a) => a.status === 'excused').length,
        byStudent: {} as Record<string, { present: number; total: number }>,
      }

      attendanceData.forEach((a) => {
        if (!stats.byStudent[a.student_id]) {
          stats.byStudent[a.student_id] = { present: 0, total: 0 }
        }
        stats.byStudent[a.student_id].total++
        if (a.status === 'present' || a.status === 'late') {
          stats.byStudent[a.student_id].present++
        }
      })

      return stats
    },
    enabled: !!sessionId,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  const { data: grades, isLoading: isGradesLoading } = useQuery({
    queryKey: ['session-grades', sessionId],
    queryFn: async () => {
      if (!sessionId) return []
      const { data, error } = await supabase
        .from('grades')
        .select('*, students(*)')
        .eq('session_id', sessionId)
        .order('graded_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!sessionId,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  const { data: organization } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', user.organization_id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!user?.organization_id,
  })

  // Variables dérivées
  const sessionData = session as SessionWithRelations
  const formation = sessionData?.formations
  const program = formation?.programs

  // Initialiser le formulaire
  useEffect(() => {
    if (session && sessionPrograms) {
      const sessionData = session as SessionWithRelations & { session_programs?: Program[] }
      const formation = sessionData?.formations
      const program = formation?.programs

      let programIds: string[] = []
      if (sessionPrograms && (sessionPrograms as Program[]).length > 0) {
        programIds = (sessionPrograms as Program[]).map((p: Program) => p.id)
      } else if (sessionData.session_programs && sessionData.session_programs.length > 0) {
        programIds = (sessionData.session_programs as Program[]).map((p: Program) => p.id)
      } else if (program?.id) {
        programIds = [program.id]
      }

      setFormData({
        name: sessionData.name || '',
        type: 'formation_professionnelle',
        code: (sessionData as any).code || '',
        manager1_id: (sessionData as any).manager1_id || user?.id || '',
        manager2_id: (sessionData as any).manager2_id || '',
        inter_entreprise: (sessionData as any).inter_entreprise ?? true,
        sous_traitance: (sessionData as any).sous_traitance ?? false,
        timezone: (sessionData as any).timezone || 'Europe/Paris',
        formation_id: formation?.id || '',
        program_ids: programIds,
        start_date: sessionData.start_date?.split('T')[0] || '',
        end_date: sessionData.end_date?.split('T')[0] || '',
        start_time: sessionData.start_time || '',
        end_time: sessionData.end_time || '',
        location: sessionData.location || '',
        capacity_max: sessionData.capacity_max?.toString() || '',
        teacher_id: sessionData.teacher_id || '',
        status: (sessionData.status || 'planned') as 'completed' | 'planned' | 'ongoing' | 'cancelled',
      })

      if (formation) {
        setEnrollmentForm(prev => ({
          ...prev,
          total_amount: prev.total_amount || (formation as FormationWithRelations & { price?: number }).price?.toString() || '0',
        }))
      }
    }
  }, [session, user?.id, sessionPrograms])

  // Mutations
  const updateMutation = useMutation({
    mutationFn: async (updates: Parameters<typeof sessionService.updateSession>[1]) => {
      return sessionService.updateSession(sessionId, updates)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
      // Toast sera géré par le composant parent
    },
    onError: (error) => {
      // Toast sera géré par le composant parent
      logger.error('Erreur lors de la mise à jour de la session', error as Error, {
        sessionId,
      })
    },
  })

  const updateProgramsMutation = useMutation({
    mutationFn: async ({ programIds, organizationId }: { programIds: string[]; organizationId: string }) => {
      return sessionService.updateSessionPrograms(sessionId, programIds, organizationId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['session-programs', sessionId] })
    },
  })

  const generateSlotsMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId || !formData.start_date || !formData.end_date) {
        throw new Error('Les dates de début et de fin sont requises')
      }
      return sessionSlotService.generateSlots({
        sessionId,
        startDate: formData.start_date,
        endDate: formData.end_date,
        timeSlotType: slotConfig.timeSlotType === 'full_day' ? 'both' : slotConfig.timeSlotType,
        morningStart: slotConfig.morningStart,
        morningEnd: slotConfig.morningEnd,
        afternoonStart: slotConfig.afternoonStart,
        afternoonEnd: slotConfig.afternoonEnd,
        location: formData.location || undefined,
        teacherId: formData.teacher_id || undefined,
        capacityMax: formData.capacity_max ? parseInt(formData.capacity_max) : undefined,
      })
    },
    onSuccess: () => {
      refetchSlots()
    },
    onError: (error) => {
      logger.error('Erreur lors de la génération des séances', error as Error, {
        sessionId,
        slotConfig,
      })
    },
  })

  const deleteSlotMutation = useMutation({
    mutationFn: async (slotId: string) => {
      return sessionSlotService.delete(slotId)
    },
    onSuccess: () => {
      refetchSlots()
    },
  })

  const createSlotMutation = useMutation({
    mutationFn: async (slot: { date: string; time_slot: string; start_time: string; end_time: string }) => {
      return sessionSlotService.create({
        session_id: sessionId,
        date: slot.date,
        time_slot: slot.time_slot as 'morning' | 'afternoon' | 'full_day',
        start_time: slot.start_time,
        end_time: slot.end_time,
        location: formData.location || null,
        teacher_id: formData.teacher_id || null,
        capacity_max: formData.capacity_max ? parseInt(formData.capacity_max) : null,
      })
    },
    onSuccess: () => {
      refetchSlots()
    },
  })

  const createEnrollmentMutation = useMutation({
    mutationFn: async () => {
      // Validation Zod avant traitement
      try {
        const dataToValidate: EnrollmentFormDataZod = {
          student_id: enrollmentForm.student_id,
          session_id: sessionId,
          enrollment_date: enrollmentForm.enrollment_date,
          status: enrollmentForm.status,
          payment_status: enrollmentForm.payment_status,
          total_amount: enrollmentForm.total_amount || '',
          paid_amount: enrollmentForm.paid_amount || '0',
        }

        enrollmentSchema.parse(dataToValidate)
      } catch (error) {
        if (error instanceof Error || (error as any).errors) {
          const zodErrors = (error as any).errors || []
          const errorMessages = zodErrors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
          throw new Error(`Erreur de validation : ${errorMessages}`)
        }
        throw error
      }

      // Récupérer les détails de la session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id, start_date, end_date, status, capacity_max')
        .eq('id', sessionId)
        .single()

      if (sessionError || !sessionData) {
        throw new Error('Session non trouvée')
      }

      // Vérifier que la session n'est pas terminée
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const endDate = sessionData.end_date ? new Date(sessionData.end_date) : null
      if (endDate) {
        endDate.setHours(23, 59, 59, 999)
      }

      if (
        sessionData.status === 'completed' ||
        sessionData.status === 'cancelled' ||
        (endDate && endDate < today)
      ) {
        throw new Error('Impossible d\'inscrire un apprenant à une session terminée ou annulée')
      }

      // Vérifier si l'inscription existe déjà
      const { data: existing } = await supabase
        .from('enrollments')
        .select('id')
        .eq('session_id', sessionId)
        .eq('student_id', enrollmentForm.student_id)
        .maybeSingle()

      if (existing) {
        throw new Error('Cet élève est déjà inscrit à cette session')
      }

      // Vérifier la capacité si définie
      if (sessionData.capacity_max !== null && sessionData.capacity_max > 0) {
        const { count: enrollmentCount, error: countError } = await supabase
          .from('enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', sessionId)
          .in('status', ['confirmed', 'pending'])

        if (countError) {
          throw new Error('Erreur lors de la vérification de la capacité')
        }

        if (enrollmentCount !== null && enrollmentCount >= sessionData.capacity_max) {
          throw new Error(`La session est complète (${sessionData.capacity_max} apprenants maximum)`)
        }
      }

      const { data, error } = await supabase
        .from('enrollments')
        .insert({
          student_id: enrollmentForm.student_id,
          session_id: sessionId,
          enrollment_date: enrollmentForm.enrollment_date,
          status: enrollmentForm.status,
          payment_status: enrollmentForm.payment_status,
          total_amount: parseFloat(enrollmentForm.total_amount) || 0,
          paid_amount: parseFloat(enrollmentForm.paid_amount) || 0,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error('Cet élève est déjà inscrit à cette session')
        }
        throw error
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-enrollments', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
      setShowEnrollmentForm(false)
      setEnrollmentForm({
        student_id: '',
        enrollment_date: new Date().toISOString().split('T')[0],
        status: 'confirmed',
        payment_status: 'pending',
        total_amount: (formation as FormationWithRelations & { price?: number })?.price?.toString() || '0',
        paid_amount: '0',
      })
    },
  })

  const cancelEnrollmentMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      // Récupérer l'inscription
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('id, session_id, student_id')
        .eq('id', enrollmentId)
        .single()

      if (enrollmentError || !enrollment) {
        throw new Error('Inscription non trouvée')
      }

      // Récupérer les détails de la session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id, start_date, end_date, status')
        .eq('id', enrollment.session_id || '')
        .single()

      if (sessionError || !sessionData) {
        throw new Error('Session non trouvée')
      }

      // Vérifier que la session n'est pas terminée
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const endDate = sessionData.end_date ? new Date(sessionData.end_date) : null
      if (endDate) {
        endDate.setHours(23, 59, 59, 999)
      }

      if (
        sessionData.status === 'completed' ||
        (endDate && endDate < today)
      ) {
        throw new Error('Impossible d\'annuler une inscription pour une session déjà terminée')
      }

      // Vérifier s'il existe une facture pour cette inscription
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('id, document_type, status')
        .eq('enrollment_id', enrollmentId)
        .eq('document_type', 'invoice')
        .maybeSingle()

      if (invoiceError) {
        throw new Error('Erreur lors de la vérification des factures')
      }

      if (invoice) {
        throw new Error('Impossible d\'annuler une inscription pour laquelle une facture a été émise')
      }

      // Annuler l'inscription
      const { data, error } = await supabase
        .from('enrollments')
        .update({ status: 'cancelled' })
        .eq('id', enrollmentId)
        .select()
        .single()

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-enrollments', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
      addToast({
        type: 'success',
        title: 'Inscription annulée',
        description: 'L\'inscription a été annulée avec succès.',
      })
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'annulation de l\'inscription.',
      })
      logger.error('Erreur lors de l\'annulation de l\'inscription', error as Error, {
        sessionId,
      })
    },
  })

  // Fonction pour mapper les types d'évaluation du formulaire vers les valeurs de la base de données
  // Les valeurs autorisées par la contrainte CHECK sont : 'pre_formation', 'hot', 'cold', 'manager', 'instructor', 'funder', 'quiz', 'exam', 'project', 'other'
  const mapAssessmentType = (formType: string | null | undefined): string => {
    if (!formType) return 'other' // Toujours retourner une valeur valide, jamais null
    
    const typeMap: Record<string, string> = {
      'evaluation_generale': 'other',
      'preformation': 'pre_formation',
      'a_chaud': 'hot',
      'a_froid': 'cold',
      'managers': 'manager',
      'intervenants': 'instructor',
      'financeurs': 'funder',
      'quiz': 'quiz',
      'exam': 'exam',
      'project': 'project',
      'other': 'other',
      // Valeurs déjà correctes
      'pre_formation': 'pre_formation',
      'hot': 'hot',
      'cold': 'cold',
      'manager': 'manager',
      'instructor': 'instructor',
      'funder': 'funder',
    }
    
    return typeMap[formType] || 'other'
  }

  const createEvaluationMutation = useMutation({
    mutationFn: async () => {
      if (!evaluationForm.subject) {
        throw new Error('Le sujet est requis')
      }

      if (!user?.organization_id) {
        throw new Error('Organisation non trouvée')
      }

      // Les notes sont optionnelles - peuvent être ajoutées plus tard
      const maxScore = evaluationForm.max_score ? parseFloat(evaluationForm.max_score) : null
      const score = evaluationForm.score ? parseFloat(evaluationForm.score) : null

      // Mapper le type d'évaluation
      const mappedAssessmentType = mapAssessmentType(evaluationForm.assessment_type)
      
      // Préparer les données d'évaluation
      // NOTE: percentage est une colonne générée, on ne l'inclut pas dans l'insertion
      // NOTE: score et max_score sont optionnels - peuvent être null si la note sera calculée plus tard
      const evaluationData: any = {
        subject: evaluationForm.subject,
        assessment_type: mappedAssessmentType, // Toujours une valeur valide, jamais null
        student_id: evaluationForm.student_id || null,
        session_id: sessionId,
        score: score, // Peut être null si la note sera calculée plus tard
        max_score: maxScore, // Peut être null si la note sera calculée plus tard
        // Ne pas inclure percentage - c'est une colonne générée calculée automatiquement
        notes: evaluationForm.notes || null,
        graded_at: evaluationForm.graded_at || new Date().toISOString(),
        teacher_id: user.id || null,
      }
      
      // Nettoyer les valeurs undefined
      Object.keys(evaluationData).forEach(key => {
        if (evaluationData[key] === undefined) {
          evaluationData[key] = null
        }
      })

      try {
        // Utiliser le service d'évaluation qui gère mieux les erreurs
        return await evaluationService.create(user.organization_id, evaluationData)
      } catch (error: any) {
        // Logger l'erreur complète pour le débogage
        console.error('Erreur détaillée création évaluation:', {
          error,
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          evaluationData,
          organizationId: user.organization_id,
        })
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-grades', sessionId] })
      setShowEvaluationForm(false)
      setEvaluationForm({
        subject: '',
        assessment_type: 'evaluation_generale',
        student_id: undefined,
        score: '',
        max_score: '20',
        percentage: '',
        notes: '',
        graded_at: new Date().toISOString().split('T')[0],
      })
      addToast({
        type: 'success',
        title: 'Évaluation créée',
        description: 'L\'évaluation a été créée avec succès.',
      })
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la création de l\'évaluation.',
      })
      logger.error('Erreur lors de la création de l\'évaluation', error as Error, {
        sessionId,
        evaluationForm,
      })
    },
  })

  const handleSave = async () => {
    // Validation Zod avant sauvegarde
    try {
      const dataToValidate: SessionFormDataZod = {
        formation_id: formData.formation_id,
        name: formData.name,
        code: formData.code || '',
        start_date: formData.start_date,
        end_date: formData.end_date,
        start_time: formData.start_time || '',
        end_time: formData.end_time || '',
        location: formData.location || '',
        capacity_max: formData.capacity_max || '',
        currency: 'XOF',
        status: formData.status,
        teacher_id: formData.teacher_id || '',
        manager1_id: formData.manager1_id || '',
        manager2_id: formData.manager2_id || '',
        inter_entreprise: formData.inter_entreprise,
        sous_traitance: formData.sous_traitance,
        timezone: formData.timezone,
        program_ids: formData.program_ids,
      }

      // Valider avec Zod
      sessionSchema.parse(dataToValidate)
    } catch (error) {
      if (error instanceof Error || (error as any).errors) {
        const zodErrors = (error as any).errors || []
        const errorMessages = zodErrors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
        addToast({
          type: 'error',
          title: 'Erreur de validation',
          description: `Veuillez corriger les erreurs suivantes : ${errorMessages}`,
        })
        logger.error('Erreur de validation Zod', error as Error, { formData })
        return
      }
    }

    const updates: any = {
      name: formData.name,
      start_date: formData.start_date,
      end_date: formData.end_date,
      start_time: formData.start_time || null,
      end_time: formData.end_time || null,
      location: formData.location || null,
      capacity_max: formData.capacity_max ? parseInt(formData.capacity_max) : null,
      teacher_id: formData.teacher_id || null,
      status: formData.status,
    }

    if (formData.formation_id && formData.formation_id !== sessionData?.formation_id) {
      updates.formation_id = formData.formation_id
    }

    await updateMutation.mutateAsync(updates)

    if (user?.organization_id && formData.program_ids) {
      await updateProgramsMutation.mutateAsync({
        programIds: formData.program_ids,
        organizationId: user.organization_id,
      })
    }
  }

  // Calcul des statistiques des notes
  const gradesStats = grades && (grades as GradeWithRelations[]).length > 0
    ? {
        total: (grades as GradeWithRelations[]).length,
        average: (grades as GradeWithRelations[]).reduce((sum, g) => sum + (Number(g.score) || 0), 0) / (grades as GradeWithRelations[]).length,
        averagePercentage: (grades as GradeWithRelations[]).reduce((sum, g) => {
          const maxScore = Number(g.max_score) || 20
          const score = Number(g.score) || 0
          return sum + (score / maxScore) * 100
        }, 0) / (grades as GradeWithRelations[]).length,
      }
    : null

  const isGlobalLoading = isSessionLoading || isEnrollmentsLoading || isAttendanceLoading || isGradesLoading

  return {
    // États de navigation
    activeStep,
    setActiveStep: handleStepChange,
    activeTab,
    setActiveTab,
    activeGestionTab,
    setActiveGestionTab,

    // Formulaires
    formData,
    setFormData,
    enrollmentForm,
    setEnrollmentForm,
    showEnrollmentForm,
    setShowEnrollmentForm,
    evaluationForm,
    setEvaluationForm,
    showEvaluationForm,
    setShowEvaluationForm,
    slotConfig,
    setSlotConfig,

    // Génération
    isGeneratingZip,
    setIsGeneratingZip,
    zipGenerationProgress,
    setZipGenerationProgress,
    lastZipGeneration,
    setLastZipGeneration,

    // Données
    session,
    sessionData,
    formation,
    program,
    programs: programs as Program[] | undefined,
    formations: formations as FormationWithRelations[] | undefined,
    sessionPrograms: sessionPrograms as Program[] | undefined,
    users: users as User[] | undefined,
    sessionSlots: sessionSlots as SessionSlot[] | undefined,
    enrollments: enrollments as EnrollmentWithRelations[] | undefined,
    payments: payments as any[] | undefined,
    students: students as any[] | undefined,
    attendanceStats,
    grades: grades as GradeWithRelations[] | undefined,
    gradesStats,
    organization: organization as Organization | undefined,

    // États de chargement
    isLoading: isGlobalLoading,

    // Mutations
    updateMutation,
    updateProgramsMutation,
    generateSlotsMutation,
    deleteSlotMutation,
    createSlotMutation,
    createEnrollmentMutation,
    cancelEnrollmentMutation,
    createEvaluationMutation,

    // Actions
    handleSave,
    refetchSlots,

    // Utilitaires
    user,
    router,
    queryClient,
    supabase,
  }
}
