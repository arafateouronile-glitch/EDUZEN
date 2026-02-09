'use client'

import { memo, useRef } from 'react'
import { Clock, Shield, TrendingUp, Award, Sparkles } from 'lucide-react'

const benefits = [
  {
    icon: Clock,
    title: 'Gagnez 20h par semaine',
    description: 'Automatisez 80% de vos tâches administratives. Feuilles de présence, attestations, conventions... tout est généré en 1 clic.',
    highlight: '80%',
    highlightLabel: 'moins d\'admin',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    icon: Award,
    title: 'Passez Qualiopi sereinement',
    description: 'Tous vos documents sont automatiquement conformes aux critères Qualiopi. Préparez votre audit en quelques clics, pas en quelques semaines.',
    highlight: '100%',
    highlightLabel: 'conforme',
    gradient: 'from-green-500 to-emerald-500'
  },
  {
    icon: TrendingUp,
    title: 'Augmentez vos revenus',
    description: 'Proposez des formations e-learning 24/7, gérez plus de stagiaires avec moins d\'effort et réduisez vos coûts opérationnels.',
    highlight: '+30%',
    highlightLabel: 'de CA moyen',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    icon: Shield,
    title: 'Sécurisez vos données',
    description: 'Cryptage bancaire AES-256, hébergement en France, conformité RGPD totale. Vos données et celles de vos stagiaires sont en sécurité.',
    highlight: '99.9%',
    highlightLabel: 'disponibilité',
    gradient: 'from-orange-500 to-red-500'
  }
]

export const Benefits = memo(function Benefits() {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <section id="benefices" className="relative py-24 md:py-32 lg:py-40 overflow-hidden bg-gradient-to-b from-white via-gray-50/30 to-white">
      {/* Background - simplifié */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-brand-blue/5 rounded-full blur-[60px]" />
        <div className="absolute bottom-1/4 left-0 w-[300px] h-[300px] bg-brand-cyan/5 rounded-full blur-[60px]" />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <div className="animate-fade-in-up inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-blue-ghost border border-brand-blue-pale mb-6">
            <Sparkles className="w-4 h-4 text-brand-blue" />
            <span className="text-sm font-medium text-brand-blue-darker">Ce que vous gagnez</span>
          </div>

          <h2 className="animate-fade-in-up animation-delay-100 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6">
            Concentrez-vous sur{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">
              l'essentiel
            </span>
          </h2>

          <p className="animate-fade-in-up animation-delay-200 text-lg md:text-xl text-gray-600">
            Pendant que vous formez vos stagiaires, EduZen s'occupe de tout le reste.
          </p>
        </div>

        {/* Benefits grid */}
        <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
          {benefits.map((benefit, index) => (
            <div
              key={benefit.title}
              className={`animate-fade-in-up group relative bg-white rounded-3xl p-8 md:p-10 border-2 border-gray-100 hover:border-brand-blue/30 shadow-lg hover:shadow-xl hover:shadow-brand-blue/5 transition-all duration-300 hover:-translate-y-1`}
              style={{ animationDelay: `${200 + index * 100}ms` }}
            >
              {/* Icon */}
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${benefit.gradient} mb-6 shadow-lg`}>
                <benefit.icon className="w-7 h-7 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                {benefit.title}
              </h3>

              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                {benefit.description}
              </p>

              {/* Highlight stat */}
              <div className="flex items-center gap-3 pt-6 border-t border-gray-100">
                <span className={`text-3xl md:text-4xl font-black bg-gradient-to-r ${benefit.gradient} bg-clip-text text-transparent`}>
                  {benefit.highlight}
                </span>
                <span className="text-sm font-medium text-gray-500">
                  {benefit.highlightLabel}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
})
