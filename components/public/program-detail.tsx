'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Target,
  GraduationCap,
  Award,
  TrendingUp,
  Star,
  ChevronRight,
  Play,
  FileText,
  Shield,
  Accessibility,
  Euro,
  BadgeCheck,
  Sparkles,
  Layers,
  ClipboardCheck,
  UserCheck,
  Phone,
  Mail,
  Building2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { BRAND_COLORS } from '@/lib/config/app-config'
import { cn, lightenHexColor, shimmerDataURL } from '@/lib/utils'
import { motion, AnimatePresence, useScroll, useTransform } from '@/components/ui/motion'
import { MagneticButton } from '@/components/public/magnetic-button'
import { HeroBlobs } from '@/components/public/hero-blobs'
import { CatalogTrustBar } from '@/components/public/catalog-trust-bar'
import { AnimatedCounter } from '@/components/public/animated-counter'

type TabItem = { id: string; title: string; content: string }

type Program = TableRow<'programs'> & {
  // Champs optionnels présents en DB mais hors types générés
  success_rate?: number | null
  satisfaction_rate?: number | null
  total_learners?: number | null
  completion_rate?: number | null
  public_image_url?: string | null
  photo_url?: string | null
  price?: number | null
  price_enterprise?: number | null
  price_individual?: number | null
  currency?: string | null
  // Tabs JSONB (contenu saisi via l'UI onglets)
  pedagogical_objectives_tabs?: TabItem[] | null
  learner_profile_tabs?: TabItem[] | null
  training_content_tabs?: TabItem[] | null
  execution_follow_up_tabs?: TabItem[] | null
  // Champs Qualiopi
  prerequisites?: string | null
  pedagogical_methods?: string | null
  access_delay_days?: number | null
  accessibility_info?: string | null
  capacity_min?: number | null
  capacity_max?: number | null
  rs_title_name?: string | null
  formations?: Array<TableRow<'formations'> & {
    sessions?: TableRow<'sessions'>[]
  }>
  organizations?: TableRow<'organizations'>
}

// Convertit les tabs JSONB en texte plat (fallback si champ texte vide)
function tabsToText(tabs: TabItem[] | null | undefined): string {
  if (!Array.isArray(tabs) || tabs.length === 0) return ''
  return tabs
    .filter(t => t.content?.trim())
    .map(t => tabs.length > 1 ? `${t.title}\n${t.content}` : t.content)
    .join('\n\n')
}

interface PublicProgramDetailProps {
  program: Program
  primaryColor?: string
  organizationCode?: string
  enrollmentLinks?: Record<string, string>
  generalEnrollmentToken?: string
  contactEmail?: string
}

export function PublicProgramDetail({ program, primaryColor = BRAND_COLORS.primary, organizationCode, enrollmentLinks = {}, generalEnrollmentToken, contactEmail }: PublicProgramDetailProps) {
  const [selectedFormation, setSelectedFormation] = useState<string | null>(null)
  const sessionsRef = useRef<HTMLDivElement>(null)

  function scrollToSessions() {
    sessionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleSessionEnroll(sessionId?: string) {
    const token = (sessionId && enrollmentLinks[sessionId]) || generalEnrollmentToken
    if (token) {
      window.location.href = `/s/${token}`
    } else if (contactEmail) {
      window.location.href = `mailto:${contactEmail}?subject=Demande d'inscription — ${program.name}`
    } else {
      scrollToSessions()
    }
  }

  function handleRequestQuote() {
    if (contactEmail) {
      window.location.href = `mailto:${contactEmail}?subject=Demande de devis — ${program.name}`
    } else {
      scrollToSessions()
    }
  }

  function handleContactUs() {
    if (contactEmail) {
      window.location.href = `mailto:${contactEmail}?subject=${program.name}`
    } else if (organization?.phone) {
      window.location.href = `tel:${organization.phone}`
    } else {
      scrollToSessions()
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatShortDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    })
  }

  const organization = program.organizations

  // Champs avec fallback sur les tabs JSONB si le champ texte est vide
  const objectives = program.pedagogical_objectives || tabsToText(program.pedagogical_objectives_tabs)
  const learnerProfile = program.learner_profile || tabsToText(program.learner_profile_tabs)
  const trainingContent = program.training_content || tabsToText(program.training_content_tabs)
  const executionFollowUp = program.execution_follow_up || tabsToText(program.execution_follow_up_tabs)

  // Calculer les statistiques
  const totalSessions = program.formations?.reduce((acc, f) => acc + (f.sessions?.length || 0), 0) || 0
  const totalFormations = program.formations?.length || 0
  const upcomingSessions = program.formations?.flatMap(f =>
    (f.sessions || []).filter(s => new Date(s.start_date) > new Date())
  ).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()) || []

  // Statistiques du programme (vraies données ou valeurs par défaut)
  const stats = {
    successRate: program.success_rate ?? null,
    satisfactionRate: program.satisfaction_rate ?? null,
    totalLearners: program.total_learners ?? null,
    completionRate: program.completion_rate ?? null,
  }

  // Vérifier si au moins une statistique est disponible
  const hasStats = stats.successRate !== null || stats.satisfactionRate !== null ||
                   stats.totalLearners !== null || stats.completionRate !== null

  // Points forts du programme — dérivés des données réelles, jamais de contenu générique
  // qui pourrait être faux pour ce programme précis (ex: annoncer "certifiante" alors
  // qu'aucune modalité de certification n'a été renseignée).
  const highlights = [
    program.eligible_cpf && {
      icon: BadgeCheck,
      label: 'Éligible CPF',
      description: program.cpf_code ? `Code CPF ${program.cpf_code}` : 'Finançable via votre Compte Personnel de Formation',
    },
    (program.capacity_min || program.capacity_max) && {
      icon: Users,
      label: 'Groupe restreint',
      description: program.capacity_min && program.capacity_max
        ? `De ${program.capacity_min} à ${program.capacity_max} participants`
        : program.capacity_max
          ? `Jusqu'à ${program.capacity_max} participants`
          : `À partir de ${program.capacity_min} participants`,
    },
    program.certification_modalities && {
      icon: Award,
      label: 'Formation certifiante',
      description: program.rs_title_name || 'Certification à l\'issue de la formation',
    },
    program.access_delay_days != null && {
      icon: Clock,
      label: 'Accès rapide',
      description: `Démarrage possible sous ${program.access_delay_days} jour${program.access_delay_days > 1 ? 's' : ''}`,
    },
    organization?.qualiopi_certificate_url && {
      icon: Shield,
      label: 'Certifié Qualiopi',
      description: 'Organisme certifié qualité',
    },
  ].filter((h): h is { icon: typeof Award; label: string; description: string } => Boolean(h))

  const accentColor = lightenHexColor(primaryColor, 0.4)
  const coverImage = program.public_image_url || program.photo_url
  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: 'easeOut' as const },
  }

  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress: heroScrollProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroBgY = useTransform(heroScrollProgress, [0, 1], ['0%', '25%'])
  const heroBlobsY = useTransform(heroScrollProgress, [0, 1], ['0%', '15%'])
  const heroContentY = useTransform(heroScrollProgress, [0, 1], ['0%', '40%'])
  const heroContentOpacity = useTransform(heroScrollProgress, [0, 0.8], [1, 0.15])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section Premium */}
      <div ref={heroRef} className="relative overflow-hidden">
        {/* Background avec overlay */}
        <motion.div
          className="absolute inset-0 h-[500px]"
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 50%, ${primaryColor}99 100%)`,
            y: heroBgY,
          }}
        />

        {/* Grille en pointillés masquée (motif landing page) */}
        <motion.div
          style={{ y: heroBgY }}
          className="absolute inset-0 h-[500px] bg-[linear-gradient(to_right,#ffffff14_1px,transparent_1px),linear-gradient(to_bottom,#ffffff14_1px,transparent_1px)] bg-[size:56px_56px] opacity-70 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_60%,transparent_100%)]"
        />

        <motion.div style={{ y: heroBlobsY }} className="absolute inset-0 h-[500px]">
          <HeroBlobs primaryColor={primaryColor} accentColor={accentColor} />
        </motion.div>

        <motion.div
          style={{ y: heroContentY, opacity: heroContentOpacity }}
          className="relative container mx-auto px-4 pt-8 pb-32"
        >
          {/* Navigation retour */}
          <Link
            href={organizationCode ? `/cataloguepublic/${organizationCode}` : '/programmes'}
            className="inline-flex items-center text-white/80 hover:text-white transition-colors mb-8 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Retour au catalogue
          </Link>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Contenu texte */}
            <div className="text-white">
              {/* Badges */}
              <motion.div {...fadeInUp} className="flex flex-wrap gap-2 mb-6">
                {program.category && (
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                    {program.category}
                  </Badge>
                )}
                {program.eligible_cpf && (
                  <Badge className="bg-emerald-400/20 text-white border-emerald-300/40 backdrop-blur-md">
                    <BadgeCheck className="w-3 h-3 mr-1" />
                    Éligible CPF
                  </Badge>
                )}
                {program.certification_modalities && (
                  <Badge className="bg-amber-400/20 text-white border-amber-300/40 backdrop-blur-md">
                    <Award className="w-3 h-3 mr-1" />
                    Certifiant
                  </Badge>
                )}
              </motion.div>

              {/* Titre */}
              <motion.h1
                {...fadeInUp}
                transition={{ ...fadeInUp.transition, delay: 0.1 }}
                className="font-display text-4xl md:text-5xl font-bold mb-4 leading-tight"
              >
                {program.name}
              </motion.h1>

              {program.subtitle && (
                <motion.p
                  {...fadeInUp}
                  transition={{ ...fadeInUp.transition, delay: 0.15 }}
                  className="text-xl text-white/90 mb-6"
                >
                  {program.subtitle}
                </motion.p>
              )}

              {/* Métriques clés */}
              <motion.div
                {...fadeInUp}
                transition={{ ...fadeInUp.transition, delay: 0.2 }}
                className="flex flex-wrap gap-6 mb-8"
              >
                {program.duration_days && (
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm text-white/70">Durée</div>
                      <div className="font-semibold">{program.duration_days} {program.duration_unit === 'hours' ? 'heures' : 'jours'}</div>
                    </div>
                  </div>
                )}
                {program.modalities && (
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm text-white/70">Modalité</div>
                      <div className="font-semibold capitalize">{program.modalities}</div>
                    </div>
                  </div>
                )}
                {totalSessions > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm text-white/70">Sessions</div>
                      <div className="font-semibold">{totalSessions} disponible{totalSessions > 1 ? 's' : ''}</div>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* CTA */}
              <motion.div
                {...fadeInUp}
                transition={{ ...fadeInUp.transition, delay: 0.25 }}
                className="flex flex-wrap gap-4"
              >
                <MagneticButton
                  onClick={scrollToSessions}
                  className="group relative inline-flex items-center gap-2 px-6 py-3.5 bg-white rounded-full font-bold shadow-lg hover:shadow-xl transition-shadow overflow-hidden"
                  style={{ color: primaryColor }}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <Play className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">S&apos;inscrire maintenant</span>
                </MagneticButton>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 rounded-full"
                  onClick={() => window.print()}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Télécharger le programme
                </Button>
              </motion.div>
            </div>

            {/* Image ou stats card */}
            <div className="hidden lg:block">
              {coverImage ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className="relative aspect-[4/3] rounded-[28px] overflow-hidden shadow-2xl"
                >
                  <motion.div
                    className="absolute inset-0"
                    initial={{ scale: 1 }}
                    animate={{ scale: 1.08 }}
                    transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
                  >
                    <Image
                      src={coverImage as string}
                      alt={program.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      placeholder="blur"
                      blurDataURL={shimmerDataURL(640, 480)}
                      className="object-cover"
                    />
                  </motion.div>
                  {/* Teinte duotone couleur de marque */}
                  <div className="absolute inset-0" style={{ backgroundColor: primaryColor, mixBlendMode: 'color', opacity: 0.35 }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                </motion.div>
              ) : hasStats ? (
                <div className="bg-white/10 backdrop-blur-lg rounded-[28px] p-8 border border-white/20">
                  <h3 className="font-display text-white text-lg font-semibold mb-6">Nos résultats</h3>
                  <div className="grid grid-cols-2 gap-6">
                    {stats.successRate !== null && (
                      <div className="text-center p-4 bg-white/10 rounded-xl">
                        <div className="font-display text-4xl font-bold text-white mb-1">
                          <AnimatedCounter value={stats.successRate} suffix="%" />
                        </div>
                        <div className="text-sm text-white/70">Taux de réussite</div>
                      </div>
                    )}
                    {stats.satisfactionRate !== null && (
                      <div className="text-center p-4 bg-white/10 rounded-xl">
                        <div className="font-display text-4xl font-bold text-white mb-1 flex items-center justify-center gap-1">
                          <AnimatedCounter value={stats.satisfactionRate} />
                          <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                        </div>
                        <div className="text-sm text-white/70">Satisfaction</div>
                      </div>
                    )}
                    {stats.totalLearners !== null && (
                      <div className="text-center p-4 bg-white/10 rounded-xl">
                        <div className="font-display text-4xl font-bold text-white mb-1">
                          <AnimatedCounter value={stats.totalLearners} suffix="+" />
                        </div>
                        <div className="text-sm text-white/70">Apprenants formés</div>
                      </div>
                    )}
                    {stats.completionRate !== null && (
                      <div className="text-center p-4 bg-white/10 rounded-xl">
                        <div className="font-display text-4xl font-bold text-white mb-1">
                          <AnimatedCounter value={stats.completionRate} suffix="%" />
                        </div>
                        <div className="text-sm text-white/70">Taux de complétion</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Contenu principal */}
      <div className="container mx-auto px-4 -mt-16 relative z-10 pb-16">
        {/* Cards de statistiques mobiles */}
        {hasStats && (
          <div className="lg:hidden mb-8">
            <div className="grid grid-cols-2 gap-3">
              {stats.successRate !== null && (
                <div className="bg-white rounded-xl p-4 shadow-lg text-center">
                  <div className="text-2xl font-bold" style={{ color: primaryColor }}>
                    <AnimatedCounter value={stats.successRate} suffix="%" />
                  </div>
                  <div className="text-xs text-gray-500">Taux de réussite</div>
                </div>
              )}
              {stats.satisfactionRate !== null && (
                <div className="bg-white rounded-xl p-4 shadow-lg text-center">
                  <div className="text-2xl font-bold flex items-center justify-center gap-1" style={{ color: primaryColor }}>
                    <AnimatedCounter value={stats.satisfactionRate} />
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="text-xs text-gray-500">Satisfaction</div>
                </div>
              )}
              {stats.totalLearners !== null && !stats.successRate && (
                <div className="bg-white rounded-xl p-4 shadow-lg text-center">
                  <div className="text-2xl font-bold" style={{ color: primaryColor }}>
                    <AnimatedCounter value={stats.totalLearners} suffix="+" />
                  </div>
                  <div className="text-xs text-gray-500">Apprenants formés</div>
                </div>
              )}
              {stats.completionRate !== null && !stats.satisfactionRate && (
                <div className="bg-white rounded-xl p-4 shadow-lg text-center">
                  <div className="text-2xl font-bold" style={{ color: primaryColor }}>
                    <AnimatedCounter value={stats.completionRate} suffix="%" />
                  </div>
                  <div className="text-xs text-gray-500">Taux de complétion</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Points forts */}
        {highlights.length > 0 && (
        <div className="grid md:grid-cols-4 gap-4 mb-12">
          {highlights.map((highlight, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="bg-white rounded-[24px] p-5 shadow-lg hover:shadow-xl transition-shadow border border-gray-100"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white shadow-md"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
              >
                <highlight.icon className="w-6 h-6" />
              </div>
              <h3 className="font-display font-semibold text-gray-900 mb-1">{highlight.label}</h3>
              <p className="text-sm text-gray-500">{highlight.description}</p>
            </motion.div>
          ))}
        </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <Card id="description" className="shadow-lg border-0 overflow-hidden rounded-[28px] scroll-mt-24">
              <div className="h-1" style={{ backgroundColor: primaryColor }} />
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <BookOpen className="w-5 h-5" style={{ color: primaryColor }} />
                  Présentation de la formation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                    {program.public_description || program.description || 'Découvrez notre programme de formation conçu pour vous accompagner vers la réussite professionnelle.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Objectifs pédagogiques — Qualiopi ind. 1 */}
            {objectives && (
              <Card className="shadow-lg border-0 overflow-hidden rounded-[28px]">
                <div className="h-1" style={{ backgroundColor: primaryColor }} />
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <Target className="w-5 h-5" style={{ color: primaryColor }} />
                    Objectifs pédagogiques
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {objectives.split('\n').filter(Boolean).map((objective, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: `${primaryColor}20` }}
                        >
                          <CheckCircle className="w-4 h-4" style={{ color: primaryColor }} />
                        </div>
                        <span className="text-gray-700">{objective.replace(/^[-•]\s*/, '')}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Public visé — Qualiopi ind. 1 */}
            {learnerProfile && (
              <Card className="shadow-lg border-0 overflow-hidden rounded-[28px]">
                <div className="h-1" style={{ backgroundColor: primaryColor }} />
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <UserCheck className="w-5 h-5" style={{ color: primaryColor }} />
                    Public concerné
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">{learnerProfile}</p>
                </CardContent>
              </Card>
            )}

            {/* Prérequis — Qualiopi ind. 3 */}
            {program.prerequisites && (
              <Card className="shadow-lg border-0 overflow-hidden rounded-[28px]">
                <div className="h-1" style={{ backgroundColor: primaryColor }} />
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5" style={{ color: primaryColor }} />
                    Prérequis et niveau d'entrée
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {program.prerequisites.split('\n').filter(Boolean).map((req, index) => (
                      <div key={index} className="flex items-start gap-2 text-gray-700">
                        <span className="text-gray-400 mt-1">•</span>
                        <span>{req.replace(/^[-•]\s*/, '')}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Méthodes pédagogiques — Qualiopi ind. 5 */}
            {program.pedagogical_methods && (
              <Card className="shadow-lg border-0 overflow-hidden rounded-[28px]">
                <div className="h-1" style={{ backgroundColor: primaryColor }} />
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <BookOpen className="w-5 h-5" style={{ color: primaryColor }} />
                    Méthodes pédagogiques et modalités d'évaluation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">{program.pedagogical_methods}</p>
                </CardContent>
              </Card>
            )}

            {/* Contenu de la formation — Qualiopi ind. 1 */}
            {trainingContent && (
              <Card className="shadow-lg border-0 overflow-hidden rounded-[28px]">
                <div className="h-1" style={{ backgroundColor: primaryColor }} />
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <Layers className="w-5 h-5" style={{ color: primaryColor }} />
                    Contenu pédagogique
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {trainingContent.split('\n').filter(Boolean).map((line, index) => {
                      const isModule = line.match(/^(module|chapitre|partie|jour|bloc)/i)
                      return (
                        <div
                          key={index}
                          className={cn(
                            "p-3 rounded-lg",
                            isModule ? "font-semibold bg-gray-100 text-gray-900" : "bg-gray-50 ml-4 border-l-2 text-gray-700"
                          )}
                          style={!isModule ? { borderColor: primaryColor } : {}}
                        >
                          {line.replace(/^[-•]\s*/, '')}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Suivi de l'exécution */}
            {executionFollowUp && (
              <Card className="shadow-lg border-0 overflow-hidden rounded-[28px]">
                <div className="h-1" style={{ backgroundColor: primaryColor }} />
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" style={{ color: primaryColor }} />
                    Suivi de l'exécution et évaluation des résultats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">{executionFollowUp}</p>
                </CardContent>
              </Card>
            )}

            {/* Modalités d'évaluation et certification */}
            {program.certification_modalities && (
              <Card className="shadow-lg border-0 overflow-hidden rounded-[28px]">
                <div className="h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-amber-500" />
                    Modalités d'évaluation et certification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
                    <p className="text-gray-700 whitespace-pre-line">{program.certification_modalities}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sessions disponibles */}
            {program.formations && program.formations.length > 0 && (
              <Card id="sessions" ref={sessionsRef} className="shadow-lg border-0 overflow-hidden scroll-mt-24 rounded-[28px]">
                <div className="h-1 bg-gradient-to-r" style={{ background: `linear-gradient(to right, ${primaryColor}, ${primaryColor}80)` }} />
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <Calendar className="w-5 h-5" style={{ color: primaryColor }} />
                    Sessions de formation disponibles
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {program.formations.map((formation) => (
                    <div key={formation.id} className="space-y-4">
                      {/* Titre de la formation */}
                      <div
                        className="p-4 rounded-xl cursor-pointer transition-all hover:shadow-md"
                        style={{ backgroundColor: `${primaryColor}08`, border: `1px solid ${primaryColor}20` }}
                        onClick={() => setSelectedFormation(selectedFormation === formation.id ? null : formation.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{formation.name}</h3>
                            {formation.description && (
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{formation.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary">
                              {formation.sessions?.length || 0} session{(formation.sessions?.length || 0) > 1 ? 's' : ''}
                            </Badge>
                            <ChevronRight
                              className={cn(
                                "w-5 h-5 text-gray-400 transition-transform",
                                selectedFormation === formation.id && "rotate-90"
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Sessions de cette formation */}
                      <AnimatePresence initial={false}>
                      {(selectedFormation === formation.id || !selectedFormation) && formation.sessions && formation.sessions.length > 0 && (
                        <motion.div
                          key="sessions"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.35, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                        <div className="space-y-3 pl-4 pt-1">
                          {formation.sessions.map((session: any) => {
                            const isUpcoming = new Date(session.start_date) > new Date()
                            const isSoon = new Date(session.start_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

                            return (
                              <div
                                key={session.id}
                                className="bg-white border rounded-xl p-5 hover:shadow-lg transition-all group"
                              >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="font-semibold text-gray-900">{session.name}</span>
                                      {isSoon && isUpcoming && (
                                        <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                                          <Sparkles className="w-3 h-3 mr-1" />
                                          Prochainement
                                        </Badge>
                                      )}
                                      {session.status === 'ongoing' && (
                                        <Badge className="bg-green-100 text-green-700 border-green-200">
                                          En cours
                                        </Badge>
                                      )}
                                    </div>

                                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                      {session.start_date && (
                                        <div className="flex items-center gap-1.5">
                                          <Calendar className="w-4 h-4" />
                                          <span>
                                            {formatDate(session.start_date)}
                                            {session.end_date && session.end_date !== session.start_date && (
                                              <> - {formatDate(session.end_date)}</>
                                            )}
                                          </span>
                                        </div>
                                      )}
                                      {session.location && (
                                        <div className="flex items-center gap-1.5">
                                          <MapPin className="w-4 h-4" />
                                          <span>{session.location}</span>
                                        </div>
                                      )}
                                      {session.capacity_max && (
                                        <div className="flex items-center gap-1.5">
                                          <Users className="w-4 h-4" />
                                          <span>{session.capacity_max} places</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <Button
                                    className="text-white shadow-md hover:shadow-lg transition-all"
                                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
                                    onClick={() => handleSessionEnroll(session.id)}
                                  >
                                    S'inscrire
                                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        </motion.div>
                      )}
                      </AnimatePresence>

                      {formation.sessions?.length === 0 && (
                        <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                          <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p>Aucune session programmée pour le moment</p>
                          <p className="text-sm mt-1">Contactez-nous pour connaître les prochaines dates</p>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Accessibilité et délais d'accès — Qualiopi ind. 7 */}
            {(program.access_delay_days != null || program.accessibility_info) && (
              <Card id="accessibilite" className="shadow-lg border-0 overflow-hidden rounded-[28px] scroll-mt-24">
                <div className="h-1" style={{ backgroundColor: primaryColor }} />
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <Accessibility className="w-5 h-5" style={{ color: primaryColor }} />
                    Accessibilité et délais d'accès
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {program.access_delay_days != null && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Clock className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Délai d'accès moyen :</span>
                        <span className="text-sm text-gray-600 ml-1">{program.access_delay_days} jours ouvrés</span>
                      </div>
                    </div>
                  )}
                  {program.accessibility_info ? (
                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                      {program.accessibility_info}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      Les modalités d&apos;accessibilité n&apos;ont pas été renseignées pour cette formation.
                      {contactEmail && (
                        <> Contactez <a href={`mailto:${contactEmail}`} className="underline hover:text-gray-700">l&apos;organisme</a> pour toute question relative à l&apos;accessibilité.</>
                      )}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Card inscription sticky */}
            <Card className="shadow-xl border border-white/60 bg-white/80 backdrop-blur-xl sticky top-8 overflow-hidden rounded-[28px]">
              <div className="h-2" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})` }} />
              <CardContent className="p-6 space-y-6">
                {/* Prix si disponible (programme ou première formation) */}
                {(() => {
                  const programPrice = program.price ?? program.price_enterprise ?? program.price_individual
                  const formationPrice = program.formations?.[0]?.price
                  const price = programPrice ?? formationPrice
                  const currency = program.currency || 'EUR'
                  const currencySymbol = currency === 'EUR' ? '€' : currency === 'XOF' ? 'FCFA' : currency
                  if (price == null || Number(price) <= 0) return (
                    <div className="text-center pb-4 border-b">
                      <div className="text-sm text-gray-500 mb-1">Tarif</div>
                      <div className="text-xl font-semibold text-gray-600">Sur devis</div>
                    </div>
                  )
                  return (
                    <div className="text-center pb-4 border-b">
                      <div className="text-sm text-gray-500 mb-1">À partir de</div>
                      <div className="font-display text-4xl font-bold" style={{ color: primaryColor }}>
                        {Number(price).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        <span className="text-lg font-normal text-gray-500"> {currencySymbol}</span>
                      </div>
                      <div className="text-sm text-gray-500">HT / participant</div>
                    </div>
                  )
                })()}

                {/* Prochaine session */}
                {upcomingSessions.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm font-medium text-gray-500 mb-2">Prochaine session</div>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg flex flex-col items-center justify-center text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <span className="text-lg font-bold leading-none">
                          {new Date(upcomingSessions[0].start_date).getDate()}
                        </span>
                        <span className="text-xs uppercase">
                          {new Date(upcomingSessions[0].start_date).toLocaleDateString('fr-FR', { month: 'short' })}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{upcomingSessions[0].name}</div>
                        {upcomingSessions[0].location && (
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {upcomingSessions[0].location}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Infos clés */}
                <div className="space-y-4">
                  {program.duration_days && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Durée</div>
                        <div className="font-medium">{program.duration_days} {program.duration_unit === 'hours' ? 'heures' : 'jours'}</div>
                      </div>
                    </div>
                  )}

                  {program.modalities && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Modalité</div>
                        <div className="font-medium capitalize">{program.modalities}</div>
                      </div>
                    </div>
                  )}

                  {totalFormations > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Formations</div>
                        <div className="font-medium">{totalFormations} formation{totalFormations > 1 ? 's' : ''}</div>
                      </div>
                    </div>
                  )}

                  {program.eligible_cpf && program.cpf_code && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Euro className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Code CPF</div>
                        <div className="font-medium">{program.cpf_code}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Boutons d'action */}
                <div className="space-y-3 pt-4">
                  <Button
                    className="w-full text-white shadow-lg hover:shadow-xl transition-all h-12 text-base"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
                    onClick={() =>
                      upcomingSessions.length > 0
                        ? handleSessionEnroll(upcomingSessions[0].id)
                        : handleSessionEnroll()
                    }
                  >
                    <Play className="w-4 h-4 mr-2" />
                    S'inscrire maintenant
                  </Button>
                  <Button variant="outline" className="w-full h-12" onClick={handleRequestQuote}>
                    <FileText className="w-4 h-4 mr-2" />
                    Demander un devis
                  </Button>
                </div>

                {/* Badges confiance — uniquement des faits réels et vérifiables */}
                <div className="pt-2 border-t">
                  <CatalogTrustBar
                    primaryColor={primaryColor}
                    hasQualiopi={Boolean(organization?.qualiopi_certificate_url)}
                    cpfEligible={Boolean(program.eligible_cpf)}
                    align="left"
                    theme="onLight"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Organisme de formation */}
            {organization && (
              <Card className="shadow-lg border border-white/60 bg-white/80 backdrop-blur-xl rounded-[28px]">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-base">Organisme de formation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    {organization.logo_url && (
                      <img
                        src={organization.logo_url}
                        alt={organization.name}
                        className="h-14 w-auto object-contain"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{organization.name}</h3>
                      {organization.address && (
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {organization.address}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="space-y-2 pt-3 border-t">
                    {organization.phone && (
                      <a
                        href={`tel:${organization.phone}`}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                      >
                        <Phone className="w-4 h-4" />
                        {organization.phone}
                      </a>
                    )}
                    {organization.email && (
                      <a
                        href={`mailto:${organization.email}`}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                      >
                        <Mail className="w-4 h-4" />
                        {organization.email}
                      </a>
                    )}
                  </div>

                  {/* Badge Qualiopi */}
                  {organization.qualiopi_certificate_url && (
                    <a
                      href={organization.qualiopi_certificate_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Voir l'attestation Qualiopi</span>
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Besoin d'aide */}
            <Card className="shadow-lg border border-white/10 bg-gray-900/80 backdrop-blur-xl text-white rounded-[28px]">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Besoin d'aide ?</h3>
                <p className="text-sm text-gray-300 mb-4">
                  Notre équipe est à votre disposition pour répondre à vos questions
                </p>
                <Button variant="secondary" className="w-full" onClick={handleContactUs}>
                  <Phone className="w-4 h-4 mr-2" />
                  Nous contacter
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
