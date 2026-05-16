'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { Building2, User, Mail, Lock, ArrowRight, CheckCircle2, Phone, Shield, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

function FloatingBlob({ className, delay = 0, duration = 25 }: { className?: string; delay?: number; duration?: number }) {
  return (
    <motion.div
      className={cn('absolute pointer-events-none blur-3xl opacity-30', className)}
      animate={{ scale: [1, 1.15, 0.9, 1], x: [0, 30, -20, 0], y: [0, -40, 25, 0] }}
      transition={{ duration, repeat: Infinity, ease: 'linear', delay }}
    />
  )
}

const BENEFITS = [
  'Conventions générées en 45 secondes',
  'Émargements numériques inclus',
  '32 indicateurs Qualiopi automatisés',
  'CPF/EDOF synchronisé sans double saisie',
  'Essai gratuit 14 jours · Sans carte bancaire',
]

const STATS = [
  { value: '17', label: 'Documents' },
  { value: '32', label: 'Indicateurs Qualiopi' },
  { value: '6h+', label: 'Récupérées/semaine' },
]

export default function RegisterPage() {
  const { register, isRegistering, registerError } = useAuth()
  const [formData, setFormData] = useState({
    organizationName: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    try {
      await register({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        organizationName: formData.organizationName,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    }
  }

  return (
    <div className="min-h-screen flex overflow-hidden bg-gradient-to-br from-blue-50 via-white to-cyan-50 relative">
      {/* Background blobs */}
      <FloatingBlob className="top-[-10%] left-[-5%] w-96 h-96 rounded-full bg-gradient-to-br from-brand-blue to-brand-blue-light" duration={30} />
      <FloatingBlob className="bottom-[-10%] right-[-5%] w-80 h-80 rounded-full bg-gradient-to-tr from-brand-cyan to-brand-cyan-light" delay={4} duration={35} />
      <FloatingBlob className="top-[40%] left-[40%] w-64 h-64 rounded-full bg-gradient-to-t from-blue-300 to-cyan-200" delay={8} duration={28} />

      {/* ── LEFT COLUMN — value proposition ── */}
      <div className="hidden lg:flex lg:w-[48%] relative z-10 flex-col justify-between p-12 bg-gradient-to-br from-brand-blue via-brand-blue-dark to-primary-darker overflow-hidden">
        {/* Inner decorative blur */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl" />

        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <span className="font-display font-bold text-2xl text-white tracking-tight">
            Edu<span className="text-brand-cyan">Zen</span>
          </span>
          <p className="text-brand-blue-pale text-sm mt-1 font-medium">Logiciel de gestion pour OF français</p>
        </motion.div>

        {/* Hero text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-8"
        >
          <div>
            <h1 className="font-display font-bold text-4xl text-white leading-tight mb-4">
              Gérez votre OF<br />en 2h par semaine<br />
              <span className="text-brand-cyan">au lieu de 8h.</span>
            </h1>
            <p className="text-blue-200 text-base leading-relaxed">
              Conventions, émargements, Qualiopi, CPF —<br />tout automatisé en un seul outil.
            </p>
          </div>

          {/* Founder call badge */}
          <div className="flex items-start gap-3 bg-white/10 border border-white/20 rounded-2xl px-5 py-4 backdrop-blur-sm">
            <Phone className="h-5 w-5 text-brand-cyan mt-0.5 flex-shrink-0" />
            <p className="text-white text-sm leading-relaxed font-medium">
              Le fondateur vous appelle personnellement dans les <span className="text-brand-cyan font-bold">48h</span> pour configurer votre espace.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            {BENEFITS.map((benefit, i) => (
              <motion.div
                key={benefit}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.06 }}
                className="flex items-center gap-3"
              >
                <CheckCircle2 className="h-4 w-4 text-brand-cyan flex-shrink-0" />
                <span className="text-blue-100 text-sm">{benefit}</span>
              </motion.div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="border-l-4 border-brand-cyan pl-5 bg-white/5 rounded-r-xl py-4 pr-4">
            <p className="text-white text-sm italic leading-relaxed mb-3">
              &ldquo;Je suis passée de 7h à moins de 2h d&apos;administratif par semaine. J&apos;ai retrouvé mes soirées.&rdquo;
            </p>
            <p className="text-blue-300 text-xs font-medium">— Marie D., Directrice OF, Île-de-France</p>
            <div className="flex gap-0.5 mt-1">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-3 w-3 fill-brand-cyan text-brand-cyan" />)}
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex gap-3"
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="flex-1 bg-white/10 border border-white/15 rounded-xl py-4 px-3 text-center backdrop-blur-sm">
              <div className="font-display font-bold text-3xl text-brand-cyan">{stat.value}</div>
              <div className="text-blue-300 text-xs mt-1 font-medium leading-tight">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── RIGHT COLUMN — form ── */}
      <div className="w-full lg:w-[52%] flex flex-col items-center justify-center px-6 py-12 relative z-10">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center">
          <span className="font-display font-bold text-2xl text-gray-900 tracking-tight">
            Edu<span className="text-brand-blue">Zen</span>
          </span>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Phone className="h-4 w-4 text-brand-cyan" />
            <span className="text-sm font-medium text-brand-cyan">Appel fondateur sous 48h</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <GlassCard variant="premium" className="p-8 border-2 border-white/60 shadow-2xl backdrop-blur-2xl bg-white/60">
            {/* Form header */}
            <div className="mb-7">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                className="w-12 h-12 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-brand-blue/20"
              >
                <Building2 className="h-6 w-6 text-white" />
              </motion.div>
              <h2 className="font-display font-bold text-2xl text-gray-900 tracking-tight mb-1">
                Créez votre espace gratuit
              </h2>
              <p className="text-gray-500 text-sm font-medium">14 jours gratuits · Sans carte bancaire</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <Label htmlFor="organizationName" className="text-gray-700 font-semibold text-xs uppercase tracking-wider ml-1">
                  Nom de l&apos;établissement *
                </Label>
                <div className="relative mt-1.5 group">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-blue transition-colors" />
                  <Input
                    id="organizationName"
                    type="text"
                    value={formData.organizationName}
                    onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                    required
                    className="pl-10 h-11 bg-white/60 border-gray-200 focus:bg-white focus:border-brand-blue/30 focus:ring-4 focus:ring-brand-blue/10 transition-all rounded-xl shadow-sm"
                    placeholder="Mon Organisme de Formation"
                  />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
                <Label htmlFor="fullName" className="text-gray-700 font-semibold text-xs uppercase tracking-wider ml-1">
                  Votre nom complet *
                </Label>
                <div className="relative mt-1.5 group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-blue transition-colors" />
                  <Input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    className="pl-10 h-11 bg-white/60 border-gray-200 focus:bg-white focus:border-brand-blue/30 focus:ring-4 focus:ring-brand-blue/10 transition-all rounded-xl shadow-sm"
                    placeholder="Jean Dupont"
                  />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <Label htmlFor="email" className="text-gray-700 font-semibold text-xs uppercase tracking-wider ml-1">
                  Email *
                </Label>
                <div className="relative mt-1.5 group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-blue transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="pl-10 h-11 bg-white/60 border-gray-200 focus:bg-white focus:border-brand-blue/30 focus:ring-4 focus:ring-brand-blue/10 transition-all rounded-xl shadow-sm"
                    placeholder="votre@email.com"
                    autoComplete="email"
                  />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
                <Label htmlFor="password" className="text-gray-700 font-semibold text-xs uppercase tracking-wider ml-1">
                  Mot de passe *
                </Label>
                <div className="relative mt-1.5 group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-blue transition-colors" />
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={8}
                    className="pl-10 h-11 bg-white/60 border-gray-200 focus:bg-white focus:border-brand-blue/30 focus:ring-4 focus:ring-brand-blue/10 transition-all rounded-xl shadow-sm"
                    placeholder="Au moins 8 caractères"
                    autoComplete="new-password"
                  />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                <Label htmlFor="confirmPassword" className="text-gray-700 font-semibold text-xs uppercase tracking-wider ml-1">
                  Confirmer le mot de passe *
                </Label>
                <div className="relative mt-1.5 group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-blue transition-colors" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    className="pl-10 h-11 bg-white/60 border-gray-200 focus:bg-white focus:border-brand-blue/30 focus:ring-4 focus:ring-brand-blue/10 transition-all rounded-xl shadow-sm"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </motion.div>

              <AnimatePresence>
                {(error || registerError) && (() => {
                  const msg = error || (registerError instanceof Error ? registerError.message : 'Une erreur est survenue')
                  const isInfo = msg.includes('email de confirmation') || msg.includes('boîte de réception')
                  return (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={cn(
                        'flex items-start gap-2 px-4 py-3 rounded-xl text-sm border',
                        isInfo
                          ? 'bg-brand-blue/5 border-brand-blue/20 text-brand-blue'
                          : 'bg-red-50/80 border-red-100 text-red-600'
                      )}
                    >
                      <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p className="font-medium">{msg}</p>
                    </motion.div>
                  )
                })()}
              </AnimatePresence>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <Button
                  type="submit"
                  variant="gradient"
                  className="w-full h-12 shadow-lg shadow-brand-blue/25 hover:shadow-xl hover:shadow-brand-blue/30 transition-all duration-300 rounded-xl font-bold text-base transform hover:-translate-y-0.5"
                  disabled={isRegistering}
                  isLoading={isRegistering}
                >
                  {!isRegistering && (
                    <span className="flex items-center gap-2">
                      Démarrer mon essai gratuit
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </motion.div>

              <p className="text-center text-xs text-gray-400 font-medium">
                🔒 Sécurisé · Aucune CB requise · Annulation libre
              </p>
            </form>

            {/* Login link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-6 text-center"
            >
              <p className="text-gray-500 text-sm font-medium">
                Déjà un compte ?{' '}
                <Link href="/auth/login" className="text-brand-blue font-bold hover:text-brand-blue-dark hover:underline transition-colors">
                  Se connecter
                </Link>
              </p>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-5 flex flex-wrap gap-2 justify-center"
            >
              {['📞 Appel fondateur 48h', '🛡️ 14j gratuits', '✓ Sans engagement'].map((badge) => (
                <span
                  key={badge}
                  className="bg-gray-50 border border-gray-200 text-gray-500 text-xs font-medium px-3 py-1.5 rounded-full"
                >
                  {badge}
                </span>
              ))}
            </motion.div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  )
}
