'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { studentService } from '@/lib/services/student.service'
import { invoiceService } from '@/lib/services/invoice.service.client'
import { paymentService } from '@/lib/services/payment.service.client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { ArrowLeft, Edit, Mail, Phone, MapPin, Calendar, Users, FileText, DollarSign, Link as LinkIcon, Copy, Check } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'
import { useState } from 'react'
import { useToast } from '@/components/ui/toast'

export default function StudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.id as string
  const supabase = createClient()
  const { addToast } = useToast()
  const [copiedLink, setCopiedLink] = useState(false)

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
      return data?.map((sg: any) => sg.guardians).filter(Boolean) || []
    },
    enabled: !!studentId,
  })

  // Récupérer la session (remplace la classe)
  const { data: sessionData } = useQuery({
    queryKey: ['session', student?.class_id],
    queryFn: async () => {
      if (!student?.class_id) return null
      const { data, error } = await supabase
        .from('sessions')
        .select('*, formations(*, programs(*))')
        .eq('id', student.class_id)
        .single()
      
      if (error) throw error
      return data
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
                  {(studentInvoices as any[]).slice(0, 5).map((invoice: any) => (
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
                  {(studentPayments as any[]).slice(0, 5).map((payment: any) => (
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
                            Facture: {(payment.invoices as any).invoice_number || 'N/A'}
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
                  {guardians.map((guardian: any) => (
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

