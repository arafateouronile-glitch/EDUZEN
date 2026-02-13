'use client'

import { motion, useInView, useMotionValue, useTransform, useSpring } from '@/components/ui/motion'
import { useRef, useState, useCallback } from 'react'
import { UserPlus, Settings, Users, BarChart3, CheckCircle2, Zap, ArrowRight } from 'lucide-react'
import { useParallax } from '@/lib/hooks/useParallax'

const steps = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Créez votre compte',
    description: 'Inscription gratuite en 2 minutes. Aucune carte bancaire requise pour l\'essai de 14 jours.',
    details: ['Essai gratuit 14 jours', 'Sans engagement', 'Configuration guidée'],
  },
  {
    number: '02',
    icon: Settings,
    title: 'Configurez votre organisme',
    description: 'Importez vos formations, formateurs et stagiaires existants. Notre assistant vous guide pas à pas.',
    details: ['Import Excel/CSV', 'Templates prêts à l\'emploi', 'Support dédié'],
  },
  {
    number: '03',
    icon: Users,
    title: 'Gérez vos sessions',
    description: 'Inscriptions, émargements, documents... Tout est automatisé et conforme Qualiopi.',
    details: ['Émargement QR Code', 'Documents automatiques', 'Conformité garantie'],
  },
  {
    number: '04',
    icon: BarChart3,
    title: 'Pilotez votre activité',
    description: 'Suivez vos KPIs en temps réel, facturez automatiquement et développez votre chiffre d\'affaires.',
    details: ['Dashboard temps réel', 'Facturation CPF', 'Analytics avancés'],
  },
]

function StepCard({ step, index, isInView }: { step: typeof steps[0]; index: number; isInView: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), { stiffness: 200, damping: 20 })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), { stiffness: 200, damping: 20 })

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5)
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5)
  }, [mouseX, mouseY])

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0)
    mouseY.set(0)
    setIsHovered(false)
  }, [mouseX, mouseY])

  const Icon = step.icon

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 60, filter: 'blur(8px)' }}
      animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
      transition={{ duration: 0.8, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      style={{
        rotateX: isHovered ? rotateX : 0,
        rotateY: isHovered ? rotateY : 0,
        transformPerspective: 1200,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="relative group cursor-default"
    >
      {/* Animated gradient border */}
      <div className="absolute -inset-[1px] rounded-[28px] overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue bg-[length:200%_auto] animate-gradient-x" />
      </div>

      {/* Card */}
      <div className="relative h-full rounded-[26px] bg-white border border-gray-200/60 shadow-lg group-hover:shadow-xl group-hover:shadow-brand-blue/5 transition-all duration-700 p-8 md:p-10">
        {/* Glow */}
        <div
          className="absolute inset-0 rounded-[26px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
          style={{ background: 'radial-gradient(600px circle at 50% 0%, rgba(52, 185, 238, 0.06), transparent 50%)' }}
        />

        {/* Shimmer top line */}
        <div className="absolute top-0 left-10 right-10 h-[1px] overflow-hidden rounded-full">
          <div className="h-full bg-gradient-to-r from-brand-blue/40 via-brand-cyan/60 to-brand-blue/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent animate-shimmer-slow opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        </div>

        {/* Step number badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: index * 0.1 + 0.2, type: 'spring', stiffness: 300 }}
          className="absolute -top-4 -left-4"
        >
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center shadow-lg shadow-brand-blue/25">
            <span className="text-lg font-black text-white font-display tracking-tight">{step.number}</span>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-cyan opacity-30 blur-xl" />
          </div>
        </motion.div>

        {/* Icon */}
        <div className="flex items-center justify-between mb-7">
          <motion.div
            className="w-14 h-14 rounded-2xl bg-brand-blue-ghost/60 group-hover:bg-gradient-to-br group-hover:from-brand-blue group-hover:to-brand-cyan flex items-center justify-center transition-all duration-500"
            whileHover={{ scale: 1.1, rotate: 4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            <Icon className="w-7 h-7 text-brand-blue group-hover:text-white transition-colors duration-500" strokeWidth={1.5} />
          </motion.div>
        </div>

        {/* Title */}
        <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 font-display leading-tight tracking-tight">
          {step.title}
        </h3>

        {/* Description */}
        <p className="text-[15px] text-gray-500 leading-relaxed mb-6 font-light tracking-[-0.01em]">
          {step.description}
        </p>

        {/* Details */}
        <ul className="space-y-3">
          {step.details.map((detail, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 + 0.3 + i * 0.05 }}
              className="flex items-center gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-brand-cyan flex-shrink-0" strokeWidth={2} />
              <span className="text-sm text-gray-500 font-medium tracking-tight">{detail}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  )
}

export function HowItWorks() {
  const { ref: bgRef1, y: bg1Y } = useParallax(60)
  const { ref: bgRef2, y: bg2Y } = useParallax(100)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-80px' })
  const headerRef = useRef<HTMLDivElement>(null)
  const headerInView = useInView(headerRef, { once: true, margin: '-50px' })

  return (
    <section id="comment-ca-marche" className="relative py-16 md:py-20 lg:py-24 overflow-hidden bg-gradient-to-b from-gray-50/40 via-white to-gray-50/20">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(39,68,114,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(39,68,114,0.02)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_50%,black,transparent)]" />

        <motion.div
          ref={bgRef1}
          style={{ y: bg1Y }}
          className="absolute top-[10%] right-[-8%] w-[500px] h-[500px] bg-gradient-to-br from-brand-blue/8 to-brand-cyan/5 rounded-full blur-[100px]"
        />
        <motion.div
          ref={bgRef2}
          style={{ y: bg2Y }}
          className="absolute bottom-[5%] left-[-5%] w-[600px] h-[600px] bg-gradient-to-tr from-brand-cyan/6 to-brand-blue/4 rounded-full blur-[120px]"
        />

        <div className="absolute top-[25%] left-[12%] w-1.5 h-1.5 rounded-full bg-brand-cyan/25 animate-float" />
        <div className="absolute bottom-[30%] right-[15%] w-2 h-2 rounded-full bg-brand-blue/15 animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div ref={headerRef} className="text-center max-w-4xl mx-auto mb-14 md:mb-16 lg:mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={headerInView ? { opacity: 1, scale: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-md mb-10"
          >
            <Zap className="w-4 h-4 text-brand-cyan" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-brand-blue-darker/80 font-display">
              Simple comme bonjour
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 50, filter: 'blur(8px)' }}
            animate={headerInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl md:text-6xl lg:text-7xl tracking-tightest text-gray-900 mb-8 leading-tighter font-display"
          >
            <span className="font-extralight italic tracking-luxe">Comment ça</span>
            <br />
            <span className="relative inline-block">
              <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue bg-[length:200%_auto] animate-gradient-x font-black not-italic">
                marche ?
              </span>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={headerInView ? { scaleX: 1 } : {}}
                transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="absolute -bottom-2 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue rounded-full origin-left"
              />
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-xl lg:text-2xl text-gray-400 leading-relaxed max-w-3xl mx-auto font-light tracking-tight"
          >
            <span className="font-medium text-gray-700">4 étapes simples</span> pour digitaliser votre organisme de formation
          </motion.p>
        </div>

        {/* Steps grid */}
        <div ref={containerRef} className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-7">
            {steps.map((step, index) => (
              <StepCard key={step.number} step={step} index={index} isInView={isInView} />
            ))}
          </div>

          {/* Bottom progress bar */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : {}}
            transition={{ duration: 1.5, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:block h-[3px] bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue rounded-full mt-10 origin-left"
          />
        </div>
      </div>
    </section>
  )
}
