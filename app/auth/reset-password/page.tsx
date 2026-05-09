'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const isSetupMode = searchParams.get('mode') === 'setup'

  useEffect(() => {
    // En mode PKCE, le code a déjà été échangé par /auth/callback avant d'arriver ici.
    // On vérifie juste que l'utilisateur est bien authentifié (session recovery active).
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionReady(true)
      } else {
        setError('Lien expiré ou invalide. Demandez un nouveau lien de réinitialisation.')
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      setSuccess(true)

      setTimeout(() => {
        router.push(isSetupMode ? '/dashboard/onboarding' : '/auth/login')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <GlassCard className="p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"
            >
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {isSetupMode ? 'Mot de passe créé !' : 'Mot de passe réinitialisé !'}
            </h1>
            <p className="text-gray-600 mb-6">
              {isSetupMode
                ? 'Votre mot de passe a été créé. Vous allez être redirigé vers votre espace...'
                : 'Votre mot de passe a été mis à jour. Vous allez être redirigé vers la connexion...'}
            </p>
            <Link href={isSetupMode ? '/dashboard/onboarding' : '/auth/login'}>
              <Button className="w-full">
                {isSetupMode ? 'Accéder à mon espace' : 'Aller à la connexion'}
              </Button>
            </Link>
          </GlassCard>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <GlassCard className="p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isSetupMode ? 'Créez votre mot de passe' : 'Nouveau mot de passe'}
            </h1>
            <p className="text-gray-600">
              {isSetupMode
                ? 'Choisissez un mot de passe pour accéder à EduZen à tout moment.'
                : 'Entrez votre nouveau mot de passe ci-dessous.'}
            </p>
          </div>

          {!sessionReady && !error && (
            <p className="text-center text-gray-400 text-sm py-4">Vérification du lien...</p>
          )}

          {(sessionReady || error) && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">
                  {isSetupMode ? 'Mot de passe' : 'Nouveau mot de passe'}
                </Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 caractères"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={!!error}
                    className={cn('pl-10 pr-10', error && 'border-red-500')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Répétez le mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={!!error}
                    className={cn('pl-10 pr-10', error && 'border-red-500')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {!error && (
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading
                    ? 'Enregistrement...'
                    : isSetupMode
                      ? 'Créer mon mot de passe'
                      : 'Réinitialiser le mot de passe'}
                </Button>
              )}
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900">
              Retour à la connexion
            </Link>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  )
}
