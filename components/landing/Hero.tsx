'use client'

import { memo } from 'react'
import { ArrowRight, CheckCircle2, PlayCircle, Sparkles, Zap } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// Hero optimisé pour le LCP - animations CSS uniquement, pas de Framer Motion au chargement initial
export const Hero = memo(function Hero() {
  return (
    <section className="relative pt-40 pb-32 md:pt-56 md:pb-48 lg:pt-72 lg:pb-72 overflow-hidden bg-gradient-to-b from-white via-gray-50/30 to-white">
      {/* Background simplifié - blurs réduits pour performance GPU */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Gradient mesh léger */}
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.15),transparent)]" />

        {/* Blobs simplifiés avec will-change pour GPU */}
        <div
          className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-gradient-to-br from-brand-blue/20 to-brand-cyan/10 rounded-full blur-[80px] opacity-50 will-change-transform animate-float-slow"
          style={{ transform: 'translateZ(0)' }}
        />
        <div
          className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-tr from-brand-cyan/15 to-brand-blue/10 rounded-full blur-[80px] opacity-40 will-change-transform animate-float-slower"
          style={{ transform: 'translateZ(0)' }}
        />

        {/* Grid pattern optimisé */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(39,68,114,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(39,68,114,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,black,transparent)]" />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col items-center text-center max-w-7xl mx-auto">
          {/* Premium Badge - CSS animation only */}
          <div className="animate-fade-in-up relative inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-lg mb-12 md:mb-16">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-cyan"></span>
            </span>
            <span className="text-sm md:text-base font-bold bg-gradient-to-r from-brand-blue-darker to-brand-cyan-dark bg-clip-text text-transparent">
              La référence pour les organismes de formation
            </span>
            <Sparkles className="w-4 h-4 text-brand-cyan" />
          </div>

          {/* Headline - Pas d'animation JS, CSS fade-in */}
          <div className="animate-fade-in-up animation-delay-100 relative mb-12 md:mb-16">
            <h1 className="relative text-5xl md:text-7xl lg:text-8xl font-black tracking-tightest leading-tightest font-display">
              <span className="block text-gray-900 font-extralight tracking-luxe">
                Gérez votre organisme
              </span>
              <span className="block text-gray-900 italic font-medium tracking-tight">
                de formation avec
              </span>
              <span className="block relative mt-4">
                <span className="relative inline-block">
                  <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue bg-[length:200%_auto] animate-gradient-x font-black not-italic">
                    simplicité
                  </span>
                </span>
              </span>
            </h1>
          </div>

          {/* Subtitle */}
          <p className="animate-fade-in-up animation-delay-200 text-lg md:text-xl lg:text-2xl text-gray-700 mb-16 md:mb-20 max-w-4xl leading-relaxed font-light tracking-tight">
            Une plateforme{' '}
            <span className="italic font-normal">complète</span> pour{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan font-extrabold tracking-tighter not-italic">
              digitaliser et optimiser
            </span>{' '}
            la gestion de votre organisme de formation.{' '}
            <span className="font-medium">De l'inscription des stagiaires à la facturation CPF</span>, en passant par la{' '}
            <span className="italic text-brand-blue font-semibold">conformité Qualiopi</span>.
          </p>

          {/* CTAs - CSS hover effects */}
          <div className="animate-fade-in-up animation-delay-300 flex flex-col sm:flex-row gap-6 w-full sm:w-auto mb-20 md:mb-24">
            <Link href="/auth/register" className="group">
              <Button
                size="lg"
                className="relative h-16 md:h-18 px-12 text-xl font-bold rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan hover:from-brand-blue-dark hover:to-brand-cyan-dark text-white shadow-xl hover:shadow-2xl hover:shadow-brand-blue/30 w-full sm:w-auto transition-all duration-300 hover:-translate-y-1"
              >
                <Zap className="w-6 h-6 mr-3" />
                Essayer gratuitement
                <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <Button
              size="lg"
              variant="outline"
              className="relative h-16 md:h-18 px-12 text-xl font-bold rounded-full border-2 border-gray-300 hover:border-brand-blue bg-white hover:bg-gray-50 text-gray-900 hover:text-brand-blue shadow-lg hover:shadow-xl w-full sm:w-auto transition-all duration-300 hover:-translate-y-1"
            >
              <PlayCircle className="w-6 h-6 mr-3" />
              Voir la démo
            </Button>
          </div>

          {/* Trust badges - CSS stagger animation */}
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {[
              { text: "14 jours d'essai gratuit" },
              { text: "Aucune carte bancaire requise" },
              { text: "Support 24/7" }
            ].map((item, index) => (
              <div
                key={index}
                className={`animate-fade-in-up flex items-center gap-3 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`}
                style={{ animationDelay: `${400 + index * 100}ms` }}
              >
                <CheckCircle2 className="w-5 h-5 text-brand-cyan" />
                <span className="text-base md:text-lg font-semibold text-gray-800">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Dashboard Preview - Simplifié, pas d'animation complexe */}
          <div className="animate-fade-in-up animation-delay-700 mt-24 md:mt-32 lg:mt-40 relative w-full max-w-6xl">
            <div className="relative rounded-2xl md:rounded-3xl border-2 border-gray-200/50 bg-white/60 backdrop-blur-sm p-3 md:p-4 shadow-2xl hover:shadow-3xl transition-shadow duration-500">
              <div className="relative rounded-xl md:rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 via-gray-50 to-white aspect-[16/9]">
                {/* Placeholder simple */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-blue-pale/30 via-white to-brand-cyan-pale/30" />

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue font-display">
                    Interface Dashboard Premium
                  </div>
                </div>

                {/* Badge statique */}
                <div className="absolute bottom-6 right-6 px-5 py-2.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-brand-cyan animate-pulse" />
                    <span className="text-sm md:text-base font-bold bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">
                      Plateforme complète
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
})
