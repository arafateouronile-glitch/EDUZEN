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
  ChevronDown, ChevronUp, MapPin, Receipt, Users, BookOpen,
  PenLine, FileOutput, Globe, CreditCard, FileCheck,
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
    <button type="button" onClick={() => setOpen(!open)} className="w-full text-left">
      <div className="flex items-center justify-between gap-3 py-3">
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
            className="text-gray-500 text-sm leading-relaxed pb-3"
          >
            {answer}
          </motion.p>
        )}
      </AnimatePresence>
      <div className="border-b border-gray-100" />
    </button>
  )
}

const FEATURES = [
  { icon: FileOutput,  label: 'Génération de documents' },
  { icon: PenLine,     label: 'Émargements numériques' },
  { icon: Shield,      label: '33 indicateurs Qualiopi' },
  { icon: CreditCard,  label: 'CPF / EDOF synchronisé' },
  { icon: Receipt,     label: 'Facturation automatisée' },
  { icon: Users,       label: 'CRM intégré' },
  { icon: BookOpen,    label: 'E-learning inclus' },
  { icon: Globe,       label: 'Catalogue public' },
  { icon: FileCheck,   label: 'Conventions en 45s' },
  { icon: Zap,         label: 'Devis & contrats' },
]

const BENEFITS = [
  { icon: Zap,           text: 'Conventions générées en 45 secondes' },
  { icon: BadgeCheck,    text: 'Émargements numériques inclus' },
  { icon: Shield,        text: '33 indicateurs Qualiopi automatisés' },
  { icon: ArrowRight,    text: 'CPF/EDOF synchronisé sans double saisie' },
  { icon: Clock,         text: '14 jours gratuits · Sans carte bancaire' },
]

const TESTIMONIALS = [
  {
    quote: "J'avais peur que ce soit trop complexe à mettre en place. En réalité, le fondateur a tout configuré avec moi en 45 minutes. Le lendemain, je générais mes premières conventions.",
    author: 'Marie D.',
    role: 'Directrice OF, Île-de-France',
    result: "7h → 1h30 d'admin/semaine",
    objection: 'Mise en place',
  },
  {
    quote: "Mon auditeur Qualiopi est arrivé à l'improviste. Tous mes indicateurs étaient déjà traçés et exportables. Il a dit que c'était le dossier le mieux préparé qu'il ait vu depuis 2 ans.",
    author: 'Thomas R.',
    role: 'Responsable qualité, OF Lyon',
    result: 'Audit Qualiopi réussi du 1er coup',
    objection: 'Conformité Qualiopi',
  },
  {
    quote: "Je venais de Digiforma. J'avais des années de données et je ne voulais rien perdre. EduZen a tout importé en une matinée. Rien ne manquait, pas un stagiaire, pas une convention.",
    author: 'Sophie M.',
    role: 'Gérante, Centre de formation, Bordeaux',
    result: '100% des données migrées en 1 matinée',
    objection: 'Migration sans perte',
  },
  {
    quote: "En 4 mois, j'ai économisé l'équivalent de 2 jours de travail par semaine. EduZen se finance lui-même plusieurs fois par mois. C'est la meilleure décision de l'année.",
    author: 'Jean-Pierre L.',
    role: 'Formateur indépendant, Toulouse',
    result: '2 jours économisés/semaine',
    objection: 'Retour sur investissement',
  },
]

const STATS = [
  { value: '17',  label: 'Documents automatisés' },
  { value: '33',  label: 'Indicateurs Qualiopi' },
  { value: '6h+', label: 'Récupérées / semaine' },
]

const FAQS = [
  {
    question: 'Combien de temps pour être opérationnel ?',
    answer: 'Moins de 45 minutes. Le fondateur vous appelle personnellement pour configurer votre espace ensemble — vous n\'avez rien à faire seul.',
  },
  {
    question: 'Que se passe-t-il après les 14 jours ?',
    answer: 'Vous choisissez librement de continuer ou non. Aucun prélèvement automatique, aucune carte bancaire requise à l\'inscription. Annulation en 1 clic.',
  },
  {
    question: 'Mes données sont-elles sécurisées ?',
    answer: 'Vos données sont hébergées en France (OVH Cloud), chiffrées en transit et au repos, conformes RGPD. Vous restez propriétaire et pouvez tout exporter à tout moment.',
  },
  {
    question: 'Est-ce compatible avec mon logiciel actuel ?',
    answer: 'EduZen importe vos données existantes gratuitement (Excel, CSV, Digiforma, Dendreo, Formateurs…). Notre équipe gère la migration pour vous.',
  },
]

const TRUST_ROW = [
  { icon: MapPin,         label: 'Hébergé en France' },
  { icon: Shield,         label: 'Conforme RGPD' },
  { icon: HeartHandshake, label: 'Support 7j/7' },
  { icon: BadgeCheck,     label: 'Export libre' },
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

  const inputClass = "pl-10 h-11 bg-white/60 border-gray-200 focus:bg-white focus:border-brand-blue/30 focus:ring-4 focus:ring-brand-blue/10 transition-all rounded-xl shadow-sm text-sm"
  const labelClass = "text-gray-700 font-semibold text-xs uppercase tracking-wider ml-1"

  return (
    <div className="min-h-screen flex overflow-hidden bg-gradient-to-br from-blue-50 via-white to-cyan-50 relative">
      <FloatingBlob className="top-[-10%] left-[-5%] w-96 h-96 rounded-full bg-gradient-to-br from-brand-blue to-brand-blue-light" duration={30} />
      <FloatingBlob className="bottom-[-10%] right-[-5%] w-80 h-80 rounded-full bg-gradient-to-tr from-brand-cyan to-brand-cyan-light" delay={4} duration={35} />
      <FloatingBlob className="top-[40%] left-[35%] w-64 h-64 rounded-full bg-blue-200" delay={8} duration={28} />

      {/* ── LEFT COLUMN (desktop) ── */}
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-5 my-8">

          {/* Hero */}
          <div>
            <h1 className="font-display font-bold text-[1.85rem] leading-[1.2] text-gray-900 mb-3">
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
                <div className="font-display font-bold text-xl bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">{stat.value}</div>
                <div className="text-gray-400 text-[10px] mt-0.5 font-medium leading-tight">{stat.label}</div>
              </GlassCard>
            ))}
          </div>

          {/* Founder call */}
          <GlassCard variant="default" className="p-4 border-brand-blue/15">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-brand-blue/10 border border-brand-blue/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Phone className="h-4 w-4 text-brand-blue" />
              </div>
              <div>
                <p className="text-gray-800 text-sm font-semibold mb-0.5">
                  Le fondateur vous appelle dans les <span className="text-brand-blue">48h</span>
                </p>
                <p className="text-gray-500 text-xs">Configuration personnalisée incluse · Créneaux limités</p>
              </div>
            </div>
          </GlassCard>

          {/* Features grid */}
          <div>
            <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-widest mb-2.5">Tout ce qui est inclus</p>
            <div className="grid grid-cols-2 gap-2">
              {FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 bg-white/50 border border-gray-100 rounded-lg px-3 py-2">
                  <div className="w-6 h-6 bg-brand-blue/8 border border-brand-blue/15 rounded-md flex items-center justify-center flex-shrink-0">
                    <Icon className="h-3.5 w-3.5 text-brand-blue" />
                  </div>
                  <span className="text-gray-700 text-xs font-medium leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonials — detailed */}
          <div className="space-y-3">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.author} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.08 }}>
                <GlassCard variant="subtle" className="border-l-4 border-l-brand-cyan rounded-l-none p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-brand-blue/8 text-brand-blue text-[10px] font-bold px-2 py-0.5 rounded-full border border-brand-blue/15 uppercase tracking-wide">
                      {t.objection}
                    </span>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, j) => <Star key={j} className="h-2.5 w-2.5 fill-brand-cyan text-brand-cyan" />)}
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm italic leading-relaxed mb-2.5">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-xs font-semibold">{t.author}</p>
                      <p className="text-gray-400 text-xs">{t.role}</p>
                    </div>
                    <div className="bg-green-50 border border-green-100 rounded-lg px-2.5 py-1 text-right">
                      <p className="text-green-700 text-[10px] font-bold leading-tight">{t.result}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Trust row */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="flex flex-wrap gap-3">
          {TRUST_ROW.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
              <Icon className="h-3.5 w-3.5 text-brand-blue/60" />
              {label}
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── RIGHT COLUMN — form ── */}
      <div className="w-full lg:w-[52%] flex flex-col items-center justify-start lg:justify-center px-4 sm:px-6 py-8 lg:py-10 relative z-10 overflow-y-auto">

        {/* ── MOBILE HEADER ── */}
        <div className="lg:hidden w-full max-w-md mb-6">
          {/* Logo mobile */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-lg flex items-center justify-center shadow-md shadow-brand-blue/20">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span className="font-display font-bold text-lg text-gray-900 tracking-tight">
                Edu<span className="text-brand-blue">Zen</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-brand-cyan/10 border border-brand-cyan/25 rounded-full px-3 py-1">
              <Phone className="h-3 w-3 text-brand-cyan" />
              <span className="text-brand-cyan text-xs font-semibold">Appel sous 48h</span>
            </div>
          </div>

          {/* Hero mobile */}
          <h1 className="font-display font-bold text-2xl text-gray-900 leading-tight mb-2">
            Gérez votre OF en 2h/semaine<br />
            <span className="bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">au lieu de 8h.</span>
          </h1>

          {/* Stats mobile */}
          <div className="flex gap-2 mb-4">
            {STATS.map((stat) => (
              <GlassCard key={stat.label} variant="default" className="flex-1 py-2.5 px-1.5 text-center">
                <div className="font-display font-bold text-base bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">{stat.value}</div>
                <div className="text-gray-400 text-[9px] mt-0.5 font-medium leading-tight">{stat.label}</div>
              </GlassCard>
            ))}
          </div>

          {/* Features grid mobile */}
          <div className="mb-4">
            <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-widest mb-2">Tout ce qui est inclus</p>
            <div className="grid grid-cols-2 gap-1.5">
              {FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 bg-white/50 border border-gray-100 rounded-lg px-2.5 py-1.5">
                  <div className="w-5 h-5 bg-brand-blue/8 border border-brand-blue/15 rounded-md flex items-center justify-center flex-shrink-0">
                    <Icon className="h-3 w-3 text-brand-blue" />
                  </div>
                  <span className="text-gray-700 text-[11px] font-medium leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile testimonials — horizontal scroll */}
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
            {TESTIMONIALS.map((t) => (
              <div key={t.author} className="flex-shrink-0 w-72 snap-start">
                <GlassCard variant="subtle" className="border-l-4 border-l-brand-cyan rounded-l-none p-3.5 h-full">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="bg-brand-blue/8 text-brand-blue text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-brand-blue/15 uppercase tracking-wide">
                      {t.objection}
                    </span>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => <Star key={i} className="h-2 w-2 fill-brand-cyan text-brand-cyan" />)}
                    </div>
                  </div>
                  <p className="text-gray-700 text-xs italic leading-relaxed mb-2">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-[11px] font-semibold">{t.author}</p>
                      <p className="text-gray-400 text-[10px]">{t.role}</p>
                    </div>
                    <div className="bg-green-50 border border-green-100 rounded-md px-2 py-0.5">
                      <p className="text-green-700 text-[9px] font-bold leading-tight">{t.result}</p>
                    </div>
                  </div>
                </GlassCard>
              </div>
            ))}
          </div>
        </div>

        {/* Social proof counter */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="w-full max-w-md flex items-center justify-center gap-2 mb-3"
        >
          <div className="flex -space-x-2">
            {['bg-brand-blue', 'bg-brand-cyan', 'bg-blue-400', 'bg-indigo-400'].map((c, i) => (
              <div key={i} className={`w-6 h-6 rounded-full border-2 border-white ${c} flex items-center justify-center`}>
                <User className="h-3 w-3 text-white" />
              </div>
            ))}
          </div>
          <p className="text-gray-600 text-sm font-medium">
            <span className="text-brand-blue font-bold">+230 directeurs d&apos;OF</span> ont déjà créé leur espace
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md space-y-3"
        >
          <GlassCard variant="premium" className="p-6 sm:p-7 border-2 border-white/60 shadow-2xl backdrop-blur-2xl bg-white/60">
            {/* Form header */}
            <div className="mb-5">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                className="w-10 h-10 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-brand-blue/20"
              >
                <Building2 className="h-5 w-5 text-white" />
              </motion.div>
              <h2 className="font-display font-bold text-xl sm:text-2xl text-gray-900 tracking-tight mb-1">
                Créez votre espace gratuit
              </h2>
              <p className="text-gray-500 text-sm font-medium">14 jours gratuits · Sans carte bancaire · Annulation libre</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {[
                { id: 'organizationName', label: "Nom de l'établissement *", icon: Building2, placeholder: 'Mon Organisme de Formation', type: 'text', key: 'organizationName', autoComplete: undefined },
                { id: 'fullName',         label: 'Votre nom complet *',      icon: User,      placeholder: 'Jean Dupont',                type: 'text', key: 'fullName',         autoComplete: undefined },
                { id: 'email',            label: 'Email professionnel *',     icon: Mail,      placeholder: 'votre@email.com',            type: 'email',key: 'email',            autoComplete: 'email' },
              ].map(({ id, label, icon: Icon, placeholder, type, key, autoComplete }, i) => (
                <motion.div key={id} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
                  <Label htmlFor={id} className={labelClass}>{label}</Label>
                  <div className="relative mt-1.5 group">
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-blue transition-colors" />
                    <Input
                      id={id}
                      type={type}
                      value={formData[key as keyof typeof formData]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      required
                      className={inputClass}
                      placeholder={placeholder}
                      autoComplete={autoComplete}
                    />
                  </div>
                </motion.div>
              ))}

              {[
                { id: 'password',        label: 'Mot de passe *',            placeholder: 'Au moins 8 caractères', key: 'password',        autoComplete: 'new-password', minLength: 8 },
                { id: 'confirmPassword', label: 'Confirmer le mot de passe *',placeholder: '••••••••',              key: 'confirmPassword', autoComplete: 'new-password', minLength: undefined },
              ].map(({ id, label, placeholder, key, autoComplete, minLength }, i) => (
                <motion.div key={id} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.05 }}>
                  <Label htmlFor={id} className={labelClass}>{label}</Label>
                  <div className="relative mt-1.5 group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-blue transition-colors" />
                    <Input
                      id={id}
                      type="password"
                      value={formData[key as keyof typeof formData]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      required
                      minLength={minLength}
                      className={inputClass}
                      placeholder={placeholder}
                      autoComplete={autoComplete}
                    />
                  </div>
                </motion.div>
              ))}

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
                        isInfo ? 'bg-brand-blue/5 border-brand-blue/20 text-brand-blue' : 'bg-red-50/80 border-red-100 text-red-600'
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

            {/* Cancellation guarantee */}
            <div className="mt-4 flex items-center gap-3 bg-green-50/70 border border-green-100 rounded-xl px-4 py-3">
              <BadgeCheck className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="text-green-800 text-xs font-medium leading-snug">
                <span className="font-bold">Annulation gratuite en 1 clic</span> — aucun engagement, aucune carte bancaire requise.
              </p>
            </div>

            {/* Login link */}
            <div className="mt-4 text-center">
              <p className="text-gray-500 text-sm font-medium">
                Déjà un compte ?{' '}
                <Link href="/auth/login" className="text-brand-blue font-bold hover:text-brand-blue-dark hover:underline transition-colors">
                  Se connecter
                </Link>
              </p>
            </div>
          </GlassCard>

          {/* Security badges */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }} className="flex flex-wrap gap-2 justify-center">
            {['🔒 Sécurisé SSL', '🇫🇷 Hébergé France', 'Conforme RGPD', 'Aucun engagement'].map((label) => (
              <span key={label} className="bg-white/70 border border-gray-200 text-gray-500 text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm">
                {label}
              </span>
            ))}
          </motion.div>

          {/* FAQ */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <GlassCard variant="subtle" className="p-5">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Questions fréquentes</p>
              <div className="space-y-0.5">
                {FAQS.map((faq) => (
                  <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Trust row — mobile visible */}
          <div className="flex flex-wrap gap-3 justify-center pb-4 lg:hidden">
            {TRUST_ROW.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                <Icon className="h-3.5 w-3.5 text-brand-blue/60" />
                {label}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
