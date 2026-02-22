import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { sessionService } from '@/lib/services/session.service'
import { programService } from '@/lib/services/program.service'
import { formationService } from '@/lib/services/formation.service'
import { sessionSlotService } from '@/lib/services/session-slot.service'
import { evaluationService } from '@/lib/services/evaluation.service'
import { emailService } from '@/lib/services/email.service'
import { evaluationTemplateService } from '@/lib/services/evaluation-template.service'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/components/ui/toast'
import { logger } from '@/lib/utils/logger'
import { formatDate } from '@/lib/utils'
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
  funding_type_id: string
}

/** Types d'évaluation "satisfaction" en base : avis + étoiles 0-5, pas de score */
const SATISFACTION_ASSESSMENT_TYPES_DB = ['hot', 'cold', 'manager', 'instructor', 'funder']

export interface EvaluationFormData {
  template_id?: string
  subject: string
  assessment_type: string
  student_id: string | undefined
  score: string
  max_score: string
  percentage: string
  notes: string
  graded_at: string
  /** Note satisfaction 0-5 (étoiles) pour types à chaud / à froid / apprenants / financeurs */
  rating?: string
  sendByEmail?: boolean
  addToPersonalSpace?: boolean
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
  const [activeTab, setActiveTab] = useState<ConfigTab>(() => {
    // Initialiser depuis l'URL si disponible
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tabFromUrl = params.get('tab') as ConfigTab | null
      if (tabFromUrl && ['initialisation', 'dates_prix', 'apprenants', 'programme', 'intervenants'].includes(tabFromUrl)) {
        return tabFromUrl
      }
    }
    return 'initialisation'
  })
  const [activeGestionTab, setActiveGestionTab] = useState<GestionTab>(() => {
    // Initialiser depuis l'URL si disponible
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const gestionTabFromUrl = params.get('gestionTab') as GestionTab | null
      // Support aussi du paramètre "tab" pour compatibilité avec "finances"
      const tabFromUrl = params.get('tab') as GestionTab | null
      const finalTab = gestionTabFromUrl || tabFromUrl
      if (finalTab && ['conventions', 'convocations', 'evaluations', 'finances', 'espace_entreprise', 'automatisation'].includes(finalTab)) {
        return finalTab
      }
    }
    return 'conventions'
  })

  // Synchroniser l'état avec l'URL quand le paramètre change
  useEffect(() => {
    const stepFromUrl = searchParams.get('step') as WorkflowStep | null
    const tabFromUrl = searchParams.get('tab') as ConfigTab | null
    const gestionTabFromUrl = searchParams.get('gestionTab') as GestionTab | null
    
    if (stepFromUrl && validSteps.includes(stepFromUrl) && stepFromUrl !== activeStep) {
      setActiveStepInternal(stepFromUrl)
    }
    
    if (tabFromUrl && ['initialisation', 'dates_prix', 'apprenants', 'programme', 'intervenants'].includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
    
    if (gestionTabFromUrl && ['conventions', 'convocations', 'evaluations', 'finances', 'espace_entreprise', 'automatisation'].includes(gestionTabFromUrl) && gestionTabFromUrl !== activeGestionTab) {
      setActiveGestionTab(gestionTabFromUrl)
    }
    
    // Si on a un gestionTab dans l'URL, s'assurer que activeStep est 'gestion'
    if (gestionTabFromUrl && activeStep !== 'gestion') {
      setActiveStepInternal('gestion')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Fonction pour changer d'étape et mettre à jour l'URL
  const handleStepChange = (step: WorkflowStep) => {
    setActiveStepInternal(step)
    const params = new URLSearchParams(searchParams.toString())
    params.set('step', step)
    // Réinitialiser les tabs si on change d'étape
    if (step === 'configuration') {
      params.delete('gestionTab')
      params.delete('tab')
      params.set('tab', 'initialisation')
      setActiveTab('initialisation')
    } else if (step === 'gestion') {
      params.delete('tab')
      params.delete('gestionTab')
      params.set('gestionTab', 'conventions')
      setActiveGestionTab('conventions')
    } else {
      params.delete('tab')
      params.delete('gestionTab')
    }
    router.push(`/dashboard/sessions/${sessionId}?${params.toString()}`, { scroll: false })
  }
  
  // Fonction pour changer de tab de configuration et mettre à jour l'URL
  const handleConfigTabChange = (tab: ConfigTab) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set('step', 'configuration')
    params.set('tab', tab)
    params.delete('gestionTab') // Nettoyer le paramètre gestionTab pour éviter les conflits
    router.push(`/dashboard/sessions/${sessionId}?${params.toString()}`, { scroll: false })
  }
  
  // Fonction pour changer de tab de gestion et mettre à jour l'URL
  const handleGestionTabChange = (tab: GestionTab) => {
    setActiveGestionTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set('step', 'gestion')
    params.set('gestionTab', tab)
    params.delete('tab') // Nettoyer le paramètre tab pour éviter les conflits
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
    funding_type_id: '',
  })

  const [showEvaluationForm, setShowEvaluationForm] = useState(false)
  const [evaluationForm, setEvaluationForm] = useState<EvaluationFormData>({
    template_id: undefined,
    subject: '',
    assessment_type: 'evaluation_generale',
    student_id: undefined,
    score: '',
    max_score: '20',
    percentage: '',
    notes: '',
    graded_at: '',
    rating: undefined,
    sendByEmail: true,
    addToPersonalSpace: true,
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
      const result = await formationService.getAllFormations(user.organization_id, { isActive: true })
      const allFormations = Array.isArray(result) ? result : result.data

      if (!formData.program_ids || formData.program_ids.length === 0) {
        return allFormations
      }
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
    staleTime: 60 * 1000, // 1 min
  })

  const { data: sessionModules, refetch: refetchSessionModules } = useQuery({
    queryKey: ['session-modules', sessionId],
    queryFn: async () => {
      if (!sessionId) return []
      const { data, error } = await supabase
        .from('session_modules' as any)
        .select('*')
        .eq('session_id', sessionId)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data || []) as unknown as Array<{ id: string; session_id: string; name: string; amount: number; currency: string; display_order: number }>
    },
    enabled: !!sessionId,
    staleTime: 60 * 1000, // 1 min
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
      if (!sessionId || !enrollments || enrollments.length === 0) return []

      // Récupérer les IDs des inscriptions de cette session
      const enrollmentIds = (enrollments as EnrollmentWithRelations[])
        .map((e) => e.id)
        .filter((id): id is string => id !== null)

      if (enrollmentIds.length === 0) return []

      // Récupérer d'abord les factures liées à ces inscriptions
      const { data: sessionInvoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id')
        .in('enrollment_id', enrollmentIds)

      if (invoicesError) throw invoicesError

      const invoiceIds = (sessionInvoices || []).map((inv) => inv.id)

      if (invoiceIds.length === 0) return []

      // Récupérer les paiements liés à ces factures
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- évite "Type instantiation is excessively deep"
      const q: any = supabase
        .from('payments')
        .select('*, students(*), invoices(*)')
        .eq('organization_id', user?.organization_id || '')
        .in('invoice_id', invoiceIds)
        .order('paid_at', { ascending: false })
      const { data, error } = await q

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- évite "Type instantiation is excessively deep"
      const q: any = supabase
        .from('grades')
        .select('*, students(*)')
        .eq('session_id', sessionId)
        .order('graded_at', { ascending: false })
      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    enabled: !!sessionId,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  // Map grade_id -> template_id pour savoir quelles évaluations ont un quiz côté apprenant
  const { data: gradeInstanceMap = {} } = useQuery({
    queryKey: ['session-grade-instances', (grades ?? []).map((g: any) => g.id).filter(Boolean)],
    queryFn: async () => {
      const gradeIds = (grades ?? []).map((g: any) => g.id).filter(Boolean)
      if (gradeIds.length === 0) return {} as Record<string, string>
      const { data, error } = await supabase
        .from('evaluation_template_instances')
        .select('grade_id, template_id')
        .in('grade_id', gradeIds)
      if (error) {
        logger.debug('Récupération instances évaluation', { error: error.message })
        return {} as Record<string, string>
      }
      const map: Record<string, string> = {}
      ;(data || []).forEach((row: any) => {
        if (row.grade_id && row.template_id) map[row.grade_id] = row.template_id
      })
      return map
    },
    enabled: !!sessionId && (grades ?? []).length > 0,
  })

  const attachTemplateToGradeMutation = useMutation({
    mutationFn: async ({ gradeId, templateId }: { gradeId: string; templateId: string }) => {
      await evaluationTemplateService.createInstance(gradeId, templateId)
    },
    onSuccess: (_data, { gradeId, templateId }) => {
      queryClient.invalidateQueries({ queryKey: ['session-grades', sessionId] })
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string) === 'session-grade-instances' })
      addToast({
        type: 'success',
        title: 'Modèle associé',
        description: "L'apprenant pourra maintenant passer le quiz pour cette évaluation.",
      })
      logger.info('Instance de modèle créée pour un grade existant', { gradeId, templateId })
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error?.message || 'Impossible d\'associer le modèle.',
      })
    },
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

  // Charger les modèles d'évaluations
  const { data: evaluationTemplates } = useQuery({
    queryKey: ['evaluation-templates', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return evaluationTemplateService.getTemplates(user.organization_id)
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

      // Note: le total_amount sera mis à jour par l'effet sessionModules ci-dessous
    }
  }, [session, user?.id, sessionPrograms])

  // Mettre à jour le montant par défaut du formulaire d'inscription quand les modules changent
  useEffect(() => {
    if (sessionModules && sessionModules.length > 0) {
      const modulesTotal = sessionModules.reduce((sum, m) => sum + Number(m.amount || 0), 0)
      setEnrollmentForm(prev => ({
        ...prev,
        total_amount: prev.total_amount || modulesTotal.toString(),
      }))
    } else if (formation) {
      // Fallback au prix de la formation si pas de modules
      setEnrollmentForm(prev => ({
        ...prev,
        total_amount: prev.total_amount || (formation as FormationWithRelations & { price?: number }).price?.toString() || '0',
      }))
    }
  }, [sessionModules, formation])

  // Mutations
  const updateMutation = useMutation({
    mutationFn: async (updates: Parameters<typeof sessionService.updateSession>[1]) => {
      return sessionService.updateSession(sessionId, updates)
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
      // Si teacher_id a été modifié, invalider aussi les caches des sessions enseignants
      if ((variables as any)?.teacher_id !== undefined) {
        queryClient.invalidateQueries({ queryKey: ['teacher-dashboard-sessions'], exact: false })
        queryClient.invalidateQueries({ queryKey: ['teacher-session-ids'], exact: false })
        queryClient.invalidateQueries({ queryKey: ['teacher-sessions'], exact: false })
      }
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
          funding_type_id: enrollmentForm.funding_type_id || null,
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
      // Utiliser le total des modules ou le prix de la formation comme fallback
      const modulesTotal = sessionModules?.reduce((sum, m) => sum + Number(m.amount || 0), 0) || 0
      const defaultTotal = modulesTotal > 0
        ? modulesTotal.toString()
        : (formation as FormationWithRelations & { price?: number })?.price?.toString() || '0'
      setEnrollmentForm({
        student_id: '',
        enrollment_date: new Date().toISOString().split('T')[0],
        status: 'confirmed',
        payment_status: 'pending',
        total_amount: defaultTotal,
        paid_amount: '0',
        funding_type_id: '',
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

      const mappedAssessmentType = mapAssessmentType(evaluationForm.assessment_type)
      const isSatisfactionType = SATISFACTION_ASSESSMENT_TYPES_DB.includes(mappedAssessmentType)

      // Pour les types satisfaction (à chaud, à froid, apprenants, financeurs) : à la création on ne met
      // jamais graded_at ni rating, pour que l'évaluation reste dans "À faire" côté apprenant jusqu'à
      // ce qu'il remplisse le quiz (ou qu'un formateur corrige manuellement plus tard).
      const ratingValue =
        isSatisfactionType && evaluationForm.rating !== undefined && evaluationForm.rating !== ''
          ? parseInt(evaluationForm.rating, 10)
          : null
      const score =
        isSatisfactionType ? null : evaluationForm.score ? parseFloat(evaluationForm.score) : null
      const maxScore =
        isSatisfactionType ? null : evaluationForm.max_score ? parseFloat(evaluationForm.max_score) : null
      const hasResult = isSatisfactionType ? false : (score !== null && score !== undefined)
      const gradedAt =
        !isSatisfactionType &&
        hasResult &&
        evaluationForm.graded_at &&
        evaluationForm.graded_at.trim() !== ''
          ? evaluationForm.graded_at
          : !isSatisfactionType && hasResult
            ? new Date().toISOString()
            : null

      const evaluationData: any = {
        subject: evaluationForm.subject,
        assessment_type: mappedAssessmentType,
        student_id: evaluationForm.student_id || null,
        session_id: sessionId,
        score: score,
        max_score: maxScore,
        notes: evaluationForm.notes || null,
        graded_at: gradedAt,
        teacher_id: user.id || null,
      }
      // Ne pas renseigner rating à la création pour les types satisfaction (sera rempli par l'apprenant ou en correction manuelle)
      if (isSatisfactionType) {
        evaluationData.rating = null
      }
      
      // Nettoyer les valeurs undefined
      Object.keys(evaluationData).forEach(key => {
        if (evaluationData[key] === undefined) {
          evaluationData[key] = null
        }
      })

      try {
        // Si addToPersonalSpace est activé, s'assurer que l'évaluation a un student_id
        if (evaluationForm.addToPersonalSpace) {
          if (evaluationForm.student_id) {
            // Évaluation individuelle - créer avec le student_id du formulaire
            // evaluationData contient déjà le student_id, donc on peut créer directement
            logger.info('Création évaluation individuelle avec addToPersonalSpace', {
              studentId: evaluationForm.student_id,
              subject: evaluationForm.subject,
            })
            const created = await evaluationService.create(user.organization_id, evaluationData)
            logger.info('Évaluation créée avec succès', {
              evaluationId: created?.id,
              studentId: created?.student_id,
            })
            // Lier le modèle d'évaluation au grade pour que l'apprenant voie le quiz
            if (created?.id && evaluationForm.template_id) {
              try {
                await evaluationTemplateService.createInstance(created.id, evaluationForm.template_id)
                logger.info('Instance de modèle d\'évaluation créée pour le grade', {
                  gradeId: created.id,
                  templateId: evaluationForm.template_id,
                })
              } catch (instanceErr: any) {
                logger.warn('Impossible de lier le modèle au grade (l\'apprenant ne verra pas le quiz)', {
                  gradeId: created.id,
                  templateId: evaluationForm.template_id,
                  error: instanceErr?.message,
                })
              }
            }
            return created
          } else if (enrollments) {
            // Évaluation collective - créer une évaluation pour chaque étudiant de la session
            const validEnrollments = (enrollments as EnrollmentWithRelations[]).filter(
              (e) => e.students && e.status !== 'cancelled'
            )
            
            logger.info('Création évaluations collectives avec addToPersonalSpace', {
              enrollmentsCount: validEnrollments.length,
              subject: evaluationForm.subject,
            })
            
            if (validEnrollments.length > 0) {
              // Créer une évaluation pour chaque étudiant
              const evaluationPromises = validEnrollments.map(async (enrollment) => {
                const studentEvaluationData = {
                  ...evaluationData,
                  student_id: enrollment.student_id,
                }
                logger.info('Création évaluation pour étudiant', {
                  studentId: enrollment.student_id,
                  studentName: enrollment.students?.first_name + ' ' + enrollment.students?.last_name,
                  organizationId: user.organization_id ?? undefined,
                  evaluationData: {
                    subject: studentEvaluationData.subject,
                    student_id: studentEvaluationData.student_id,
                    session_id: studentEvaluationData.session_id,
                  },
                })
                const created = await evaluationService.create(user.organization_id ?? '', studentEvaluationData)
                logger.info('Évaluation créée pour étudiant', {
                  evaluationId: created?.id,
                  studentId: created?.student_id,
                  organizationId: created?.organization_id ?? undefined,
                  subject: created?.subject,
                  sessionId: created?.session_id ?? undefined,
                })
                // Lier le modèle d'évaluation au grade pour que l'apprenant voie le quiz
                if (created?.id && evaluationForm.template_id) {
                  try {
                    await evaluationTemplateService.createInstance(created.id, evaluationForm.template_id as string)
                    logger.info('Instance de modèle d\'évaluation créée pour le grade', {
                      gradeId: created.id,
                      templateId: evaluationForm.template_id,
                    })
                  } catch (instanceErr: any) {
                    logger.warn('Impossible de lier le modèle au grade (l\'apprenant ne verra pas le quiz)', {
                      gradeId: created.id,
                      templateId: evaluationForm.template_id,
                      error: instanceErr?.message,
                    })
                  }
                }
                
                // Vérifier immédiatement que l'évaluation peut être récupérée avec le client dashboard
                try {
                  const { data: verifyData, error: verifyError } = await supabase
                    .from('grades')
                    .select('id, student_id, subject, organization_id, session_id')
                    .eq('id', created.id)
                    .maybeSingle()
                  
                  if (verifyError) {
                    logger.warn('Impossible de vérifier l\'évaluation créée', { 
                      error: verifyError,
                      evaluationId: created.id,
                    })
                  } else if (!verifyData) {
                    logger.error('❌ Évaluation créée mais non trouvée lors de la vérification', {
                      evaluationId: created.id,
                      studentId: enrollment.student_id,
                      createdData: created,
                    })
                  } else {
                    logger.info('✅ Évaluation vérifiée avec succès (dashboard client)', {
                      evaluationId: verifyData.id,
                      studentId: verifyData.student_id,
                      organizationId: verifyData.organization_id ?? undefined,
                      sessionId: verifyData.session_id ?? undefined,
                    })
                    
                    // Vérifier aussi avec un client learner simulé
                    try {
                      const learnerClient = createClient()
                      // Note: Le client learner utilise un header spécial, mais on peut quand même tester
                      const { data: learnerVerifyData, error: learnerVerifyError } = await learnerClient
                        .from('grades')
                        .select('id, student_id, subject')
                        .eq('student_id', enrollment.student_id ?? '')
                        .eq('id', created.id)
                        .maybeSingle()
                      
                      if (learnerVerifyError) {
                        logger.warn('⚠️ Client learner ne peut pas accéder à l\'évaluation (RLS?)', {
                          error: learnerVerifyError,
                          evaluationId: created.id,
                          studentId: enrollment.student_id,
                        })
                      } else if (!learnerVerifyData) {
                        logger.warn('⚠️ Client learner ne trouve pas l\'évaluation (RLS?)', {
                          evaluationId: created.id,
                          studentId: enrollment.student_id,
                        })
                      } else {
                        logger.info('✅ Client learner peut accéder à l\'évaluation', {
                          evaluationId: learnerVerifyData.id,
                          studentId: learnerVerifyData.student_id,
                        })
                      }
                    } catch (learnerErr) {
                      logger.warn('Erreur lors de la vérification avec client learner', { error: learnerErr })
                    }
                  }
                } catch (verifyErr) {
                  logger.warn('Erreur lors de la vérification de l\'évaluation', { error: verifyErr })
                }
                
                return created
              })
              
              const createdEvaluations = await Promise.allSettled(evaluationPromises)
              
              // Logger les résultats détaillés
              const successful = createdEvaluations.filter(r => r.status === 'fulfilled')
              const failed = createdEvaluations.filter(r => r.status === 'rejected')
              
              logger.info('Résultats création évaluations collectives', {
                successful: successful.length,
                failed: failed.length,
                total: createdEvaluations.length,
                successfulIds: successful.map(r => r.status === 'fulfilled' ? r.value?.id : null).filter(Boolean),
                failedErrors: failed.map(r => r.status === 'rejected' ? r.reason : null).filter(Boolean),
              })
              
              // Logger les erreurs en détail
              failed.forEach((result, index) => {
                if (result.status === 'rejected') {
                  logger.error(`Erreur création évaluation ${index + 1}`, result.reason as Error, {
                    enrollmentIndex: index,
                    studentId: validEnrollments[index]?.student_id,
                  })
                }
              })
              
              // Vérifier que les évaluations créées sont bien dans la base
              if (successful.length > 0) {
                const firstSuccess = successful[0]
                if (firstSuccess.status === 'fulfilled' && firstSuccess.value?.id) {
                  // Vérifier immédiatement dans la base
                  const { data: dbCheck, error: dbError } = await supabase
                    .from('grades')
                    .select('id, student_id, organization_id, subject')
                    .in('id', successful
                      .filter(r => r.status === 'fulfilled' && r.value?.id)
                      .map(r => (r as any).value.id)
                      .slice(0, 5) // Vérifier les 5 premières
                    )
                  
                  if (dbError) {
                    logger.error('Erreur lors de la vérification en base', dbError, {
                      evaluationIds: successful
                        .filter(r => r.status === 'fulfilled' && r.value?.id)
                        .map(r => (r as any).value.id),
                    })
                  } else {
                    logger.info('Vérification en base réussie', {
                      found: dbCheck?.length || 0,
                      expected: successful.length,
                      evaluations: dbCheck,
                    })
                  }
                }
              }
              
              // Retourner la première évaluation créée avec succès
              const firstSuccess = createdEvaluations.find((result) => result.status === 'fulfilled')
              if (firstSuccess && firstSuccess.status === 'fulfilled') {
                logger.info('Première évaluation créée avec succès', {
                  evaluationId: firstSuccess.value?.id,
                  studentId: firstSuccess.value?.student_id,
                  organizationId: firstSuccess.value?.organization_id ?? undefined,
                })
                return firstSuccess.value
              }
              throw new Error('Erreur lors de la création des évaluations pour les étudiants')
            }
          }
        }
        
        // Si addToPersonalSpace n'est pas activé, créer l'évaluation normalement (peut être collective ou individuelle)
        logger.info('Création évaluation sans addToPersonalSpace', {
          studentId: evaluationForm.student_id || null,
          subject: evaluationForm.subject,
        })
        const created = await evaluationService.create(user.organization_id ?? '', evaluationData)
        logger.info('Évaluation créée', {
          evaluationId: created?.id,
          studentId: created?.student_id,
        })
        // Lier le modèle d'évaluation au grade pour que l'apprenant voie le quiz
        if (created?.id && evaluationForm.template_id) {
          try {
            await evaluationTemplateService.createInstance(created.id, evaluationForm.template_id as string)
            logger.info('Instance de modèle d\'évaluation créée pour le grade', {
              gradeId: created.id,
              templateId: evaluationForm.template_id,
            })
          } catch (instanceErr: any) {
            logger.warn('Impossible de lier le modèle au grade (l\'apprenant ne verra pas le quiz)', {
              gradeId: created.id,
              templateId: evaluationForm.template_id,
              error: instanceErr?.message,
            })
          }
        }
        return created
      } catch (error: any) {
        // Logger l'erreur complète pour le débogage
        logger.error('Erreur détaillée création évaluation:', {
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
    onSuccess: async (createdEvaluation) => {
      // Invalider les caches pour que les évaluations apparaissent immédiatement
      queryClient.invalidateQueries({ queryKey: ['session-grades', sessionId] })
      
      // Invalider aussi le cache de l'espace personnel de l'apprenant
      // Note: L'invalidation du cache côté dashboard ne peut pas directement invalider le cache côté learner
      // car ils utilisent des QueryClients différents. Les évaluations apparaîtront au prochain rafraîchissement
      // ou lors de la prochaine visite de la page /learner/evaluations
      
      // Pour forcer le rafraîchissement, on peut aussi invalider avec un pattern plus large
      if (evaluationForm.student_id) {
        queryClient.invalidateQueries({ queryKey: ['learner-grades', evaluationForm.student_id] })
        logger.info('Cache invalidé pour étudiant', { studentId: evaluationForm.student_id })
      } else if (evaluationForm.addToPersonalSpace && enrollments) {
        // Invalider pour tous les étudiants de la session si évaluation collective
        const validEnrollments = (enrollments as EnrollmentWithRelations[]).filter(
          (e) => e.students && e.status !== 'cancelled'
        )
        logger.info('Invalidation cache pour évaluations collectives', {
          studentsCount: validEnrollments.length,
        })
        validEnrollments.forEach((enrollment) => {
          if (enrollment.student_id) {
            queryClient.invalidateQueries({ queryKey: ['learner-grades', enrollment.student_id] })
          }
        })
      }
      
      setShowEvaluationForm(false)
      
      // Déterminer les étudiants à notifier
      const studentsToNotify: Array<{ email: string; firstName: string; lastName: string; studentId: string }> = []
      
      if (evaluationForm.student_id) {
        // Évaluation individuelle - envoyer à un seul étudiant
        const student = students?.find(s => s.id === evaluationForm.student_id)
        if (student && student.email) {
          studentsToNotify.push({
            email: student.email,
            firstName: student.first_name || '',
            lastName: student.last_name || '',
            studentId: student.id,
          })
        }
      } else if (evaluationForm.addToPersonalSpace) {
        // Évaluation collective avec addToPersonalSpace - utiliser les étudiants pour lesquels on a créé des évaluations
        const validEnrollments = (enrollments as EnrollmentWithRelations[])?.filter(
          (e) => e.students && e.students.email && e.status !== 'cancelled'
        ) || []
        
        validEnrollments.forEach((enrollment) => {
          const student = enrollment.students
          if (student && student.email) {
            studentsToNotify.push({
              email: student.email,
              firstName: student.first_name || '',
              lastName: student.last_name || '',
              studentId: student.id,
            })
          }
        })
      } else {
        // Évaluation collective sans addToPersonalSpace - envoyer à tous les étudiants de la session
        const validEnrollments = (enrollments as EnrollmentWithRelations[])?.filter(
          (e) => e.students && e.students.email && e.status !== 'cancelled'
        ) || []
        
        validEnrollments.forEach((enrollment) => {
          const student = enrollment.students
          if (student && student.email) {
            studentsToNotify.push({
              email: student.email,
              firstName: student.first_name || '',
              lastName: student.last_name || '',
              studentId: student.id,
            })
          }
        })
      }
      
      setEvaluationForm({
        template_id: undefined,
        subject: '',
        assessment_type: 'evaluation_generale',
        student_id: undefined,
        score: '',
        max_score: '20',
        percentage: '',
        notes: '',
        graded_at: '',
        rating: undefined,
        sendByEmail: true,
        addToPersonalSpace: true,
      })
      
      // Envoyer automatiquement un email à l'étudiant (ou tous les étudiants si évaluation collective) si l'option est activée
      if (evaluationForm.sendByEmail && studentsToNotify.length > 0) {
        try {
          // Envoyer les emails
          const sessionName = sessionData?.name || 'Session'
          const formationName = formation?.name || 'Formation'
          const organizationName = organization?.name || 'Organisation'
          
          const emailPromises = studentsToNotify.map(async (student) => {
            // Générer le lien vers l'évaluation dans l'espace personnel
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
            const evaluationLink = `${baseUrl}/learner/evaluations`
            
            const subject = `Nouvelle évaluation : ${evaluationForm.subject}`
            const emailBody = `
              <p>Bonjour ${student.firstName} ${student.lastName},</p>
              <p>Une nouvelle évaluation a été créée pour vous :</p>
              <ul style="margin: 20px 0; padding-left: 20px;">
                <li><strong>Sujet :</strong> ${evaluationForm.subject}</li>
                <li><strong>Session :</strong> ${sessionName}</li>
                <li><strong>Formation :</strong> ${formationName}</li>
                ${evaluationForm.rating !== undefined && evaluationForm.rating !== '' ? `<li><strong>Satisfaction :</strong> ${evaluationForm.rating}/5 étoiles</li>` : evaluationForm.score ? `<li><strong>Note :</strong> ${evaluationForm.score}/${evaluationForm.max_score || 20}</li>` : ''}
                ${evaluationForm.graded_at ? `<li><strong>Date de correction :</strong> ${formatDate(evaluationForm.graded_at)}</li>` : ''}
              </ul>
              ${evaluationForm.notes ? `<p><strong>Commentaires :</strong><br>${evaluationForm.notes.replace(/\n/g, '<br>')}</p>` : ''}
              <p style="margin: 20px 0;">
                <a href="${evaluationLink}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  Consulter l'évaluation dans mon espace personnel
                </a>
              </p>
              <p style="margin-top: 20px; color: #666; font-size: 14px;">
                Ou copiez ce lien dans votre navigateur :<br>
                <a href="${evaluationLink}" style="color: #2563eb; word-break: break-all;">${evaluationLink}</a>
              </p>
              <p>Cordialement,<br>${organizationName}</p>
            `
            
            try {
              await emailService.sendEmail({
                to: student.email,
                subject,
                html: emailBody,
              })
            } catch (emailError) {
              logger.error('Erreur lors de l\'envoi de l\'email d\'évaluation', emailError as Error, {
                studentEmail: student.email,
                evaluationId: createdEvaluation?.id,
              })
            }
          })
          
          await Promise.allSettled(emailPromises)
        } catch (emailError) {
          // Ne pas bloquer la création de l'évaluation si l'envoi d'email échoue
          logger.error('Erreur lors de l\'envoi automatique des emails d\'évaluation', emailError as Error, {
            evaluationId: createdEvaluation?.id,
          })
        }
      }
      
      // L'évaluation est automatiquement ajoutée à l'espace personnel si student_id est défini
      // ou si addToPersonalSpace est activé (dans ce cas, on crée une évaluation pour chaque étudiant)
      
      const successMessages = []
      if (evaluationForm.sendByEmail && studentsToNotify.length > 0) {
        successMessages.push(`envoyée par email à ${studentsToNotify.length} apprenant${studentsToNotify.length > 1 ? 's' : ''}`)
      }
      if (evaluationForm.addToPersonalSpace) {
        if (evaluationForm.student_id) {
          successMessages.push('ajoutée à l\'espace personnel')
        } else {
          // Évaluation collective - on a créé une évaluation pour chaque étudiant
          successMessages.push(`ajoutée aux espaces personnels de ${studentsToNotify.length} apprenant${studentsToNotify.length > 1 ? 's' : ''}`)
        }
      }
      
      addToast({
        type: 'success',
        title: 'Évaluation créée',
        description: `L'évaluation a été créée avec succès${successMessages.length > 0 ? ` et ${successMessages.join(' et ')}` : ''}.`,
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

  // Fonction pour gérer le changement de modèle d'évaluation
  const handleTemplateChange = (templateId: string | undefined) => {
    if (!templateId) {
      setEvaluationForm({
        ...evaluationForm,
        template_id: undefined,
      })
      return
    }

    const template = evaluationTemplates?.find(t => t.id === templateId)
    if (template) {
      setEvaluationForm({
        ...evaluationForm,
        template_id: templateId,
        subject: template.subject || evaluationForm.subject,
        assessment_type: template.assessment_type || evaluationForm.assessment_type,
        max_score: template.max_score?.toString() || evaluationForm.max_score,
        notes: template.description || evaluationForm.notes,
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

  /** Invalide et refetch les données qui alimentent la timeline Suivi (session, inscriptions, présences, notes) */
  const refetchSessionDetail = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
    queryClient.invalidateQueries({ queryKey: ['session-enrollments', sessionId] })
    queryClient.invalidateQueries({ queryKey: ['session-attendance-stats', sessionId] })
    queryClient.invalidateQueries({ queryKey: ['session-grades', sessionId] })
    queryClient.invalidateQueries({ queryKey: ['session-payments', sessionId] })
  }, [queryClient, sessionId])

  return {
    // États de navigation
    activeStep,
    setActiveStep: handleStepChange,
    activeTab,
    setActiveTab: handleConfigTabChange,
    activeGestionTab,
    setActiveGestionTab: handleGestionTabChange,

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
    sessionModules: sessionModules || [],
    refetchSessionModules,
    enrollments: enrollments as EnrollmentWithRelations[] | undefined,
    payments: payments as any[] | undefined,
    students: students as any[] | undefined,
    attendanceStats,
    grades: grades as GradeWithRelations[] | undefined,
    gradesStats,
    organization: organization as Organization | undefined,
    evaluationTemplates: evaluationTemplates || [],

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
    attachTemplateToGradeMutation,

    // Données dérivées
    gradeInstanceMap,

    // Actions
    handleSave,
    refetchSlots,
    handleTemplateChange,
    refetchSessionDetail,

    // Utilitaires
    user,
    router,
    queryClient,
    supabase,
  }
}
