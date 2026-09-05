'use client'

import { useState } from 'react'
import { motion } from '@/components/ui/motion'
import { GlassCard } from '@/components/ui/glass-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { identifyTikTok, trackTikTok, tiktokEventId } from '@/lib/utils/tiktok-pixel'
import Link from 'next/link'
import {
  Building2, Star, Shield, BadgeCheck, HeartHandshake,
  MapPin, CalendarCheck2, CheckCircle2, ArrowRight, Clock,
  Video, User, Zap, LogIn,
} from 'lucide-react'

function FloatingBlob({ className, delay = 0, duration = 25 }: { className?: string; delay?: number; duration?: number }) {
  return (
    <motion.div
      className={cn('absolute pointer-events-none blur-3xl opacity-20', className)}
      animate={{ scale: [1, 1.15, 0.9, 1], x: [0, 30, -20, 0], y: [0, -40, 25, 0] }}
      transition={{ duration, repeat: Infinity, ease: 'linear', delay }}
    />
  )
}

const DEMO_AGENDA = [
  "Tour complet de l'interface en 5 min",
  'Génération d\'une convention en direct (45s)',
  'Émargement numérique par QR code',
  '33 indicateurs Qualiopi automatisés',
  'Synchronisation CPF / EDOF sans double saisie',
  'Questions & réponses personnalisées',
]

const STATS = [
  { value: '17',  label: 'Documents automatisés' },
  { value: '33',  label: 'Indicateurs Qualiopi' },
  { value: '6h+', label: 'Récupérées / semaine' },
]

const TESTIMONIALS = [
  {
    quote: "En 30 minutes de démo, j'avais compris que ça allait changer ma façon de travailler. Le lendemain, je générais mes premières conventions.",
    author: 'Marie D.',
    role: 'Directrice OF, Île-de-France',
    result: "7h → 1h30 d'admin/semaine",
  },
  {
    quote: "Mon auditeur Qualiopi est arrivé à l'improviste. Tous mes indicateurs étaient déjà traçés. Il a dit que c'était le dossier le mieux préparé qu'il ait vu depuis 2 ans.",
    author: 'Thomas R.',
    role: 'Responsable qualité, OF Lyon',
    result: 'Audit Qualiopi réussi du 1er coup',
  },
]

const TRUST_ROW = [
  { icon: MapPin,         label: 'Hébergé en France' },
  { icon: Shield,         label: 'Conforme RGPD' },
  { icon: HeartHandshake, label: 'Support 7j/7' },
  { icon: BadgeCheck,     label: 'Export libre' },
]

interface DemoContentProps {
  /**
   * Saute le formulaire de capture (prénom/nom/email/organisme) et affiche
   * directement le CTA de prise de rendez-vous Calendly — lien séparé pour
   * tester un funnel sans friction de formulaire préalable (cf. /demo/reserver).
   * Aucun compte d'essai n'est créé automatiquement dans ce cas, faute d'email.
   */
  skipForm?: boolean
}

export function DemoContent({ skipForm = false }: DemoContentProps) {
  const [unlocked, setUnlocked] = useState(skipForm)
  const [status, setStatus] = useState<'new_account' | 'existing_account' | null>(null)
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', organisme: '', website: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/demo-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Une erreur est survenue.')
      setStatus(json.status)
      setUnlocked(true)
      // Pixel TikTok — conversion « demande de démo » (event_id partagé avec l'Events API serveur)
      await identifyTikTok(form.email)
      trackTikTok('Lead', { content_name: 'Demande de démo EduZen' }, await tiktokEventId('lead', form.email))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex overflow-hidden bg-gradient-to-br from-blue-50 via-white to-cyan-50 relative pt-16">
      <FloatingBlob className="top-[-10%] left-[-5%] w-96 h-96 rounded-full bg-gradient-to-br from-brand-blue to-brand-blue-light" duration={30} />
      <FloatingBlob className="bottom-[-10%] right-[-5%] w-80 h-80 rounded-full bg-gradient-to-tr from-brand-cyan to-brand-cyan-light" delay={4} duration={35} />
      <FloatingBlob className="top-[40%] left-[35%] w-64 h-64 rounded-full bg-blue-200" delay={8} duration={28} />

      {/* ── LEFT COLUMN (desktop) ── */}
      <div className="hidden lg:flex lg:w-[44%] relative z-10 flex-col justify-between p-12 overflow-y-auto">

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
              Reprenez<br />
              <span className="bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">6h par semaine</span><br />
              sur votre administratif Qualiopi.
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Une démo de 30 min avec le fondateur, sur votre organisme — pas une présentation générique. Zéro powerpoint, 100% concret.
            </p>
          </div>

          {/* Aperçu vidéo */}
          <div className="rounded-xl overflow-hidden shadow-xl shadow-brand-blue/10 ring-1 ring-black/5">
            <video
              src="/videos/VIDEO LP EDUZEN 1.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="w-full block"
            />
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

          {/* Agenda */}
          <GlassCard variant="default" className="p-4 border-brand-blue/15">
            <div className="flex items-center gap-2 mb-3">
              <CalendarCheck2 className="h-4 w-4 text-brand-blue" />
              <p className="text-gray-700 text-sm font-semibold">Au programme de votre démo</p>
            </div>
            <div className="space-y-2">
              {DEMO_AGENDA.map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-cyan mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 text-xs">{item}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Témoignages */}
          <div className="space-y-3">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.author} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.08 }}>
                <GlassCard variant="subtle" className="border-l-4 border-l-brand-cyan rounded-l-none p-4">
                  <div className="flex gap-0.5 mb-2">
                    {[...Array(5)].map((_, j) => <Star key={j} className="h-2.5 w-2.5 fill-brand-cyan text-brand-cyan" />)}
                  </div>
                  <p className="text-gray-700 text-sm italic leading-relaxed mb-2.5">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-xs font-semibold">{t.author}</p>
                      <p className="text-gray-400 text-xs">{t.role}</p>
                    </div>
                    <div className="bg-green-50 border border-green-100 rounded-lg px-2.5 py-1">
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

      {/* ── RIGHT COLUMN — CTA Calendly ── */}
      <div className="w-full lg:w-[56%] flex flex-col items-center justify-start lg:justify-center px-4 sm:px-6 py-8 lg:py-10 relative z-10 overflow-y-auto">

        {/* Mobile header */}
        <div className="lg:hidden w-full max-w-md mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-lg flex items-center justify-center shadow-md shadow-brand-blue/20">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-gray-900 tracking-tight">
              Edu<span className="text-brand-blue">Zen</span>
            </span>
          </div>
          <h1 className="font-display font-bold text-2xl text-gray-900 leading-tight mb-2">
            Reprenez <span className="bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">6h par semaine</span><br />
            sur votre administratif Qualiopi.
          </h1>
          <p className="text-gray-500 text-sm mb-4">Une démo de 30 min avec le fondateur, sur votre organisme — pas une présentation générique.</p>

          {/* Stats */}
          <div className="flex gap-2.5 mb-4">
            {STATS.map((stat) => (
              <GlassCard key={stat.label} variant="default" className="flex-1 py-3 px-2 text-center">
                <div className="font-display font-bold text-lg bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">{stat.value}</div>
                <div className="text-gray-400 text-[10px] mt-0.5 font-medium leading-tight">{stat.label}</div>
              </GlassCard>
            ))}
          </div>

          {/* Agenda */}
          <GlassCard variant="default" className="p-4 border-brand-blue/15 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarCheck2 className="h-4 w-4 text-brand-blue" />
              <p className="text-gray-700 text-sm font-semibold">Au programme de votre démo</p>
            </div>
            <div className="space-y-2">
              {DEMO_AGENDA.map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-cyan mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 text-xs">{item}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Témoignages */}
          <div className="space-y-3 mb-4">
            {TESTIMONIALS.map((t) => (
              <GlassCard key={t.author} variant="subtle" className="border-l-4 border-l-brand-cyan rounded-l-none p-4">
                <div className="flex gap-0.5 mb-2">
                  {[...Array(5)].map((_, j) => <Star key={j} className="h-2.5 w-2.5 fill-brand-cyan text-brand-cyan" />)}
                </div>
                <p className="text-gray-700 text-sm italic leading-relaxed mb-2.5">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs font-semibold">{t.author}</p>
                    <p className="text-gray-400 text-xs">{t.role}</p>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-lg px-2.5 py-1">
                    <p className="text-green-700 text-[10px] font-bold leading-tight">{t.result}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Trust row */}
          <div className="flex flex-wrap gap-3 mb-2">
            {TRUST_ROW.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                <Icon className="h-3.5 w-3.5 text-brand-blue/60" />
                {label}
              </div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md space-y-4"
        >
          {/* Card principale */}
          <GlassCard variant="premium" className="p-7 border-2 border-white/60 shadow-2xl backdrop-blur-2xl bg-white/70">

            {/* Badge disponibilité */}
            <div className="flex items-center gap-2 mb-5">
              <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-700 text-xs font-semibold">Créneaux disponibles cette semaine</span>
              </div>
            </div>

            {/* Titre */}
            <div className="mb-6">
              <h2 className="font-display font-bold text-2xl text-gray-900 mb-1.5">
                Réservez votre démo
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                30 minutes avec le fondateur, en visio, pour voir EduZen sur votre cas concret.
              </p>
            </div>

            {!unlocked ? (
              <>
                {/* Bonus essai gratuit — annoncé avant le formulaire, pas caché après */}
                <div className="flex items-center gap-2.5 bg-brand-blue/5 border border-brand-blue/10 rounded-lg px-3 py-2.5 mb-4">
                  <Zap className="h-4 w-4 text-brand-blue flex-shrink-0" />
                  <p className="text-gray-700 text-sm">
                    <span className="font-semibold">+ un essai gratuit de 14 jours offert</span>, sans engagement
                  </p>
                </div>

                {/* Formulaire de déblocage */}
                <form onSubmit={handleSubmit} className="space-y-3 mb-1">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      name="prenom"
                      label="Prénom"
                      required
                      placeholder="Jean"
                      value={form.prenom}
                      onChange={handleChange}
                    />
                    <Input
                      name="nom"
                      label="Nom"
                      required
                      placeholder="Dupont"
                      value={form.nom}
                      onChange={handleChange}
                    />
                  </div>
                  <Input
                    name="email"
                    type="email"
                    label="Email professionnel"
                    required
                    placeholder="jean.dupont@organisme.fr"
                    value={form.email}
                    onChange={handleChange}
                  />
                  <Input
                    name="organisme"
                    label="Nom de votre organisme de formation"
                    required
                    placeholder="Mon Organisme de Formation"
                    value={form.organisme}
                    onChange={handleChange}
                  />
                  {/* Honeypot anti-bot — invisible pour un humain */}
                  <input
                    type="text"
                    name="website"
                    value={form.website}
                    onChange={handleChange}
                    tabIndex={-1}
                    autoComplete="off"
                    className="sr-only"
                    aria-hidden="true"
                  />

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    isLoading={submitting}
                    className="group w-full h-14 bg-gradient-to-r from-brand-blue to-brand-cyan hover:from-brand-blue-dark hover:to-brand-cyan text-white font-bold text-base rounded-xl shadow-lg shadow-brand-blue/25 hover:shadow-xl hover:shadow-brand-blue/35 transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2 mt-1"
                  >
                    <CalendarCheck2 className="h-5 w-5" />
                    Voir les créneaux disponibles
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </form>
              </>
            ) : (
              <>
                {status === 'existing_account' && (
                  <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 mb-5">
                    <LogIn className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-blue-700 text-sm">
                      Vous avez déjà un compte EduZen —{' '}
                      <Link href="/auth/login" className="font-semibold underline">
                        connectez-vous
                      </Link>{' '}
                      pour accéder à votre espace.
                    </p>
                  </div>
                )}
                {status === 'new_account' && (
                  <div className="flex items-start gap-2.5 bg-green-50 border border-green-100 rounded-lg px-3 py-2.5 mb-5">
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-green-700 text-sm">
                      Votre essai gratuit de 14 jours est prêt. Un email pour créer votre mot de passe vous sera envoyé dans quelques minutes.
                    </p>
                  </div>
                )}

                {/* Détails pratiques */}
                <div className="space-y-3 mb-7">
                  {[
                    { icon: Clock,  text: '30 minutes chrono — pas de débordement' },
                    { icon: Video,  text: 'En visio (Google Meet ou Teams)' },
                    { icon: User,   text: 'Avec le fondateur, pas un commercial' },
                    { icon: Zap,    text: 'Démo sur votre situation réelle' },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-brand-blue/8 border border-brand-blue/15 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="h-3.5 w-3.5 text-brand-blue" />
                      </div>
                      <span className="text-gray-700 text-sm">{text}</span>
                    </div>
                  ))}
                </div>

                {/* CTA principal */}
                <Link
                  href="https://calendly.com/airtonenile/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-full h-14 bg-gradient-to-r from-brand-blue to-brand-cyan hover:from-brand-blue-dark hover:to-brand-cyan text-white font-bold text-base rounded-xl shadow-lg shadow-brand-blue/25 hover:shadow-xl hover:shadow-brand-blue/35 transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  <CalendarCheck2 className="h-5 w-5" />
                  Choisir mon créneau
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                {/* Sous-bouton */}
                <p className="text-center text-gray-400 text-xs mt-3">
                  Vous serez redirigé vers Calendly pour choisir votre horaire
                </p>
              </>
            )}
          </GlassCard>

          {/* Aperçu vidéo (mobile uniquement — le desktop l'affiche dans la colonne gauche) */}
          <div className="lg:hidden rounded-xl overflow-hidden shadow-lg shadow-brand-blue/10 ring-1 ring-black/5">
            <video
              src="/videos/VIDEO LP EDUZEN 1.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="w-full block"
            />
          </div>

          {/* Card garantie */}
          <GlassCard variant="subtle" className="p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-gray-600 text-sm leading-snug">
              <span className="font-semibold text-gray-800">Aucun engagement.</span>{' '}
              La démo est gratuite, sans pression commerciale. Si EduZen ne vous convient pas, on vous dit pourquoi — et on vous recommande une alternative.
            </p>
          </GlassCard>

          {/* Badges */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex flex-wrap gap-2 justify-center pb-4">
            {['🔒 Sécurisé SSL', '🇫🇷 Hébergé France', 'Conforme RGPD', 'Sans engagement'].map((label) => (
              <span key={label} className="bg-white/70 border border-gray-200 text-gray-500 text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm">
                {label}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
