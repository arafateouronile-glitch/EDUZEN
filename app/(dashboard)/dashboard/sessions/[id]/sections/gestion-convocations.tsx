'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Mail, UserPlus, X, FileText, CheckCircle, AlertCircle, Trash2 } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { useDocumentGeneration } from '../hooks/use-document-generation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { 
  SessionWithRelations, 
  EnrollmentWithRelations,
  FormationWithRelations,
  StudentWithRelations
} from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'

type Program = TableRow<'programs'>
type Organization = TableRow<'organizations'>
type Enrollment = TableRow<'enrollments'>

interface GestionConvocationsProps {
  sessionId: string
  sessionData: SessionWithRelations | undefined
  formation: FormationWithRelations | null | undefined
  program: Program | null | undefined
  organization: Organization | undefined
  enrollments?: EnrollmentWithRelations[]
  students?: StudentWithRelations[]
  showEnrollmentForm: boolean
  enrollmentForm: {
    student_id: string
    enrollment_date: string
    status: Enrollment['status']
    payment_status: Enrollment['payment_status']
    total_amount: string
    paid_amount: string
  }
  onEnrollmentFormChange: (form: GestionConvocationsProps['enrollmentForm']) => void
  onCreateEnrollment: () => void
  createEnrollmentMutation: {
    isPending: boolean
    error: Error | null
  }
  cancelEnrollmentMutation: {
    mutate: (enrollmentId: string) => void
    isPending: boolean
    error: Error | null
  }
  onCloseEnrollmentForm: () => void
  onShowEnrollmentForm: () => void
  isGeneratingZip?: boolean
  zipGenerationProgress?: { current: number; total: number }
  lastZipGeneration?: Date | null
}

export function GestionConvocations({
  sessionId,
  sessionData,
  formation,
  program,
  organization,
  enrollments = [],
  students = [],
  showEnrollmentForm,
  enrollmentForm,
  onEnrollmentFormChange,
  onCreateEnrollment,
  createEnrollmentMutation,
  cancelEnrollmentMutation,
  onCloseEnrollmentForm,
  onShowEnrollmentForm,
  isGeneratingZip = false,
  zipGenerationProgress = { current: 0, total: 0 },
  lastZipGeneration = null,
}: GestionConvocationsProps) {
  const {
    handleGenerateConvocation,
    handleGenerateAllConvocationsZip,
    handleSendConvocationByEmail,
    handleSendConvocationByEmailWithCustomContent,
    handleSendAllConvocationsByEmail,
    prepareConvocationEmail,
  } = useDocumentGeneration({
    sessionData,
    formation,
    program,
    organization,
  })

  const [emailPreview, setEmailPreview] = useState<{
    to: string
    subject: string
    body: string
    studentName: string
    enrollment: EnrollmentWithRelations
  } | null>(null)
  
  const [editedEmail, setEditedEmail] = useState<{
    to: string
    subject: string
    body: string
  } | null>(null)

  return (
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
                onClick={onCloseEnrollmentForm}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                onCreateEnrollment()
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-2">Élève *</label>
                <select
                  value={enrollmentForm.student_id}
                  onChange={(e) => onEnrollmentFormChange({ ...enrollmentForm, student_id: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                >
                  <option value="">Sélectionner un élève</option>
                  {students.map((student) => (
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
                    onChange={(e) => onEnrollmentFormChange({ ...enrollmentForm, enrollment_date: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Statut *</label>
                  <select
                    value={enrollmentForm.status || 'pending'}
                    onChange={(e) => onEnrollmentFormChange({ ...enrollmentForm, status: e.target.value as Enrollment['status'] })}
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
                    onChange={(e) => onEnrollmentFormChange({ ...enrollmentForm, total_amount: e.target.value })}
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
                    onChange={(e) => onEnrollmentFormChange({ ...enrollmentForm, paid_amount: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Statut de paiement *</label>
                <select
                  value={enrollmentForm.payment_status || 'pending'}
                  onChange={(e) => onEnrollmentFormChange({ ...enrollmentForm, payment_status: e.target.value as Enrollment['payment_status'] })}
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
              {cancelEnrollmentMutation.error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                  {cancelEnrollmentMutation.error instanceof Error
                    ? cancelEnrollmentMutation.error.message
                    : 'Une erreur est survenue lors de l\'annulation'}
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCloseEnrollmentForm}
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

      {/* Génération et envoi des convocations */}
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
                  onClick={() => handleGenerateAllConvocationsZip(enrollments)}
                  disabled={isGeneratingZip || enrollments.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isGeneratingZip
                    ? `Génération... (${zipGenerationProgress.current}/${zipGenerationProgress.total})`
                    : 'Générer un ZIP des convocations'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendAllConvocationsByEmail(enrollments)}
                  disabled={enrollments.length === 0}
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

          {/* Liste des apprenants */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Apprenants inscrits ({enrollments.length})</h4>
              {!showEnrollmentForm && (
                <Button variant="outline" size="sm" onClick={onShowEnrollmentForm}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Inscrire un apprenant
                </Button>
              )}
            </div>

            {enrollments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Aucun apprenant inscrit pour le moment</p>
                <Button variant="outline" className="mt-4" onClick={onShowEnrollmentForm}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Inscrire le premier apprenant
                </Button>
              </div>
            ) : (
              enrollments.map((enrollment) => {
                const student = enrollment.students
                if (!student) return null

                return (
                  <div key={enrollment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{student.first_name} {student.last_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {student.student_number}
                          {student.email && ` • ${student.email}`}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`text-xs px-2 py-1 rounded ${
                            enrollment.status === 'confirmed' ? 'bg-brand-blue-ghost text-brand-blue' :
                            enrollment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            enrollment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {enrollment.status === 'confirmed' ? 'Confirmé' :
                             enrollment.status === 'completed' ? 'Terminé' :
                             enrollment.status === 'cancelled' ? 'Annulé' : 'En attente'}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            enrollment.payment_status === 'paid' ? 'bg-brand-blue-ghost text-brand-blue' :
                            enrollment.payment_status === 'partial' ? 'bg-brand-cyan-ghost text-brand-cyan' :
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
                    <div className="flex items-center space-x-2">
                      {enrollment.status !== 'cancelled' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGenerateConvocation(enrollment)}
                            title="Générer la convocation"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const emailData = prepareConvocationEmail(enrollment)
                              if (emailData) {
                                setEmailPreview(emailData)
                                setEditedEmail({
                                  to: emailData.to,
                                  subject: emailData.subject,
                                  body: emailData.body,
                                })
                              }
                            }}
                            title="Envoyer par email"
                            disabled={!student.email}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {enrollment.status !== 'cancelled' && enrollment.status !== 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Êtes-vous sûr de vouloir annuler l'inscription de ${student.first_name} ${student.last_name} ?`)) {
                              cancelEnrollmentMutation.mutate(enrollment.id)
                            }
                          }}
                          disabled={cancelEnrollmentMutation.isPending}
                          title="Annuler l'inscription"
                          className="text-danger-primary hover:text-danger-primary hover:bg-danger-bg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
        )}
      </div>

      {/* Modal d'aperçu d'email */}
      <Dialog open={!!emailPreview} onOpenChange={(open) => {
        if (!open) {
          setEmailPreview(null)
          setEditedEmail(null)
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aperçu de l'email</DialogTitle>
            <DialogDescription>
              Vérifiez le contenu et le destinataire avant d'envoyer
            </DialogDescription>
          </DialogHeader>
          
          {emailPreview && editedEmail && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="email-to">Destinataire</Label>
                <Input
                  id="email-to"
                  type="email"
                  value={editedEmail.to}
                  onChange={(e) => setEditedEmail({ ...editedEmail, to: e.target.value })}
                  className="mt-1"
                  placeholder="email@example.com"
                />
              </div>
              
              <div>
                <Label htmlFor="email-subject">Sujet</Label>
                <Input
                  id="email-subject"
                  type="text"
                  value={editedEmail.subject}
                  onChange={(e) => setEditedEmail({ ...editedEmail, subject: e.target.value })}
                  className="mt-1"
                  placeholder="Sujet de l'email"
                />
              </div>
              
              <div>
                <Label htmlFor="email-body">Contenu</Label>
                <Textarea
                  id="email-body"
                  value={editedEmail.body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()}
                  onChange={(e) => setEditedEmail({ ...editedEmail, body: e.target.value })}
                  className="mt-1 min-h-[200px] font-mono text-sm"
                  placeholder="Contenu de l'email"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Le formatage HTML sera préservé lors de l'envoi
                </p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>Pièce jointe :</strong> Un PDF de la convocation sera joint à cet email.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEmailPreview(null)
                setEditedEmail(null)
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={async () => {
                if (emailPreview && editedEmail) {
                  // Créer une version modifiée de l'enrollment avec l'email modifié
                  const modifiedEnrollment = {
                    ...emailPreview.enrollment,
                    students: {
                      ...emailPreview.enrollment.students,
                      email: editedEmail.to,
                    },
                  } as EnrollmentWithRelations
                  
                  // Appeler la fonction d'envoi avec les données modifiées
                  await handleSendConvocationByEmailWithCustomContent(
                    modifiedEnrollment,
                    editedEmail.subject,
                    editedEmail.body
                  )
                  setEmailPreview(null)
                  setEditedEmail(null)
                }
              }}
              disabled={!editedEmail?.to || !editedEmail?.subject || !editedEmail?.body}
            >
              <Mail className="h-4 w-4 mr-2" />
              Envoyer l'email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
})
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
