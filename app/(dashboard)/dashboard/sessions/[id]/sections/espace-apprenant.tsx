'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import {
  User,
  TrendingUp,
  ClipboardList,
  Award,
  MapPin,
  Calendar,
  Clock,
  Download,
  UserPlus,
  Eye,
  ExternalLink,
  Search,
  BookOpen,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  Users,
  GraduationCap,
  CreditCard,
  Link2,
  Copy,
  Mail,
  RefreshCw,
  Loader2,
  Share2,
  Sparkles
} from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { formatDate, formatCurrency } from '@/lib/utils'
import { StudentDocumentsSection } from '../components/student-documents-section'
import { SessionElearningSection } from '../components/session-elearning-section'
import { useDocumentGeneration } from '../hooks/use-document-generation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { 
  SessionWithRelations, 
  EnrollmentWithRelations,
  FormationWithRelations,
  GradeWithRelations,
  StudentWithRelations
} from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'

type Program = TableRow<'programs'>
type Organization = TableRow<'organizations'>

interface EspaceApprenantProps {
  sessionId: string
  sessionData: SessionWithRelations | undefined
  formation: FormationWithRelations | null | undefined
  program: Program | null | undefined
  organization: Organization | undefined
  enrollments?: EnrollmentWithRelations[]
  grades?: GradeWithRelations[]
  attendanceStats?: {
    total: number
    present: number
    absent: number
    late: number
    excused: number
    byStudent: Record<string, { present: number; total: number }>
  } | null
  organizationId?: string
  onShowEnrollmentForm: () => void
  onSwitchToGestion: () => void
}

// Type pour les liens d'accès générés (nouveau système simplifié)
interface GeneratedAccessToken {
  studentId: string
  studentName: string
  studentEmail: string
  accessUrl: string
  expiresAt: string
}

export function EspaceApprenant({
  sessionId,
  sessionData,
  formation,
  program,
  organization,
  enrollments = [],
  grades = [],
  attendanceStats,
  organizationId,
  onShowEnrollmentForm,
  onSwitchToGestion,
}: EspaceApprenantProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [showAccessLinks, setShowAccessLinks] = useState(false)
  const [accessTokens, setAccessTokens] = useState<GeneratedAccessToken[]>([])
  const supabase = createClient()

  // Mutation pour générer un token individuel
  const generateTokenMutation = useMutation({
    mutationFn: async ({ studentId, studentName, studentEmail }: { studentId: string; studentName: string; studentEmail: string }) => {
      // Générer le lien directement (nouveau système simplifié)
      const baseUrl = typeof window !== 'undefined' 
        ? `${window.location.protocol}//${window.location.host}`
        : 'http://localhost:3001'

      return {
        studentId,
        studentName,
        studentEmail,
        accessUrl: `${baseUrl}/learner/access/${studentId}`,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }
    },
    onSuccess: (newToken) => {
      // Mettre à jour ou ajouter le lien
      setAccessTokens(prev => {
        const existing = prev.findIndex(t => t.studentId === newToken.studentId)
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = newToken
          return updated
        }
        return [...prev, newToken]
      })
      toast.success(`Lien généré pour ${newToken.studentName}`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Mutation pour générer tous les liens en masse (nouveau système simplifié)
  const generateBulkTokensMutation = useMutation({
    mutationFn: async () => {
      // Récupérer les étudiants de la session
      if (!enrollments?.length) {
        throw new Error('Aucun étudiant inscrit à cette session')
      }

      // Générer les liens directement avec les studentIds
      const baseUrl = typeof window !== 'undefined' 
        ? `${window.location.protocol}//${window.location.host}`
        : 'http://localhost:3001'

      const tokens = enrollments.map((enrollment: any) => ({
        studentId: enrollment.students.id,
        studentName: `${enrollment.students.first_name} ${enrollment.students.last_name}`,
        studentEmail: enrollment.students.email,
        accessUrl: `${baseUrl}/learner/access/${enrollment.students.id}`,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 jours
      }))

      return { tokens, count: tokens.length }
    },
    onSuccess: (data) => {
      setAccessTokens(data.tokens || [])
      toast.success(`${data.count} liens d'accès générés avec succès`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Copier un lien dans le presse-papiers
  const copyToClipboard = async (url: string, studentName: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success(`Lien copié pour ${studentName}`)
    } catch {
      toast.error('Impossible de copier le lien')
    }
  }

  // Copier tous les liens
  const copyAllLinks = async () => {
    if (accessTokens.length === 0) return
    
    const linksText = accessTokens
      .map(t => `${t.studentName}: ${t.accessUrl}`)
      .join('\n')
    
    try {
      await navigator.clipboard.writeText(linksText)
      toast.success('Tous les liens ont été copiés')
    } catch {
      toast.error('Impossible de copier les liens')
    }
  }

  const {
    handleGenerateCertificate,
  } = useDocumentGeneration({
    sessionData,
    formation,
    program,
    organization,
  })

  // Récupérer les données à jour pour l'apprenant sélectionné
  const { data: studentPayments, refetch: refetchPayments } = useQuery({
    queryKey: ['student-payments', selectedStudent, sessionId, organizationId],
    queryFn: async () => {
      if (!selectedStudent || !organizationId) return []
      
      const { data, error } = await supabase
        .from('payments')
        .select('*, invoices(invoice_number, total_amount, status), students(first_name, last_name)')
        .eq('student_id', selectedStudent)
        .eq('organization_id', organizationId)
        .order('paid_at', { ascending: false })
      
      if (error) {
        console.warn('Error fetching student payments:', error)
        return []
      }
      return data || []
    },
    enabled: !!selectedStudent && !!organizationId,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  // Récupérer les présences détaillées pour l'apprenant sélectionné
  const { data: studentAttendanceDetails, refetch: refetchAttendance } = useQuery({
    queryKey: ['student-attendance-details', selectedStudent, sessionId],
    queryFn: async () => {
      if (!selectedStudent || !sessionId) return []
      
      const { data, error } = await supabase
        .from('attendance')
        .select('*, session_slots(date, start_time, end_time)')
        .eq('student_id', selectedStudent)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.warn('Error fetching student attendance:', error)
        return []
      }
      return data || []
    },
    enabled: !!selectedStudent && !!sessionId,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  // Récupérer les notes détaillées pour l'apprenant sélectionné
  const { data: studentGradesDetails, refetch: refetchGrades } = useQuery({
    queryKey: ['student-grades-details', selectedStudent, sessionId],
    queryFn: async () => {
      if (!selectedStudent || !sessionId) return []
      
      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .eq('student_id', selectedStudent)
        .eq('session_id', sessionId)
        .order('graded_at', { ascending: false })
      
      if (error) {
        console.warn('Error fetching student grades:', error)
        return []
      }
      return data || []
    },
    enabled: !!selectedStudent && !!sessionId,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  // NOTE: ancien système e-learning (tables elearning_courses/quiz_results) supprimé.
  // Le suivi e-learning session est désormais géré via `session_courses` + `lesson_progress` + `quiz_attempts`.

  // Filtrer les apprenants selon la recherche
  const filteredEnrollments = enrollments.filter((enrollment) => {
    if (!searchTerm) return true
    const student = enrollment.students as StudentWithRelations | null
    if (!student) return false
    
    const searchLower = searchTerm.toLowerCase()
    return (
      student.first_name?.toLowerCase().includes(searchLower) ||
      student.last_name?.toLowerCase().includes(searchLower) ||
      student.email?.toLowerCase().includes(searchLower) ||
      student.student_number?.toLowerCase().includes(searchLower)
    )
  })

  // Calculer les statistiques globales
  const totalStudents = enrollments.length
  const confirmedStudents = enrollments.filter(e => e.status === 'confirmed').length
  const completedStudents = enrollments.filter(e => e.status === 'completed').length
  const averageAttendance = attendanceStats && totalStudents > 0
    ? Math.round((attendanceStats.present / attendanceStats.total) * 100)
    : 0

  // Si aucun apprenant
  if (enrollments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <User className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Aucun apprenant inscrit</p>
            <p className="text-sm mb-4">
              Les apprenants inscrits à cette session apparaîtront ici
            </p>
            <Button
              variant="outline"
              onClick={() => {
                onSwitchToGestion()
                onShowEnrollmentForm()
              }}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Inscrire un apprenant
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Vue détaillée d'un apprenant
  if (selectedStudent) {
    const enrollment = enrollments.find(e => e.student_id === selectedStudent)
    if (!enrollment) {
      setSelectedStudent(null)
      return null
    }

    const student = enrollment.students as StudentWithRelations | null
    if (!student) return null

    // Utiliser les données détaillées si disponibles, sinon utiliser les stats globales
    const studentAttendanceDetailsData = studentAttendanceDetails || []
    const studentGradesDetailsData = studentGradesDetails || []
    const studentPaymentsData = studentPayments || []
    
    // Calculer les stats de présence depuis les données détaillées
    const presentCount = studentAttendanceDetailsData.filter(a => a.status === 'present' || a.status === 'late').length
    const totalCount = studentAttendanceDetailsData.length
    const studentAttendance = totalCount > 0 
      ? { present: presentCount, total: totalCount }
      : (enrollment.student_id ? (attendanceStats?.byStudent?.[enrollment.student_id] || { present: 0, total: 0 }) : { present: 0, total: 0 })
    
    const attendanceRate = studentAttendance.total > 0
      ? Math.round((studentAttendance.present / studentAttendance.total) * 100)
      : 0
    
    // Utiliser les notes détaillées si disponibles, sinon utiliser les notes globales
    const studentGrades = studentGradesDetailsData.length > 0 
      ? studentGradesDetailsData 
      : grades.filter((g) => g.student_id === enrollment.student_id)

    return (
      <div className="space-y-6">
        {/* Header avec retour */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setSelectedStudent(null)}>
            ← Retour à la liste
          </Button>
          <h2 className="text-2xl font-bold">Espace Apprenant - {student.first_name} {student.last_name}</h2>
          <div className="w-24" /> {/* Spacer */}
        </div>

        {/* En-tête de l'apprenant */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">
                    {student.first_name} {student.last_name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {student.student_number}
                    {student.email && ` • ${student.email}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Link href={`/learner`} target="_blank">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Voir son espace
                  </Button>
                </Link>
                <span className={`px-3 py-1 rounded text-sm ${
                  enrollment.status === 'completed' ? 'bg-brand-blue-ghost text-brand-blue' :
                  enrollment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {enrollment.status === 'completed' ? 'Terminé' :
                   enrollment.status === 'confirmed' ? 'Confirmé' : 'En attente'}
                </span>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Informations de la session */}
        {sessionData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations de la session</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sessionData.start_date && (
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-brand-blue" />
                    <div>
                      <p className="font-medium">Dates</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(sessionData.start_date)}
                        {sessionData.end_date && ` - ${formatDate(sessionData.end_date)}`}
                      </p>
                    </div>
                  </div>
                )}
                {(sessionData.start_time || sessionData.end_time) && (
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Horaires</p>
                      <p className="text-sm text-muted-foreground">
                        {sessionData.start_time || 'N/A'}
                        {sessionData.end_time && ` - ${sessionData.end_time}`}
                      </p>
                    </div>
                  </div>
                )}
                {sessionData.location && (
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium">Lieu</p>
                      <p className="text-sm text-muted-foreground">
                        {sessionData.location}
                      </p>
                    </div>
                  </div>
                )}
                {formation && (
                  <div className="flex items-center space-x-3">
                    <ClipboardList className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium">Formation</p>
                      <p className="text-sm text-muted-foreground">
                        {formation.name}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progression */}
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
                  <span className="text-sm text-muted-foreground">{attendanceRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <motion.div
                    className="bg-brand-blue h-3 rounded-full transition-all"
                    style={{ width: `${attendanceRate}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{studentAttendance.present} présent{studentAttendance.present > 1 ? 's' : ''}</span>
                  <span>{studentAttendance.total - studentAttendance.present} absent{(studentAttendance.total - studentAttendance.present) > 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Notes récentes */}
              {studentGrades.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-3">Notes récentes</p>
                  <div className="space-y-2">
                    {studentGrades.slice(0, 5).map((grade) => (
                      <div key={grade.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <p className="text-sm font-medium">{grade.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            {grade.assessment_type || 'Évaluation'} • {grade.graded_at && formatDate(grade.graded_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">
                            {grade.score}/{grade.max_score || 20}
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
                  {studentGrades.map((grade) => (
                    <div key={grade.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <ClipboardList className="h-5 w-5 text-brand-blue" />
                        <div>
                          <p className="font-medium">{grade.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            {grade.graded_at && formatDate(grade.graded_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          {grade.score}/{grade.max_score || 20}
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
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Aucune évaluation complétée pour le moment</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paiements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Paiements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {studentPaymentsData.length > 0 ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  {studentPaymentsData.map((payment: any) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CreditCard className="h-5 w-5 text-brand-blue" />
                        <div>
                          <p className="font-medium">
                            {formatCurrency(payment.amount || 0, payment.currency || 'EUR')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {payment.paid_at ? formatDate(payment.paid_at) : 'Date non disponible'}
                            {payment.invoices && payment.invoices.invoice_number && ` • Facture ${payment.invoices.invoice_number}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs ${
                          payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                          payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {payment.status === 'completed' ? 'Payé' :
                           payment.status === 'pending' ? 'En attente' : payment.status}
                        </span>
                        {payment.payment_method && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {payment.payment_method === 'cash' ? 'Espèces' :
                             payment.payment_method === 'card' ? 'Carte' :
                             payment.payment_method === 'bank_transfer' ? 'Virement' :
                             payment.payment_method === 'sepa' ? 'SEPA' : payment.payment_method}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Total payé */}
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total payé</span>
                    <span className="font-bold text-lg">
                      {formatCurrency(
                        studentPaymentsData
                          .filter((p: any) => p.status === 'completed')
                          .reduce((sum: number, p: any) => sum + (parseFloat(p.amount || 0)), 0),
                        studentPaymentsData[0]?.currency || 'EUR'
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Aucun paiement enregistré pour le moment</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Présences détaillées */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Historique des présences
            </CardTitle>
          </CardHeader>
          <CardContent>
            {studentAttendanceDetailsData.length > 0 ? (
              <div className="space-y-2">
                <div className="space-y-2">
                  {studentAttendanceDetailsData.map((attendance: any) => (
                    <div key={attendance.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {attendance.status === 'present' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : attendance.status === 'late' ? (
                          <Clock className="h-5 w-5 text-yellow-600" />
                        ) : attendance.status === 'excused' ? (
                          <AlertCircle className="h-5 w-5 text-blue-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium">
                            {attendance.session_slots?.date ? formatDate(attendance.session_slots.date) : 'Date non disponible'}
                            {attendance.session_slots?.start_time && attendance.session_slots?.end_time && (
                              <span className="text-sm text-muted-foreground ml-2">
                                {attendance.session_slots.start_time} - {attendance.session_slots.end_time}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {attendance.created_at && formatDate(attendance.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs ${
                          attendance.status === 'present' ? 'bg-green-100 text-green-800' :
                          attendance.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                          attendance.status === 'excused' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {attendance.status === 'present' ? 'Présent' :
                           attendance.status === 'late' ? 'En retard' :
                           attendance.status === 'excused' ? 'Excusé' : 'Absent'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Aucune présence enregistrée pour le moment</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents partagés */}
        {organizationId && enrollment.student_id && (
          <StudentDocumentsSection
            studentId={enrollment.student_id}
            organizationId={organizationId}
          />
        )}

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
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-warning-bg to-brand-cyan-ghost border border-warning-border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Award className="h-8 w-8 text-brand-cyan" />
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
  }

  // Vue liste des apprenants
  return (
    <div className="space-y-6">
      {/* Statistiques globales ultra-premium */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total apprenants',
            value: totalStudents,
            icon: Users,
            iconBg: 'bg-gradient-to-br from-brand-blue to-brand-blue-dark',
            cardBg: 'bg-gradient-to-br from-brand-blue/5 via-brand-blue/10 to-brand-cyan/5',
            borderColor: 'border-brand-blue/20',
            glowColor: 'rgba(39, 68, 114, 0.15)',
          },
          {
            label: 'Confirmés',
            value: confirmedStudents,
            icon: CheckCircle,
            iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
            cardBg: 'bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-teal-50',
            borderColor: 'border-emerald-200',
            glowColor: 'rgba(16, 185, 129, 0.15)',
          },
          {
            label: 'Terminés',
            value: completedStudents,
            icon: GraduationCap,
            iconBg: 'bg-gradient-to-br from-brand-cyan to-brand-cyan-dark',
            cardBg: 'bg-gradient-to-br from-brand-cyan/5 via-brand-cyan/10 to-brand-blue/5',
            borderColor: 'border-brand-cyan/20',
            glowColor: 'rgba(52, 185, 238, 0.15)',
          },
          {
            label: 'Présence moyenne',
            value: `${averageAttendance}%`,
            icon: BarChart3,
            iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
            cardBg: 'bg-gradient-to-br from-purple-50 via-purple-100/50 to-pink-50',
            borderColor: 'border-purple-200',
            glowColor: 'rgba(168, 85, 247, 0.15)',
          },
        ].map((stat, index) => (
          <motion.div key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: index * 0.05,
              ease: [0.16, 1, 0.3, 1]
            }}
            whileHover={{ y: -6, scale: 1.02 }}
            className="group relative"
          >
            <motion.div
              className={cn(
                "relative overflow-hidden rounded-2xl p-6 border-2 transition-all duration-500 shadow-lg hover:shadow-2xl",
                stat.cardBg,
                stat.borderColor
              )}
              style={{
                boxShadow: `0 10px 40px -10px ${stat.glowColor}, 0 0 0 1px rgba(255, 255, 255, 0.1)`
              }}
            >
              {/* Shine effect */}
              <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              />

              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <motion.div className={cn('p-3.5 rounded-2xl shadow-xl', stat.iconBg)}
                    whileHover={{ rotate: 12, scale: 1.15 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  >
                    <stat.icon className="h-6 w-6 text-white" />
                  </motion.div>
                  <motion.div className="text-right"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
                  >
                    <div className="text-4xl font-display font-bold tracking-tighter text-gray-900 leading-none mb-1">
                      {stat.value}
                    </div>
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                      {stat.label}
                    </p>
                  </motion.div>
                </div>

                {/* Bottom accent bar */}
                <motion.div className="h-1.5 rounded-full mt-4"
                  style={{
                    background: stat.iconBg.replace('bg-gradient-to-br', 'linear-gradient(to right,')
                  }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: index * 0.05 + 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>

              {/* Glow effect on hover */}
              <motion.div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: `radial-gradient(circle at 50% 50%, ${stat.glowColor} 0%, transparent 70%)`
                }}
              />
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Section Liens d'accès directs */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center">
              <Link2 className="h-5 w-5 mr-2 text-blue-600" />
              Liens d'accès directs
            </CardTitle>
            <div className="flex items-center gap-2">
              {showAccessLinks && accessTokens.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyAllLinks}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copier tous
                </Button>
              )}
              <Button
                variant={showAccessLinks ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowAccessLinks(!showAccessLinks)}
              >
                <Share2 className="h-4 w-4 mr-2" />
                {showAccessLinks ? 'Masquer' : 'Gérer les liens'}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {showAccessLinks && (
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Description */}
              <div className="text-sm text-muted-foreground bg-white/50 p-3 rounded-lg">
                <p>
                  Générez des liens d'accès personnalisés pour permettre aux stagiaires 
                  d'accéder directement à leur espace personnel <strong>sans avoir besoin de se connecter</strong>.
                </p>
                <p className="mt-2 text-xs">
                  ⏱️ Les liens expirent après 30 jours et peuvent être régénérés à tout moment.
                </p>
              </div>

              {/* Actions globales */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => generateBulkTokensMutation.mutate()}
                  disabled={generateBulkTokensMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {generateBulkTokensMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Générer tous les liens
                </Button>
                <span className="text-sm text-muted-foreground">
                  ({enrollments.length} apprenant{enrollments.length > 1 ? 's' : ''})
                </span>
              </div>

              {/* Liste des apprenants avec génération individuelle */}
              <div className="space-y-2 mt-4">
                <h4 className="text-sm font-medium mb-3">Générer des liens pour chaque apprenant :</h4>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {enrollments.map((enrollment) => {
                    const student = enrollment.students as StudentWithRelations | null
                    if (!student) return null
                    
                    const existingToken = accessTokens.find(t => t.studentId === enrollment.student_id)
                    const studentName = `${student.first_name} ${student.last_name}`
                    
                    return (
                      <div
                        key={enrollment.student_id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{studentName}</p>
                            {student.email && (
                              <p className="text-xs text-muted-foreground truncate max-w-xs">
                                {student.email}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {existingToken ? (
                            <>
                              <div className="flex items-center gap-2 min-w-0 max-w-xs">
                                <p className="text-xs text-muted-foreground truncate hidden md:block">
                                  {existingToken.accessUrl}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(existingToken.accessUrl, studentName)}
                                title="Copier le lien"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                title="Ouvrir le lien"
                              >
                                <a href={existingToken.accessUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => generateTokenMutation.mutate({
                                  studentId: enrollment.student_id || '',
                                  studentName,
                                  studentEmail: student.email || ''
                                })}
                                disabled={generateTokenMutation.isPending}
                                title="Régénérer le lien"
                              >
                                {generateTokenMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => generateTokenMutation.mutate({
                                studentId: enrollment.student_id || '',
                                studentName,
                                studentEmail: student.email || ''
                              })}
                              disabled={generateTokenMutation.isPending}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {generateTokenMutation.isPending ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Génération...
                                </>
                              ) : (
                                <>
                                  <Link2 className="h-4 w-4 mr-2" />
                                  Générer
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Génération individuelle */}
              {accessTokens.length === 0 && !generateBulkTokensMutation.isPending && (
                <div className="text-center py-6 text-muted-foreground">
                  <Link2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Aucun lien généré pour cette session</p>
                  <p className="text-xs mt-1">Cliquez sur "Générer tous les liens" pour créer les accès</p>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Section E-Learning */}
      {organizationId && (
        <SessionElearningSection
          sessionId={sessionId}
          organizationId={organizationId}
          enrollments={enrollments}
        />
      )}

      {/* Barre de recherche et actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un apprenant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                onSwitchToGestion()
                onShowEnrollmentForm()
              }}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Ajouter un apprenant
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des apprenants */}
      <div className="space-y-4">
        {filteredEnrollments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Aucun apprenant trouvé</p>
            </CardContent>
          </Card>
        ) : (
          filteredEnrollments.map((enrollment) => {
            const student = enrollment.students as StudentWithRelations | null
            if (!student) return null

            const studentAttendance = enrollment.student_id ? (attendanceStats?.byStudent?.[enrollment.student_id] || {
              present: 0,
              total: 0,
            }) : { present: 0, total: 0 }
            const attendanceRate = studentAttendance.total > 0
              ? Math.round((studentAttendance.present / studentAttendance.total) * 100)
              : 0
            const studentGrades = enrollment.student_id ? grades.filter((g) => g.student_id === enrollment.student_id) : []
            const averageGrade = studentGrades.length > 0
              ? Math.round(studentGrades.reduce((sum, g) => {
                  const percentage = g.percentage !== null ? g.percentage : ((g.score ?? 0) / (g.max_score || 20)) * 100
                  return sum + percentage
                }, 0) / studentGrades.length)
              : null

            return (
              <Card key={enrollment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-lg">
                            {student.first_name} {student.last_name}
                          </h3>
                          <Badge variant={
                            enrollment.status === 'completed' ? 'default' :
                            enrollment.status === 'confirmed' ? 'secondary' : 'outline'
                          }>
                            {enrollment.status === 'completed' ? 'Terminé' :
                             enrollment.status === 'confirmed' ? 'Confirmé' : 'En attente'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {student.student_number}
                          {student.email && ` • ${student.email}`}
                        </p>
                      </div>
                    </div>

                    {/* Statistiques rapides */}
                    <div className="flex items-center space-x-6 mr-6">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Présence</p>
                        <p className="text-sm font-semibold">{attendanceRate}%</p>
                      </div>
                      {averageGrade !== null && (
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Moyenne</p>
                          <p className="text-sm font-semibold">{averageGrade}%</p>
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Évaluations</p>
                        <p className="text-sm font-semibold">{studentGrades.length}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedStudent(enrollment.student_id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Voir détails
                      </Button>
                      {/* Lien vers l'espace apprenant - utilise le token si disponible */}
                      {(() => {
                        const existingToken = accessTokens.find(t => t.studentId === enrollment.student_id)
                        if (existingToken) {
                          return (
                            <a href={existingToken.accessUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Accès direct
                              </Button>
                            </a>
                          )
                        }
                        return (
                          <Link href={`/learner`} target="_blank">
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Espace apprenant
                            </Button>
                          </Link>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Barre de progression de présence */}
                  {studentAttendance.total > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">Progression de présence</span>
                        <span className="text-xs text-muted-foreground">
                          {studentAttendance.present}/{studentAttendance.total} séances
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div
                          className={`h-2 rounded-full transition-all ${
                            attendanceRate >= 80 ? 'bg-green-500' :
                            attendanceRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${attendanceRate}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
