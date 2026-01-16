'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { studentService } from '@/lib/services/student.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function EditStudentPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string
  const queryClient = useQueryClient()
  const auth = useAuth()
  const { user, isLoading: userLoading } = auth
  const supabase = createClient()

  // Tous les hooks doivent être appelés de manière inconditionnelle, avant les retours conditionnels
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    class_id: '',
    enrollment_date: '',
    status: 'active' as 'active' | 'inactive' | 'graduated',
  })

  // Charger les données de l'étudiant existant
  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentService.getById(studentId),
    enabled: !!studentId,
  })

  // Récupérer les sessions (remplace les classes)
  const { data: sessions } = useQuery({
    queryKey: ['program-sessions-all', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name, start_date, end_date, formations!inner(id, name, code, organization_id, programs(id, name))')
        .eq('formations.organization_id', user.organization_id)
        .order('start_date', { ascending: false })
      if (error) throw error
      return data?.map((session: any) => ({
        id: session.id,
        name: `${session.name} - ${session.formations.name}${session.formations.programs ? ` (${session.formations.programs.name})` : ''}`,
        code: session.formations.code,
        start_date: session.start_date,
        end_date: session.end_date,
      })) || []
    },
    enabled: !!user?.organization_id && !userLoading,
  })

  // Pré-remplir le formulaire avec les données existantes
  useEffect(() => {
    if (student) {
      setFormData({
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        date_of_birth: student.date_of_birth ? student.date_of_birth.split('T')[0] : '',
        gender: student.gender || '',
        email: student.email || '',
        phone: student.phone || '',
        address: student.address || '',
        city: student.city || '',
        class_id: student.class_id || '',
        enrollment_date: student.enrollment_date ? student.enrollment_date.split('T')[0] : '',
        status: student.status || 'active',
      })
    }
  }, [student])

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')

      console.log('Mise à jour de l\'élève:', studentId, formData)
      const result = await studentService.update(studentId, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        date_of_birth: formData.date_of_birth || null,
        gender: formData.gender || null,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        city: formData.city || null,
        class_id: formData.class_id || null,
        enrollment_date: formData.enrollment_date || new Date().toISOString().split('T')[0],
        status: formData.status,
      })
      console.log('Élève mis à jour avec succès:', result)
      return result
    },
    onSuccess: (updatedStudent) => {
      console.log('onSuccess appelé avec:', updatedStudent)
      // Invalider les queries pour forcer le rafraîchissement
      queryClient.invalidateQueries({ queryKey: ['student', studentId] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
      router.push(`/dashboard/students/${updatedStudent.id}`)
    },
    onError: (error) => {
      console.error('Erreur lors de la mise à jour de l\'élève:', error)
    },
  })

  // Vérifications conditionnelles APRÈS tous les hooks
  if (userLoading || studentLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Chargement...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="bg-warning-bg border border-warning-border rounded-lg p-4">
          <h2 className="text-lg font-semibold text-warning-primary mb-2">
            Utilisateur non trouvé
          </h2>
          <p className="text-warning-primary">
            Votre compte n'existe pas encore dans la base de données.
          </p>
        </div>
      </div>
    )
  }

  if (!user.organization_id) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Organization ID manquant
          </h2>
          <p className="text-red-700 mb-4">
            Votre compte n'est pas associé à une organisation.
          </p>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Élève non trouvé</p>
          <Link href="/dashboard/students">
            <Button>Retour à la liste</Button>
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/students/${studentId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Modifier l'élève</h1>
          <p className="mt-2 text-sm text-gray-600">
            Modifiez les informations de {student.first_name} {student.last_name}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Prénom *
                </label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nom *
                </label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Date de naissance
                </label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) =>
                    setFormData({ ...formData, date_of_birth: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Genre</label>
                <select
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData({ ...formData, gender: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                >
                  <option value="">Sélectionner</option>
                  <option value="male">Masculin</option>
                  <option value="female">Féminin</option>
                  <option value="other">Autre</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Téléphone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Adresse</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Ville</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Session</label>
                <select
                  value={formData.class_id}
                  onChange={(e) =>
                    setFormData({ ...formData, class_id: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                >
                  <option value="">Aucune session</option>
                  {sessions?.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Statut</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as Student['status'] })
                  }
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                >
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                  <option value="graduated">Diplômé</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Date d'inscription *
              </label>
              <input
                type="date"
                required
                value={formData.enrollment_date}
                onChange={(e) =>
                  setFormData({ ...formData, enrollment_date: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
              />
            </div>

            {updateMutation.error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                {updateMutation.error instanceof Error
                  ? updateMutation.error.message
                  : 'Une erreur est survenue'}
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-4">
              <Link href={`/dashboard/students/${studentId}`}>
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </Link>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

