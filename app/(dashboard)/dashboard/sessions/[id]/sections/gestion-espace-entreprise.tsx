'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, FileText, Mail } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useDocumentGeneration } from '../hooks/use-document-generation'
import type { 
  SessionWithRelations, 
  EnrollmentWithRelations,
  FormationWithRelations
} from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'

type Program = TableRow<'programs'>
type Organization = TableRow<'organizations'>

interface GestionEspaceEntrepriseProps {
  sessionData: SessionWithRelations | undefined
  formation: FormationWithRelations | null | undefined
  program: Program | null | undefined
  organization: Organization | undefined
  enrollments?: EnrollmentWithRelations[]
}

export function GestionEspaceEntreprise({
  sessionData,
  formation,
  program,
  organization,
  enrollments = [],
}: GestionEspaceEntrepriseProps) {
  const {
    handleGenerateSessionReport,
    handleGenerateCertificate,
  } = useDocumentGeneration({
    sessionData,
    formation,
    program,
    organization,
  })

  // Extraire les entreprises uniques des inscriptions
  const companies = new Set<string>()
  enrollments.forEach((enrollment) => {
    const student = enrollment.students
    if (student && (student as any).company) {
      companies.add((student as any).company)
    }
  })

  return (
    <div className="space-y-6">
      {/* Informations sur les entreprises participantes */}
      <Card>
        <CardHeader>
          <CardTitle>Entreprises participantes</CardTitle>
        </CardHeader>
        <CardContent>
          {companies.size === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucune entreprise identifiée pour le moment
            </p>
          ) : (
            <div className="space-y-3">
              {Array.from(companies).map((company, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div>
                    <p className="font-medium">{company}</p>
                    <p className="text-sm text-muted-foreground">
                      {enrollments.filter((e) => (e.students as any)?.company === company).length} apprenant{enrollments.filter((e) => (e.students as any)?.company === company).length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <FileText className="mr-2 h-4 w-4" />
                      Documents
                    </Button>
                    <Button variant="outline" size="sm">
                      <Mail className="mr-2 h-4 w-4" />
                      Contacter
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents pour les entreprises */}
      <Card>
        <CardHeader>
          <CardTitle>Documents et rapports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium">Rapport de session</p>
                <p className="text-sm text-muted-foreground">Rapport détaillé de la session de formation</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => {
              // TODO: Implémenter handleGenerateSessionReport
              alert('Fonctionnalité à venir : Génération du rapport de session')
            }}>
              <Download className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium">Attestations de formation</p>
                <p className="text-sm text-muted-foreground">Générer les attestations pour tous les apprenants</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => {
              // TODO: Implémenter la génération groupée de certificats
              alert('Fonctionnalité à venir : Génération des attestations')
            }}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informations de contact */}
      <Card>
        <CardHeader>
          <CardTitle>Contact et support</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {organization && (
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium">Organisation</p>
                <p className="text-sm text-muted-foreground">{organization.name}</p>
              </div>
              {organization.email && (
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{organization.email}</p>
                </div>
              )}
              {organization.phone && (
                <div>
                  <p className="text-sm font-medium">Téléphone</p>
                  <p className="text-sm text-muted-foreground">{organization.phone}</p>
                </div>
              )}
              {organization.address && (
                <div>
                  <p className="text-sm font-medium">Adresse</p>
                  <p className="text-sm text-muted-foreground">{organization.address}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
























