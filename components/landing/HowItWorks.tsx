'use client'

import { memo } from 'react'
import { UserPlus, Settings, Users, BarChart3, CheckCircle2 } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Créez votre compte',
    description: 'Inscription gratuite en 2 minutes. Aucune carte bancaire requise pour l\'essai de 14 jours.',
    details: ['Essai gratuit 14 jours', 'Sans engagement', 'Configuration guidée']
  },
  {
    number: '02',
    icon: Settings,
    title: 'Configurez votre organisme',
    description: 'Importez vos formations, formateurs et stagiaires existants. Notre assistant vous guide pas à pas.',
    details: ['Import Excel/CSV', 'Templates prêts à l\'emploi', 'Support dédié']
  },
  {
    number: '03',
    icon: Users,
    title: 'Gérez vos sessions',
    description: 'Inscriptions, émargements, documents... Tout est automatisé et conforme Qualiopi.',
    details: ['Émargement QR Code', 'Documents automatiques', 'Conformité garantie']
  },
  {
    number: '04',
    icon: BarChart3,
    title: 'Pilotez votre activité',
    description: 'Suivez vos KPIs en temps réel, facturez automatiquement et développez votre chiffre d\'affaires.',
    details: ['Dashboard temps réel', 'Facturation CPF', 'Analytics avancés']
  }
]

export const HowItWorks = memo(function HowItWorks() {
  return (
    <section id="comment-ca-marche" className="relative py-24 md:py-32 lg:py-40 overflow-hidden bg-gray-50">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(39,68,114,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(39,68,114,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <div className="animate-fade-in-up inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <span className="text-sm font-medium text-gray-600">Simple comme bonjour</span>
          </div>

          <h2 className="animate-fade-in-up animation-delay-100 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6">
            Comment ça{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">
              marche ?
            </span>
          </h2>

          <p className="animate-fade-in-up animation-delay-200 text-lg md:text-xl text-gray-600">
            4 étapes simples pour digitaliser votre organisme de formation
          </p>
        </div>

        {/* Steps */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={`animate-fade-in-up group relative`}
                style={{ animationDelay: `${300 + index * 100}ms` }}
              >
                <div className="relative bg-white rounded-3xl p-8 md:p-10 border-2 border-gray-100 hover:border-brand-blue/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  {/* Step number badge */}
                  <div className="absolute -top-4 -left-4 w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center shadow-lg">
                    <span className="text-lg font-bold text-white">{step.number}</span>
                  </div>

                  {/* Icon */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 group-hover:bg-brand-blue-ghost flex items-center justify-center transition-colors duration-300">
                      <step.icon className="w-8 h-8 text-gray-600 group-hover:text-brand-blue transition-colors duration-300" />
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
                    {step.title}
                  </h3>

                  <p className="text-gray-600 mb-6">
                    {step.description}
                  </p>

                  {/* Details list */}
                  <ul className="space-y-2">
                    {step.details.map((detail, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-500">
                        <CheckCircle2 className="w-4 h-4 text-brand-cyan flex-shrink-0" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom connector line */}
          <div className="hidden lg:block h-1 bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue rounded-full mt-8 animate-fade-in-up animation-delay-700" />
        </div>
      </div>
    </section>
  )
})
