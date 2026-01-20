'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { 
  ArrowLeft, Users, Search, Plus, X, Check, Loader2, UserPlus, 
  Calendar, Briefcase, Mail, Phone, MapPin
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { RoleGuard, ADMIN_ROLES } from '@/components/auth/role-guard'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'

type Student = {
  id: string
  first_name: string
  last_name: string
  student_number: string
  email: string | null
  phone: string | null
}

type StudentEntity = {
  id: string
  student_id: string
  entity_id: string
  relationship_type: string
  start_date: string | null
  end_date: string | null
  is_current: boolean
  position: string | null
  department: string | null
  tutor_name: string | null
  tutor_email: string | null
  tutor_phone: string | null
  notes: string | null
  students: Student
}

export default function EntityStudentsPage() {
  return (
    <RoleGuard allowedRoles={ADMIN_ROLES}>
      <EntityStudentsPageContent />
    </RoleGuard>
  )
}

function EntityStudentsPageContent() {
  const params = useParams()
  const router = useRouter()
  const entityId = params.id as string
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [search, setSearch] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Formulaire pour le rattachement
  const [formData, setFormData] = useState({
    relationship_type: 'apprenticeship' as 'apprenticeship' | 'internship' | 'employment' | 'partnership' | 'sponsorship' | 'other',
    start_date: '',
    end_date: '',
    position: '',
    department: '',
    tutor_name: '',
    tutor_email: '',
    tutor_phone: '',
    notes: '',
  })

  // Récupérer l'entité
  const { data: entity } = useQuery({
    queryKey: ['external-entity', entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('external_entities')
        .select('*')
        .eq('id', entityId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!entityId,
  })

  // Récupérer les apprenants rattachés
  const { data: studentEntities, isLoading: isLoadingAttached } = useQuery({
    queryKey: ['student-entities', entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_entities')
        .select('*, students(id, first_name, last_name, student_number, email, phone)')
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as StudentEntity[]
    },
    enabled: !!entityId,
  })

  // Récupérer tous les apprenants de l'organisation (pour la sélection)
  const { data: allStudents, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students-for-entity', user?.organization_id, search],
    queryFn: async () => {
      if (!user?.organization_id) return []
      
      let query = supabase
        .from('students')
        .select('id, first_name, last_name, student_number, email, phone')
        .eq('organization_id', user.organization_id)
        .eq('status', 'active')
        .order('last_name', { ascending: true })

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,student_number.ilike.%${search}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return (data || []) as Student[]
    },
    enabled: !!user?.organization_id,
  })

  // Filtrer les apprenants déjà rattachés
  const availableStudents = allStudents?.filter(
    (student) => !studentEntities?.some((se) => se.student_id === student.id && se.is_current)
  ) || []

  // Rattacher des apprenants
  const attachMutation = useMutation({
    mutationFn: async (studentIds: string[]) => {
      if (!user?.id) throw new Error('User ID manquant')

      const attachments = studentIds.map((studentId) => ({
        student_id: studentId,
        entity_id: entityId,
        relationship_type: formData.relationship_type,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        is_current: true,
        position: formData.position || null,
        department: formData.department || null,
        tutor_name: formData.tutor_name || null,
        tutor_email: formData.tutor_email || null,
        tutor_phone: formData.tutor_phone || null,
        notes: formData.notes || null,
        created_by: user.id,
      }))

      const { error } = await supabase
        .from('student_entities')
        .insert(attachments)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-entities', entityId] })
      queryClient.invalidateQueries({ queryKey: ['student-entity-counts'] })
      setIsAddDialogOpen(false)
      setSelectedStudents([])
      resetForm()
      addToast({
        title: 'Succès',
        description: `${selectedStudents.length} apprenant(s) rattaché(s) avec succès`,
        type: 'success',
      })
    },
    onError: (error: any) => {
      addToast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        type: 'error',
      })
    },
  })

  // Détacher un apprenant
  const detachMutation = useMutation({
    mutationFn: async (studentEntityId: string) => {
      const { error } = await supabase
        .from('student_entities')
        .update({ is_current: false })
        .eq('id', studentEntityId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-entities', entityId] })
      queryClient.invalidateQueries({ queryKey: ['student-entity-counts'] })
      addToast({
        title: 'Succès',
        description: 'Apprenant détaché avec succès',
        type: 'success',
      })
    },
    onError: (error: any) => {
      addToast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        type: 'error',
      })
    },
  })

  const resetForm = () => {
    setFormData({
      relationship_type: 'apprenticeship',
      start_date: '',
      end_date: '',
      position: '',
      department: '',
      tutor_name: '',
      tutor_email: '',
      tutor_phone: '',
      notes: '',
    })
    setSelectedStudents([])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedStudents.length === 0) {
      addToast({
        title: 'Erreur',
        description: 'Veuillez sélectionner au moins un apprenant',
        type: 'error',
      })
      return
    }
    setIsSubmitting(true)
    attachMutation.mutate(selectedStudents, {
      onSettled: () => setIsSubmitting(false),
    })
  }

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    )
  }

  const getRelationshipLabel = (type: string) => {
    const labels: Record<string, string> = {
      apprenticeship: 'Alternance',
      internship: 'Stage',
      employment: 'Emploi',
      partnership: 'Partenariat',
      sponsorship: 'Parrainage',
      other: 'Autre',
    }
    return labels[type] || type
  }

  if (!entity) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Loader2 className="h-8 w-8 mx-auto animate-spin mb-4" />
        Chargement...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/entities">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{entity.name}</h1>
          <p className="mt-2 text-sm text-gray-600">
            Gestion des apprenants rattachés
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Rattacher des apprenants
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total rattachés</p>
                <p className="text-2xl font-bold">{studentEntities?.length || 0}</p>
              </div>
              <Users className="h-8 w-8 text-brand-blue" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Actuellement actifs</p>
                <p className="text-2xl font-bold">
                  {studentEntities?.filter((se) => se.is_current).length || 0}
                </p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Disponibles</p>
                <p className="text-2xl font-bold">{availableStudents.length}</p>
              </div>
              <UserPlus className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des apprenants rattachés */}
      <Card>
        <CardHeader>
          <CardTitle>Apprenants rattachés</CardTitle>
          <CardDescription>
            Liste des apprenants actuellement rattachés à cette entité
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAttached ? (
            <div className="text-center py-12 text-gray-500">Chargement...</div>
          ) : studentEntities && studentEntities.length > 0 ? (
            <div className="space-y-4">
              {studentEntities.map((se) => (
                <div
                  key={se.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-semibold">
                          {se.students.first_name} {se.students.last_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {se.students.student_number}
                        </p>
                      </div>
                      <Badge>{getRelationshipLabel(se.relationship_type)}</Badge>
                      {se.is_current && (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          Actif
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      {se.start_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Début: {formatDate(se.start_date)}
                        </div>
                      )}
                      {se.end_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Fin: {formatDate(se.end_date)}
                        </div>
                      )}
                      {se.position && (
                        <div className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {se.position}
                        </div>
                      )}
                      {se.tutor_name && (
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          Tuteur: {se.tutor_name}
                        </div>
                      )}
                    </div>
                    {se.notes && (
                      <p className="mt-2 text-sm text-gray-600">{se.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/dashboard/students/${se.student_id}`}>
                      <Button variant="outline" size="sm">
                        Voir
                      </Button>
                    </Link>
                    {se.is_current && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('Êtes-vous sûr de vouloir détacher cet apprenant ?')) {
                            detachMutation.mutate(se.id)
                          }
                        }}
                      >
                        Détacher
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Aucun apprenant rattaché</p>
              <Button onClick={() => setIsAddDialogOpen(true)} className="mt-4">
                <UserPlus className="h-4 w-4 mr-2" />
                Rattacher des apprenants
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog pour rattacher des apprenants */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rattacher des apprenants</DialogTitle>
            <DialogDescription>
              Sélectionnez les apprenants à rattacher à {entity.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Recherche */}
            <div>
              <Label>Rechercher un apprenant</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Nom, prénom ou numéro d'apprenant..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Liste des apprenants disponibles */}
            <div>
              <Label>Apprenants disponibles ({availableStudents.length})</Label>
              <div className="mt-2 border rounded-lg max-h-64 overflow-y-auto">
                {isLoadingStudents ? (
                  <div className="text-center py-8 text-gray-500">Chargement...</div>
                ) : availableStudents.length > 0 ? (
                  <div className="divide-y">
                    {availableStudents.map((student) => (
                      <label
                        key={student.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                          className="rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium">
                            {student.first_name} {student.last_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {student.student_number}
                            {student.email && ` • ${student.email}`}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Aucun apprenant disponible
                  </div>
                )}
              </div>
              {selectedStudents.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  {selectedStudents.length} apprenant(s) sélectionné(s)
                </p>
              )}
            </div>

            {/* Informations du rattachement */}
            <div className="border-t pt-4 space-y-4">
              <h3 className="font-semibold">Informations du rattachement</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="relationship_type">Type de rattachement *</Label>
                  <Select
                    value={formData.relationship_type}
                    onValueChange={(value) => setFormData({ ...formData, relationship_type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apprenticeship">Alternance</SelectItem>
                      <SelectItem value="internship">Stage</SelectItem>
                      <SelectItem value="employment">Emploi</SelectItem>
                      <SelectItem value="partnership">Partenariat</SelectItem>
                      <SelectItem value="sponsorship">Parrainage</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="position">Poste/Fonction</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Date de début</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">Date de fin</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="department">Département/Service</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="tutor_name">Nom du tuteur</Label>
                  <Input
                    id="tutor_name"
                    value={formData.tutor_name}
                    onChange={(e) => setFormData({ ...formData, tutor_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="tutor_email">Email du tuteur</Label>
                  <Input
                    id="tutor_email"
                    type="email"
                    value={formData.tutor_email}
                    onChange={(e) => setFormData({ ...formData, tutor_email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="tutor_phone">Téléphone du tuteur</Label>
                  <Input
                    id="tutor_phone"
                    value={formData.tutor_phone}
                    onChange={(e) => setFormData({ ...formData, tutor_phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes complémentaires..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setIsAddDialogOpen(false); resetForm() }}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting || selectedStudents.length === 0}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Rattacher {selectedStudents.length > 0 && `(${selectedStudents.length})`}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
