'use client'

import { useState } from 'react'
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
import { cn } from '@/lib/utils'

type Program = TableRow<'programs'> & {
  formations?: Array<TableRow<'formations'> & {
    sessions?: TableRow<'sessions'>[]
  }>
  organizations?: TableRow<'organizations'>
}

interface PublicProgramDetailProps {
  program: Program
  primaryColor?: string
  organizationCode?: string
}

export function PublicProgramDetail({ program, primaryColor = BRAND_COLORS.primary, organizationCode }: PublicProgramDetailProps) {
  const [selectedFormation, setSelectedFormation] = useState<string | null>(null)

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

  // Calculer les statistiques
  const totalSessions = program.formations?.reduce((acc, f) => acc + (f.sessions?.length || 0), 0) || 0
  const totalFormations = program.formations?.length || 0
  const upcomingSessions = program.formations?.flatMap(f =>
    (f.sessions || []).filter(s => new Date(s.start_date) > new Date())
  ).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()) || []

  // Statistiques du programme (vraies données ou valeurs par défaut)
  const stats = {
    successRate: (program as any).success_rate ?? null,
    satisfactionRate: (program as any).satisfaction_rate ?? null,
    totalLearners: (program as any).total_learners ?? null,
    completionRate: (program as any).completion_rate ?? null,
  }

  // Vérifier si au moins une statistique est disponible
  const hasStats = stats.successRate !== null || stats.satisfactionRate !== null ||
                   stats.totalLearners !== null || stats.completionRate !== null

  // Points forts du programme
  const highlights = [
    { icon: Award, label: 'Formation certifiante', description: 'Certification reconnue par l\'État' },
    { icon: Users, label: 'Petits groupes', description: 'Maximum 12 participants par session' },
    { icon: BookOpen, label: 'Supports inclus', description: 'Documentation complète fournie' },
    { icon: Shield, label: 'Garantie réussite', description: 'Accompagnement personnalisé' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section Premium */}
      <div className="relative">
        {/* Background avec overlay */}
        <div
          className="absolute inset-0 h-[500px]"
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 50%, ${primaryColor}99 100%)`
          }}
        />

        {/* Pattern décoratif */}
        <div className="absolute inset-0 h-[500px] opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative container mx-auto px-4 pt-8 pb-32">
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
              <div className="flex flex-wrap gap-2 mb-6">
                {program.category && (
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                    {program.category}
                  </Badge>
                )}
                {program.eligible_cpf && (
                  <Badge className="bg-emerald-500/90 text-white border-0">
                    <BadgeCheck className="w-3 h-3 mr-1" />
                    Éligible CPF
                  </Badge>
                )}
                {program.certification_modalities && (
                  <Badge className="bg-amber-500/90 text-white border-0">
                    <Award className="w-3 h-3 mr-1" />
                    Certifiant
                  </Badge>
                )}
              </div>

              {/* Titre */}
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                {program.name}
              </h1>

              {program.subtitle && (
                <p className="text-xl text-white/90 mb-6">
                  {program.subtitle}
                </p>
              )}

              {/* Métriques clés */}
              <div className="flex flex-wrap gap-6 mb-8">
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
              </div>

              {/* CTA */}
              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  className="bg-white hover:bg-white/90 shadow-lg"
                  style={{ color: primaryColor }}
                >
                  <Play className="w-4 h-4 mr-2" />
                  S'inscrire maintenant
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Télécharger le programme
                </Button>
              </div>
            </div>

            {/* Image ou stats card */}
            <div className="hidden lg:block">
              {program.public_image_url ? (
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                  <Image
                    src={program.public_image_url}
                    alt={program.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
              ) : hasStats ? (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                  <h3 className="text-white text-lg font-semibold mb-6">Nos résultats</h3>
                  <div className="grid grid-cols-2 gap-6">
                    {stats.successRate !== null && (
                      <div className="text-center p-4 bg-white/10 rounded-xl">
                        <div className="text-4xl font-bold text-white mb-1">{stats.successRate}%</div>
                        <div className="text-sm text-white/70">Taux de réussite</div>
                      </div>
                    )}
                    {stats.satisfactionRate !== null && (
                      <div className="text-center p-4 bg-white/10 rounded-xl">
                        <div className="text-4xl font-bold text-white mb-1 flex items-center justify-center gap-1">
                          {stats.satisfactionRate}
                          <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                        </div>
                        <div className="text-sm text-white/70">Satisfaction</div>
                      </div>
                    )}
                    {stats.totalLearners !== null && (
                      <div className="text-center p-4 bg-white/10 rounded-xl">
                        <div className="text-4xl font-bold text-white mb-1">{stats.totalLearners.toLocaleString()}+</div>
                        <div className="text-sm text-white/70">Apprenants formés</div>
                      </div>
                    )}
                    {stats.completionRate !== null && (
                      <div className="text-center p-4 bg-white/10 rounded-xl">
                        <div className="text-4xl font-bold text-white mb-1">{stats.completionRate}%</div>
                        <div className="text-sm text-white/70">Taux de complétion</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="container mx-auto px-4 -mt-16 relative z-10 pb-16">
        {/* Cards de statistiques mobiles */}
        {hasStats && (
          <div className="lg:hidden mb-8">
            <div className="grid grid-cols-2 gap-3">
              {stats.successRate !== null && (
                <div className="bg-white rounded-xl p-4 shadow-lg text-center">
                  <div className="text-2xl font-bold" style={{ color: primaryColor }}>{stats.successRate}%</div>
                  <div className="text-xs text-gray-500">Taux de réussite</div>
                </div>
              )}
              {stats.satisfactionRate !== null && (
                <div className="bg-white rounded-xl p-4 shadow-lg text-center">
                  <div className="text-2xl font-bold flex items-center justify-center gap-1" style={{ color: primaryColor }}>
                    {stats.satisfactionRate}
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="text-xs text-gray-500">Satisfaction</div>
                </div>
              )}
              {stats.totalLearners !== null && !stats.successRate && (
                <div className="bg-white rounded-xl p-4 shadow-lg text-center">
                  <div className="text-2xl font-bold" style={{ color: primaryColor }}>{stats.totalLearners.toLocaleString()}+</div>
                  <div className="text-xs text-gray-500">Apprenants formés</div>
                </div>
              )}
              {stats.completionRate !== null && !stats.satisfactionRate && (
                <div className="bg-white rounded-xl p-4 shadow-lg text-center">
                  <div className="text-2xl font-bold" style={{ color: primaryColor }}>{stats.completionRate}%</div>
                  <div className="text-xs text-gray-500">Taux de complétion</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Points forts */}
        <div className="grid md:grid-cols-4 gap-4 mb-12">
          {highlights.map((highlight, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-5 shadow-lg hover:shadow-xl transition-shadow border border-gray-100"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <highlight.icon className="w-6 h-6" style={{ color: primaryColor }} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{highlight.label}</h3>
              <p className="text-sm text-gray-500">{highlight.description}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <div className="h-1" style={{ backgroundColor: primaryColor }} />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
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

            {/* Objectifs pédagogiques */}
            {program.pedagogical_objectives && (
              <Card className="shadow-lg border-0 overflow-hidden">
                <div className="h-1" style={{ backgroundColor: primaryColor }} />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" style={{ color: primaryColor }} />
                    Objectifs pédagogiques
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {program.pedagogical_objectives.split('\n').filter(Boolean).map((objective, index) => (
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

            {/* Contenu de la formation */}
            {program.training_content && (
              <Card className="shadow-lg border-0 overflow-hidden">
                <div className="h-1" style={{ backgroundColor: primaryColor }} />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="w-5 h-5" style={{ color: primaryColor }} />
                    Programme détaillé
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {program.training_content.split('\n').filter(Boolean).map((content, index) => {
                      const isModule = content.match(/^(module|chapitre|partie|jour)/i)
                      return (
                        <div
                          key={index}
                          className={cn(
                            "p-4 rounded-lg",
                            isModule ? "bg-gray-900 text-white" : "bg-gray-50 ml-4 border-l-2"
                          )}
                          style={!isModule ? { borderColor: primaryColor } : {}}
                        >
                          {isModule ? (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                <span className="font-bold text-sm">{index + 1}</span>
                              </div>
                              <span className="font-semibold">{content}</span>
                            </div>
                          ) : (
                            <span className="text-gray-700">{content.replace(/^[-•]\s*/, '')}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Public visé et prérequis */}
            <div className="grid md:grid-cols-2 gap-6">
              {program.learner_profile && (
                <Card className="shadow-lg border-0 overflow-hidden">
                  <div className="h-1" style={{ backgroundColor: primaryColor }} />
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <UserCheck className="w-5 h-5" style={{ color: primaryColor }} />
                      Public visé
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm whitespace-pre-line">{program.learner_profile}</p>
                  </CardContent>
                </Card>
              )}

              {program.execution_follow_up && (
                <Card className="shadow-lg border-0 overflow-hidden">
                  <div className="h-1" style={{ backgroundColor: primaryColor }} />
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ClipboardCheck className="w-5 h-5" style={{ color: primaryColor }} />
                      Prérequis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm whitespace-pre-line">{program.execution_follow_up}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Modalités d'évaluation et certification */}
            {program.certification_modalities && (
              <Card className="shadow-lg border-0 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
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
              <Card className="shadow-lg border-0 overflow-hidden">
                <div className="h-1 bg-gradient-to-r" style={{ background: `linear-gradient(to right, ${primaryColor}, ${primaryColor}80)` }} />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
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
                      {(selectedFormation === formation.id || !selectedFormation) && formation.sessions && formation.sessions.length > 0 && (
                        <div className="space-y-3 pl-4">
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
                                    style={{ backgroundColor: primaryColor }}
                                  >
                                    S'inscrire
                                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

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

            {/* Accessibilité */}
            <Card className="shadow-lg border-0 overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Accessibility className="w-5 h-5 text-blue-600" />
                  Accessibilité
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white/80 backdrop-blur rounded-xl p-5 border border-blue-100">
                  <p className="text-gray-700">
                    Cette formation est accessible aux personnes en situation de handicap.
                    Notre référent handicap est à votre disposition pour étudier les adaptations
                    nécessaires à votre parcours de formation.
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-blue-600">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm font-medium">Contactez notre référent handicap</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Card inscription sticky */}
            <Card className="shadow-xl border-0 sticky top-8 overflow-hidden">
              <div className="h-2" style={{ backgroundColor: primaryColor }} />
              <CardContent className="p-6 space-y-6">
                {/* Prix si disponible */}
                {program.formations && program.formations[0] && (
                  <div className="text-center pb-4 border-b">
                    <div className="text-sm text-gray-500 mb-1">À partir de</div>
                    <div className="text-4xl font-bold" style={{ color: primaryColor }}>
                      {program.formations[0].price?.toLocaleString('fr-FR') || 'Sur devis'}
                      {program.formations[0].price && (
                        <span className="text-lg font-normal text-gray-500"> €</span>
                      )}
                    </div>
                    {program.formations[0].price && (
                      <div className="text-sm text-gray-500">HT / participant</div>
                    )}
                  </div>
                )}

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
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    S'inscrire maintenant
                  </Button>
                  <Button variant="outline" className="w-full h-12">
                    <FileText className="w-4 h-4 mr-2" />
                    Demander un devis
                  </Button>
                </div>

                {/* Badges confiance */}
                <div className="flex items-center justify-center gap-3 pt-4 border-t">
                  <div className="text-center">
                    <CheckCircle className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
                    <div className="text-xs text-gray-500">Qualiopi</div>
                  </div>
                  {program.eligible_cpf && (
                    <div className="text-center">
                      <BadgeCheck className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                      <div className="text-xs text-gray-500">CPF</div>
                    </div>
                  )}
                  <div className="text-center">
                    <Shield className="w-5 h-5 mx-auto text-purple-500 mb-1" />
                    <div className="text-xs text-gray-500">Certifié</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organisme de formation */}
            {organization && (
              <Card className="shadow-lg border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Organisme de formation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    {(organization.logo_url || (organization.settings && typeof organization.settings === 'object' && 'logo_url' in organization.settings)) && (
                      <img
                        src={organization.logo_url || (organization.settings as any)?.logo_url}
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
                  {organization.settings && typeof organization.settings === 'object' && 'qualiopi_certificate_url' in organization.settings && (
                    <a
                      href={(organization.settings as any).qualiopi_certificate_url}
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
            <Card className="shadow-lg border-0 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Besoin d'aide ?</h3>
                <p className="text-sm text-gray-300 mb-4">
                  Notre équipe est à votre disposition pour répondre à vos questions
                </p>
                <Button variant="secondary" className="w-full">
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
