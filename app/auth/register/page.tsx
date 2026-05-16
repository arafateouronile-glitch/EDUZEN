'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion, AnimatePresence } from '@/components/ui/motion'
import {
  Building2, User, Mail, Lock, ArrowRight, CheckCircle2,
  Phone, Shield, Star, BadgeCheck, Clock, Zap, HeartHandshake,
  ServerCrash, ChevronDown, ChevronUp, MapPin,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function FloatingBlob({ className, delay = 0, duration = 25 }: { className?: string; delay?: number; duration?: number }) {
  return (
    <motion.div
      className={cn('absolute pointer-events-none blur-3xl opacity-20', className)}
      animate={{ scale: [1, 1.15, 0.9, 1], x: [0, 30, -20, 0], y: [0, -40, 25, 0] }}
      transition={{ duration, repeat: Infinity, ease: 'linear', delay }}
    />
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className="w-full text-left"
    >
      <div className="flex items-center justify-between gap-3 py-2.5">
        <span className="text-gray-700 text-sm font-semibold">{question}</span>
        {open
          ? <ChevronUp className="h-4 w-4 text-brand-blue flex-shrink-0" />
          : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
      </div>
      <AnimatePresence>
        {open && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-gray-500 text-sm leading-relaxed pb-2"
          >
            {answer}
          </motion.p>
        )}
      </AnimatePresence>
      <div className="border-b border-gray-100" />
    </button>
  )
}

const BENEFITS = [
  { icon: Zap,           text: 'Conventions générées en 45 secondes' },
  { icon: BadgeCheck,    text: 'Émargements numériques inclus' },
  { icon: Shield,        text: '32 indicateurs Qualiopi automatisés' },
  { icon: ArrowRight,    text: 'CPF/EDOF synchronisé sans double saisie' },
  { icon: Clock,         text: 'Essai gratuit 14 jours · Sans carte bancaire' },
]

const TESTIMONIALS = [
  {
    quote: "Je suis passée de 7h à moins de 2h d'administratif par semaine. J'ai retrouvé mes soirées.",
    author: 'Marie D.',
    role: 'Directrice OF, Île-de-France',
  },
  {
    quote: "L'audit Qualiopi s'est passé sans stress. Tous les indicateurs étaient déjà traçés automatiquement.",
    author: 'Thomas R.',
    role: 'Responsable qualité, OF Lyon',
  },
]

const STATS = [
  { value: '17',  label: 'Documents automatisés' },
  { value: '32',  label: 'Indicateurs Qualiopi' },
  { value: '6h+', label: 'Récupérées / semaine' },
]

const FAQS = [
  {
    question: 'Combien de temps pour être opérationnel ?',
    answer: 'Moins de 30 minutes. Le fondateur vous appelle personnellement pour configurer votre espace ensemble — vous n\'avez rien à faire seul.',
  },
  {
    question: 'Que se passe-t-il après les 14 jours ?',
    answer: 'Vous choisissez librement de continuer ou non. Aucun prélèvement automatique, aucune carte bancaire requise à l\'inscription. Annulation en 1 clic.',
  },
  {
    question: 'Mes données sont-elles sécurisées ?',
    answer: 'Vos données sont hébergées en France (OVH Cloud), chiffrées, conformes RGPD. Vous restez propriétaire de vos données et pouvez les exporter à tout moment.',
  },
  {
    question: 'Est-ce compatible avec mon logiciel actuel ?',
    answer: 'EduZen importe vos données existantes gratuitement (Excel, CSV, Digiforma, Dendreo…). Notre équipe gère la migration pour vous.',
  },
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
      <FloatingBlob className="top-[-10%] left-[-5%] w-96 h-96 rounded-full bg-gradient-to-br from-brand-blue to-brand-blue-light" duration={30} />
      <FloatingBlob className="bottom-[-10%] right-[-5%] w-80 h-80 rounded-full bg-gradient-to-tr from-brand-cyan to-brand-cyan-light" delay={4} duration={35} />
      <FloatingBlob className="top-[40%] left-[35%] w-64 h-64 rounded-full bg-blue-200" delay={8} duration={28} />

      {/* ── LEFT COLUMN ── */}
      <div className="hidden lg:flex lg:w-[48%] relative z-10 flex-col justify-between p-12 overflow-y-auto">

        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-lg flex items-center justify-center shadow-md shadow-brand-blue/20">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-gray-900 tracking-tight">
              Edu<span className="text-brand-blue">Zen</span>
            </span>
          </div>
          <p className="text-gray-400 text-xs font-medium ml-9">Logiciel de gestion pour OF français</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-5 my-8"
        >
          {/* Hero */}
          <div>
            <h1 className="font-display font-bold text-[1.9rem] leading-[1.2] text-gray-900 mb-3">
              Gérez votre OF<br />en 2h par semaine<br />
              <span className="bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">au lieu de 8h.</span>
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Conventions, émargements, Qualiopi, CPF —<br />tout automatisé en un seul outil.
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-2.5">
            {STATS.map((stat) => (
              <GlassCard key={stat.label} variant="default" className="flex-1 py-3.5 px-2 text-center">
                <div className="font-display font-bold text-xl bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-gray-400 text-[10px] mt-0.5 font-medium leading-tight">{stat.label}</div>
              </GlassCard>
            ))}
          </div>

          {/* Founder call — urgency */}
          <GlassCard variant="default" className="p-4 border-brand-blue/15">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-brand-blue/10 border border-brand-blue/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Phone className="h-4 w-4 text-brand-blue" />
              </div>
              <div>
                <p className="text-gray-800 text-sm font-semibold mb-0.5">
                  Le fondateur vous appelle dans les <span className="text-brand-blue">48h</span>
                </p>
                <p className="text-gray-500 text-xs leading-relaxed">
                  Configuration personnalisée incluse · Créneaux limités cette semaine
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Benefits */}
          <div className="space-y-2">
            {BENEFITS.map(({ icon: Icon, text }, i) => (
              <motion.div
                key={text}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.06 }}
                className="flex items-center gap-3"
              >
                <div className="w-5 h-5 bg-brand-cyan/10 border border-brand-cyan/25 rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon className="h-3 w-3 text-brand-cyan" />
                </div>
                <span className="text-gray-600 text-sm">{text}</span>
              </motion.div>
            ))}
          </div>

          {/* Testimonials */}
          <div className="space-y-3">
            {TESTIMONIALS.map((t) => (
              <GlassCard key={t.author} variant="subtle" className="border-l-4 border-l-brand-cyan rounded-l-none p-4">
                <p className="text-gray-700 text-sm italic leading-relaxed mb-2">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-xs font-semibold">{t.author}</p>
                    <p className="text-gray-400 text-xs">{t.role}</p>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => <Star key={i} className="h-3 w-3 fill-brand-cyan text-brand-cyan" />)}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </motion.div>

        {/* Trust row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap gap-3"
        >
          {[
            { icon: MapPin,        label: 'Hébergé en France' },
            { icon: Shield,        label: 'Conforme RGPD' },
            { icon: HeartHandshake,label: 'Support humain 7j/7' },
            { icon: ServerCrash,   label: 'Export données garanti' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
              <Icon className="h-3.5 w-3.5 text-brand-blue/60" />
              {label}
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── RIGHT COLUMN — form ── */}
      <div className="w-full lg:w-[52%] flex flex-col items-center justify-center px-6 py-10 relative z-10">

        {/* Mobile logo */}
        <div className="lg:hidden mb-6 text-center">
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
          className="w-full max-w-md space-y-4"
        >
          {/* Social proof counter */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex items-center justify-center gap-2"
          >
            <div className="flex -space-x-2">
              {['bg-brand-blue', 'bg-brand-cyan', 'bg-blue-400', 'bg-indigo-400'].map((c, i) => (
                <div key={i} className={`w-7 h-7 rounded-full border-2 border-white ${c} flex items-center justify-center`}>
                  <User className="h-3.5 w-3.5 text-white" />
                </div>
              ))}
            </div>
            <p className="text-gray-600 text-sm font-medium">
              <span className="text-brand-blue font-bold">+230 directeurs d'OF</span> ont déjà créé leur espace
            </p>
          </motion.div>

          <GlassCard variant="premium" className="p-7 border-2 border-white/60 shadow-2xl backdrop-blur-2xl bg-white/60">
            {/* Form header */}
            <div className="mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                className="w-11 h-11 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-brand-blue/20"
              >
                <Building2 className="h-5 w-5 text-white" />
              </motion.div>
              <h2 className="font-display font-bold text-2xl text-gray-900 tracking-tight mb-1">
                Créez votre espace gratuit
              </h2>
              <p className="text-gray-500 text-sm font-medium">14 jours gratuits · Sans carte bancaire · Annulation libre</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
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
                  Email professionnel *
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

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="pt-1">
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
            </form>

            {/* Guarantee */}
            <div className="mt-4 flex items-center gap-3 bg-green-50/70 border border-green-100 rounded-xl px-4 py-3">
              <BadgeCheck className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="text-green-800 text-xs font-medium leading-snug">
                <span className="font-bold">Garantie satisfait 30 jours</span> — si EduZen ne vous fait pas gagner du temps, on vous rembourse intégralement.
              </p>
            </div>

            {/* Login link */}
            <div className="mt-5 text-center">
              <p className="text-gray-500 text-sm font-medium">
                Déjà un compte ?{' '}
                <Link href="/auth/login" className="text-brand-blue font-bold hover:text-brand-blue-dark hover:underline transition-colors">
                  Se connecter
                </Link>
              </p>
            </div>
          </GlassCard>

          {/* Security micro-badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
            className="flex flex-wrap gap-2 justify-center"
          >
            {[
              { icon: Shield,      label: '🔒 Sécurisé SSL' },
              { icon: MapPin,      label: '🇫🇷 Hébergé France' },
              { icon: BadgeCheck,  label: 'Conforme RGPD' },
              { icon: Clock,       label: 'Aucun engagement' },
            ].map(({ label }) => (
              <span key={label} className="bg-white/70 border border-gray-200 text-gray-500 text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm">
                {label}
              </span>
            ))}
          </motion.div>

          {/* FAQ objections */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <GlassCard variant="subtle" className="p-5">
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Questions fréquentes</p>
              <div className="space-y-0.5">
                {FAQS.map((faq) => (
                  <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
