'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionService } from '@/lib/services/session.service'
import { programService } from '@/lib/services/program.service'
import { formationService } from '@/lib/services/formation.service'
import { sessionSlotService } from '@/lib/services/session-slot.service'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ArrowLeft, Save, Copy, Archive, Trash2, Settings, FolderOpen, 
  GraduationCap, CheckCircle, Calendar, Clock, MapPin, Users, 
  BookOpen, DollarSign, Building, Plus, FileText, Mail, Download,
  Star, XCircle, AlertCircle, X, UserPlus, TrendingUp, AlertTriangle,
  BarChart3, Activity, Percent, User, Award, ClipboardList, Eye, Trash
} from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { generatePDFFromHTML, generatePDFBlobFromHTML, createZipFromPDFs } from '@/lib/utils/pdf-generator'
import {
  generateConventionHTML,
  generateContractHTML,
  generateConvocationHTML,
  generateProgramHTML,
  generateTermsHTML,
  generatePrivacyPolicyHTML,
  generateSessionReportHTML,
  generateCertificateHTML,
} from '@/lib/utils/document-templates'
import { documentService } from '@/lib/services/document.service'
import { emailService } from '@/lib/services/email.service'
import { useToast } from '@/components/ui/toast'
import type { 
  SessionWithRelations, 
  EnrollmentWithRelations, 
  GradeWithRelations,
  FormationWithRelations,
  StudentWithRelations,
  DocumentWithRelations
} from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'

type Enrollment = TableRow<'enrollments'>
type Grade = TableRow<'grades'>
type User = TableRow<'users'>
type Program = TableRow<'programs'>
type Formation = TableRow<'formations'>
type Organization = TableRow<'organizations'>
type Payment = TableRow<'payments'>
type SessionSlot = TableRow<'session_slots'>

type WorkflowStep = 'configuration' | 'gestion' | 'espace_apprenant' | 'suivi'
type ConfigTab = 'initialisation' | 'dates_prix' | 'apprenants' | 'programme' | 'intervenants'
type GestionTab = 'conventions' | 'convocations' | 'evaluations' | 'finances' | 'espace_entreprise'

// Composant pour afficher les documents d'un apprenant
function StudentDocumentsSection({ 
  studentId, 
  organizationId 
}: { 
  studentId: string
  organizationId: string 
}) {
  const { data: documents, isLoading } = useQuery({
    queryKey: ['student-documents', studentId, organizationId],
    queryFn: async () => {
      if (!organizationId) return []
      return documentService.getAll(organizationId, {
        studentId: studentId,
      })
    },
    enabled: !!studentId && !!organizationId,
  })

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'certificate':
        return <Award className="h-4 w-4" />
      case 'transcript':
        return <FileText className="h-4 w-4" />
      case 'attestation':
        return <FileText className="h-4 w-4" />
      case 'contract':
        return <FileText className="h-4 w-4" />
      case 'convocation':
        return <Mail className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'certificate':
        return 'Certificat'
      case 'transcript':
        return 'Relevé de notes'
      case 'attestation':
        return 'Attestation'
      case 'contract':
        return 'Contrat'
      case 'convocation':
        return 'Convocation'
      case 'invoice':
        return 'Facture'
      case 'receipt':
        return 'Reçu'
      default:
        return type
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Documents partagés
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              addToast({
                type: 'info',
                title: 'Fonctionnalité à venir',
                description: 'L\'upload de documents sera implémenté prochainement. Vous pourrez ajouter des supports de cours, exercices et autres documents.',
                duration: 7000,
              })
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un document
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement des documents...</p>
        ) : documents && documents.length > 0 ? (
          <div className="space-y-3">
            {(documents as DocumentWithRelations[]).map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    {getDocumentTypeIcon(doc.type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {getDocumentTypeLabel(doc.type)}
                      {doc.created_at && ` • ${formatDate(doc.created_at)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {doc.file_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (doc.file_url) {
                          window.open(doc.file_url, '_blank')
                        }
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Aucun document partagé pour le moment</p>
            <p className="text-xs mt-1">Les supports de cours et exercices apparaîtront ici</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { addToast } = useToast()

  const [activeStep, setActiveStep] = useState<WorkflowStep>('configuration')
  const [activeTab, setActiveTab] = useState<ConfigTab>('initialisation')
  const [activeGestionTab, setActiveGestionTab] = useState<GestionTab>('conventions')
  
  // États pour la gestion des inscriptions
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false)
  const [enrollmentForm, setEnrollmentForm] = useState({
    student_id: '',
    enrollment_date: new Date().toISOString().split('T')[0],
    status: 'confirmed' as 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'failed',
    payment_status: 'pending' as 'pending' | 'partial' | 'paid' | 'overdue',
    total_amount: '',
    paid_amount: '0',
  })
  
  // États pour la génération en masse de convocations
  const [isGeneratingZip, setIsGeneratingZip] = useState(false)
  const [zipGenerationProgress, setZipGenerationProgress] = useState({ current: 0, total: 0 })
  const [lastZipGeneration, setLastZipGeneration] = useState<Date | null>(null)
  
  // États pour la création d'évaluations
  const [showEvaluationForm, setShowEvaluationForm] = useState(false)
  const [evaluationForm, setEvaluationForm] = useState({
    subject: '',
    assessment_type: 'evaluation_generale' as string,
    student_id: '' as string | undefined,
    score: '',
    max_score: '20',
    percentage: '',
    notes: '',
    graded_at: new Date().toISOString().split('T')[0],
  })
  const [formData, setFormData] = useState({
    name: '',
    type: 'formation_professionnelle',
    code: '',
    manager1_id: '',
    manager2_id: '',
    inter_entreprise: true,
    sous_traitance: false,
    timezone: 'Europe/Paris',
    formation_id: '',
    program_ids: [] as string[], // Tableau de IDs de programmes
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    location: '',
    capacity_max: '',
    teacher_id: '',
    status: 'planned' as 'planned' | 'ongoing' | 'completed' | 'cancelled',
  })

  // Récupérer la session
  const { data: session, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionService.getSessionById(sessionId),
    enabled: !!sessionId,
  })

  // Récupérer les programmes
  const { data: programs } = useQuery({
    queryKey: ['programs', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return programService.getAllPrograms(user.organization_id, { isActive: true })
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les formations (peut être filtrée par plusieurs programmes)
  const { data: formations } = useQuery({
    queryKey: ['formations', user?.organization_id, formData.program_ids],
    queryFn: async () => {
      if (!user?.organization_id) return []
      if (!formData.program_ids || formData.program_ids.length === 0) {
        // Récupérer toutes les formations si aucun programme n'est sélectionné
        return formationService.getAllFormations(user.organization_id, { isActive: true })
      }
      // Si plusieurs programmes sont sélectionnés, récupérer les formations de tous ces programmes
      // Pour l'instant, on récupère toutes les formations et on filtre côté client
      const allFormations = await formationService.getAllFormations(user.organization_id, { isActive: true })
      return allFormations.filter((f: FormationWithRelations) => 
        f.program_id && formData.program_ids.includes(f.program_id)
      )
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les programmes actuellement associés à la session
  const { data: sessionPrograms } = useQuery({
    queryKey: ['session-programs', sessionId],
    queryFn: async () => {
      if (!sessionId) return []
      return sessionService.getSessionPrograms(sessionId)
    },
    enabled: !!sessionId,
  })

  // Récupérer les utilisateurs (managers, enseignants)
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

  // Configuration des séances
  const [slotConfig, setSlotConfig] = useState({
    timeSlotType: 'both' as 'morning' | 'afternoon' | 'both' | 'full_day',
    morningStart: '09:00',
    morningEnd: '12:00',
    afternoonStart: '14:00',
    afternoonEnd: '17:00',
  })

  // Récupérer les séances existantes
  const { data: sessionSlots, refetch: refetchSlots } = useQuery({
    queryKey: ['session-slots', sessionId],
    queryFn: async () => {
      if (!sessionId) return []
      return sessionSlotService.getBySessionId(sessionId)
    },
    enabled: !!sessionId,
  })

  // Récupérer les inscriptions à cette session
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['session-enrollments', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, students(*)')
        .eq('session_id', sessionId)
        .order('enrollment_date', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!sessionId,
  })

  // Récupérer les paiements liés aux inscriptions de cette session
  const { data: payments } = useQuery({
    queryKey: ['session-payments', sessionId],
    queryFn: async () => {
      if (!enrollments || !user?.organization_id) return []
      const enrollmentIds = (enrollments as EnrollmentWithRelations[]).map((e) => e.id)
      
      // Récupérer les factures liées aux inscriptions
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, total_amount, paid_amount, status')
        .eq('organization_id', user.organization_id)
        .in('student_id', (enrollments as EnrollmentWithRelations[]).map((e) => e.student_id || '').filter(Boolean))
      
      if (!invoices || invoices.length === 0) return []
      
      // Récupérer les paiements liés à ces factures
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .in('invoice_id', invoices.map((inv: any) => inv.id))
        .eq('status', 'completed')
        .order('paid_at', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!sessionId && !!enrollments && !!user?.organization_id,
  })

  // Récupérer tous les étudiants pour le formulaire d'inscription
  const { data: students } = useQuery({
    queryKey: ['students', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, email, student_number')
        .eq('organization_id', user.organization_id)
        .eq('status', 'active')
        .order('last_name', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les statistiques de présence pour cette session
  const { data: attendanceStats } = useQuery({
    queryKey: ['session-attendance-stats', sessionId],
    queryFn: async () => {
      if (!sessionId || !user?.organization_id) return null

      const { data, error } = await supabase
        .from('attendance')
        .select('status, date, student_id')
        .eq('session_id', sessionId)
        .eq('organization_id', user.organization_id)

      if (error) throw error

      const attendanceData = (data as AttendanceWithRelations[]) || []
      const total = attendanceData.length
      const present = attendanceData.filter((a) => a.status === 'present').length
      const absent = attendanceData.filter((a) => a.status === 'absent').length
      const late = attendanceData.filter((a) => a.status === 'late').length
      const excused = attendanceData.filter((a) => a.status === 'excused').length

      // Grouper par date pour les graphiques
      const byDate: Record<string, { present: number; absent: number; late: number; excused: number }> = {}
      attendanceData.forEach((a) => {
        if (!byDate[a.date]) {
          byDate[a.date] = { present: 0, absent: 0, late: 0, excused: 0 }
        }
        byDate[a.date][a.status as keyof typeof byDate[string]]++
      })

      const attendanceByDate = Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, stats]) => ({
          date,
          ...stats,
        }))

      // Grouper par étudiant pour les stats individuelles
      const byStudent: Record<string, { present: number; absent: number; late: number; excused: number; total: number }> = {}
      const attendanceDataArray = (data as AttendanceWithRelations[]) || []
      attendanceDataArray.forEach((a) => {
        if (!byStudent[a.student_id]) {
          byStudent[a.student_id] = { present: 0, absent: 0, late: 0, excused: 0, total: 0 }
        }
        byStudent[a.student_id][a.status as keyof typeof byStudent[string]]++
        byStudent[a.student_id].total++
      })

      return {
        total,
        present,
        absent,
        late,
        excused,
        attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
        byDate: attendanceByDate,
        byStudent,
        rawData: data || [],
      }
    },
    enabled: !!sessionId && !!user?.organization_id,
  })

  // Récupérer les notes pour cette session
  const { data: grades } = useQuery({
    queryKey: ['session-grades', sessionId],
    queryFn: async () => {
      if (!sessionId || !user?.organization_id) return []

      const { data, error } = await supabase
        .from('grades')
        .select('*, students(first_name, last_name, student_number)')
        .eq('session_id', sessionId)
        .eq('organization_id', user.organization_id)
        .order('graded_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!sessionId && !!user?.organization_id,
  })

  // Calculer les statistiques des notes
  const gradesStats = grades && grades.length > 0
    ? {
        total: grades.length,
        average: Math.round((grades as GradeWithRelations[]).reduce((sum, g) => sum + (Number(g.score) || 0), 0) / grades.length * 100) / 100,
        max: Math.max(...(grades as GradeWithRelations[]).map(g => Number(g.score) || 0)),
        min: Math.min(...(grades as GradeWithRelations[]).map(g => Number(g.score) || 0)),
        averagePercentage: grades.some(g => g.percentage !== null)
          ? Math.round((grades as GradeWithRelations[]).reduce((sum, g) => sum + (Number(g.percentage) || 0), 0) / grades.length)
          : null,
      }
    : null

  // Récupérer l'organisation
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

  // Variables dérivées de la session
  const sessionData = session as SessionWithRelations
  const formation = sessionData?.formations
  const program = formation?.programs

  // Initialiser le formulaire avec les données de la session
  useEffect(() => {
    if (session) {
      const sessionData = session as SessionWithRelations & { session_programs?: Program[] }
      const formation = sessionData?.formations
      const program = formation?.programs

      // Récupérer les IDs des programmes associés (priorité à sessionPrograms si disponible)
      let programIds: string[] = []
      
      // Si sessionPrograms est déjà chargé, l'utiliser
      if (sessionPrograms && (sessionPrograms as Program[]).length > 0) {
        programIds = (sessionPrograms as Program[]).map((p: Program) => p.id)
      } 
      // Sinon, utiliser session_programs de la session
      else if (sessionData.session_programs && sessionData.session_programs.length > 0) {
        programIds = (sessionData.session_programs as Program[]).map((p: Program) => p.id)
      } 
      // Fallback: utiliser le programme de la formation
      else if (program?.id) {
        programIds = [program.id]
      }

      setFormData({
        name: sessionData.name || '',
        type: 'formation_professionnelle',
        code: sessionData.code || '',
        manager1_id: sessionData.manager1_id || user?.id || '',
        manager2_id: sessionData.manager2_id || '',
        inter_entreprise: sessionData.inter_entreprise ?? true,
        sous_traitance: sessionData.sous_traitance ?? false,
        timezone: sessionData.timezone || 'Europe/Paris',
        formation_id: formation?.id || '',
        program_ids: programIds,
        start_date: sessionData.start_date?.split('T')[0] || '',
        end_date: sessionData.end_date?.split('T')[0] || '',
        start_time: sessionData.start_time || '',
        end_time: sessionData.end_time || '',
        location: sessionData.location || '',
        capacity_max: sessionData.capacity_max?.toString() || '',
        teacher_id: sessionData.teacher_id || '',
        status: sessionData.status || 'planned',
      })

      // Initialiser le formulaire d'inscription avec le prix de la formation
      const formationData = sessionData?.formations
      if (formationData) {
        setEnrollmentForm(prev => ({
          ...prev,
          total_amount: prev.total_amount || (formationData as FormationWithRelations & { price?: number }).price?.toString() || '0',
        }))
      }
    }
  }, [session, user?.id, sessionPrograms])

  // Mutation pour mettre à jour la session
  const updateMutation = useMutation({
    mutationFn: async (updates: Parameters<typeof sessionService.updateSession>[1]) => {
      return sessionService.updateSession(sessionId, updates)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
    },
  })

  // Mutation pour cloner la session
  const cloneMutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error('Session non trouvée')
      const sessionData = session as SessionWithRelations
      const newSession = {
        name: `${sessionData.name} (Copie)`,
        formation_id: sessionData.formation_id,
        start_date: sessionData.start_date,
        end_date: sessionData.end_date,
        start_time: sessionData.start_time,
        end_time: sessionData.end_time,
        location: sessionData.location,
        capacity_max: sessionData.capacity_max,
        teacher_id: sessionData.teacher_id,
        status: 'planned' as const,
      }
      return sessionService.createSession(newSession)
    },
    onSuccess: (data) => {
      router.push(`/dashboard/sessions/${data.id}`)
    },
  })

  // Mutation pour archiver la session
  const archiveMutation = useMutation({
    mutationFn: async () => {
      return sessionService.updateSession(sessionId, { status: 'completed' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
    },
  })

  // Mutation pour supprimer la session
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return sessionService.deleteSession(sessionId)
    },
    onSuccess: () => {
      router.push('/dashboard/sessions')
    },
  })

  // Mutation pour créer une évaluation
  const createEvaluationMutation = useMutation({
    mutationFn: async () => {
      if (!evaluationForm.subject || !evaluationForm.score) {
        throw new Error('Sujet et note requis')
      }

      if (!user?.organization_id) {
        throw new Error('Organisation non trouvée')
      }

      const maxScore = parseFloat(evaluationForm.max_score) || 20
      const score = parseFloat(evaluationForm.score)
      const percentage = evaluationForm.percentage 
        ? parseFloat(evaluationForm.percentage)
        : Math.round((score / maxScore) * 100)

      const { data, error } = await supabase
        .from('grades')
        .insert({
          subject: evaluationForm.subject,
          assessment_type: evaluationForm.assessment_type || null,
          student_id: evaluationForm.student_id || null,
          session_id: sessionId,
          organization_id: user.organization_id,
          score: score,
          max_score: maxScore,
          percentage: percentage,
          notes: evaluationForm.notes || null,
          graded_at: evaluationForm.graded_at || new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-grades', sessionId] })
      setShowEvaluationForm(false)
      setEvaluationForm({
        subject: '',
        assessment_type: 'evaluation_generale',
        student_id: '',
        score: '',
        max_score: '20',
        percentage: '',
        notes: '',
        graded_at: new Date().toISOString().split('T')[0],
      })
    },
  })

  // Mutation pour créer une inscription
  const createEnrollmentMutation = useMutation({
    mutationFn: async () => {
      if (!enrollmentForm.student_id) {
        throw new Error('Élève requis')
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
      setShowEnrollmentForm(false)
      setEnrollmentForm({
        student_id: '',
        enrollment_date: new Date().toISOString().split('T')[0],
        status: 'confirmed',
        payment_status: 'pending',
        total_amount: (session as SessionWithRelations)?.formations?.price?.toString() || '0',
        paid_amount: '0',
      })
    },
  })

  // Mutation pour mettre à jour les programmes de la session
  const updateProgramsMutation = useMutation({
    mutationFn: async ({ sessionId, programIds, organizationId }: { sessionId: string; programIds: string[]; organizationId: string }) => {
      return sessionService.updateSessionPrograms(sessionId, programIds, organizationId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['session-programs', sessionId] })
    },
  })

  // Mutation pour générer les séances
  const generateSlotsMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId || !formData.start_date || !formData.end_date) {
        throw new Error('Les dates de début et de fin sont requises')
      }
      return sessionSlotService.generateSlots({
        sessionId,
        startDate: formData.start_date,
        endDate: formData.end_date,
        timeSlotType: slotConfig.timeSlotType === 'full_day' ? 'full_day' : slotConfig.timeSlotType,
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
      addToast({
        type: 'success',
        title: 'Séances générées',
        description: 'Les séances ont été générées avec succès.',
      })
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la génération des séances.',
      })
    },
  })

  // Mutation pour supprimer une séance
  const deleteSlotMutation = useMutation({
    mutationFn: async (slotId: string) => {
      return sessionSlotService.delete(slotId)
    },
    onSuccess: () => {
      refetchSlots()
      addToast({
        type: 'success',
        title: 'Séance supprimée',
        description: 'La séance a été supprimée avec succès.',
      })
    },
  })

  // Mutation pour créer une séance manuelle
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
      addToast({
        type: 'success',
        title: 'Séance ajoutée',
        description: 'La séance a été ajoutée avec succès.',
      })
    },
  })

  const handleSave = async () => {
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

    // Mettre à jour la formation si elle a changé
    if (formData.formation_id && formData.formation_id !== sessionData?.formation_id) {
      updates.formation_id = formData.formation_id
    }

    // Sauvegarder la session
    await updateMutation.mutateAsync(updates)

    // Mettre à jour les programmes associés
    if (user?.organization_id && formData.program_ids) {
      await updateProgramsMutation.mutateAsync({
        sessionId,
        programIds: formData.program_ids,
        organizationId: user.organization_id,
      })
    }
  }

  const workflowSteps = [
    { id: 'configuration' as const, label: 'Configuration', icon: Settings, color: 'purple' },
    { id: 'gestion' as const, label: 'Gestion', icon: FolderOpen, color: 'teal' },
    { id: 'espace_apprenant' as const, label: 'Espace Apprenant', icon: GraduationCap, color: 'blue' },
    { id: 'suivi' as const, label: 'Suivi', icon: CheckCircle, color: 'yellow' },
  ]

  const configTabs = [
    { id: 'initialisation' as const, label: 'Initialisation' },
    { id: 'dates_prix' as const, label: 'Dates et prix' },
    { id: 'apprenants' as const, label: 'Apprenants' },
    { id: 'programme' as const, label: 'Programme' },
    { id: 'intervenants' as const, label: 'Intervenants' },
  ]

  const gestionTabs = [
    { id: 'conventions' as const, label: 'Conventions' },
    { id: 'convocations' as const, label: 'Convocations' },
    { id: 'evaluations' as const, label: 'Évaluations' },
    { id: 'finances' as const, label: 'Finances' },
    { id: 'espace_entreprise' as const, label: 'Espace entreprise' },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-muted-foreground">Chargement...</div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-muted-foreground">Session non trouvée</div>
          <Link href="/dashboard/sessions">
            <Button className="mt-4">Retour à la liste</Button>
          </Link>
        </div>
      </div>
    )
  }


  // Fonctions de génération de documents
  const handleGenerateConvention = async () => {
    if (!sessionData || !formation || !organization) return

    try {
      const html = generateConventionHTML({
        session: {
          name: sessionData.name,
          start_date: sessionData.start_date,
          end_date: sessionData.end_date,
          location: sessionData.location || undefined,
        },
        formation: {
          name: formation.name,
          code: formation.code || undefined,
          price: (formation as FormationWithRelations & { price?: number }).price || undefined,
          duration_hours: (formation as FormationWithRelations & { duration_hours?: number }).duration_hours || undefined,
        },
        program: program ? { name: program.name } : undefined,
        organization: {
          name: organization.name,
          address: organization.address || undefined,
          phone: organization.phone || undefined,
          email: organization.email || undefined,
          logo_url: organization.logo_url || undefined,
        },
        issueDate: new Date().toISOString(),
        language: 'fr',
      })

      // Créer un élément temporaire pour le PDF
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      document.body.appendChild(tempDiv)

      const element = tempDiv.querySelector('[id$="-document"]')
      if (element) {
        element.id = `temp-convention-${Date.now()}`
        await new Promise((resolve) => setTimeout(resolve, 500))
        await generatePDFFromHTML(element.id, `convention_${sessionData.name.replace(/\s+/g, '_')}.pdf`)
      }

      document.body.removeChild(tempDiv)
      addToast({
        type: 'success',
        title: 'Convention générée',
        description: 'La convention a été générée et téléchargée avec succès.',
      })
    } catch (error) {
      console.error('Erreur lors de la génération de la convention:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la génération de la convention.',
      })
    }
  }

  const handleGenerateContract = async (enrollment: EnrollmentWithRelations) => {
    if (!sessionData || !formation || !organization || !enrollment) return

    const student = enrollment.students
    if (!student) return

    try {
      const html = generateContractHTML({
        student: {
          first_name: student.first_name,
          last_name: student.last_name,
          email: student.email || undefined,
          phone: student.phone || undefined,
          address: student.address || undefined,
          date_of_birth: student.date_of_birth || undefined,
        },
        session: {
          name: sessionData.name,
          start_date: sessionData.start_date,
          end_date: sessionData.end_date,
          location: sessionData.location || undefined,
        },
        formation: {
          name: formation.name,
          code: formation.code || undefined,
          price: (formation as FormationWithRelations & { price?: number }).price || undefined,
          duration_hours: (formation as FormationWithRelations & { duration_hours?: number }).duration_hours || undefined,
        },
        program: program ? { name: program.name } : undefined,
        organization: {
          name: organization.name,
          address: organization.address || undefined,
          phone: organization.phone || undefined,
          email: organization.email || undefined,
          logo_url: organization.logo_url || undefined,
        },
        enrollment: {
          enrollment_date: enrollment.enrollment_date,
          total_amount: enrollment.total_amount || 0,
          paid_amount: enrollment.paid_amount || 0,
        },
        issueDate: new Date().toISOString(),
        language: 'fr',
      })

      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      document.body.appendChild(tempDiv)

      const element = tempDiv.querySelector('[id$="-document"]')
      if (element) {
        element.id = `temp-contract-${Date.now()}`
        await new Promise((resolve) => setTimeout(resolve, 500))
        await generatePDFFromHTML(element.id, `contrat_${student.last_name}_${student.first_name}.pdf`)
      }

      document.body.removeChild(tempDiv)
      addToast({
        type: 'success',
        title: 'Contrat généré',
        description: 'Le contrat a été généré et téléchargé avec succès.',
      })
    } catch (error) {
      console.error('Erreur lors de la génération du contrat:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la génération du contrat.',
      })
    }
  }

  const handleGenerateConvocation = async (enrollment: any) => {
    if (!sessionData || !formation || !organization || !enrollment) return

    const student = enrollment.students
    if (!student) return

    try {
      const html = generateConvocationHTML({
        student: {
          first_name: student.first_name,
          last_name: student.last_name,
          email: student.email || undefined,
          phone: student.phone || undefined,
        },
        session: {
          name: sessionData.name,
          start_date: sessionData.start_date,
          end_date: sessionData.end_date,
          start_time: sessionData.start_time || undefined,
          end_time: sessionData.end_time || undefined,
          location: sessionData.location || undefined,
        },
        formation: {
          name: formation.name,
          code: formation.code || undefined,
        },
        program: program ? { name: program.name } : undefined,
        organization: {
          name: organization.name,
          address: organization.address || undefined,
          phone: organization.phone || undefined,
          email: organization.email || undefined,
          logo_url: organization.logo_url || undefined,
        },
        issueDate: new Date().toISOString(),
        language: 'fr',
      })

      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      document.body.appendChild(tempDiv)

      const element = tempDiv.querySelector('[id$="-document"]')
      if (element) {
        element.id = `temp-convocation-${Date.now()}`
        await new Promise((resolve) => setTimeout(resolve, 500))
        await generatePDFFromHTML(element.id, `convocation_${student.last_name}_${student.first_name}.pdf`)
      }

      document.body.removeChild(tempDiv)
      addToast({
        type: 'success',
        title: 'Convocation générée',
        description: 'La convocation a été générée et téléchargée avec succès.',
      })
    } catch (error) {
      console.error('Erreur lors de la génération de la convocation:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la génération de la convocation.',
      })
    }
  }

  // Générer toutes les conventions et contrats en ZIP
  const handleGenerateAllConventionsZip = async () => {
    if (!sessionData || !formation || !organization) {
      addToast({
        type: 'warning',
        title: 'Données incomplètes',
        description: 'Veuillez compléter les informations de la session avant de générer les conventions.',
      })
      return
    }

    setIsGeneratingZip(true)
    const validEnrollments = (enrollments as EnrollmentWithRelations[])?.filter((e) => e.students) || []
    const totalFiles = 1 + validEnrollments.length // 1 convention + N contrats
    setZipGenerationProgress({ current: 0, total: totalFiles })

    try {
      const pdfFiles: Array<{ name: string; blob: Blob }> = []
      const sessionName = sessionData.name.replace(/\s+/g, '_')

      // 1. Générer la convention générale
      setZipGenerationProgress({ current: 1, total: totalFiles })
      const conventionHTML = generateConventionHTML({
        session: {
          name: sessionData.name,
          start_date: sessionData.start_date,
          end_date: sessionData.end_date,
          location: sessionData.location || undefined,
        },
        formation: {
          name: formation.name,
          code: formation.code || undefined,
          price: (formation as FormationWithRelations & { price?: number }).price || undefined,
          duration_hours: (formation as FormationWithRelations & { duration_hours?: number }).duration_hours || undefined,
        },
        program: program ? { name: program.name } : undefined,
        organization: {
          name: organization.name,
          address: organization.address || undefined,
          phone: organization.phone || undefined,
          email: organization.email || undefined,
          logo_url: organization.logo_url || undefined,
        },
        issueDate: new Date().toISOString(),
        language: 'fr',
      })

      const tempConventionDiv = document.createElement('div')
      tempConventionDiv.innerHTML = conventionHTML
      tempConventionDiv.style.position = 'absolute'
      tempConventionDiv.style.left = '-9999px'
      document.body.appendChild(tempConventionDiv)

      const conventionElement = tempConventionDiv.querySelector('[id$="-document"]')
      if (conventionElement) {
        conventionElement.id = `temp-convention-zip-${Date.now()}`
        await new Promise((resolve) => setTimeout(resolve, 500))
        
        const conventionBlob = await generatePDFBlobFromHTML(conventionElement.id)
        pdfFiles.push({
          name: `Convention_${sessionName}.pdf`,
          blob: conventionBlob,
        })
      }

      document.body.removeChild(tempConventionDiv)

      // 2. Générer tous les contrats particuliers
      for (let i = 0; i < validEnrollments.length; i++) {
        const enrollment = validEnrollments[i]
        const student = enrollment.students

        setZipGenerationProgress({ current: i + 2, total: totalFiles })

        const contractHTML = generateContractHTML({
          student: {
            first_name: student.first_name,
            last_name: student.last_name,
            email: student.email || undefined,
            phone: student.phone || undefined,
            address: student.address || undefined,
            date_of_birth: student.date_of_birth || undefined,
          },
          session: {
            name: sessionData.name,
            start_date: sessionData.start_date,
            end_date: sessionData.end_date,
            location: sessionData.location || undefined,
          },
          formation: {
            name: formation.name,
            code: formation.code || undefined,
            price: (formation as FormationWithRelations & { price?: number }).price || undefined,
            duration_hours: (formation as FormationWithRelations & { duration_hours?: number }).duration_hours || undefined,
          },
          program: program ? { name: program.name } : undefined,
          organization: {
            name: organization.name,
            address: organization.address || undefined,
            phone: organization.phone || undefined,
            email: organization.email || undefined,
            logo_url: organization.logo_url || undefined,
          },
          enrollment: {
            enrollment_date: enrollment.enrollment_date,
            total_amount: enrollment.total_amount || 0,
            paid_amount: enrollment.paid_amount || 0,
          },
          issueDate: new Date().toISOString(),
          language: 'fr',
        })

        const tempContractDiv = document.createElement('div')
        tempContractDiv.innerHTML = contractHTML
        tempContractDiv.style.position = 'absolute'
        tempContractDiv.style.left = '-9999px'
        document.body.appendChild(tempContractDiv)

        const contractElement = tempContractDiv.querySelector('[id$="-document"]')
        if (contractElement) {
          contractElement.id = `temp-contract-zip-${Date.now()}-${i}`
          await new Promise((resolve) => setTimeout(resolve, 500))
          
          const contractBlob = await generatePDFBlobFromHTML(contractElement.id)
          const studentName = `${student.last_name}_${student.first_name}`.replace(/\s+/g, '_')
          pdfFiles.push({
            name: `Contrat_${studentName}.pdf`,
            blob: contractBlob,
          })
        }

        document.body.removeChild(tempContractDiv)
      }

      // 3. Créer le ZIP
      if (pdfFiles.length > 0) {
        const zipFilename = `conventions_contrats_${sessionName}_${new Date().toISOString().split('T')[0]}.zip`
        await createZipFromPDFs(pdfFiles, zipFilename)
        setLastZipGeneration(new Date())
        addToast({
          type: 'success',
          title: 'ZIP généré avec succès',
          description: `${pdfFiles.length} fichier${pdfFiles.length > 1 ? 's' : ''} inclus dans le ZIP.`,
        })
      } else {
        addToast({
          type: 'warning',
          title: 'Aucun fichier',
          description: 'Aucun fichier à inclure dans le ZIP.',
        })
      }
    } catch (error) {
      console.error('Erreur lors de la génération du ZIP des conventions:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la génération du ZIP des conventions.',
      })
    } finally {
      setIsGeneratingZip(false)
      setZipGenerationProgress({ current: 0, total: 0 })
    }
  }

  // Générer toutes les convocations en ZIP
  const handleGenerateAllConvocationsZip = async () => {
    if (!sessionData || !formation || !organization || !enrollments || !enrollments.length) {
      addToast({
        type: 'warning',
        title: 'Aucune inscription',
        description: 'Aucune inscription trouvée pour cette session.',
      })
      return
    }

    setIsGeneratingZip(true)
    setZipGenerationProgress({ current: 0, total: (enrollments as EnrollmentWithRelations[]).length })

    try {
      const pdfFiles: Array<{ name: string; blob: Blob }> = []
      const validEnrollments = (enrollments as EnrollmentWithRelations[]).filter((e) => e.students)

      for (let i = 0; i < validEnrollments.length; i++) {
        const enrollment = validEnrollments[i]
        const student = enrollment.students

        setZipGenerationProgress({ current: i + 1, total: validEnrollments.length })

        const html = generateConvocationHTML({
          student: {
            first_name: student.first_name,
            last_name: student.last_name,
            email: student.email || undefined,
            phone: student.phone || undefined,
          },
          session: {
            name: sessionData.name,
            start_date: sessionData.start_date,
            end_date: sessionData.end_date,
            start_time: sessionData.start_time || undefined,
            end_time: sessionData.end_time || undefined,
            location: sessionData.location || undefined,
          },
          formation: {
            name: formation.name,
            code: formation.code || undefined,
          },
          program: program ? { name: program.name } : undefined,
          organization: {
            name: organization.name,
            address: organization.address || undefined,
            phone: organization.phone || undefined,
            email: organization.email || undefined,
            logo_url: organization.logo_url || undefined,
          },
          issueDate: new Date().toISOString(),
          language: 'fr',
        })

        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = html
        tempDiv.style.position = 'absolute'
        tempDiv.style.left = '-9999px'
        tempDiv.style.top = '-9999px'
        tempDiv.style.width = '210mm'
        tempDiv.style.padding = '20mm'
        document.body.appendChild(tempDiv)

        try {
          const element = tempDiv.querySelector('[id$="-document"]')
          if (element) {
            const elementId = `temp-convocation-zip-${i}-${Date.now()}`
            element.id = elementId
            await new Promise((resolve) => setTimeout(resolve, 500))
            
            const pdfBlob = await generatePDFBlobFromHTML(elementId)
            const filename = `convocation_${student.last_name}_${student.first_name}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_')
            pdfFiles.push({ name: filename, blob: pdfBlob })
          }
        } finally {
          // Nettoyer l'élément temporaire
          if (document.body.contains(tempDiv)) {
            document.body.removeChild(tempDiv)
          }
        }
      }

      // Créer le ZIP
      const sessionName = sessionData.name || 'session'
      const zipFilename = `convocations_${sessionName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.zip`
      await createZipFromPDFs(pdfFiles, zipFilename)

      setLastZipGeneration(new Date())
      addToast({
        type: 'success',
        title: 'ZIP généré avec succès',
        description: `${pdfFiles.length} convocation${pdfFiles.length > 1 ? 's' : ''} incluse${pdfFiles.length > 1 ? 's' : ''} dans le ZIP.`,
      })
    } catch (error) {
      console.error('Erreur lors de la génération du ZIP:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la génération du ZIP des convocations.',
      })
    } finally {
      setIsGeneratingZip(false)
      setZipGenerationProgress({ current: 0, total: 0 })
    }
  }

  // Fonction pour générer le rapport de session PDF
  const handleGenerateSessionReport = async () => {
    if (!sessionData || !formation || !organization || !enrollments) {
      addToast({
        type: 'warning',
        title: 'Données incomplètes',
        description: 'Veuillez compléter les informations de la session avant de générer le rapport.',
      })
      return
    }

    try {
      // Calculer les statistiques
      const totalEnrollments = enrollments.length || 0
      const enrollmentsArray = (enrollments as EnrollmentWithRelations[]) || []
      const activeEnrollments = enrollmentsArray.filter((e) => e.status === 'confirmed' || e.status === 'ongoing').length
      const completedEnrollments = enrollmentsArray.filter((e) => e.status === 'completed').length
      
      // Calculer le taux de présence global
      const attendanceRate = attendanceStats && attendanceStats.total > 0
        ? Math.round((attendanceStats.present / attendanceStats.total) * 100)
        : 0

      // Calculer les statistiques financières
      const totalRevenue = enrollmentsArray.reduce((sum, e) => sum + Number(e.total_amount || 0), 0)
      const paidAmount = enrollmentsArray.reduce((sum, e) => sum + Number(e.paid_amount || 0), 0)
      const remainingAmount = totalRevenue - paidAmount

      // Préparer la liste des étudiants avec leurs statistiques
      const studentsData = enrollmentsArray.map((enrollment) => {
        const student = enrollment.students
        if (!student) return null

        const studentAttendance = attendanceStats?.byStudent?.[enrollment.student_id] || {
          present: 0,
          total: 0,
        }
        const studentAttendanceRate = studentAttendance.total > 0
          ? Math.round((studentAttendance.present / studentAttendance.total) * 100)
          : 0

        // Calculer la note moyenne de l'étudiant
        const studentGrades = (grades as GradeWithRelations[])?.filter((g) => g.student_id === enrollment.student_id) || []
        const avgGrade = studentGrades.length > 0
          ? Math.round((studentGrades.reduce((sum: number, g: any) => sum + (Number(g.score) || 0), 0) / studentGrades.length) * 100) / 100
          : null

        return {
          first_name: student.first_name,
          last_name: student.last_name,
          student_number: student.student_number || undefined,
          email: student.email || undefined,
          attendanceRate: studentAttendanceRate,
          averageGrade: avgGrade,
          paymentStatus: enrollment.payment_status || 'pending',
          enrollmentDate: enrollment.enrollment_date,
        }
      }).filter((s) => s !== null)

      // Générer le HTML du rapport
      const html = generateSessionReportHTML({
        session: {
          name: sessionData.name,
          start_date: sessionData.start_date,
          end_date: sessionData.end_date,
          start_time: sessionData.start_time || undefined,
          end_time: sessionData.end_time || undefined,
          location: sessionData.location || undefined,
          status: sessionData.status || 'planned',
        },
        formation: {
          name: formation.name,
          code: formation.code || undefined,
          duration_hours: (formation as FormationWithRelations & { duration_hours?: number }).duration_hours || undefined,
          price: (formation as FormationWithRelations & { price?: number }).price || undefined,
        },
        program: program ? { name: program.name } : undefined,
        organization: {
          name: organization.name,
          address: organization.address || undefined,
          phone: organization.phone || undefined,
          email: organization.email || undefined,
          logo_url: organization.logo_url || undefined,
        },
        statistics: {
          totalEnrollments,
          activeEnrollments,
          completedEnrollments,
          attendanceRate,
          averageGrade: gradesStats?.average || undefined,
          averagePercentage: gradesStats?.averagePercentage || undefined,
          totalRevenue,
          paidAmount,
          remainingAmount,
        },
        students: studentsData,
        issueDate: new Date().toISOString(),
        language: 'fr',
      })

      // Créer un élément temporaire pour le PDF
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      document.body.appendChild(tempDiv)

      const element = tempDiv.querySelector('[id$="-document"]')
      if (element) {
        element.id = `temp-session-report-${Date.now()}`
        await new Promise((resolve) => setTimeout(resolve, 500))
        
        const sessionName = sessionData.name.replace(/\s+/g, '_')
        const reportFilename = `rapport_session_${sessionName}_${new Date().toISOString().split('T')[0]}.pdf`
        await generatePDFFromHTML(element.id, reportFilename)
      }

      document.body.removeChild(tempDiv)
      addToast({
        type: 'success',
        title: 'Rapport généré',
        description: 'Le rapport de session a été généré et téléchargé avec succès.',
      })
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la génération du rapport de session.',
      })
    }
  }

  // Fonction pour générer le certificat de formation pour un apprenant
  const handleGenerateCertificate = async (enrollment: any) => {
    if (!sessionData || !formation || !organization || !enrollment) {
      addToast({
        type: 'warning',
        title: 'Données incomplètes',
        description: 'Veuillez compléter les informations de la session avant de générer le certificat.',
      })
      return
    }

    // Vérifier que l'apprenant a complété la session
    if (enrollment.status !== 'completed') {
      addToast({
        type: 'warning',
        title: 'Statut requis',
        description: 'Le certificat ne peut être généré que pour les apprenants ayant complété la session.',
      })
      return
    }

    const student = enrollment.students
    if (!student) {
      addToast({
        type: 'warning',
        title: 'Informations manquantes',
        description: 'Les informations de l\'apprenant sont manquantes.',
      })
      return
    }

    try {
      // Générer le HTML du certificat
      const html = generateCertificateHTML({
        student: {
          first_name: student.first_name,
          last_name: student.last_name,
          student_number: student.student_number || 'N/A',
        },
        organization: {
          name: organization.name,
          address: organization.address || undefined,
          logo_url: organization.logo_url || undefined,
        },
        program: program ? {
          name: program.name,
          duration_hours: (formation as FormationWithRelations & { duration_hours?: number }).duration_hours || undefined,
        } : {
          name: formation.name,
          duration_hours: (formation as FormationWithRelations & { duration_hours?: number }).duration_hours || undefined,
        },
        session: {
          name: sessionData.name,
          start_date: sessionData.start_date,
          end_date: sessionData.end_date,
        },
        issueDate: new Date().toISOString(),
        language: 'fr',
      })

      // Créer un élément temporaire pour le PDF
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      document.body.appendChild(tempDiv)

      const element = tempDiv.querySelector('[id$="-document"]')
      if (element) {
        element.id = `temp-certificate-${Date.now()}`
        await new Promise((resolve) => setTimeout(resolve, 500))
        
        const studentName = `${student.last_name}_${student.first_name}`.replace(/\s+/g, '_')
        const certificateFilename = `certificat_${studentName}_${new Date().toISOString().split('T')[0]}.pdf`
        await generatePDFFromHTML(element.id, certificateFilename)
      }

      document.body.removeChild(tempDiv)
      addToast({
        type: 'success',
        title: 'Certificat généré',
        description: 'Le certificat a été généré et téléchargé avec succès.',
      })
    } catch (error) {
      console.error('Erreur lors de la génération du certificat:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la génération du certificat.',
      })
    }
  }

  // Envoyer toutes les convocations par email (placeholder - nécessite un backend)
  const handleSendAllConvocationsByEmail = async () => {
    if (!enrollments || (enrollments as EnrollmentWithRelations[]).length === 0) {
      addToast({
        type: 'warning',
        title: 'Aucun apprenant',
        description: 'Aucun apprenant inscrit pour cette session.',
      })
      return
    }

    if (!sessionData) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Session non trouvée.',
      })
      return
    }

    try {
      addToast({
        type: 'info',
        title: 'Envoi en cours',
        description: 'Envoi des convocations par email...',
      })

      const emailPromises = (enrollments as EnrollmentWithRelations[]).map(async (enrollment) => {
        const student = enrollment.students
        if (!student || !student.email) {
          return {
            success: false,
            studentName: `${student?.first_name || ''} ${student?.last_name || ''}`,
            error: 'Email non renseigné',
          }
        }

        // Générer le PDF de convocation
        const convocationHTML = generateConvocationHTML({
          student: {
            first_name: student.first_name,
            last_name: student.last_name,
            email: student.email || undefined,
            phone: student.phone || undefined,
          },
          session: {
            name: sessionData.name,
            start_date: sessionData.start_date,
            end_date: sessionData.end_date,
            location: sessionData.location || undefined,
          },
          formation: formation ? {
            name: formation.name,
            code: formation.code || undefined,
          } : undefined,
          program: program ? { name: program.name } : undefined,
          organization: organization ? {
            name: organization.name,
            address: organization.address || undefined,
            phone: organization.phone || undefined,
            email: organization.email || undefined,
            logo_url: organization.logo_url || undefined,
          } : undefined,
        })

        const pdfBlob = await generatePDFBlobFromHTML(convocationHTML)
        const pdfBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1]
            resolve(base64)
          }
          reader.readAsDataURL(pdfBlob)
        })

        // Envoyer l'email
        const result = await emailService.sendConvocation({
          to: student.email,
          studentName: `${student.first_name} ${student.last_name}`,
          sessionName: sessionData.name,
          startDate: sessionData.start_date,
          location: sessionData.location || undefined,
        })

        return {
          success: result.success,
          studentName: `${student.first_name} ${student.last_name}`,
          error: result.error,
        }
      })

      const results = await Promise.all(emailPromises)
      const successCount = results.filter((r) => r.success).length
      const errorCount = results.filter((r) => !r.success).length

      if (errorCount === 0) {
        addToast({
          type: 'success',
          title: 'Emails envoyés',
          description: `${successCount} convocation(s) envoyée(s) avec succès.`,
        })
      } else {
        addToast({
          type: errorCount === results.length ? 'error' : 'warning',
          title: 'Envoi partiel',
          description: `${successCount} envoyé(s), ${errorCount} erreur(s).`,
        })
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi des emails:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'envoi des emails.',
      })
    }
  }

  const handleGenerateProgram = async () => {
    if (!sessionData || !formation || !organization || !program) return

    try {
      const html = generateProgramHTML({
        program: {
          name: program.name,
          description: (program as FormationWithRelations['programs'] & { description?: string })?.description || undefined,
        },
        formation: {
          name: formation.name,
          code: formation.code || undefined,
          subtitle: (formation as FormationWithRelations & { subtitle?: string }).subtitle || undefined,
          duration_hours: (formation as FormationWithRelations & { duration_hours?: number }).duration_hours || undefined,
          objectives: (formation as FormationWithRelations & { pedagogical_objectives?: string }).pedagogical_objectives || undefined,
          content: (formation as FormationWithRelations & { training_content?: string }).training_content || undefined,
          learner_profile: (formation as FormationWithRelations & { learner_profile?: string }).learner_profile || undefined,
        },
        organization: {
          name: organization.name,
          address: organization.address || undefined,
          phone: organization.phone || undefined,
          email: organization.email || undefined,
          logo_url: organization.logo_url || undefined,
        },
        issueDate: new Date().toISOString(),
        language: 'fr',
      })

      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      document.body.appendChild(tempDiv)

      const element = tempDiv.querySelector('[id$="-document"]')
      if (element) {
        element.id = `temp-program-${Date.now()}`
        await new Promise((resolve) => setTimeout(resolve, 500))
        await generatePDFFromHTML(element.id, `programme_${formation.name.replace(/\s+/g, '_')}.pdf`)
      }

      document.body.removeChild(tempDiv)
      addToast({
        type: 'success',
        title: 'Programme généré',
        description: 'Le programme a été généré et téléchargé avec succès.',
      })
    } catch (error) {
      console.error('Erreur lors de la génération du programme:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la génération du programme.',
      })
    }
  }

  const handleGenerateTerms = async () => {
    if (!organization) return

    try {
      const html = generateTermsHTML({
        organization: {
          name: organization.name,
          address: organization.address || undefined,
          phone: organization.phone || undefined,
          email: organization.email || undefined,
          logo_url: organization.logo_url || undefined,
        },
        issueDate: new Date().toISOString(),
        language: 'fr',
      })

      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      document.body.appendChild(tempDiv)

      const element = tempDiv.querySelector('[id$="-document"]')
      if (element) {
        element.id = `temp-terms-${Date.now()}`
        await new Promise((resolve) => setTimeout(resolve, 500))
        await generatePDFFromHTML(element.id, 'cgv.pdf')
      }

      document.body.removeChild(tempDiv)
      addToast({
        type: 'success',
        title: 'CGV générées',
        description: 'Les Conditions Générales de Vente ont été générées et téléchargées avec succès.',
      })
    } catch (error) {
      console.error('Erreur lors de la génération des CGV:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la génération des CGV.',
      })
    }
  }

  const handleGeneratePrivacyPolicy = async () => {
    if (!organization) return

    try {
      const html = generatePrivacyPolicyHTML({
        organization: {
          name: organization.name,
          address: organization.address || undefined,
          phone: organization.phone || undefined,
          email: organization.email || undefined,
          logo_url: organization.logo_url || undefined,
        },
        issueDate: new Date().toISOString(),
        language: 'fr',
      })

      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      document.body.appendChild(tempDiv)

      const element = tempDiv.querySelector('[id$="-document"]')
      if (element) {
        element.id = `temp-privacy-${Date.now()}`
        await new Promise((resolve) => setTimeout(resolve, 500))
        await generatePDFFromHTML(element.id, 'politique_confidentialite.pdf')
      }

      document.body.removeChild(tempDiv)
      addToast({
        type: 'success',
        title: 'Politique générée',
        description: 'La politique de confidentialité a été générée et téléchargée avec succès.',
      })
    } catch (error) {
      console.error('Erreur lors de la génération de la politique de confidentialité:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la génération de la politique de confidentialité.',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href="/dashboard/sessions" className="hover:text-primary">Toutes mes sessions</Link>
        <span>/</span>
        <span>{formData.name || sessionData.name}</span>
        {activeStep !== 'configuration' && (
          <>
            <span>/</span>
            <span className="text-foreground">{workflowSteps.find(s => s.id === activeStep)?.label}</span>
          </>
        )}
      </div>

      {/* Workflow Progress Bar */}
      <div className="flex items-center justify-between border-b pb-4">
        {workflowSteps.map((step, index) => {
          const StepIcon = step.icon
          const isActive = activeStep === step.id
          const isCompleted = workflowSteps.findIndex(s => s.id === activeStep) > index

          return (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isActive
                  ? step.color === 'purple'
                    ? 'bg-purple-100 text-purple-800'
                    : step.color === 'teal'
                    ? 'bg-teal-100 text-teal-800'
                    : step.color === 'blue'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-yellow-100 text-yellow-800'
                  : isCompleted
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-white text-gray-400 hover:bg-gray-50'
              }`}
            >
              <StepIcon className="h-5 w-5" />
              <span className="font-medium">{step.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tabs (shown in configuration and gestion steps) */}
      {activeStep === 'configuration' && (
        <div className="flex space-x-2 border-b">
          {configTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeStep === 'gestion' && (
        <div className="flex space-x-2 border-b">
          {gestionTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveGestionTab(tab.id)}
              className={`px-4 py-2 font-medium transition-colors ${
                activeGestionTab === tab.id
                  ? 'border-b-2 border-teal-600 text-teal-600 bg-teal-50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Content (3 columns) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Configuration - Initialisation Tab */}
          {activeStep === 'configuration' && activeTab === 'initialisation' && (
            <Card>
              <CardHeader>
                <CardTitle>Informations générales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nom de la session *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Type de session</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="formation_professionnelle">Formation professionnelle</option>
                    <option value="stage">Stage</option>
                    <option value="cours">Cours</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Code interne</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Gestionnaire n°1</label>
                    <select
                      value={formData.manager1_id}
                      onChange={(e) => setFormData({ ...formData, manager1_id: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Sélectionner un gestionnaire</option>
                      {(users as User[])?.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Gestionnaire n°2</label>
                    <select
                      value={formData.manager2_id}
                      onChange={(e) => setFormData({ ...formData, manager2_id: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Sélectionner un gestionnaire</option>
                      {(users as User[])?.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.inter_entreprise}
                      onChange={(e) => setFormData({ ...formData, inter_entreprise: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Inter entreprise</span>
                  </label>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    Décochez la case pour considérer cette session comme intra entreprise
                  </p>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.sous_traitance}
                      onChange={(e) => setFormData({ ...formData, sous_traitance: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Réalisée en sous traitance d'un autre organisme</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Fuseau horaire</label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="Europe/Paris">UTC +01:00 Europe/Paris</option>
                    <option value="Africa/Dakar">UTC +00:00 Africa/Dakar</option>
                    <option value="Africa/Abidjan">UTC +00:00 Africa/Abidjan</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fuseau horaire utilisé pour la définition des dates et heures des modules
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Configuration - Dates et prix Tab */}
          {activeStep === 'configuration' && activeTab === 'dates_prix' && (
            <div className="space-y-6">
              {/* Configuration des dates et informations générales */}
              <Card>
                <CardHeader>
                  <CardTitle>Dates et informations générales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Date de début *</label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Date de fin *</label>
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Lieu/Salle</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Ex: Salle A1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Capacité maximale</label>
                    <input
                      type="number"
                      value={formData.capacity_max}
                      onChange={(e) => setFormData({ ...formData, capacity_max: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Ex: 25"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Configuration des séances */}
              <Card>
                <CardHeader>
                  <CardTitle>Configuration des séances</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Type de séances *</label>
                    <select
                      value={slotConfig.timeSlotType}
                      onChange={(e) => setSlotConfig({ ...slotConfig, timeSlotType: e.target.value as 'morning' | 'afternoon' | 'both' | 'full_day' })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="both">Matin et après-midi</option>
                      <option value="morning">Matin seulement</option>
                      <option value="afternoon">Après-midi seulement</option>
                      <option value="full_day">Journée complète</option>
                    </select>
                  </div>

                  {(slotConfig.timeSlotType === 'morning' || slotConfig.timeSlotType === 'both') && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium mb-2">Début matin</label>
                        <input
                          type="time"
                          value={slotConfig.morningStart}
                          onChange={(e) => setSlotConfig({ ...slotConfig, morningStart: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Fin matin</label>
                        <input
                          type="time"
                          value={slotConfig.morningEnd}
                          onChange={(e) => setSlotConfig({ ...slotConfig, morningEnd: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}

                  {(slotConfig.timeSlotType === 'afternoon' || slotConfig.timeSlotType === 'both') && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium mb-2">Début après-midi</label>
                        <input
                          type="time"
                          value={slotConfig.afternoonStart}
                          onChange={(e) => setSlotConfig({ ...slotConfig, afternoonStart: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Fin après-midi</label>
                        <input
                          type="time"
                          value={slotConfig.afternoonEnd}
                          onChange={(e) => setSlotConfig({ ...slotConfig, afternoonEnd: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}

                  {slotConfig.timeSlotType === 'full_day' && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium mb-2">Début journée</label>
                        <input
                          type="time"
                          value={slotConfig.morningStart}
                          onChange={(e) => setSlotConfig({ ...slotConfig, morningStart: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Fin journée</label>
                        <input
                          type="time"
                          value={slotConfig.afternoonEnd}
                          onChange={(e) => setSlotConfig({ ...slotConfig, afternoonEnd: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => generateSlotsMutation.mutate()}
                    disabled={!formData.start_date || !formData.end_date || generateSlotsMutation.isPending}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {generateSlotsMutation.isPending ? 'Génération...' : 'Générer les séances automatiquement'}
                  </Button>

                  {!formData.start_date || !formData.end_date ? (
                    <p className="text-xs text-muted-foreground text-center">
                      Veuillez d'abord définir les dates de début et de fin de la session
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              {/* Liste des séances générées */}
              {sessionSlots && sessionSlots.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Séances générées ({sessionSlots.length})</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('Voulez-vous supprimer toutes les séances ?')) {
                            sessionSlotService.deleteBySessionId(sessionId).then(() => {
                              refetchSlots()
                              addToast({
                                type: 'success',
                                title: 'Séances supprimées',
                                description: 'Toutes les séances ont été supprimées.',
                              })
                            })
                          }
                        }}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Tout supprimer
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {(sessionSlots as SessionSlot[]).map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{formatDate(slot.date)}</span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                slot.time_slot === 'morning' ? 'bg-blue-100 text-blue-800' :
                                slot.time_slot === 'afternoon' ? 'bg-orange-100 text-orange-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {slot.time_slot === 'morning' ? 'Matin' :
                                 slot.time_slot === 'afternoon' ? 'Après-midi' : 'Journée complète'}
                              </span>
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {slot.start_time} - {slot.end_time}
                              </span>
                              {slot.location && (
                                <>
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">{slot.location}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Voulez-vous supprimer cette séance ?')) {
                                deleteSlotMutation.mutate(slot.id)
                              }
                            }}
                          >
                            <Trash className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Ajouter une séance manuelle */}
              <Card>
                <CardHeader>
                  <CardTitle>Ajouter une séance manuelle</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Date</label>
                      <input
                        type="date"
                        id="manual-slot-date"
                        min={formData.start_date}
                        max={formData.end_date}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Créneau</label>
                      <select
                        id="manual-slot-time-slot"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="morning">Matin</option>
                        <option value="afternoon">Après-midi</option>
                        <option value="full_day">Journée complète</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Heure début</label>
                      <input
                        type="time"
                        id="manual-slot-start"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Heure fin</label>
                      <input
                        type="time"
                        id="manual-slot-end"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full mt-4"
                    onClick={() => {
                      const dateInput = document.getElementById('manual-slot-date') as HTMLInputElement
                      const timeSlotSelect = document.getElementById('manual-slot-time-slot') as HTMLSelectElement
                      const startInput = document.getElementById('manual-slot-start') as HTMLInputElement
                      const endInput = document.getElementById('manual-slot-end') as HTMLInputElement

                      if (!dateInput?.value || !startInput?.value || !endInput?.value) {
                        addToast({
                          type: 'error',
                          title: 'Erreur',
                          description: 'Veuillez remplir tous les champs.',
                        })
                        return
                      }

                      createSlotMutation.mutate({
                        date: dateInput.value,
                        time_slot: timeSlotSelect.value,
                        start_time: startInput.value,
                        end_time: endInput.value,
                      })

                      // Réinitialiser les champs
                      dateInput.value = ''
                      startInput.value = ''
                      endInput.value = ''
                    }}
                    disabled={!formData.start_date || !formData.end_date}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter la séance
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Configuration - Apprenants Tab */}
          {activeStep === 'configuration' && activeTab === 'apprenants' && (
            <Card>
              <CardHeader>
                <CardTitle>Apprenants</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">La gestion des apprenants se fait via l'onglet "Gestion" → "Inscriptions".</p>
                {formData.formation_id ? (
                  <Link href={`/dashboard/formations/${formData.formation_id}/sessions`}>
                    <Button variant="outline" className="mt-4">
                      <Users className="mr-2 h-4 w-4" />
                      Gérer les inscriptions
                    </Button>
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">Veuillez d'abord sélectionner une formation dans l'onglet "Programme".</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Configuration - Programme Tab */}
          {activeStep === 'configuration' && activeTab === 'programme' && (
            <Card>
              <CardHeader>
                <CardTitle>Programmes et Formation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Programmes *</label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Sélectionnez un ou plusieurs programmes associés à cette session
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                    {!programs || (programs as Program[]).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucun programme disponible</p>
                    ) : (
                      (programs as Program[]).map((p) => (
                        <label
                          key={p.id}
                          className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.program_ids.includes(p.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  program_ids: [...formData.program_ids, p.id],
                                  // Réinitialiser la formation si elle n'est plus dans les programmes sélectionnés
                                  formation_id: formData.formation_id && formations?.some((f: FormationWithRelations) => 
                                    f.id === formData.formation_id && f.program_id && [...formData.program_ids, p.id].includes(f.program_id)
                                  ) ? formData.formation_id : '',
                                })
                              } else {
                                const newProgramIds = formData.program_ids.filter((id) => id !== p.id)
                                setFormData({
                                  ...formData,
                                  program_ids: newProgramIds,
                                  // Réinitialiser la formation si elle n'est plus dans les programmes sélectionnés
                                  formation_id: formData.formation_id && formations?.some((f: FormationWithRelations) => 
                                    f.id === formData.formation_id && f.program_id && newProgramIds.includes(f.program_id)
                                  ) ? formData.formation_id : '',
                                })
                              }
                            }}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                          />
                          <span className="text-sm">{p.name}</span>
                          {p.code && (
                            <span className="text-xs text-muted-foreground">({p.code})</span>
                          )}
                        </label>
                      ))
                    )}
                  </div>
                  {formData.program_ids.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {formData.program_ids.length} programme{formData.program_ids.length > 1 ? 's' : ''} sélectionné{formData.program_ids.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Formation *</label>
                  <select
                    value={formData.formation_id}
                    onChange={(e) => setFormData({ ...formData, formation_id: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={formData.program_ids.length === 0}
                  >
                    <option value="">Sélectionner une formation</option>
                    {(formations as FormationWithRelations[])?.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} {f.program_id && formData.program_ids.includes(f.program_id) ? '' : '(hors programmes sélectionnés)'}
                      </option>
                    ))}
                  </select>
                  {formData.program_ids.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Veuillez d'abord sélectionner au moins un programme
                    </p>
                  )}
                </div>

                {formation && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Formation sélectionnée</h4>
                    <p className="text-sm text-muted-foreground">
                      <Link href={`/dashboard/formations/${formation.id}`} className="text-primary hover:underline">
                        {formation.name}
                      </Link>
                    </p>
                    {(sessionPrograms && (sessionPrograms as Program[]).length > 0) ? (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Programmes associés:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {(sessionPrograms as Program[]).map((p: Program) => (
                            <li key={p.id} className="text-xs text-muted-foreground">
                              <Link href={`/dashboard/programs/${p.id}`} className="text-primary hover:underline">
                                {p.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : program && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Programme: <Link href={`/dashboard/programs/${program.id}`} className="text-primary hover:underline">
                          {program.name}
                        </Link>
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Configuration - Intervenants Tab */}
          {activeStep === 'configuration' && activeTab === 'intervenants' && (
            <Card>
              <CardHeader>
                <CardTitle>Intervenants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Enseignant/Formateur</label>
                  <select
                    value={formData.teacher_id}
                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Sélectionner un intervenant</option>
                    {(users as User[])?.filter((u) => u.role === 'teacher' || u.role === 'admin')?.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gestion - Conventions Tab */}
          {activeStep === 'gestion' && activeGestionTab === 'conventions' && (
            <div className="space-y-6">
              {/* Conventions et contrats par client */}
              <Card>
                <CardHeader>
                  <CardTitle>Conventions et contrats par client</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(!formData.start_date || !formData.end_date || !sessionData?.formations) ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-yellow-800 font-medium">
                            Votre session est incomplète, il n'est pas possible de générer de conventions.
                          </p>
                          <p className="text-xs text-yellow-700 mt-1">
                            Assurez-vous que votre session contient au moins un module avec des dates et un prix.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Section génération en masse */}
                      <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="font-medium text-blue-900">Conventions et contrats</p>
                            {lastZipGeneration ? (
                              <span className="text-xs text-blue-700 mt-1 inline-block">
                                Dernière génération : {formatDate(lastZipGeneration.toISOString())}
                              </span>
                            ) : (
                              <span className="text-xs text-blue-700 mt-1 inline-block">Jamais généré</span>
                            )}
                          </div>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleGenerateAllConventionsZip}
                            disabled={isGeneratingZip || !enrollments || (enrollments as EnrollmentWithRelations[]).length === 0}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            {isGeneratingZip 
                              ? `Génération... (${zipGenerationProgress.current}/${zipGenerationProgress.total})`
                              : 'Générer un ZIP des conventions et contrats'}
                          </Button>
                        </div>
                        {isGeneratingZip && (
                          <div className="mt-2">
                            <div className="w-full bg-blue-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{
                                  width: `${zipGenerationProgress.total > 0 
                                    ? (zipGenerationProgress.current / zipGenerationProgress.total) * 100 
                                    : 0}%`,
                                }}
                              />
                            </div>
                            <p className="text-xs text-blue-700 mt-1 text-center">
                              Génération en cours... {zipGenerationProgress.current} sur {zipGenerationProgress.total} document{zipGenerationProgress.total > 1 ? 's' : ''}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Convention générale */}
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium">Convention</p>
                            <p className="text-sm text-muted-foreground">Convention générale de formation</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" onClick={handleGenerateConvention}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Mail className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Inscriptions existantes */}
                      {enrollmentsLoading ? (
                        <p className="text-sm text-muted-foreground">Chargement des inscriptions...</p>
                      ) : (enrollments as EnrollmentWithRelations[]) && (enrollments as EnrollmentWithRelations[]).length > 0 ? (
                        (enrollments as EnrollmentWithRelations[]).map((enrollment) => {
                          const student = enrollment.students
                          if (!student) return null

                          return (
                            <div key={enrollment.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center space-x-3">
                                <FileText className="h-5 w-5 text-gray-400" />
                                <div>
                                  <p className="font-medium">{student.first_name} {student.last_name}</p>
                                  <p className="text-sm text-muted-foreground">Contrat particulier</p>
                                  <p className="text-xs text-muted-foreground">Contrat</p>
                                  <span className="text-xs text-muted-foreground mt-1 inline-block">Jamais généré</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Signé</span>
                                <Button variant="ghost" size="sm" onClick={() => handleGenerateContract(enrollment)}>
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Mail className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  ⋯
                                </Button>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <p className="text-sm">Aucune inscription pour le moment.</p>
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => {
                              setActiveGestionTab('convocations')
                              setShowEnrollmentForm(true)
                            }}
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Inscrire un apprenant
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Autres documents contractuels */}
              <Card>
                <CardHeader>
                  <CardTitle>Autres documents contractuels</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!program ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-yellow-800 font-medium">
                            Votre session n'est pas associée à un programme, il n'est pas possible de générer de programme.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium">Programme</p>
                            <p className="text-sm text-muted-foreground">Programme</p>
                            <span className="text-xs text-muted-foreground mt-1 inline-block">Jamais généré</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" onClick={handleGenerateProgram}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            ⋯
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium">CGV</p>
                            <p className="text-sm text-muted-foreground">CGV</p>
                            <span className="text-xs text-muted-foreground mt-1 inline-block">Jamais généré</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" onClick={handleGenerateTerms}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            ⋯
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium">Politique de confidentialité</p>
                            <p className="text-sm text-muted-foreground">Politique de confidentialité</p>
                            <span className="text-xs text-muted-foreground mt-1 inline-block">Jamais généré</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" onClick={handleGeneratePrivacyPolicy}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            ⋯
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Gestion - Convocations Tab */}
          {activeStep === 'gestion' && activeGestionTab === 'convocations' && (
            <div className="space-y-6">
              {/* Formulaire d'inscription */}
              {showEnrollmentForm && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Inscrire un apprenant</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowEnrollmentForm(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        createEnrollmentMutation.mutate()
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium mb-2">Élève *</label>
                        <select
                          value={enrollmentForm.student_id}
                          onChange={(e) => setEnrollmentForm({ ...enrollmentForm, student_id: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        >
                          <option value="">Sélectionner un élève</option>
                          {(students as StudentWithRelations[])?.map((student) => (
                            <option key={student.id} value={student.id}>
                              {student.first_name} {student.last_name} ({student.student_number})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Date d'inscription *</label>
                          <input
                            type="date"
                            value={enrollmentForm.enrollment_date}
                            onChange={(e) => setEnrollmentForm({ ...enrollmentForm, enrollment_date: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Statut *</label>
                          <select
                            value={enrollmentForm.status}
                            onChange={(e) => setEnrollmentForm({ ...enrollmentForm, status: e.target.value as Enrollment['status'] })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          >
                            <option value="pending">En attente</option>
                            <option value="confirmed">Confirmée</option>
                            <option value="completed">Terminée</option>
                            <option value="cancelled">Annulée</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Montant total</label>
                          <input
                            type="number"
                            step="0.01"
                            value={enrollmentForm.total_amount}
                            onChange={(e) => setEnrollmentForm({ ...enrollmentForm, total_amount: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Montant payé</label>
                          <input
                            type="number"
                            step="0.01"
                            value={enrollmentForm.paid_amount}
                            onChange={(e) => setEnrollmentForm({ ...enrollmentForm, paid_amount: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Statut de paiement *</label>
                        <select
                          value={enrollmentForm.payment_status}
                          onChange={(e) => setEnrollmentForm({ ...enrollmentForm, payment_status: e.target.value as Enrollment['payment_status'] })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                          <option value="pending">En attente</option>
                          <option value="partial">Partiel</option>
                          <option value="paid">Payé</option>
                          <option value="overdue">En retard</option>
                        </select>
                      </div>

                      {createEnrollmentMutation.error && (
                        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                          {createEnrollmentMutation.error instanceof Error
                            ? createEnrollmentMutation.error.message
                            : 'Une erreur est survenue'}
                        </div>
                      )}

                      <div className="flex justify-end space-x-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowEnrollmentForm(false)}
                        >
                          Annuler
                        </Button>
                        <Button type="submit" disabled={createEnrollmentMutation.isPending}>
                          {createEnrollmentMutation.isPending ? 'Inscription...' : 'Inscrire'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Génération et envoi des convocations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                {/* Génération globale */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">Convocations</p>
                      {lastZipGeneration ? (
                        <span className="text-xs text-muted-foreground">
                          Dernière génération : {formatDate(lastZipGeneration.toISOString())}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Jamais généré</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleGenerateAllConvocationsZip}
                        disabled={isGeneratingZip || !enrollments || (enrollments as EnrollmentWithRelations[]).length === 0}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {isGeneratingZip 
                          ? `Génération... (${zipGenerationProgress.current}/${zipGenerationProgress.total})`
                          : 'Générer un ZIP des convocations'
                        }
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleSendAllConvocationsByEmail}
                        disabled={!enrollments || (enrollments as EnrollmentWithRelations[]).length === 0}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Envoyer par email
                      </Button>
                    </div>
                  </div>
                  {isGeneratingZip && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${zipGenerationProgress.total > 0 
                              ? (zipGenerationProgress.current / zipGenerationProgress.total) * 100 
                              : 0}%` 
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        Génération en cours... {zipGenerationProgress.current} sur {zipGenerationProgress.total} convocations
                      </p>
                    </div>
                  )}
                </div>

                {/* Apprenants */}
                <div className="space-y-3">
                  <h4 className="font-medium">Apprenants</h4>
                  {enrollmentsLoading ? (
                    <p className="text-sm text-muted-foreground">Chargement...</p>
                  ) : (enrollments as EnrollmentWithRelations[]) && (enrollments as EnrollmentWithRelations[]).length > 0 ? (
                    (enrollments as EnrollmentWithRelations[]).map((enrollment) => {
                      const student = enrollment.students
                      if (!student) return null

                      return (
                        <div key={enrollment.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{student.first_name} {student.last_name}</p>
                            <span className="text-xs text-muted-foreground">Jamais généré</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleGenerateConvocation(enrollment)}>
                              Générer la convocation
                            </Button>
                            <Button variant="ghost" size="sm">
                              ⋯
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Mail className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm mb-4">Aucun apprenant inscrit</p>
                      <Button
                        variant="outline"
                        onClick={() => setShowEnrollmentForm(true)}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Inscrire un apprenant
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            </div>
          )}

          {/* Gestion - Évaluations Tab */}
          {activeStep === 'gestion' && activeGestionTab === 'evaluations' && (
            <div className="space-y-6">
              {/* Statistiques des évaluations */}
              {grades && grades.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Statistiques des évaluations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{grades.length}</p>
                        <p className="text-sm text-muted-foreground mt-1">Évaluations totales</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">
                          {gradesStats?.average?.toFixed(2) || '0'}/{gradesStats?.max || 0}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">Note moyenne</p>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <p className="text-2xl font-bold text-yellow-600">
                          {gradesStats?.averagePercentage || 0}%
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">Moyenne en %</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">
                          {(grades as GradeWithRelations[]).filter((g) => g.graded_at).length}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">Corrigées</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Liste des évaluations existantes */}
              {grades && grades.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>Évaluations enregistrées</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEvaluationForm({
                            ...evaluationForm,
                            assessment_type: 'evaluation_generale',
                          })
                          setShowEvaluationForm(true)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Nouvelle évaluation
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(grades as GradeWithRelations[]).map((grade) => {
                        const student = grade.students
                        return (
                          <div key={grade.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <ClipboardList className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">{grade.subject}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {student?.first_name} {student?.last_name} • {grade.assessment_type || 'Évaluation'}
                                    {grade.graded_at && ` • ${formatDate(grade.graded_at)}`}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">
                                {grade.score}/{grade.max_score || gradesStats?.max || 0}
                              </p>
                              {grade.percentage !== null && (
                                <p className="text-sm text-muted-foreground">
                                  {grade.percentage}%
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Types d'évaluations disponibles */}
              <Card>
                <CardHeader>
                  <CardTitle>Types d'évaluations disponibles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Évaluation préformation pour les apprenants</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Sondez les attentes et diagnostiquez le besoin avant la session.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          setEvaluationForm({
                            ...evaluationForm,
                            assessment_type: 'preformation',
                            subject: 'Évaluation préformation',
                          })
                          setShowEvaluationForm(true)
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Créer une évaluation préformation
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Évaluation à chaud pour les apprenants</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Envoyez une évaluation dématérialisée à l'apprenant pour qu'il note à chaud la formation.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          setEvaluationForm({
                            ...evaluationForm,
                            assessment_type: 'a_chaud',
                            subject: 'Évaluation à chaud',
                          })
                          setShowEvaluationForm(true)
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Créer une évaluation à chaud
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Évaluation à froid pour les apprenants</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Mesurez l'impact professionnel de la formation pour entrer dans une démarche qualité quantitative.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          setEvaluationForm({
                            ...evaluationForm,
                            assessment_type: 'a_froid',
                            subject: 'Évaluation à froid',
                          })
                          setShowEvaluationForm(true)
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Créer une évaluation à froid
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Questionnaire pour les managers des apprenants</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Impliquez les prescripteurs de la formation dans votre démarche qualité.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          setEvaluationForm({
                            ...evaluationForm,
                            assessment_type: 'managers',
                            subject: 'Questionnaire managers',
                          })
                          setShowEvaluationForm(true)
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Créer un questionnaire manager
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Questionnaire pour les intervenants</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Demandez aux intervenants d'évaluer la session.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          setEvaluationForm({
                            ...evaluationForm,
                            assessment_type: 'intervenants',
                            subject: 'Questionnaire intervenants',
                          })
                          setShowEvaluationForm(true)
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Créer un questionnaire intervenant
                      </Button>
                    </CardContent>
                  </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Questionnaire pour les financeurs et les commanditaires</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          Vérifiez la bonne collaboration avec les financeurs et les commanditaires.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            setEvaluationForm({
                              ...evaluationForm,
                              assessment_type: 'financeurs',
                              subject: 'Questionnaire financeurs',
                            })
                            setShowEvaluationForm(true)
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Créer un questionnaire
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              {/* Message si aucune évaluation */}
              {(!grades || grades.length === 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Aucune évaluation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 text-muted-foreground">
                      <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">Aucune évaluation pour cette session</p>
                      <p className="text-sm mb-4">
                        Créez des évaluations pour suivre la progression et la satisfaction des apprenants
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Formulaire de création d'évaluation */}
              {showEvaluationForm && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Créer une évaluation</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowEvaluationForm(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        createEvaluationMutation.mutate()
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium mb-2">Sujet/Matière *</label>
                        <input
                          type="text"
                          value={evaluationForm.subject}
                          onChange={(e) => setEvaluationForm({ ...evaluationForm, subject: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Ex: Évaluation préformation, Contrôle de connaissances..."
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Type d'évaluation *</label>
                        <select
                          value={evaluationForm.assessment_type}
                          onChange={(e) => setEvaluationForm({ ...evaluationForm, assessment_type: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        >
                          <option value="evaluation_generale">Évaluation générale</option>
                          <option value="preformation">Évaluation préformation</option>
                          <option value="a_chaud">Évaluation à chaud</option>
                          <option value="a_froid">Évaluation à froid</option>
                          <option value="managers">Questionnaire managers</option>
                          <option value="intervenants">Questionnaire intervenants</option>
                          <option value="financeurs">Questionnaire financeurs</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Apprenant (optionnel)</label>
                        <select
                          value={evaluationForm.student_id || ''}
                          onChange={(e) => setEvaluationForm({ ...evaluationForm, student_id: e.target.value || undefined })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                          <option value="">Évaluation globale (tous les apprenants)</option>
                          {(enrollments as EnrollmentWithRelations[])?.map((enrollment) => {
                            const student = enrollment.students
                            if (!student) return null
                            return (
                              <option key={enrollment.id} value={student.id}>
                                {student.first_name} {student.last_name} ({student.student_number || 'N/A'})
                              </option>
                            )
                          })}
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Laissez vide pour une évaluation globale de la session
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Note obtenue *</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={evaluationForm.score}
                            onChange={(e) => {
                              const score = e.target.value
                              setEvaluationForm({
                                ...evaluationForm,
                                score,
                                percentage: evaluationForm.percentage || '',
                              })
                            }}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="0"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Note maximale *</label>
                          <input
                            type="number"
                            step="0.01"
                            min="1"
                            value={evaluationForm.max_score}
                            onChange={(e) => setEvaluationForm({ ...evaluationForm, max_score: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="20"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Pourcentage (optionnel)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={evaluationForm.percentage}
                          onChange={(e) => setEvaluationForm({ ...evaluationForm, percentage: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Calculé automatiquement si vide"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Si vide, le pourcentage sera calculé automatiquement (note / note max × 100)
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Date de correction</label>
                        <input
                          type="date"
                          value={evaluationForm.graded_at}
                          onChange={(e) => setEvaluationForm({ ...evaluationForm, graded_at: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Notes/Commentaires (optionnel)</label>
                        <textarea
                          value={evaluationForm.notes}
                          onChange={(e) => setEvaluationForm({ ...evaluationForm, notes: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          rows={4}
                          placeholder="Ajoutez des commentaires, observations ou remarques sur cette évaluation..."
                        />
                      </div>

                      {createEvaluationMutation.error && (
                        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                          {createEvaluationMutation.error instanceof Error
                            ? createEvaluationMutation.error.message
                            : 'Une erreur est survenue'}
                        </div>
                      )}

                      <div className="flex justify-end space-x-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowEvaluationForm(false)}
                        >
                          Annuler
                        </Button>
                        <Button type="submit" disabled={createEvaluationMutation.isPending}>
                          {createEvaluationMutation.isPending ? 'Création...' : 'Créer l\'évaluation'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Gestion - Finances Tab */}
          {activeStep === 'gestion' && activeGestionTab === 'finances' && (
            <div className="space-y-6">
              {/* Statistiques financières */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium">Revenu total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(
                        (enrollments as EnrollmentWithRelations[])?.reduce((sum, e) => sum + Number(e.total_amount || 0), 0) || 0,
                        'XOF'
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {enrollments?.length || 0} inscription{(enrollments?.length || 0) > 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium">Montant payé</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(
                        (enrollments as EnrollmentWithRelations[])?.reduce((sum, e) => sum + Number(e.paid_amount || 0), 0) || 0,
                        'XOF'
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(
                        ((payments as Payment[])?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0),
                        'XOF'
                      )} via paiements
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium">Reste à payer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {formatCurrency(
                        (enrollments as EnrollmentWithRelations[])?.reduce((sum, e) => {
                          const total = Number(e.total_amount || 0)
                          const paid = Number(e.paid_amount || 0)
                          return sum + (total - paid)
                        }, 0) || 0,
                        'XOF'
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {enrollments?.filter((e: any) => {
                        const total = Number(e.total_amount || 0)
                        const paid = Number(e.paid_amount || 0)
                        return total - paid > 0
                      }).length || 0} inscription{(enrollments?.filter((e: any) => {
                        const total = Number(e.total_amount || 0)
                        const paid = Number(e.paid_amount || 0)
                        return total - paid > 0
                      }).length || 0) > 1 ? 's' : ''} avec solde
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Répartition par statut de paiement */}
              <Card>
                <CardHeader>
                  <CardTitle>Répartition par statut de paiement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {enrollments?.filter((e: any) => e.payment_status === 'pending').length || 0}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">En attente</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">
                        {enrollments?.filter((e: any) => e.payment_status === 'partial').length || 0}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">Partiel</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {enrollments?.filter((e: any) => e.payment_status === 'paid').length || 0}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">Payé</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">
                        {enrollments?.filter((e: any) => e.payment_status === 'overdue').length || 0}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">En retard</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Détails des inscriptions */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Détails financiers par inscription</CardTitle>
                    <Link href={`/dashboard/payments`}>
                      <Button variant="outline" size="sm">
                        <DollarSign className="mr-2 h-4 w-4" />
                        Voir toutes les factures
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {enrollmentsLoading ? (
                    <p className="text-sm text-muted-foreground">Chargement...</p>
                  ) : (enrollments as EnrollmentWithRelations[]) && (enrollments as EnrollmentWithRelations[]).length > 0 ? (
                    <div className="space-y-3">
                      {(enrollments as EnrollmentWithRelations[]).map((enrollment) => {
                        const student = enrollment.students
                        if (!student) return null

                        const total = Number(enrollment.total_amount || 0)
                        const paid = Number(enrollment.paid_amount || 0)
                        const remaining = total - paid
                        const paymentStatus = enrollment.payment_status || 'pending'

                        const getPaymentStatusColor = (status: string) => {
                          switch (status) {
                            case 'paid':
                              return 'bg-green-100 text-green-800'
                            case 'partial':
                              return 'bg-yellow-100 text-yellow-800'
                            case 'pending':
                              return 'bg-blue-100 text-blue-800'
                            case 'overdue':
                              return 'bg-red-100 text-red-800'
                            default:
                              return 'bg-gray-100 text-gray-800'
                          }
                        }

                        const getPaymentStatusLabel = (status: string) => {
                          switch (status) {
                            case 'paid':
                              return 'Payé'
                            case 'partial':
                              return 'Partiel'
                            case 'pending':
                              return 'En attente'
                            case 'overdue':
                              return 'En retard'
                            default:
                              return status
                          }
                        }

                        return (
                          <div key={enrollment.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium">{student.first_name} {student.last_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatCurrency(total, 'XOF')} • {formatCurrency(paid, 'XOF')} payé
                                {remaining > 0 && (
                                  <span className="text-orange-600"> • {formatCurrency(remaining, 'XOF')} restant</span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className={`text-xs px-2 py-1 rounded ${getPaymentStatusColor(paymentStatus)}`}>
                                {getPaymentStatusLabel(paymentStatus)}
                              </span>
                              <Link href={`/dashboard/payments?student=${enrollment.student_id}`}>
                                <Button variant="ghost" size="sm">
                                  Voir
                                </Button>
                              </Link>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">Aucune inscription pour le moment.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Gestion - Espace entreprise Tab */}
          {activeStep === 'gestion' && activeGestionTab === 'espace_entreprise' && (
            <div className="space-y-6">
              {/* Vue d'ensemble pour les entreprises */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Building className="h-5 w-5 mr-2" />
                    Vue d'ensemble - Espace entreprise
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-6">
                    Espace dédié aux entreprises commanditaires. Gérez les relations avec vos clients, consultez les statistiques par entreprise et générez des rapports.
                  </p>

                  {/* Statistiques globales */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Apprenants en formation</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-blue-600">
                          {enrollments?.length || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {enrollments?.filter((e: any) => e.status === 'confirmed' || e.status === 'completed').length || 0} actif{(enrollments?.filter((e: any) => e.status === 'confirmed' || e.status === 'completed').length || 0) > 1 ? 's' : ''}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Taux de complétion</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-green-600">
                          {enrollments && enrollments.length > 0
                            ? Math.round(
                                ((enrollments as EnrollmentWithRelations[]).filter((e) => e.status === 'completed').length /
                                  enrollments.length) *
                                  100
                              )
                            : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {enrollments?.filter((e: any) => e.status === 'completed').length || 0} complété{(enrollments?.filter((e: any) => e.status === 'completed').length || 0) > 1 ? 's' : ''}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Taux de satisfaction</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-yellow-600">
                          {gradesStats?.averagePercentage || 'N/A'}
                          {gradesStats?.averagePercentage !== null && '%'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Basé sur les évaluations
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              {/* Statistiques financières par entreprise */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Statistiques financières
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm font-medium text-green-900 mb-1">Revenu total</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(
                            (enrollments as EnrollmentWithRelations[])?.reduce((sum, e) => sum + Number(e.total_amount || 0), 0) || 0,
                            'XOF'
                          )}
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          {enrollments?.length || 0} inscription{(enrollments?.length || 0) > 1 ? 's' : ''}
                        </p>
                      </div>

                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-medium text-blue-900 mb-1">Montant payé</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(
                            (enrollments as EnrollmentWithRelations[])?.reduce((sum, e) => sum + Number(e.paid_amount || 0), 0) || 0,
                            'XOF'
                          )}
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          {formatCurrency(
                            ((payments as Payment[])?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0),
                            'XOF'
                          )} via paiements
                        </p>
                      </div>

                      <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <p className="text-sm font-medium text-orange-900 mb-1">Reste à payer</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {formatCurrency(
                            (enrollments as EnrollmentWithRelations[])?.reduce((sum, e) => {
                              const total = Number(e.total_amount || 0)
                              const paid = Number(e.paid_amount || 0)
                              return sum + (total - paid)
                            }, 0) || 0,
                            'XOF'
                          )}
                        </p>
                        <p className="text-xs text-orange-700 mt-1">
                          {enrollments?.filter((e: any) => {
                            const total = Number(e.total_amount || 0)
                            const paid = Number(e.paid_amount || 0)
                            return total - paid > 0
                          }).length || 0} inscription{(enrollments?.filter((e: any) => {
                            const total = Number(e.total_amount || 0)
                            const paid = Number(e.paid_amount || 0)
                            return total - paid > 0
                          }).length || 0) > 1 ? 's' : ''} avec solde
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Apprenants par session */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Apprenants de la session
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setActiveStep('espace_apprenant')
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Voir l'espace apprenant
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {enrollmentsLoading ? (
                    <p className="text-sm text-muted-foreground">Chargement...</p>
                  ) : (enrollments as EnrollmentWithRelations[]) && (enrollments as EnrollmentWithRelations[]).length > 0 ? (
                    <div className="space-y-3">
                      {(enrollments as EnrollmentWithRelations[]).map((enrollment) => {
                        const student = enrollment.students
                        if (!student) return null

                        const studentAttendance = attendanceStats?.byStudent?.[enrollment.student_id] || {
                          present: 0,
                          total: 0,
                        }
                        const attendanceRate = studentAttendance.total > 0
                          ? Math.round((studentAttendance.present / studentAttendance.total) * 100)
                          : 0

                        return (
                          <div key={enrollment.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-4 flex-1">
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-6 w-6 text-primary" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">
                                  {student.first_name} {student.last_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {student.student_number || 'N/A'} • {student.email || 'Pas d\'email'}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div>
                                <p className="text-sm font-medium text-blue-600">{attendanceRate}%</p>
                                <p className="text-xs text-muted-foreground">Présence</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {formatCurrency(Number(enrollment.paid_amount || 0), 'XOF')}
                                </p>
                                <p className="text-xs text-muted-foreground">Payé</p>
                              </div>
                              <div>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  enrollment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  enrollment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {enrollment.status === 'completed' ? 'Terminé' :
                                   enrollment.status === 'confirmed' ? 'Confirmé' :
                                   enrollment.status === 'pending' ? 'En attente' : enrollment.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Aucun apprenant inscrit</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Rapports pour entreprises */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Rapports et documents pour entreprises
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Rapport de session</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          Générez un rapport complet de la session incluant les statistiques, la progression des apprenants et les résultats.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={handleGenerateSessionReport}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Générer le rapport
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Factures et documents financiers</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          Accédez aux factures et documents financiers liés à cette session pour les entreprises.
                        </p>
                        <Link href="/dashboard/payments">
                          <Button variant="outline" size="sm" className="w-full">
                            <DollarSign className="h-4 w-4 mr-2" />
                            Voir les factures
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Évaluations et feedback</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          Consultez les évaluations et le feedback des apprenants pour partager avec les entreprises.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            setActiveGestionTab('evaluations')
                          }}
                        >
                          <ClipboardList className="h-4 w-4 mr-2" />
                          Voir les évaluations
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Certificats de formation</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          Générez et téléchargez les certificats de formation pour les apprenants qui ont complété la session.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            setActiveStep('espace_apprenant')
                          }}
                        >
                          <Award className="h-4 w-4 mr-2" />
                          Voir les certificats
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              {/* Informations de contact */}
              {organization && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Building className="h-5 w-5 mr-2" />
                      Informations de contact
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-medium mb-3">Organisation de formation</h3>
                        <div className="space-y-2 text-sm">
                          <p><span className="font-medium">Nom :</span> {organization.name}</p>
                          {organization.address && (
                            <p><span className="font-medium">Adresse :</span> {organization.address}</p>
                          )}
                          {organization.phone && (
                            <p><span className="font-medium">Téléphone :</span> {organization.phone}</p>
                          )}
                          {organization.email && (
                            <p><span className="font-medium">Email :</span> {organization.email}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-medium mb-3">Session</h3>
                        <div className="space-y-2 text-sm">
                          {sessionData && (
                            <>
                              <p><span className="font-medium">Nom :</span> {sessionData.name}</p>
                              {sessionData.start_date && (
                                <p><span className="font-medium">Date de début :</span> {formatDate(sessionData.start_date)}</p>
                              )}
                              {sessionData.end_date && (
                                <p><span className="font-medium">Date de fin :</span> {formatDate(sessionData.end_date)}</p>
                              )}
                              {sessionData.location && (
                                <p><span className="font-medium">Lieu :</span> {sessionData.location}</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Espace Apprenant Step */}
          {activeStep === 'espace_apprenant' && (
            <div className="space-y-6">
              {/* Vue d'ensemble */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Espace Apprenant - {enrollments?.length || 0} apprenant{(enrollments?.length || 0) > 1 ? 's' : ''} inscrit{(enrollments?.length || 0) > 1 ? 's' : ''}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {enrollmentsLoading ? (
                    <p className="text-sm text-muted-foreground">Chargement...</p>
                  ) : (enrollments as EnrollmentWithRelations[]) && (enrollments as EnrollmentWithRelations[]).length > 0 ? (
                    <div className="space-y-4">
                      {(enrollments as EnrollmentWithRelations[]).map((enrollment) => {
                        const student = enrollment.students
                        if (!student) return null

                        // Statistiques pour cet apprenant
                        const studentGrades = (grades as GradeWithRelations[])?.filter((g) => g.student_id === enrollment.student_id) || []
                        const studentAttendance = attendanceStats?.byStudent?.[enrollment.student_id] || {
                          present: 0,
                          absent: 0,
                          late: 0,
                          excused: 0,
                          total: 0,
                        }
                        const studentAttendanceRate = studentAttendance.total > 0
                          ? Math.round((studentAttendance.present / studentAttendance.total) * 100)
                          : 0
                        const avgGrade = studentGrades.length > 0
                          ? studentGrades.reduce((sum, g) => sum + (Number(g.score) || 0), 0) / studentGrades.length
                          : null

                        return (
                          <div key={enrollment.id} className="border rounded-lg p-6 space-y-6">
                            {/* En-tête de l'apprenant */}
                            <div className="flex items-start justify-between border-b pb-4">
                              <div className="flex items-start space-x-4">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                  <h3 className="text-xl font-semibold">
                                    {student.first_name} {student.last_name}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {student.student_number || 'N/A'} • {student.email || 'Pas d\'email'}
                                  </p>
                                  <div className="flex items-center space-x-3 mt-2">
                                    <span className={`text-xs px-2 py-1 rounded ${
                                      enrollment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                      enrollment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {enrollment.status === 'completed' ? 'Terminé' :
                                       enrollment.status === 'confirmed' ? 'Confirmé' :
                                       enrollment.status === 'pending' ? 'En attente' : enrollment.status}
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded ${
                                      enrollment.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                                      enrollment.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                      enrollment.payment_status === 'overdue' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {enrollment.payment_status === 'paid' ? 'Payé' :
                                       enrollment.payment_status === 'partial' ? 'Partiel' :
                                       enrollment.payment_status === 'overdue' ? 'En retard' : 'En attente'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <Link href={`/dashboard/students/${enrollment.student_id}`}>
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4 mr-2" />
                                  Voir le profil
                                </Button>
                              </Link>
                            </div>

                            {/* Statistiques rapides */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <Card>
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-sm font-medium text-muted-foreground">Présence</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="text-2xl font-bold">{studentAttendanceRate}%</div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {studentAttendance.present}/{studentAttendance.total} séances
                                  </p>
                                </CardContent>
                              </Card>

                              <Card>
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-sm font-medium text-muted-foreground">Note moyenne</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {avgGrade !== null ? (
                                    <>
                                      <div className="text-2xl font-bold">
                                        {avgGrade.toFixed(2)}/{gradesStats?.max || 0}
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {studentGrades.length} note{studentGrades.length > 1 ? 's' : ''}
                                      </p>
                                    </>
                                  ) : (
                                    <div className="text-sm text-muted-foreground">Aucune note</div>
                                  )}
                                </CardContent>
                              </Card>

                              <Card>
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-sm font-medium text-muted-foreground">Paiement</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="text-2xl font-bold">
                                    {formatCurrency(Number(enrollment.paid_amount || 0), 'XOF')}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    sur {formatCurrency(Number(enrollment.total_amount || 0), 'XOF')}
                                  </p>
                                </CardContent>
                              </Card>

                              <Card>
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-sm font-medium text-muted-foreground">Inscription</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="text-sm font-medium">
                                    {formatDate(enrollment.enrollment_date || '')}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Date d'inscription
                                  </p>
                                </CardContent>
                              </Card>
                            </div>

                            {/* Planning personnalisé */}
                            {sessionData && (
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-base flex items-center">
                                    <Calendar className="h-5 w-5 mr-2" />
                                    Planning de la session
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                      <div className="flex items-center space-x-3">
                                        <Calendar className="h-5 w-5 text-blue-600" />
                                        <div>
                                          <p className="font-medium">Date de début</p>
                                          <p className="text-sm text-muted-foreground">
                                            {formatDate(sessionData.start_date || '')}
                                            {sessionData.start_time && ` à ${sessionData.start_time}`}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                                      <div className="flex items-center space-x-3">
                                        <Calendar className="h-5 w-5 text-orange-600" />
                                        <div>
                                          <p className="font-medium">Date de fin</p>
                                          <p className="text-sm text-muted-foreground">
                                            {formatDate(sessionData.end_date || '')}
                                            {sessionData.end_time && ` à ${sessionData.end_time}`}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {sessionData.location && (
                                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                          <MapPin className="h-5 w-5 text-green-600" />
                                          <div>
                                            <p className="font-medium">Lieu</p>
                                            <p className="text-sm text-muted-foreground">
                                              {sessionData.location}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            {/* Progression individuelle */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base flex items-center">
                                  <TrendingUp className="h-5 w-5 mr-2" />
                                  Progression
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-4">
                                  {/* Barre de progression de présence */}
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium">Taux de présence</span>
                                      <span className="text-sm text-muted-foreground">{studentAttendanceRate}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                      <div
                                        className="bg-green-600 h-3 rounded-full transition-all"
                                        style={{ width: `${studentAttendanceRate}%` }}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                                      <span>{studentAttendance.present} présent{studentAttendance.present > 1 ? 's' : ''}</span>
                                      <span>{studentAttendance.absent} absent{studentAttendance.absent > 1 ? 's' : ''}</span>
                                      {studentAttendance.late > 0 && <span>{studentAttendance.late} retard{studentAttendance.late > 1 ? 's' : ''}</span>}
                                    </div>
                                  </div>

                                  {/* Notes récentes */}
                                  {studentGrades.length > 0 && (
                                    <div>
                                      <p className="text-sm font-medium mb-3">Notes récentes</p>
                                      <div className="space-y-2">
                                        {studentGrades.slice(0, 5).map((grade: any, idx: number) => (
                                          <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                            <div>
                                              <p className="text-sm font-medium">{grade.subject}</p>
                                              <p className="text-xs text-muted-foreground">
                                                {grade.assessment_type || 'Évaluation'} • {formatDate(grade.graded_at || '')}
                                              </p>
                                            </div>
                                            <div className="text-right">
                                              <p className="text-sm font-bold">
                                                {grade.score}/{grade.max_score || gradesStats?.max || 0}
                                              </p>
                                              {grade.percentage !== null && (
                                                <p className="text-xs text-muted-foreground">
                                                  {grade.percentage}%
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>

                            {/* Évaluations */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base flex items-center">
                                  <ClipboardList className="h-5 w-5 mr-2" />
                                  Évaluations
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                {studentGrades.length > 0 ? (
                                  <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground mb-3">
                                      {studentGrades.length} évaluation{studentGrades.length > 1 ? 's' : ''} complétée{studentGrades.length > 1 ? 's' : ''}
                                    </p>
                                    <div className="space-y-2">
                                      {studentGrades.map((grade: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                                          <div className="flex items-center space-x-3">
                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                            <div>
                                              <p className="font-medium">{grade.subject}</p>
                                              <p className="text-xs text-muted-foreground">
                                                {formatDate(grade.graded_at || '')}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <p className="font-bold">
                                              {grade.score}/{grade.max_score || gradesStats?.max || 0}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-muted-foreground">
                                    <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p className="text-sm">Aucune évaluation complétée pour le moment</p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            {/* Documents partagés */}
                            <StudentDocumentsSection 
                              studentId={enrollment.student_id}
                              organizationId={user?.organization_id || ''}
                            />

                            {/* Certificats */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base flex items-center">
                                  <Award className="h-5 w-5 mr-2" />
                                  Certificats
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                {enrollment.status === 'completed' ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                                      <div className="flex items-center space-x-3">
                                        <Award className="h-8 w-8 text-yellow-600" />
                                        <div>
                                          <p className="font-medium">Certificat de formation</p>
                                          <p className="text-sm text-muted-foreground">
                                            Session terminée avec succès
                                          </p>
                                        </div>
                                      </div>
                                      <Button variant="outline" size="sm" onClick={() => handleGenerateCertificate(enrollment)}>
                                        <Download className="h-4 w-4 mr-2" />
                                        Télécharger
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-muted-foreground">
                                    <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p className="text-sm">
                                      Le certificat sera disponible une fois la session terminée
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">Aucun apprenant inscrit</p>
                      <p className="text-sm mb-4">
                        Les apprenants inscrits à cette session apparaîtront ici
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setActiveStep('gestion')
                          setActiveGestionTab('convocations')
                          setShowEnrollmentForm(true)
                        }}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Inscrire un apprenant
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Suivi Step */}
          {activeStep === 'suivi' && (
            <div className="space-y-6">
              {/* KPIs Principaux */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center">
                      <Activity className="h-5 w-5 mr-2 text-blue-600" />
                      Taux de présence
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      {attendanceStats?.attendanceRate || 0}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {attendanceStats?.present || 0} présent{(attendanceStats?.present || 0) > 1 ? 's' : ''} sur {attendanceStats?.total || 0} séance{(attendanceStats?.total || 0) > 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                      Taux de complétion
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {enrollments && enrollments.length > 0
                        ? Math.round(
                            ((enrollments as EnrollmentWithRelations[]).filter((e) => e.status === 'completed').length /
                              enrollments.length) *
                              100
                          )
                        : 0}
                      %
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {enrollments?.filter((e: any) => e.status === 'completed').length || 0} complété{(enrollments?.filter((e: any) => e.status === 'completed').length || 0) > 1 ? 's' : ''} sur {enrollments?.length || 0} inscription{(enrollments?.length || 0) > 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center">
                      <Star className="h-5 w-5 mr-2 text-yellow-600" />
                      Note moyenne
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-yellow-600">
                      {gradesStats?.average || 0}/{gradesStats?.max || 0}
                    </div>
                    {gradesStats?.averagePercentage !== null && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ({gradesStats.averagePercentage}%)
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {gradesStats?.total || 0} note{(gradesStats?.total || 0) > 1 ? 's' : ''} enregistrée{(gradesStats?.total || 0) > 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center">
                      <DollarSign className="h-5 w-5 mr-2 text-teal-600" />
                      Taux de recouvrement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-teal-600">
                      {enrollments && enrollments.length > 0
                        ? Math.round(
                            (((enrollments as EnrollmentWithRelations[]).reduce((sum, e) => sum + Number(e.paid_amount || 0), 0) /
                              (enrollments as EnrollmentWithRelations[]).reduce((sum, e) => sum + Number(e.total_amount || 0), 1)) *
                              100)
                          )
                        : 0}
                      %
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(
                        (enrollments as EnrollmentWithRelations[])?.reduce((sum, e) => sum + Number(e.paid_amount || 0), 0) || 0,
                        'XOF'
                      )}{' '}
                      payé
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Graphiques */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Graphique d'évolution de la présence */}
                {attendanceStats?.byDate && attendanceStats.byDate.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Évolution de la présence</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={attendanceStats.byDate}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => formatDate(value)}
                            style={{ fontSize: '12px' }}
                          />
                          <YAxis style={{ fontSize: '12px' }} />
                          <Tooltip 
                            labelFormatter={(value) => formatDate(value)}
                            formatter={(value: any) => [value, '']}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="present" stroke="#22c55e" strokeWidth={2} name="Présent" />
                          <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} name="Absent" />
                          <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} name="En retard" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Répartition des présences */}
                {attendanceStats && attendanceStats.total > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Répartition des présences</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Présent', value: attendanceStats.present, color: '#22c55e' },
                              { name: 'Absent', value: attendanceStats.absent, color: '#ef4444' },
                              { name: 'En retard', value: attendanceStats.late, color: '#f59e0b' },
                              { name: 'Justifié', value: attendanceStats.excused, color: '#3b82f6' },
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            <Cell fill="#22c55e" />
                            <Cell fill="#ef4444" />
                            <Cell fill="#f59e0b" />
                            <Cell fill="#3b82f6" />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Répartition des statuts de paiement */}
                {enrollments && enrollments.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Statuts de paiement</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={[
                            {
                              status: 'En attente',
                              count: enrollments.filter((e: any) => e.payment_status === 'pending').length,
                            },
                            {
                              status: 'Partiel',
                              count: enrollments.filter((e: any) => e.payment_status === 'partial').length,
                            },
                            {
                              status: 'Payé',
                              count: enrollments.filter((e: any) => e.payment_status === 'paid').length,
                            },
                            {
                              status: 'En retard',
                              count: enrollments.filter((e: any) => e.payment_status === 'overdue').length,
                            },
                          ]}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="status" style={{ fontSize: '12px' }} />
                          <YAxis style={{ fontSize: '12px' }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#14b8a6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Distribution des notes */}
                {gradesStats && gradesStats.total > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Distribution des notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={[
                            { range: '0-20%', count: (grades as GradeWithRelations[]).filter((g) => (Number(g.percentage) || 0) >= 0 && (Number(g.percentage) || 0) < 20).length },
                            { range: '20-40%', count: (grades as GradeWithRelations[]).filter((g) => (Number(g.percentage) || 0) >= 20 && (Number(g.percentage) || 0) < 40).length },
                            { range: '40-60%', count: (grades as GradeWithRelations[]).filter((g) => (Number(g.percentage) || 0) >= 40 && (Number(g.percentage) || 0) < 60).length },
                            { range: '60-80%', count: (grades as GradeWithRelations[]).filter((g) => (Number(g.percentage) || 0) >= 60 && (Number(g.percentage) || 0) < 80).length },
                            { range: '80-100%', count: (grades as GradeWithRelations[]).filter((g) => (Number(g.percentage) || 0) >= 80 && (Number(g.percentage) || 0) <= 100).length },
                          ]}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="range" style={{ fontSize: '12px' }} />
                          <YAxis style={{ fontSize: '12px' }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#f59e0b" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Alertes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
                    Alertes et actions requises
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Alertes de paiement */}
                    {(enrollments as EnrollmentWithRelations[])?.filter((e) => e.payment_status === 'overdue').length > 0 && (
                      <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-red-900">
                            {(enrollments as EnrollmentWithRelations[]).filter((e) => e.payment_status === 'overdue').length} paiement{(enrollments as EnrollmentWithRelations[]).filter((e) => e.payment_status === 'overdue').length > 1 ? 's' : ''} en retard
                          </p>
                          <p className="text-sm text-red-700 mt-1">
                            Certains apprenants ont des paiements en retard. Vérifiez la section Finances.
                          </p>
                        </div>
                        <Link href="#finances">
                          <Button variant="outline" size="sm">
                            Voir
                          </Button>
                        </Link>
                      </div>
                    )}

                    {/* Alertes d'absences */}
                    {attendanceStats && attendanceStats.absent > 0 && (
                      <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-yellow-900">
                            {attendanceStats.absent} absence{(attendanceStats.absent > 1 ? 's' : '')} enregistrée{(attendanceStats.absent > 1 ? 's' : '')}
                          </p>
                          <p className="text-sm text-yellow-700 mt-1">
                            Certains apprenants ont été absents. Consultez les détails d'émargement.
                          </p>
                        </div>
                        <Link href={`/dashboard/attendance/session/${sessionId}`}>
                          <Button variant="outline" size="sm">
                            Voir
                          </Button>
                        </Link>
                      </div>
                    )}

                    {/* Message si pas d'alertes */}
                    {(!enrollments || enrollments.length === 0 || 
                      ((enrollments as EnrollmentWithRelations[]).filter((e) => e.payment_status === 'overdue').length === 0 && 
                       (!attendanceStats || attendanceStats.absent === 0))) && (
                      <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <p className="text-sm text-green-700">
                          Aucune alerte pour le moment. Tout semble en ordre !
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Suivi de progression par apprenant */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Progression par apprenant
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {enrollmentsLoading ? (
                    <p className="text-sm text-muted-foreground">Chargement...</p>
                  ) : (enrollments as EnrollmentWithRelations[]) && (enrollments as EnrollmentWithRelations[]).length > 0 ? (
                    <div className="space-y-4">
                      {(enrollments as EnrollmentWithRelations[]).map((enrollment) => {
                        const student = enrollment.students
                        if (!student) return null

                        // Calculer les statistiques pour cet apprenant
                        const studentGrades = (grades as GradeWithRelations[])?.filter((g) => g.student_id === enrollment.student_id) || []
                        const studentAttendance = attendanceStats?.byStudent?.[enrollment.student_id] || {
                          present: 0,
                          absent: 0,
                          late: 0,
                          excused: 0,
                          total: 0,
                        }
                        const studentAttendanceRate = studentAttendance.total > 0
                          ? Math.round((studentAttendance.present / studentAttendance.total) * 100)
                          : 0

                        const avgGrade = studentGrades.length > 0
                          ? studentGrades.reduce((sum, g) => sum + (Number(g.score) || 0), 0) / studentGrades.length
                          : null

                        return (
                          <div key={enrollment.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="font-medium">
                                  {student.first_name} {student.last_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {student.student_number || 'N/A'}
                                </p>
                              </div>
                              <div className={`text-xs px-2 py-1 rounded ${
                                enrollment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                enrollment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {enrollment.status === 'completed' ? 'Terminé' :
                                 enrollment.status === 'confirmed' ? 'Confirmé' :
                                 enrollment.status === 'pending' ? 'En attente' : enrollment.status}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Présence</p>
                                <div className="flex items-center space-x-2">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-green-600 h-2 rounded-full"
                                      style={{
                                        width: `${studentAttendanceRate}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium">
                                    {studentAttendanceRate}%
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {studentAttendance.present} présent{studentAttendance.present > 1 ? 's' : ''} sur {studentAttendance.total} séance{studentAttendance.total > 1 ? 's' : ''}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Note moyenne</p>
                                {avgGrade !== null ? (
                                  <>
                                    <p className="text-lg font-bold">
                                      {avgGrade.toFixed(2)}/{gradesStats?.max || 0}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {studentGrades.length} note{studentGrades.length > 1 ? 's' : ''}
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-sm text-muted-foreground">Aucune note</p>
                                )}
                              </div>

                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Paiement</p>
                                <div className={`text-xs px-2 py-1 rounded inline-block ${
                                  enrollment.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                                  enrollment.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                  enrollment.payment_status === 'overdue' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {enrollment.payment_status === 'paid' ? 'Payé' :
                                   enrollment.payment_status === 'partial' ? 'Partiel' :
                                   enrollment.payment_status === 'overdue' ? 'En retard' : 'En attente'}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatCurrency(Number(enrollment.paid_amount || 0), 'XOF')} / {formatCurrency(Number(enrollment.total_amount || 0), 'XOF')}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">Aucun apprenant inscrit</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bouton d'export du rapport */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Rapport de session</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Générez un rapport complet de la session incluant toutes les statistiques, la progression des apprenants et les détails financiers.
                  </p>
                  <Button variant="outline" onClick={handleGenerateSessionReport}>
                    <Download className="mr-2 h-4 w-4" />
                    Exporter le rapport PDF
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="bg-primary text-white"
            >
              <Save className="mr-2 h-4 w-4" />
              {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
            <Button
              variant="outline"
              onClick={() => cloneMutation.mutate()}
              disabled={cloneMutation.isPending}
            >
              <Copy className="mr-2 h-4 w-4" />
              Cloner
            </Button>
            <Button
              variant="outline"
              onClick={() => archiveMutation.mutate()}
              disabled={archiveMutation.isPending}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archiver
            </Button>
            <Button
              variant="outline"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </div>

        {/* Right Sidebar (1 column) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{formData.name || sessionData.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Button variant="outline" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter
                </Button>
              </div>

              <div>
                <h4 className="font-medium mb-2">Tâches</h4>
                <p className="text-sm text-muted-foreground">Aucune tâche prévue pour le moment.</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Notes</h4>
                <p className="text-sm text-muted-foreground">Aucune note pour le moment.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
