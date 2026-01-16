'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { RoleGuard, ADMIN_ROLES } from '@/components/auth/role-guard'
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Shield,
  Save,
  RefreshCw,
  UserCog
} from 'lucide-react'
import Link from 'next/link'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'teacher', label: 'Enseignant' },
  { value: 'secretary', label: 'Secrétaire' },
  { value: 'accountant', label: 'Comptable' },
  { value: 'parent', label: 'Parent' },
  { value: 'student', label: 'Étudiant' },
]

function EditUserPageContent() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string
  const { user } = useAuth()
  const supabase = createClient()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    role: 'teacher',
    is_active: true,
  })

  // Charger les données de l'utilisateur
  const { data: userData, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, phone, role, is_active, organization_id')
        .eq('id', userId)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!userId,
    onSuccess: (data) => {
      if (data) {
        setFormData({
          email: data.email || '',
          full_name: data.full_name || '',
          phone: data.phone || '',
          role: data.role || 'teacher',
          is_active: data.is_active ?? true,
        })
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('users')
        .update({
          email: data.email,
          full_name: data.full_name,
          phone: data.phone || null,
          role: data.role,
          is_active: data.is_active,
        })
        .eq('id', userId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-users'] })
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      
      addToast({
        type: 'success',
        title: 'Succès',
        description: 'L\'utilisateur a été mis à jour avec succès',
      })
      
      setTimeout(() => {
        router.push('/dashboard/settings/users')
      }, 300)
    },
    onError: (error: Error) => {
      console.error('❌ [UPDATE USER] Erreur:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la mise à jour',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.email || !formData.full_name) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
      })
      return
    }

    updateMutation.mutate(formData)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-blue" />
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Utilisateur introuvable
              </p>
              <Button asChild>
                <Link href="/dashboard/settings/users">
                  Retour à la liste
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/settings/users"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la liste des utilisateurs
        </Link>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <UserCog className="h-8 w-8 text-brand-blue" />
          Modifier l'utilisateur
        </h1>
        <p className="text-muted-foreground">
          Modifiez les informations de l'utilisateur
        </p>
      </div>

      {/* Formulaire */}
      <Card>
        <CardHeader>
          <CardTitle>Informations de l'utilisateur</CardTitle>
          <CardDescription>
            Modifiez les informations de l'utilisateur
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nom complet */}
            <div>
              <Label htmlFor="full_name">
                <User className="h-4 w-4 inline mr-2" />
                Nom complet <span className="text-red-500">*</span>
              </Label>
              <Input
                id="full_name"
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Jean Dupont"
                required
                className="mt-2"
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">
                <Mail className="h-4 w-4 inline mr-2" />
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jean.dupont@example.com"
                required
                className="mt-2"
              />
            </div>

            {/* Téléphone */}
            <div>
              <Label htmlFor="phone">
                <Phone className="h-4 w-4 inline mr-2" />
                Téléphone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+221 77 123 45 67"
                className="mt-2"
              />
            </div>

            {/* Rôle */}
            <div>
              <Label htmlFor="role">
                <Shield className="h-4 w-4 inline mr-2" />
                Rôle <span className="text-red-500">*</span>
              </Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Statut actif */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Utilisateur actif
              </Label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/settings/users')}
                disabled={updateMutation.isPending}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer les modifications
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function EditUserPage() {
  return (
    <RoleGuard allowedRoles={ADMIN_ROLES}>
      <EditUserPageContent />
    </RoleGuard>
  )
}

