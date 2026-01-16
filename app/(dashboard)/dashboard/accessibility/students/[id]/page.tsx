'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { accessibilityService } from '@/lib/services/accessibility.service'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StudentNeedForm } from '@/components/accessibility/student-need-form'
import { AccommodationForm } from '@/components/accessibility/accommodation-form'
import { AccommodationCard } from '@/components/accessibility/accommodation-card'
import { DocumentUpload } from '@/components/accessibility/document-upload'
import {
  User,
  FileText,
  Package,
  Calendar,
  ArrowLeft,
  Plus,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function StudentAccessibilityPage() {
  const params = useParams()
  const studentId = params.id as string
  const { user } = useAuth()
  const supabase = createClient()

  const [showNeedForm, setShowNeedForm] = useState(false)
  const [showAccommodationForm, setShowAccommodationForm] = useState(false)
  const [editingAccommodation, setEditingAccommodation] = useState<any>(null)

  // Query étudiant
  const { data: student, isLoading: studentLoading } = useQuery<any>({
    queryKey: ['student', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, programs(name), cohorts(name)')
        .eq('id', studentId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!studentId,
  })

  // Query besoins
  const { data: need, isLoading: needLoading } = useQuery({
    queryKey: ['accessibility-student-need', studentId],
    queryFn: async () => {
      return await accessibilityService.getStudentNeedByStudentId(studentId)
    },
    enabled: !!studentId,
  })

  // Query aménagements
  const { data: accommodations = [], isLoading: accommodationsLoading } = useQuery({
    queryKey: ['accessibility-accommodations', studentId],
    queryFn: async () => {
      return await accessibilityService.getStudentAccommodations(studentId)
    },
    enabled: !!studentId,
  })

  // Query types de handicap
  const { data: disabilityTypes = [] } = useQuery({
    queryKey: ['accessibility-disability-types'],
    queryFn: async () => {
      return await accessibilityService.getDisabilityTypes()
    },
  })

  const handleEditAccommodation = (accommodation: any) => {
    setEditingAccommodation(accommodation)
    setShowAccommodationForm(true)
  }

  const handleCloseAccommodationForm = () => {
    setShowAccommodationForm(false)
    setEditingAccommodation(null)
  }

  if (!user || studentLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Étudiant introuvable</h3>
            <p className="text-sm text-muted-foreground mb-4">
              L'étudiant demandé n'existe pas ou vous n'avez pas les permissions pour y accéder.
            </p>
            <Link href="/dashboard/accessibility">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculer les types de handicap déclarés
  const declaredDisabilityTypes = need?.disability_type_ids
    ? disabilityTypes.filter((dt) => need.disability_type_ids.includes(dt.id))
    : []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/accessibility">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <User className="h-8 w-8 text-primary" />
              {student.first_name} {student.last_name}
            </h1>
            <p className="text-muted-foreground mt-1">
              Suivi de l'accessibilité et des aménagements
            </p>
          </div>
        </div>
      </div>

      {/* Informations étudiant */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informations générales
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{student.email || 'Non renseigné'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Programme</p>
            <p className="font-medium">{student.programs?.name || 'Non affecté'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Cohorte</p>
            <p className="font-medium">{student.cohorts?.name || 'Non affecté'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Statut déclaration */}
      {!need ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-2">
                  Aucune déclaration de besoins spécifiques
                </h3>
                <p className="text-sm text-amber-800 mb-4">
                  Cet étudiant n'a pas encore rempli le formulaire d'auto-déclaration des besoins spécifiques.
                </p>
                <Button onClick={() => setShowNeedForm(true)} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Remplir la déclaration
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Déclaration de besoins spécifiques
              </CardTitle>
              <div className="flex items-center gap-2">
                {need.status === 'pending' && (
                  <Badge className="bg-amber-100 text-amber-800">En attente de revue</Badge>
                )}
                {need.status === 'reviewed' && (
                  <Badge className="bg-blue-100 text-blue-800">Revue effectuée</Badge>
                )}
                {need.status === 'implemented' && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Aménagements en place
                  </Badge>
                )}
                <Button onClick={() => setShowNeedForm(true)} variant="outline" size="sm">
                  Modifier
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Handicap déclaré */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Déclaration de handicap</p>
              <p className="font-medium">
                {need.has_disability ? (
                  <span className="text-blue-600">Oui, un handicap est déclaré</span>
                ) : (
                  <span>Aucun handicap déclaré</span>
                )}
              </p>
            </div>

            {/* Types de handicap */}
            {need.has_disability && declaredDisabilityTypes.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Types de handicap</p>
                <div className="flex flex-wrap gap-2">
                  {declaredDisabilityTypes.map((dt) => (
                    <Badge key={dt.id} variant="outline">
                      {dt.name_fr}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {need.disability_description && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Description</p>
                <p className="text-sm">{need.disability_description}</p>
              </div>
            )}

            {/* Reconnaissance MDPH */}
            {need.has_mdph_recognition && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Reconnaissance MDPH/RQTH</p>
                  <p className="font-medium text-blue-900">Oui</p>
                </div>
                {need.mdph_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">Numéro MDPH</p>
                    <p className="font-medium text-blue-900">{need.mdph_number}</p>
                  </div>
                )}
                {need.mdph_expiry_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Date d'expiration</p>
                    <p className="font-medium text-blue-900">
                      {new Date(need.mdph_expiry_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Besoins */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {need.needs_physical_accommodations && (
                <div className="p-3 border rounded-lg">
                  <p className="text-sm font-medium mb-1">Aménagements physiques</p>
                  <p className="text-xs text-muted-foreground">
                    {need.physical_accommodations_detail || 'Demandés'}
                  </p>
                </div>
              )}
              {need.needs_pedagogical_accommodations && (
                <div className="p-3 border rounded-lg">
                  <p className="text-sm font-medium mb-1">Aménagements pédagogiques</p>
                  <p className="text-xs text-muted-foreground">
                    {need.pedagogical_accommodations_detail || 'Demandés'}
                  </p>
                </div>
              )}
              {need.needs_exam_accommodations && (
                <div className="p-3 border rounded-lg">
                  <p className="text-sm font-medium mb-1">Aménagements examens</p>
                  <p className="text-xs text-muted-foreground">
                    {need.exam_accommodations_detail || 'Demandés'}
                  </p>
                </div>
              )}
              {need.needs_technical_aids && (
                <div className="p-3 border rounded-lg">
                  <p className="text-sm font-medium mb-1">Aides techniques</p>
                  <p className="text-xs text-muted-foreground">
                    {need.technical_aids_detail || 'Demandées'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs: Aménagements et Documents */}
      <Tabs defaultValue="accommodations" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="accommodations">
            Aménagements ({accommodations.length})
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents justificatifs
          </TabsTrigger>
        </TabsList>

        {/* Aménagements */}
        <TabsContent value="accommodations" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Aménagements mis en place</h3>
            <Button onClick={() => setShowAccommodationForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nouvel aménagement
            </Button>
          </div>

          {accommodationsLoading ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Chargement des aménagements...</p>
              </CardContent>
            </Card>
          ) : accommodations.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun aménagement</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Aucun aménagement n'a encore été mis en place pour cet étudiant.
                </p>
                <Button onClick={() => setShowAccommodationForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un aménagement
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accommodations.map((accommodation) => (
                <AccommodationCard
                  key={accommodation.id}
                  accommodation={accommodation}
                  onEdit={() => handleEditAccommodation(accommodation)}
                  showActions
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <DocumentUpload
            organizationId={user.organization_id || ''}
            studentId={studentId}
            studentNeedId={need?.id}
            showExisting
          />
        </TabsContent>
      </Tabs>

      {/* Dialog formulaire besoins */}
      <Dialog open={showNeedForm} onOpenChange={setShowNeedForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Déclaration de besoins spécifiques</DialogTitle>
            <DialogDescription>
              Formulaire d'auto-déclaration des besoins d'accessibilité
            </DialogDescription>
          </DialogHeader>
          <StudentNeedForm
            studentId={studentId}
            organizationId={user.organization_id || ''}
            onSuccess={() => setShowNeedForm(false)}
            onCancel={() => setShowNeedForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog formulaire aménagement */}
      <Dialog open={showAccommodationForm} onOpenChange={setShowAccommodationForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAccommodation ? 'Modifier l\'aménagement' : 'Nouvel aménagement'}
            </DialogTitle>
            <DialogDescription>
              {editingAccommodation
                ? 'Modifiez les informations de l\'aménagement'
                : 'Créez un nouvel aménagement pour cet étudiant'}
            </DialogDescription>
          </DialogHeader>
          <AccommodationForm
            organizationId={user.organization_id || ''}
            studentId={studentId}
            studentNeedId={need?.id}
            accommodationId={editingAccommodation?.id}
            initialData={editingAccommodation}
            onSuccess={handleCloseAccommodationForm}
            onCancel={handleCloseAccommodationForm}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
