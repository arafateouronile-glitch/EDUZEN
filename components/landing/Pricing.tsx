'use client'

import { motion, useInView } from '@/components/ui/motion'
import { useRef, useState } from 'react'
import { Check, ArrowRight, Sparkles, Zap, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const plans = [
  {
    name: "Starter",
    monthlyPrice: 79,
    yearlyTotal: 790,
    description: "L'essentiel pour débuter",
    features: [
      "20 stagiaires / mois",
      "Gestion Pédagogique",
      "Émargement QR & Signature",
      "Génération de Documents",
      "Facturation & Paiements",
      "Support Email (48h)"
    ],
    cta: "Commencer l'essai gratuit",
    highlight: false,
    icon: Sparkles
  },
  {
    name: "Pro",
    monthlyPrice: 169,
    yearlyTotal: 1690,
    description: "La sérénité administrative",
    features: [
      "100 stagiaires / mois",
      "Tout du plan Starter",
      "Dashboard Qualiopi",
      "Automate BPF",
      "Portail E-learning",
      "Support Prioritaire (24h)"
    ],
    cta: "Essayer le plan Pro",
    highlight: true,
    icon: Crown
  },
  {
    name: "Enterprise",
    monthlyPrice: 349,
    yearlyTotal: 3490,
    description: "Pour changer d'échelle",
    features: [
      "Stagiaires illimités",
      "Tout du plan Pro",
      "Marque Blanche / URL",
      "API & Intégrations",
      "Account Manager dédié",
      "Support Téléphone"
    ],
    cta: "Contacter les ventes",
    highlight: false,
    icon: Zap
  }
]

export function Pricing() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })
  const [isYearly, setIsYearly] = useState(true)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <section id="tarifs" className="relative py-24 md:py-32 overflow-hidden bg-[#FDFDFD]">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-4xl mx-auto mb-16 md:mb-24">
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tightest text-gray-900 mb-8 font-display">
            Des tarifs{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">
              simples.
            </span>
          </h2>
          
          <p className="text-xl text-gray-500 font-light mb-12">
            Choisissez le plan qui correspond à la taille de votre organisme.
          </p>

          {/* Toggle */}
          <div className="flex justify-center items-center gap-4 mb-12 relative z-20">
            <span className={cn("text-sm font-medium transition-colors", !isYearly ? "text-gray-900" : "text-gray-500")}>
              Mensuel
            </span>
            
            <button
              onClick={() => setIsYearly(!isYearly)}
              className="relative w-16 h-8 rounded-full bg-gray-200 transition-colors focus:outline-none"
            >
              <motion.div
                className="absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md"
                animate={{ x: isYearly ? 32 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>

            <div className="flex items-center gap-2">
              <span className={cn("text-sm font-medium transition-colors", isYearly ? "text-gray-900" : "text-gray-500")}>
                Annuel
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wide">
                -17% · 2 mois offerts
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto items-stretch">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              onHoverStart={() => setHoveredIndex(index)}
              onHoverEnd={() => setHoveredIndex(null)}
              className={cn(
                "relative rounded-[2rem] p-8 md:p-10 flex flex-col transition-all duration-300",
                plan.highlight 
                  ? "bg-gray-900 text-white shadow-2xl scale-105 z-10 ring-4 ring-brand-blue/20" 
                  : "bg-white border border-gray-100 shadow-xl hover:shadow-2xl hover:-translate-y-2"
              )}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-gradient-to-r from-brand-blue to-brand-cyan rounded-full text-xs font-bold uppercase tracking-widest text-white shadow-lg">
                  Recommandé
                </div>
              )}

              <div className="flex-1">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center mb-6",
                  plan.highlight ? "bg-white/10" : "bg-gray-50"
                )}>
                  <plan.icon className={cn("w-6 h-6", plan.highlight ? "text-white" : "text-brand-blue")} />
                </div>

                <h3 className="text-2xl font-bold mb-2 font-display">{plan.name}</h3>
                <p className={cn("text-sm mb-8", plan.highlight ? "text-gray-400" : "text-gray-500")}>
                  {plan.description}
                </p>

                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">€</span>
                    <span className="text-5xl font-black tracking-tight">
                      {isYearly ? Math.round(plan.yearlyTotal / 12) : plan.monthlyPrice}
                    </span>
                    <span className={cn("text-sm font-medium ml-1", plan.highlight ? "text-gray-400" : "text-gray-500")}>
                      HT/mois
                    </span>
                  </div>
                  {isYearly ? (
                    <div className="mt-2 space-y-1">
                      <p className={cn("text-xs font-medium", plan.highlight ? "text-gray-400" : "text-gray-500")}>
                        soit {plan.yearlyTotal}€ facturé annuellement
                      </p>
                      <p className={cn("text-xs font-bold", plan.highlight ? "text-green-400" : "text-green-600")}>
                        Économie : {plan.monthlyPrice * 12 - plan.yearlyTotal}€/an
                      </p>
                    </div>
                  ) : (
                    <p className={cn("text-xs mt-2 font-medium", plan.highlight ? "text-gray-400" : "text-gray-500")}>
                      sans engagement
                    </p>
                  )}
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className={cn("w-5 h-5 flex-shrink-0", plan.highlight ? "text-brand-cyan" : "text-brand-blue")} />
                      <span className={cn("text-sm font-medium", plan.highlight ? "text-gray-300" : "text-gray-600")}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link href="/auth/register" className="block mt-auto">
                <Button 
                  className={cn(
                    "w-full h-12 rounded-xl font-bold transition-all",
                    plan.highlight 
                      ? "bg-white text-gray-900 hover:bg-gray-100" 
                      : "bg-gray-900 text-white hover:bg-black"
                  )}
                >
                  {plan.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}
