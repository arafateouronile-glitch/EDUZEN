'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { twoFactorAuthService } from '@/lib/services/2fa.service.client'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, Key, Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'

// Composant pour les formes 3D flottantes
function FloatingShape({ 
  className, 
  delay = 0, 
  duration = 20,
  initialX = 0,
  initialY = 0
}: { 
  className?: string
  delay?: number 
  duration?: number
  initialX?: number
  initialY?: number
}) {
  return (
    <motion.div
      className={cn("absolute pointer-events-none opacity-40 blur-xl", className)}
      initial={{ x: initialX, y: initialY }}
      animate={{ 
        x: [initialX, initialX + 50, initialX - 30, initialX],
        y: [initialY, initialY - 60, initialY + 40, initialY],
        rotate: [0, 180, 360],
        scale: [1, 1.1, 0.9, 1]
      }}
      transition={{ 
        duration, 
        repeat: Infinity, 
        ease: "linear",
        delay 
      }}
    />
  )
}

// Scène 3D simplifiée avec CSS
function Background3D() {
  return (
    <div className="absolute inset-0 overflow-hidden perspective-1000">
      {/* Grille de fond en perspective */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          transform: 'rotateX(60deg) scale(2)',
          transformOrigin: 'center 0',
        }}
      />

      {/* Formes flottantes "3D" */}
      {/* Sphère Bleue */}
      <FloatingShape 
        className="top-[10%] left-[10%] w-64 h-64 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 mix-blend-multiply filter blur-3xl opacity-30" 
        duration={25} 
        initialX={-50} 
        initialY={-50} 
      />
      
      {/* Cube Violet (Simulé) */}
      <FloatingShape 
        className="top-[40%] right-[10%] w-72 h-72 rounded-3xl bg-gradient-to-tr from-purple-400 to-pink-600 mix-blend-multiply filter blur-3xl opacity-30" 
        delay={2} 
        duration={30} 
        initialX={50} 
        initialY={0} 
      />
      
      {/* Forme Cyan */}
      <FloatingShape 
        className="bottom-[10%] left-[30%] w-96 h-96 rounded-full bg-gradient-to-t from-cyan-300 to-teal-500 mix-blend-multiply filter blur-3xl opacity-30" 
        delay={5} 
        duration={35} 
        initialX={0} 
        initialY={50} 
      />

      {/* Éléments géométriques nets pour effet de profondeur */}
      <motion.div 
        className="absolute top-[20%] right-[20%] w-20 h-20 border-4 border-blue-200/20 rounded-2xl rotate-45"
        animate={{ 
          rotate: [45, 225],
          y: [0, -20, 0]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      <motion.div 
        className="absolute bottom-[20%] left-[15%] w-16 h-16 border-4 border-purple-200/20 rounded-full"
        animate={{ 
          scale: [1, 1.2, 1],
          x: [0, 20, 0]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoggingIn, loginError } = useAuth()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'login' | '2fa'>('login')
  const [userId, setUserId] = useState<string | null>(null)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [isVerifying2FA, setIsVerifying2FA] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      // Connexion initiale
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (!authData.user) {
        setError('Erreur de connexion')
        return
      }

      // Vérifier si l'utilisateur a la 2FA activée
      const config = await twoFactorAuthService.getConfig(authData.user.id)

      if (config?.is_enabled) {
        // Nécessite une vérification 2FA
        setUserId(authData.user.id)
        setStep('2fa')
        // Déconnecter temporairement jusqu'à la vérification 2FA
        await supabase.auth.signOut()
      } else {
        // Pas de 2FA, connexion normale
        login({ email, password })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    }
  }

  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsVerifying2FA(true)

    try {
      if (!userId || !twoFactorCode) {
        setError('Code requis')
        return
      }

      // Vérifier le code 2FA via la nouvelle API sécurisée
      // Cette API définit le cookie 2fa_session de manière httpOnly côté serveur
      const response = await fetch('/api/2fa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important pour recevoir le cookie
        body: JSON.stringify({
          userId,
          code: twoFactorCode,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || 'Code invalide')
        return
      }

      // Reconnexion après vérification 2FA réussie
      // Le cookie 2fa_session est déjà défini par l'API de manière sécurisée (httpOnly)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError('Erreur de connexion après vérification 2FA')
        return
      }

      // Attendre un peu pour que la session soit mise à jour
      await new Promise(resolve => setTimeout(resolve, 300))

      // Rediriger vers le dashboard (le dashboard détectera automatiquement le rôle)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setIsVerifying2FA(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-50/50">
      {/* 3D Background */}
      <Background3D />

      <div className="w-full max-w-md px-4 relative z-10">
        <AnimatePresence mode="wait">
          {step === 'login' ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            >
              <GlassCard variant="premium" className="p-8 border-2 border-white/60 shadow-2xl backdrop-blur-2xl bg-white/40">
                <div className="text-center mb-8">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                    className="w-16 h-16 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-blue/20 rotate-3 transform perspective-500 hover:rotate-6 transition-transform duration-500"
                  >
                    <Shield className="h-8 w-8 text-white drop-shadow-md" />
                  </motion.div>
                  <motion.h1 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl font-display font-bold text-gray-900 tracking-tight mb-2"
                  >
                    Bon retour
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-gray-600 font-medium"
                  >
                    Connectez-vous à votre espace EduZen
                  </motion.p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="email" className="text-gray-700 font-bold ml-1 text-xs uppercase tracking-wider">Email</Label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-brand-blue transition-colors" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10 h-12 bg-white/60 border-gray-200 focus:bg-white focus:border-brand-blue/30 focus:ring-4 focus:ring-brand-blue/10 transition-all rounded-xl shadow-sm"
                        placeholder="votre@email.com"
                        autoComplete="email"
                      />
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <Label htmlFor="password" className="text-gray-700 font-bold ml-1 text-xs uppercase tracking-wider">Mot de passe</Label>
                      <Link 
                        href="/auth/forgot-password" 
                        className="text-xs font-semibold text-brand-blue hover:text-brand-blue-dark hover:underline transition-colors"
                      >
                        Mot de passe oublié ?
                      </Link>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-brand-blue transition-colors" />
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-10 h-12 bg-white/60 border-gray-200 focus:bg-white focus:border-brand-blue/30 focus:ring-4 focus:ring-brand-blue/10 transition-all rounded-xl shadow-sm"
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
                    </div>
                  </motion.div>

                  <AnimatePresence>
                    {(error || loginError) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-red-50/50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-start gap-2 shadow-sm"
                      >
                        <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <p className="font-medium">{error || (loginError instanceof Error ? loginError.message : 'Une erreur est survenue')}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-brand-blue to-brand-cyan hover:from-brand-blue-dark hover:to-brand-cyan-dark text-white shadow-lg shadow-brand-blue/25 hover:shadow-xl hover:shadow-brand-blue/30 transition-all duration-300 rounded-xl font-bold text-base transform hover:-translate-y-0.5"
                      disabled={isLoggingIn}
                    >
                      {isLoggingIn ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Connexion...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>Se connecter</span>
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      )}
                    </Button>
                  </motion.div>
                </form>

                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="mt-8 text-center"
                >
                  <p className="text-gray-500 text-sm font-medium">
                    Pas encore de compte ?{' '}
                    <Link href="/auth/register" className="text-brand-blue font-bold hover:text-brand-blue-dark hover:underline transition-colors">
                      Créer un compte
                    </Link>
                  </p>
                </motion.div>
              </GlassCard>
            </motion.div>
          ) : (
            <motion.div
              key="2fa"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            >
              <GlassCard variant="premium" className="p-8 border-2 border-white/60 shadow-2xl backdrop-blur-2xl bg-white/40">
                <div className="text-center mb-8">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/20 rotate-3"
                  >
                    <Shield className="h-8 w-8 text-white drop-shadow-md" />
                  </motion.div>
                  <h2 className="text-2xl font-display font-bold text-gray-900 tracking-tight mb-2">Vérification 2FA</h2>
                  <p className="text-gray-600 font-medium">
                    Entrez le code à 6 chiffres de votre application d'authentification
                  </p>
                </div>

                <form onSubmit={handle2FAVerify} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="2fa-code" className="sr-only">Code d'authentification</Label>
                    <div className="relative">
                      <Input
                        id="2fa-code"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="h-16 font-mono text-center text-3xl tracking-[0.5em] bg-white/60 border-gray-200 focus:bg-white focus:border-purple-500/30 focus:ring-4 focus:ring-purple-500/10 transition-all rounded-xl shadow-inner"
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-center text-gray-500 font-medium">
                      Vous pouvez également utiliser un code de récupération si vous avez perdu l'accès à votre application.
                    </p>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-red-50/50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Shield className="h-4 w-4" />
                        <p className="font-medium">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-3">
                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 rounded-xl font-bold text-base transform hover:-translate-y-0.5"
                      disabled={isVerifying2FA || twoFactorCode.length !== 6}
                    >
                      {isVerifying2FA ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Vérification...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5" />
                          <span>Vérifier</span>
                        </div>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full h-12 text-gray-500 hover:text-gray-900 hover:bg-white/50 rounded-xl font-medium border border-transparent hover:border-gray-200 transition-all"
                      onClick={() => {
                        setStep('login')
                        setTwoFactorCode('')
                        setUserId(null)
                        setError(null)
                      }}
                    >
                      Retour à la connexion
                    </Button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Footer simple */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center"
        >
          <p className="text-xs text-gray-400 font-medium">
            &copy; {new Date().getFullYear()} EduZen. Tous droits réservés.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
