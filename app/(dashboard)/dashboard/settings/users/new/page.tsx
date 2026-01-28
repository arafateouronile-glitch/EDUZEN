'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import {
  ArrowLeft,
  UserPlus,
  Mail,
  Phone,
  User,
  Shield,
  Save,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { logger, sanitizeError } from '@/lib/utils/logger'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'teacher', label: 'Enseignant' },
  { value: 'secretary', label: 'Secrétaire' },
  { value: 'accountant', label: 'Comptable' },
  { value: 'parent', label: 'Parent' },
  { value: 'student', label: 'Étudiant' },
]

export default function NewUserPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    role: 'teacher',
    is_active: true,
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          full_name: data.full_name,
          phone: data.phone && data.phone.trim() !== '' ? data.phone.trim() : null,
          role: data.role,
          is_active: data.is_active,
          organization_id: user?.organization_id,
        }),
      })

      if (!response.ok) {
        let errorMessage = 'Erreur lors de la création de l\'utilisateur'
        let errorDetails = null
        let validationErrors: Record<string, string[]> | null = null
        try {
          const error = await response.json()
          errorMessage = error.error || errorMessage
          errorDetails = error.details || error.code || null
          validationErrors = error.errors || null
          
          logger.error('❌ [CREATE USER] Erreur API:', error)
          
          // Si ce sont des erreurs de validation, construire un message détaillé
          if (validationErrors && Object.keys(validationErrors).length > 0) {
            const validationMessages = Object.entries(validationErrors)
              .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
              .join('; ')
            errorMessage = `Erreur de validation: ${validationMessages}`
          }
          
          if (errorDetails) {
            logger.error('❌ [CREATE USER] Détails:', errorDetails)
          }
        } catch (e) {
          logger.error('❌ [CREATE USER] Erreur lors de la lecture de la réponse:', e)
          errorMessage = `Erreur ${response.status}: ${response.statusText}`
        }
        const fullErrorMessage = errorDetails && !validationErrors
          ? `${errorMessage} (${errorDetails})` 
          : errorMessage
        throw new Error(fullErrorMessage)
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalider toutes les queries liées aux utilisateurs de l'organisation
      // Utiliser queryKey avec prefixMatch pour invalider toutes les variantes
      queryClient.invalidateQueries({ 
        queryKey: ['organization-users'],
        exact: false, // Invalider toutes les queries qui commencent par cette clé
      })
      
      // Forcer le refetch immédiat
      queryClient.refetchQueries({ 
        queryKey: ['organization-users'],
        exact: false,
      })
      
      addToast({
        type: 'success',
        title: 'Succès',
        description: 'L\'utilisateur a été créé avec succès',
      })
      
      // Attendre un peu avant de rediriger pour laisser le temps au refetch
      setTimeout(() => {
        router.push('/dashboard/settings/users')
      }, 500)
    },
    onError: (error: Error) => {
      logger.error('❌ [CREATE USER] Erreur:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la création',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.email || !formData.password || !formData.full_name) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
      })
      return
    }

    if (formData.password.length < 8) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Le mot de passe doit contenir au moins 8 caractères',
      })
      return
    }

    // Validation du format du mot de passe (majuscule, minuscule, chiffre)
    const hasUpperCase = /[A-Z]/.test(formData.password)
    const hasLowerCase = /[a-z]/.test(formData.password)
    const hasNumbers = /\d/.test(formData.password)

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre',
      })
      return
    }

    if (formData.password !== formData.confirmPassword) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas',
      })
      return
    }

    createMutation.mutate(formData)
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
          <UserPlus className="h-8 w-8 text-brand-blue" />
          Créer un nouvel utilisateur
        </h1>
        <p className="text-muted-foreground">
          Ajoutez un nouvel utilisateur à votre organisation
        </p>
      </div>

      {/* Formulaire */}
      <Card>
        <CardHeader>
          <CardTitle>Informations de l'utilisateur</CardTitle>
          <CardDescription>
            Remplissez les informations pour créer un nouvel utilisateur
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

            {/* Mot de passe */}
            <div>
              <Label htmlFor="password">
                Mot de passe <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Minimum 8 caractères"
                required
                minLength={8}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Le mot de passe doit contenir au moins 8 caractères, avec une majuscule, une minuscule et un chiffre. L'utilisateur recevra un email de confirmation avec un lien pour se connecter.
              </p>
            </div>

            {/* Confirmation mot de passe */}
            <div>
              <Label htmlFor="confirmPassword">
                Confirmer le mot de passe <span className="text-red-500">*</span>
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Répétez le mot de passe"
                required
                className="mt-2"
              />
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
                Activer l'utilisateur immédiatement
              </Label>
            </div>

            {/* Information sur l'email de confirmation */}
            {formData.role !== 'student' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Email de confirmation automatique
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      L'utilisateur recevra automatiquement un email de confirmation avec un lien pour accéder à la page d'authentification. Il pourra se connecter avec le mot de passe assigné ou utiliser "Mot de passe oublié" pour le changer.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/settings/users')}
                disabled={createMutation.isPending}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Créer l'utilisateur
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




