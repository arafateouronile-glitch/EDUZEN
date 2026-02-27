'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { User, Mail, Lock, Save, RefreshCw } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function splitFullName(fullName?: string | null): { firstName: string; lastName: string } {
  const value = (fullName || '').trim()
  if (!value) return { firstName: '', lastName: '' }
  const parts = value.split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  }
}

export default function ProfileSettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const { user, isLoading: authLoading } = useAuth()

  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
  })

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (!authLoading && user?.role === 'teacher') {
      router.push('/dashboard')
      addToast({
        type: 'error',
        title: 'Acces refuse',
        description: 'Les parametres de profil ne sont pas accessibles aux enseignants.',
      })
    }
  }, [authLoading, user?.role, router, addToast])

  useEffect(() => {
    if (!user) return
    const { firstName, lastName } = splitFullName(user.full_name)
    setProfileForm({
      firstName,
      lastName,
      email: user.email || '',
    })
  }, [user])

  const computedFullName = useMemo(() => {
    return `${profileForm.firstName.trim()} ${profileForm.lastName.trim()}`.trim()
  }, [profileForm.firstName, profileForm.lastName])

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Utilisateur non authentifie')

      const email = profileForm.email.trim().toLowerCase()
      const fullName = computedFullName

      if (!email || !fullName) {
        throw new Error('Nom, prenom et email sont obligatoires')
      }

      const fullNameChanged = fullName !== (user.full_name || '')
      const emailChanged = email !== (user.email || '').toLowerCase()

      if (fullNameChanged || emailChanged) {
        const payload: { full_name?: string; email?: string } = {}
        if (fullNameChanged) payload.full_name = fullName
        if (emailChanged) payload.email = email

        const { error: dbError } = await supabase
          .from('users')
          .update(payload)
          .eq('id', user.id)

        if (dbError) throw dbError
      }

      if (emailChanged) {
        const { error: authError } = await supabase.auth.updateUser({ email })
        if (authError) throw authError
      }

      return { emailChanged }
    },
    onSuccess: ({ emailChanged }) => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['user', user.id] })
      }
      queryClient.invalidateQueries({ queryKey: ['session'] })

      addToast({
        type: 'success',
        title: 'Profil mis a jour',
        description: emailChanged
          ? 'Vos informations ont ete enregistrees. Verifiez votre boite mail pour confirmer le nouvel email.'
          : 'Vos informations ont ete enregistrees avec succes.',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Impossible de mettre a jour le profil.',
      })
    },
  })

  const updatePasswordMutation = useMutation({
    mutationFn: async () => {
      const password = passwordForm.newPassword
      const confirm = passwordForm.confirmPassword

      if (password.length < 8) {
        throw new Error('Le mot de passe doit contenir au moins 8 caracteres.')
      }
      if (password !== confirm) {
        throw new Error('Les mots de passe ne correspondent pas.')
      }

      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
    },
    onSuccess: () => {
      setPasswordForm({ newPassword: '', confirmPassword: '' })
      addToast({
        type: 'success',
        title: 'Mot de passe mis a jour',
        description: 'Votre mot de passe a ete modifie avec succes.',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Impossible de modifier le mot de passe.',
      })
    },
  })

  if (authLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-blue" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mon profil</h1>
        <p className="text-gray-600 mt-1">Mettez a jour vos informations personnelles et votre mot de passe.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-brand-blue" />
            Informations personnelles
          </CardTitle>
          <CardDescription>Nom, prenom et adresse email de votre compte administrateur.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              updateProfileMutation.mutate()
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nom</Label>
                <Input
                  id="first_name"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Votre nom"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Prenom</Label>
                <Input
                  id="last_name"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Votre prenom"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Adresse email
              </Label>
              <Input
                id="email"
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="vous@exemple.com"
                required
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-brand-blue" />
            Securite du compte
          </CardTitle>
          <CardDescription>Modifiez votre mot de passe pour securiser votre compte.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              updatePasswordMutation.mutate()
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="new_password">Nouveau mot de passe</Label>
              <Input
                id="new_password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Minimum 8 caracteres"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirmer le mot de passe</Label>
              <Input
                id="confirm_password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Retapez le mot de passe"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updatePasswordMutation.isPending}>
                {updatePasswordMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Mise a jour...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Changer le mot de passe
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
