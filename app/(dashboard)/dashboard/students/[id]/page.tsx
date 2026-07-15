'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { studentService } from '@/lib/services/student.service.client'
import { invoiceService } from '@/lib/services/invoice.service.client'
import { paymentService } from '@/lib/services/payment.service.client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { ArrowLeft, Edit, Mail, Phone, MapPin, Calendar, Users, FileText, DollarSign, Link as LinkIcon, Check, UserCheck, UserX, Loader2, BookOpen, Download, Eye, ExternalLink, GraduationCap, Send } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'
import { useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { logger } from '@/lib/utils/logger'

const EMAIL_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  sent: { label: 'Envoyé', color: 'bg-blue-100 text-blue-700' },
  delivered: { label: 'Livré', color: 'bg-green-100 text-green-700' },
  opened: { label: 'Ouvert', color: 'bg-purple-100 text-purple-700' },
  clicked: { label: 'Cliqué', color: 'bg-indigo-100 text-indigo-700' },
  bounced: { label: 'Rejeté', color: 'bg-red-100 text-red-700' },
  failed: { label: 'Échoué', color: 'bg-red-100 text-red-700' },
  complained: { label: 'Spam', color: 'bg-orange-100 text-orange-700' },
  pending: { label: 'En attente', color: 'bg-gray-100 text-gray-600' },
}

const SIGNATURE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente de signature', color: 'bg-amber-100 text-amber-700' },
  signed: { label: 'Signé', color: 'bg-green-100 text-green-700' },
  expired: { label: 'Expiré', color: 'bg-gray-100 text-gray-600' },
  declined: { label: 'Refusé', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Annulé', color: 'bg-gray-100 text-gray-600' },
}

const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  session_reminder: 'Convocation session',
  convention: 'Convention',
  contrat: 'Contrat',
  facture: 'Facture',
  devis: 'Devis',
  attestation: 'Attestation',
  custom: 'Personnalisé',
}

export default function StudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.id as string
  const supabase = createClient()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [copiedLink, setCopiedLink] = useState(false)
  const [isReactivating, setIsReactivating] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)

  const handleDeactivate = async () => {
    setIsDeactivating(true)
    try {
      await studentService.update(studentId, { status: 'inactive' })
      await queryClient.invalidateQueries({ queryKey: ['student', studentId] })
      addToast({ title: 'Apprenant désactivé', description: 'Le statut a été passé à inactif.', type: 'success' })
    } catch {
      addToast({ title: 'Erreur', description: "Impossible de désactiver l'apprenant.", type: 'error' })
    } finally {
      setIsDeactivating(false)
    }
  }

  const handleReactivate = async () => {
    setIsReactivating(true)
    try {
      await studentService.update(studentId, { status: 'active' })
      await queryClient.invalidateQueries({ queryKey: ['student', studentId] })
      addToast({ title: 'Apprenant réactivé', description: 'Le statut a été remis à actif.', type: 'success' })
    } catch {
      addToast({ title: 'Erreur', description: 'Impossible de réactiver l\'apprenant.', type: 'error' })
    } finally {
      setIsReactivating(false)
    }
  }

  // Récupérer l'élève
  const { data: student, isLoading } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentService.getById(studentId),
  })

  // Récupérer les tuteurs
  const { data: guardians } = useQuery({
    queryKey: ['student-guardians', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_guardians')
        .select('*, guardians(*)')
        .eq('student_id', studentId)
      if (error) throw error
      type Row = { guardians?: unknown }
      return (data as Row[] | null)?.map((sg) => sg.guardians).filter(Boolean) || []
    },
    enabled: !!studentId,
  })

  // Récupérer la session (remplace la classe)
  const { data: sessionData } = useQuery({
    queryKey: ['session', student?.class_id],
    queryFn: async () => {
      if (!student?.class_id) return null
      
      // Récupérer d'abord la session sans relations
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', student.class_id)
        .maybeSingle()
      
      if (sessionError) {
        logger.warn('Erreur récupération session pour étudiant', { error: sessionError, class_id: student.class_id })
        return null
      }
      
      if (!session) return null
      
      // Enrichir avec la formation si nécessaire (sans relations imbriquées)
      if (session.formation_id) {
        try {
          // Récupérer la formation sans relations
          const { data: formation } = await supabase
            .from('formations')
            .select('*')
            .eq('id', session.formation_id)
            .maybeSingle()
          
          // Récupérer le programme si nécessaire
          let program = null
          if (formation?.program_id) {
            const { data: programData } = await supabase
              .from('programs')
              .select('*')
              .eq('id', formation.program_id)
              .maybeSingle()
            
            program = programData
          }
          
          return {
            ...session,
            formations: formation ? {
              ...formation,
              programs: program
            } : null
          }
        } catch (formationError) {
          logger.warn('Erreur récupération formation pour session', { error: formationError })
          return {
            ...session,
            formations: null
          }
        }
      }
      
      return {
        ...session,
        formations: null
      }
    },
    enabled: !!student?.class_id,
  })

  // Récupérer les devis et factures de l'élève
  const { data: studentInvoices } = useQuery({
    queryKey: ['student-invoices', studentId],
    queryFn: async () => {
      if (!student?.organization_id) return []
      return invoiceService.getAll(student.organization_id, {
        studentId: studentId,
      })
    },
    enabled: !!student?.organization_id && !!studentId,
  })

  // Récupérer les paiements de l'élève
  const { data: studentPayments } = useQuery({
    queryKey: ['student-payments', studentId],
    queryFn: async () => {
      if (!student?.organization_id) return []
      return paymentService.getAll(student.organization_id, {
        studentId: studentId,
      })
    },
    enabled: !!student?.organization_id && !!studentId,
  })

  // Récupérer les inscriptions (sessions suivies)
  const { data: enrollments } = useQuery({
    queryKey: ['student-enrollments', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('id, status, created_at, sessions(id, name, start_date, end_date, formation_id, formations(id, name))')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!studentId,
  })

  // Récupérer les documents de l'apprenant
  const { data: studentDocuments } = useQuery({
    queryKey: ['student-documents', studentId],
    queryFn: async () => {
      type DocItem = { id: string; name: string; type: string; file_url: string | null; date: string | null; source: string }
      const allDocs: DocItem[] = []

      const { data: learnerDocs } = await supabase
        .from('learner_documents')
        .select('id, title, type, file_url, sent_at, created_at')
        .eq('student_id', studentId)
        .order('sent_at', { ascending: false })

      if (learnerDocs) {
        type LRow = { id: string; title?: string; type?: string; file_url?: string | null; sent_at?: string | null; created_at?: string | null }
        ;(learnerDocs as LRow[]).forEach(d => allDocs.push({ id: d.id, name: d.title || `Document ${d.type}`, type: d.type || 'other', file_url: d.file_url ?? null, date: d.sent_at || d.created_at || null, source: 'learner_documents' }))
      }

      const { data: generatedDocs } = await supabase
        .from('generated_documents')
        .select('id, file_name, type, file_url, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })

      if (generatedDocs) {
        type GRow = { id: string; file_name?: string; type?: string; file_url?: string | null; created_at?: string | null }
        ;(generatedDocs as GRow[]).forEach(d => allDocs.push({ id: d.id, name: d.file_name || `Document ${d.type}`, type: d.type || 'other', file_url: d.file_url ?? null, date: d.created_at || null, source: 'generated_documents' }))
      }

      // Devis/factures/attestations créés (ex: depuis les demandes de signature
      // envoyées sur une facture/un devis de session)
      const { data: invoiceDocs } = await supabase
        .from('documents')
        .select('id, title, type, file_url, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })

      if (invoiceDocs) {
        type IRow = { id: string; title?: string; type?: string; file_url?: string | null; created_at?: string | null }
        ;(invoiceDocs as IRow[]).forEach(d => allDocs.push({ id: d.id, name: d.title || `Document ${d.type}`, type: d.type || 'other', file_url: d.file_url ?? null, date: d.created_at || null, source: 'documents' }))
      }

      return allDocs.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    },
    enabled: !!studentId,
  })

  // Historique des emails envoyés à cet apprenant : email_logs (envois trackés
  // via EmailService) + signature_requests (demandes de signature, non trackées
  // dans email_logs). Le rattachement se fait par email, students n'ayant pas
  // de lien direct vers ces deux tables.
  const { data: emailHistory } = useQuery({
    queryKey: ['student-email-history', studentId, student?.email],
    queryFn: async () => {
      type EmailHistoryItem = { id: string; subject: string; typeLabel: string; statusLabel: string; statusColor: string; date: string | null }
      const items: EmailHistoryItem[] = []
      if (!student?.email || !student.organization_id) return items
      const organizationId = student.organization_id

      const { data: logs } = await supabase
        .from('email_logs')
        .select('id, subject, status, template_type, created_at')
        .eq('recipient', student.email)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (logs) {
        type LogRow = { id: string; subject?: string | null; status?: string | null; template_type?: string | null; created_at?: string | null }
        ;(logs as LogRow[]).forEach((l) => {
          const cfg = EMAIL_STATUS_CONFIG[l.status || 'sent'] || EMAIL_STATUS_CONFIG.sent
          items.push({
            id: `log-${l.id}`,
            subject: l.subject || '(sans objet)',
            typeLabel: TEMPLATE_TYPE_LABELS[l.template_type || ''] || l.template_type || 'Email',
            statusLabel: cfg.label,
            statusColor: cfg.color,
            date: l.created_at ?? null,
          })
        })
      }

      const { data: sigRequests } = await supabase
        .from('signature_requests')
        .select('id, subject, status, created_at')
        .eq('recipient_email', student.email)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (sigRequests) {
        type SigRow = { id: string; subject?: string | null; status?: string | null; created_at?: string | null }
        ;(sigRequests as SigRow[]).forEach((s) => {
          const cfg = SIGNATURE_STATUS_CONFIG[s.status || 'pending'] || SIGNATURE_STATUS_CONFIG.pending
          items.push({
            id: `sig-${s.id}`,
            subject: s.subject || 'Demande de signature',
            typeLabel: 'Demande de signature',
            statusLabel: cfg.label,
            statusColor: cfg.color,
            date: s.created_at ?? null,
          })
        })
      }

      return items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    },
    enabled: !!student?.email,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-muted-foreground">Chargement...</div>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-muted-foreground">Élève non trouvé</div>
          <Link href="/dashboard/students">
            <Button className="mt-4">Retour à la liste</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/students">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {student.first_name} {student.last_name}
            </h1>
            <p className="mt-2 text-sm text-gray-600">{student.student_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const accessLink = `${window.location.origin}/learner/access/${studentId}`
              navigator.clipboard.writeText(accessLink).then(() => {
                setCopiedLink(true)
                addToast({
                  title: 'Lien copié',
                  description: 'Le lien d\'accès a été copié dans le presse-papiers',
                  type: 'success',
                })
                setTimeout(() => setCopiedLink(false), 2000)
              }).catch(() => {
                addToast({
                  title: 'Erreur',
                  description: 'Impossible de copier le lien',
                  type: 'error',
                })
              })
            }}
          >
            {copiedLink ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Lien copié
              </>
            ) : (
              <>
                <LinkIcon className="mr-2 h-4 w-4" />
                Copier le lien d'accès
              </>
            )}
          </Button>
          {student.status === 'inactive' && (
            <Button
              variant="outline"
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              onClick={handleReactivate}
              disabled={isReactivating}
            >
              {isReactivating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="mr-2 h-4 w-4" />
              )}
              Réactiver
            </Button>
          )}
          {student.status === 'active' && (
            <Button
              variant="outline"
              className="border-rose-300 text-rose-700 hover:bg-rose-50"
              onClick={handleDeactivate}
              disabled={isDeactivating}
            >
              {isDeactivating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserX className="mr-2 h-4 w-4" />
              )}
              Désactiver
            </Button>
          )}
          <Link href={`/dashboard/students/${studentId}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations principales */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                {student.photo_url ? (
                  <Avatar
                    src={student.photo_url}
                    alt={`${student.first_name} ${student.last_name}`}
                    fallback={`${student.first_name || ''} ${student.last_name || ''}`}
                    userId={student.id}
                    size="xl"
                    variant="auto"
                    className="shadow-xl"
                  />
                ) : (
                  <Avatar
                    fallback={`${student.first_name || ''} ${student.last_name || ''}`}
                    userId={student.id}
                    size="xl"
                    variant="auto"
                    className="shadow-xl"
                  />
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Statut</p>
                  <p className="font-medium">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        student.status === 'active'
                          ? 'bg-brand-blue-ghost text-brand-blue'
                          : student.status === 'inactive'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {student.status === 'active'
                        ? 'Actif'
                        : student.status === 'inactive'
                        ? 'Inactif'
                        : student.status}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {student.date_of_birth && (
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <Calendar className="mr-2 h-4 w-4" />
                      Date de naissance
                    </p>
                    <p className="font-medium">{formatDate(student.date_of_birth)}</p>
                  </div>
                )}
                {student.gender && (
                  <div>
                    <p className="text-sm text-muted-foreground">Genre</p>
                    <p className="font-medium">
                      {student.gender === 'male'
                        ? 'Masculin'
                        : student.gender === 'female'
                        ? 'Féminin'
                        : student.gender}
                    </p>
                  </div>
                )}
              </div>

              {student.email && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center">
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </p>
                  <p className="font-medium">{student.email}</p>
                </div>
              )}

              {student.phone && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center">
                    <Phone className="mr-2 h-4 w-4" />
                    Téléphone
                  </p>
                  <p className="font-medium">{student.phone}</p>
                </div>
              )}

              {student.address && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center">
                    <MapPin className="mr-2 h-4 w-4" />
                    Adresse
                  </p>
                  <p className="font-medium">
                    {student.address}
                    {student.city && `, ${student.city}`}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  Date d'inscription
                </p>
                <p className="font-medium">{formatDate(student.enrollment_date || '')}</p>
              </div>
            </CardContent>
          </Card>

          {/* Informations académiques */}
          <Card>
            <CardHeader>
              <CardTitle>Informations académiques</CardTitle>
            </CardHeader>
            <CardContent>
              {sessionData ? (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center">
                    <Users className="mr-2 h-4 w-4" />
                    Session
                  </p>
                  <p className="font-medium text-lg">
                   {sessionData.name} - {sessionData.formations?.name || ''}
                   {sessionData.formations?.programs && ` (${sessionData.formations.programs.name})`}
                 </p>
                </div>
              ) : (
                <p className="text-muted-foreground">Aucune session assignée</p>
              )}
            </CardContent>
          </Card>

          {/* Sessions suivies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <GraduationCap className="mr-2 h-5 w-5" />
                Sessions suivies
              </CardTitle>
            </CardHeader>
            <CardContent>
              {enrollments && enrollments.length > 0 ? (
                <div className="space-y-3">
                  {(enrollments as Array<{
                    id: string
                    status?: string
                    created_at?: string
                    sessions?: { id?: string; name?: string; start_date?: string; end_date?: string; formations?: { name?: string } | null } | null
                  }>).map((enrollment) => (
                    <div key={enrollment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                          <h4 className="font-semibold">{enrollment.sessions?.name || 'Session sans nom'}</h4>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            enrollment.status === 'active' ? 'bg-brand-blue-ghost text-brand-blue' :
                            enrollment.status === 'completed' ? 'bg-green-100 text-green-800' :
                            enrollment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {enrollment.status === 'active' ? 'En cours' :
                             enrollment.status === 'completed' ? 'Terminée' :
                             enrollment.status === 'cancelled' ? 'Annulée' :
                             enrollment.status || 'Inscrit'}
                          </span>
                        </div>
                        {enrollment.sessions?.formations?.name && (
                          <p className="text-sm text-muted-foreground mt-1 ml-6">{enrollment.sessions.formations.name}</p>
                        )}
                        {(enrollment.sessions?.start_date || enrollment.sessions?.end_date) && (
                          <p className="text-xs text-muted-foreground mt-1 ml-6 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {enrollment.sessions?.start_date ? formatDate(enrollment.sessions.start_date) : '—'}
                            {' → '}
                            {enrollment.sessions?.end_date ? formatDate(enrollment.sessions.end_date) : '—'}
                          </p>
                        )}
                      </div>
                      {enrollment.sessions?.id && (
                        <Link href={`/dashboard/sessions/${enrollment.sessions.id}`}>
                          <Button variant="ghost" size="sm">Voir</Button>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Aucune session inscrite</p>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {studentDocuments && studentDocuments.length > 0 ? (
                <div className="space-y-3">
                  {(studentDocuments as Array<{ id: string; name: string; type: string; file_url: string | null; date: string | null; source: string }>).slice(0, 10).map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <h4 className="font-medium truncate">{doc.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {doc.date ? formatDate(doc.date) : '—'}
                            {' · '}
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              doc.type === 'convocation' ? 'bg-blue-100 text-blue-800' :
                              doc.type === 'attestation' ? 'bg-brand-cyan-ghost text-brand-cyan' :
                              doc.type === 'certificate' ? 'bg-green-100 text-green-800' :
                              doc.type === 'invoice' ? 'bg-gray-100 text-gray-800' :
                              doc.type === 'quote' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {doc.type === 'convocation' ? 'Convocation' :
                               doc.type === 'attestation' ? 'Attestation' :
                               doc.type === 'certificate' ? 'Certificat' :
                               doc.type === 'invoice' ? 'Facture' :
                               doc.type === 'quote' ? 'Devis' :
                               doc.type === 'convention' ? 'Convention' :
                               doc.type}
                            </span>
                          </p>
                        </div>
                      </div>
                      {doc.file_url && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => window.open(doc.file_url!, '_blank')}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              try {
                                const res = await fetch(doc.file_url!)
                                const blob = await res.blob()
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = doc.name
                                a.click()
                                URL.revokeObjectURL(url)
                              } catch {
                                window.open(doc.file_url!, '_blank')
                              }
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {studentDocuments.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      + {studentDocuments.length - 10} autres documents
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Aucun document</p>
              )}
            </CardContent>
          </Card>

          {/* Emails envoyés */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Send className="mr-2 h-5 w-5" />
                Emails envoyés
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!student.email ? (
                <p className="text-muted-foreground">Aucun email renseigné pour cet apprenant</p>
              ) : emailHistory && emailHistory.length > 0 ? (
                <div className="space-y-3">
                  {emailHistory.slice(0, 10).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <h4 className="font-medium truncate">{item.subject}</h4>
                          <p className="text-xs text-muted-foreground">
                            {item.date ? formatDate(item.date) : '—'}
                            {' · '}
                            {item.typeLabel}
                          </p>
                        </div>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-xs whitespace-nowrap ${item.statusColor}`}>
                        {item.statusLabel}
                      </span>
                    </div>
                  ))}
                  {emailHistory.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      + {emailHistory.length - 10} autres emails
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Aucun email envoyé</p>
              )}
            </CardContent>
          </Card>

          {/* Devis et Factures */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Devis et Factures
              </CardTitle>
              <Link href={`/dashboard/payments/new`}>
                <Button size="sm" variant="outline">
                  Nouveau devis / facture
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {studentInvoices && studentInvoices.length > 0 ? (
                <div className="space-y-3">
                  {(studentInvoices as Array<{ id: string; invoice_number?: string; document_type?: string; status?: string; issue_date?: string; due_date?: string; total_amount?: string | number; currency?: string }>).slice(0, 5).map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold">{invoice.invoice_number}</h4>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            invoice.document_type === 'quote' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-brand-blue-ghost text-brand-blue'
                          }`}>
                            {invoice.document_type === 'quote' ? 'Devis' : 'Facture'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            invoice.status === 'paid' ? 'bg-brand-blue-ghost text-brand-blue' :
                            invoice.status === 'sent' ? 'bg-brand-blue-pale text-brand-blue' :
                            invoice.status === 'partial' ? 'bg-brand-cyan-ghost text-brand-cyan' :
                            invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {invoice.status === 'paid' ? 'Payée' :
                             invoice.status === 'sent' ? 'Envoyée' :
                             invoice.status === 'partial' ? 'Partielle' :
                             invoice.status === 'overdue' ? 'En retard' :
                             invoice.status === 'draft' ? 'Brouillon' : invoice.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Émission: {formatDate(invoice.issue_date)} - Échéance: {formatDate(invoice.due_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(Number(invoice.total_amount), invoice.currency)}
                        </p>
                        <Link href={`/dashboard/payments/${invoice.id}`}>
                          <Button variant="ghost" size="sm" className="mt-2">
                            Voir détails
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                  {studentInvoices.length > 5 && (
                    <Link href="/dashboard/payments">
                      <Button variant="outline" className="w-full mt-2">
                        Voir tous les devis et factures ({studentInvoices.length})
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Aucun devis ou facture</p>
              )}
            </CardContent>
          </Card>

          {/* Paiements */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5" />
                Paiements
              </CardTitle>
              <Link href={`/dashboard/payments/new`}>
                <Button size="sm" variant="outline">
                  Nouveau paiement
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {studentPayments && studentPayments.length > 0 ? (
                <div className="space-y-3">
                  {(studentPayments as Array<{ id: string; amount?: string | number; currency?: string; payment_method?: string; payment_provider?: string; paid_at?: string; status?: string; invoices?: { invoice_number?: string } }>).slice(0, 5).map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-semibold">
                          {formatCurrency(Number(payment.amount), payment.currency)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {payment.payment_method === 'cash' ? 'Espèces' :
                           payment.payment_method === 'mobile_money' ? `Mobile Money (${payment.payment_provider || 'N/A'})` :
                           payment.payment_method === 'card' ? 'Carte' :
                           payment.payment_method === 'bank_transfer' ? 'Virement' : payment.payment_method}
                          {' - '}
                          {payment.paid_at ? formatDate(payment.paid_at) : 'N/A'}
                        </p>
                        {payment.invoices && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Facture: {payment.invoices?.invoice_number ?? 'N/A'}
                          </p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        payment.status === 'completed' ? 'bg-success-bg text-success-primary' :
                        payment.status === 'pending' ? 'bg-warning-bg text-warning-primary' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {payment.status === 'completed' ? 'Complété' :
                         payment.status === 'pending' ? 'En attente' : payment.status}
                      </span>
                    </div>
                  ))}
                  {studentPayments.length > 5 && (
                    <Link href="/dashboard/payments">
                      <Button variant="outline" className="w-full mt-2">
                        Voir tous les paiements ({studentPayments.length})
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Aucun paiement enregistré</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tuteurs */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tuteurs / Parents</CardTitle>
            </CardHeader>
            <CardContent>
              {guardians && guardians.length > 0 ? (
                <div className="space-y-4">
                  {(guardians as Array<{ id: string; first_name?: string; last_name?: string; relationship?: string; phone_primary?: string; email?: string }>).map((guardian) => (
                    <div key={guardian.id} className="p-4 border rounded-lg">
                      <p className="font-semibold">
                        {guardian.first_name} {guardian.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {guardian.relationship}
                      </p>
                      {guardian.phone_primary && (
                        <p className="text-sm mt-2 flex items-center">
                          <Phone className="mr-2 h-4 w-4" />
                          {guardian.phone_primary}
                        </p>
                      )}
                      {guardian.email && (
                        <p className="text-sm mt-1 flex items-center">
                          <Mail className="mr-2 h-4 w-4" />
                          {guardian.email}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Aucun tuteur enregistré</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

