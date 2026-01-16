'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, Mail, AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
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
  FormationWithRelations
} from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { UserPlus } from 'lucide-react'

type Program = TableRow<'programs'>
type Organization = TableRow<'organizations'>

interface GestionConventionsProps {
  sessionData: SessionWithRelations | undefined
  formation: FormationWithRelations | null | undefined
  program: Program | null | undefined
  organization: Organization | undefined
  enrollments?: EnrollmentWithRelations[]
  isLoading?: boolean
  onShowEnrollmentForm: () => void
  onSwitchTab: (tab: 'convocations') => void
}

export function GestionConventions({
  sessionData,
  formation,
  program,
  organization,
  enrollments = [],
  isLoading = false,
  onShowEnrollmentForm,
  onSwitchTab,
}: GestionConventionsProps) {
  const {
    isGeneratingZip,
    zipGenerationProgress,
    lastZipGeneration,
    handleGenerateConvention,
    handleGenerateContract,
    handleGenerateAllConventionsZip,
    handleGenerateProgram,
    handleGenerateTerms,
    handleGeneratePrivacyPolicy,
    handleSendContractByEmail,
    handleSendContractByEmailWithCustomContent,
    prepareContractEmail,
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
      {/* Conventions et contrats */}
      <Card>
        <CardHeader>
          <CardTitle>Conventions et contrats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {enrollments.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <p className="font-medium text-blue-900">Génération en masse</p>
                <p className="text-sm text-blue-700">Générer toutes les conventions et contrats en un fichier ZIP</p>
                {lastZipGeneration && (
                  <span className="text-xs text-blue-600">
                    Dernière génération : {formatDate(lastZipGeneration.toISOString())}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateAllConventionsZip(enrollments)}
                disabled={isGeneratingZip}
              >
                <Download className="mr-2 h-4 w-4" />
                {isGeneratingZip
                  ? `Génération... (${zipGenerationProgress.current}/${zipGenerationProgress.total})`
                  : 'Générer un ZIP des conventions et contrats'}
              </Button>
            </div>
          )}
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
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement des inscriptions...</p>
          ) : enrollments.length > 0 ? (
            enrollments.map((enrollment) => {
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
                    <span className="text-xs bg-brand-blue-ghost text-brand-blue px-2 py-1 rounded">Signé</span>
                    <Button variant="ghost" size="sm" onClick={() => handleGenerateContract(enrollment)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const emailData = prepareContractEmail(enrollment)
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
                  onSwitchTab('convocations')
                  onShowEnrollmentForm()
                }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Inscrire un apprenant
              </Button>
            </div>
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
            <div className="bg-warning-bg border border-warning-border rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-warning-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-warning-primary font-medium">
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
                  <strong>Pièce jointe :</strong> Un PDF du contrat sera joint à cet email.
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
                  await handleSendContractByEmailWithCustomContent(
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
}

