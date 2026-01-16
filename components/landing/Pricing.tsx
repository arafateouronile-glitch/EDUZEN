'use client'

import { motion, useInView, useMotionValue, useTransform } from '@/components/ui/motion'
import { useRef, useState } from 'react'
import { Check, ArrowRight, Sparkles, Zap, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useParallax } from '@/lib/hooks/useParallax'

const plans = [
  {
    name: "Starter",
    price: "49",
    period: "/mois",
    description: "Idéal pour les organismes de formation qui démarrent.",
    features: [
      "Jusqu'à 100 stagiaires/an",
      "Gestion des sessions et inscriptions",
      "Contrats et documents Qualiopi",
      "Feuilles de présence",
      "Support par email",
      "3 utilisateurs"
    ],
    cta: "Commencer l'essai gratuit",
    highlight: false,
    icon: Sparkles
  },
  {
    name: "Professional",
    price: "149",
    period: "/mois",
    description: "La solution complète pour les organismes en croissance.",
    features: [
      "Stagiaires illimités",
      "Tout du plan Starter",
      "Facturation CPF automatique",
      "Portail stagiaire & formateur",
      "Reporting avancé",
      "Conformité Datadock",
      "Support prioritaire",
      "10 utilisateurs"
    ],
    cta: "Essayer le plan Professional",
    highlight: true,
    icon: Crown
  },
  {
    name: "Enterprise",
    price: "Sur mesure",
    description: "Pour les réseaux de formation et grands organismes.",
    features: [
      "Tout du plan Professional",
      "Multi-sites et franchises",
      "API & Intégrations personnalisées",
      "Formation et accompagnement dédiés",
      "Account Manager dédié",
      "Marque blanche complète",
      "SLA garantis"
    ],
    cta: "Contacter les ventes",
    highlight: false,
    icon: Zap
  }
]

export function Pricing() {
  const { ref: bgRef, y: bgY } = useParallax(60)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <section id="tarifs" className="relative py-32 md:py-40 lg:py-56 overflow-hidden bg-gradient-to-b from-white via-gray-50/50 to-white">
      {/* Enhanced Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        {/* Animated aurora gradient */}
        <div className="absolute inset-0 bg-gradient-aurora" />

        <motion.div
          ref={bgRef}
          style={{ y: bgY }}
          className="absolute bottom-[10%] left-[5%] w-[600px] h-[600px] bg-gradient-radial-cyan rounded-full blur-[120px] opacity-40 animate-wave"
        />

        <motion.div
          className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-gradient-radial-blue rounded-full blur-[100px] opacity-30 animate-bounce-slow"
        />

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(39,68,114,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(39,68,114,0.015)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-4xl mx-auto mb-20 md:mb-28">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-white/80 to-white/60 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(52,185,238,0.12)] mb-8 overflow-hidden group"
          >
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <Sparkles className="relative w-4 h-4 text-brand-cyan" />
            <span className="relative text-sm md:text-base font-bold bg-gradient-to-r from-brand-cyan-darker to-brand-blue-darker bg-clip-text text-transparent">
              Tarification transparente
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tightest text-gray-900 mb-8 leading-tighter font-display"
          >
            Des tarifs{' '}
            <span className="relative inline-block italic font-light">
              <span className="absolute inset-0 blur-3xl bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue opacity-50 animate-gradient-xy" />
              <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue bg-[length:200%_auto] animate-gradient-shift font-extrabold">
                simples
              </span>
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-xl lg:text-2xl text-gray-700 leading-relaxed font-light tracking-tight"
          >
            Choisissez le plan qui{' '}
            <span className="italic font-normal">correspond</span> à la taille et aux besoins de{' '}
            <span className="text-gradient-animated font-extrabold tracking-tighter not-italic">
              votre organisme
            </span>
          </motion.p>
        </div>

        {/* Pricing Cards */}
        <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10 max-w-7xl mx-auto items-stretch">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 80, scale: 0.9 }}
              animate={isInView ? {
                opacity: 1,
                y: 0,
                scale: plan.highlight ? 1.08 : 1
              } : {}}
              transition={{ duration: 0.8, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{
                y: -16,
                scale: plan.highlight ? 1.12 : 1.04,
                rotateY: hoveredIndex === index ? 2 : 0
              }}
              onHoverStart={() => setHoveredIndex(index)}
              onHoverEnd={() => setHoveredIndex(null)}
              className={`relative rounded-[2rem] md:rounded-[3rem] p-10 md:p-12 flex flex-col transition-all duration-800 ${
                plan.highlight
                  ? 'bg-gradient-to-br from-brand-blue via-brand-blue-dark to-brand-cyan'
                  : 'bg-white/60 backdrop-blur-2xl border-2 border-white/40'
              }`}
              style={{
                transformStyle: 'preserve-3d',
                boxShadow: plan.highlight
                  ? '0 50px 100px -20px rgba(39,68,114,0.35), 0 0 80px rgba(52,185,238,0.25), inset 0 1px 0 rgba(255,255,255,0.2)'
                  : '0 20px 60px -15px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6)'
              }}
            >
              {/* Glassmorphic overlay */}
              {!plan.highlight && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/50 to-white/80 rounded-[2rem] md:rounded-[3rem]" />
              )}

              {/* Animated glow on hover */}
              {plan.highlight && (
                <motion.div
                  className="absolute inset-0 rounded-[2rem] md:rounded-[3rem] opacity-0 transition-opacity duration-800"
                  animate={{
                    opacity: hoveredIndex === index ? 1 : 0
                  }}
                  style={{
                    background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.2), transparent 70%)'
                  }}
                />
              )}

              {/* Popular badge */}
              {plan.highlight && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.8 }}
                  animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                  transition={{ duration: 0.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute -top-6 left-1/2 -translate-x-1/2"
                >
                  <div className="relative px-6 py-2.5 rounded-full bg-gradient-to-r from-brand-cyan via-brand-cyan-light to-brand-cyan shadow-2xl shadow-brand-cyan/50 overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <div className="relative flex items-center gap-2">
                      <Crown className="w-4 h-4 text-white animate-pulse" />
                      <span className="text-sm font-black text-white uppercase tracking-wider">
                        Le plus populaire
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="relative z-10">
                {/* Icon */}
                <motion.div
                  className={`inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-3xl mb-8 ${
                    plan.highlight
                      ? 'bg-white/20 backdrop-blur-xl border border-white/30'
                      : 'bg-gradient-to-br from-brand-blue/10 to-brand-cyan/10 border border-brand-blue/20'
                  }`}
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  <plan.icon className={`w-8 h-8 md:w-10 md:h-10 ${
                    plan.highlight ? 'text-white' : 'text-brand-blue'
                  }`} />
                </motion.div>

                {/* Plan name */}
                <h3 className={`text-3xl md:text-4xl font-black mb-4 font-display tracking-tight ${
                  plan.highlight ? 'text-white italic' : 'text-gray-900'
                }`}>
                  {plan.name}
                </h3>

                {/* Description */}
                <p className={`text-base md:text-lg mb-10 min-h-[3rem] font-light italic tracking-wide ${
                  plan.highlight ? 'text-white/95' : 'text-gray-700'
                }`}>
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mb-12">
                  {plan.price === "Sur mesure" ? (
                    <span className={`text-4xl md:text-5xl lg:text-6xl font-black font-display ${
                      plan.highlight ? 'text-white' : 'text-gray-900'
                    }`}>
                      {plan.price}
                    </span>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className={`text-6xl md:text-7xl lg:text-8xl font-black font-display leading-none ${
                        plan.highlight ? 'text-white' : 'text-gray-900'
                      }`}>
                        {plan.price}
                      </span>
                      <div className="flex flex-col">
                        <span className={`text-2xl md:text-3xl font-bold ${
                          plan.highlight ? 'text-white' : 'text-gray-900'
                        }`}>€</span>
                        <span className={`text-lg ${
                          plan.highlight ? 'text-white/80' : 'text-gray-600'
                        }`}>
                          {plan.period}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-5 mb-12 flex-1">
                  {plan.features.map((feature, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={isInView ? { opacity: 1, x: 0 } : {}}
                      transition={{ duration: 0.6, delay: 0.5 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                      className="flex items-start gap-4"
                    >
                      <div className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${
                        plan.highlight
                          ? 'bg-white/20 backdrop-blur-md'
                          : 'bg-brand-blue/10'
                      }`}>
                        <Check className={`w-4 h-4 ${
                          plan.highlight ? 'text-white' : 'text-brand-blue'
                        }`} />
                      </div>
                      <span className={`text-base md:text-lg font-medium ${
                        plan.highlight ? 'text-white/95' : 'text-gray-800'
                      }`}>
                        {feature}
                      </span>
                    </motion.li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Link href="/auth/register" className="block">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="relative group"
                  >
                    {plan.highlight && (
                      <div className="absolute -inset-1 bg-white rounded-3xl opacity-20 blur-xl" />
                    )}
                    <Button
                      className={`relative w-full h-16 md:h-18 rounded-2xl text-lg md:text-xl font-black transition-all duration-600 overflow-hidden ${
                        plan.highlight
                          ? 'bg-white text-brand-blue hover:bg-gray-50 shadow-2xl shadow-white/30'
                          : 'bg-gradient-to-r from-brand-blue to-brand-cyan text-white hover:from-brand-blue-dark hover:to-brand-cyan-dark shadow-2xl shadow-brand-blue/30'
                      }`}
                    >
                      {!plan.highlight && (
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      )}
                      <span className="relative">{plan.cta}</span>
                      <ArrowRight className="relative w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </motion.div>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom guarantee */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20 md:mt-24 text-center"
        >
          <div className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl">
            <Sparkles className="w-6 h-6 text-brand-cyan" />
            <span className="text-lg md:text-xl font-bold text-gray-900">
              Garantie satisfait ou remboursé pendant 30 jours
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
