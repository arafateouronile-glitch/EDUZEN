'use client'

import { motion, useInView, useMotionValue, useTransform, useSpring } from '@/components/ui/motion'
import { useRef, useState, useEffect, useCallback } from 'react'
import { Clock, ShieldCheck, TrendingUp, FileCheck, ArrowRight, Sparkles } from 'lucide-react'
import { useParallax } from '@/lib/hooks/useParallax'

// Animated counter with easeOutCubic
function AnimatedCounter({ end, duration = 2000, suffix = '', prefix = '' }: { end: number; duration?: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  useEffect(() => {
    if (!isInView) return
    const startTime = Date.now()
    const update = () => {
      const progress = Math.min((Date.now() - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * end))
      if (progress < 1) requestAnimationFrame(update)
    }
    requestAnimationFrame(update)
  }, [isInView, end, duration])

  return <span ref={ref}>{prefix}{count}{suffix}</span>
}

const bentoCards = [
  {
    title: "Gagnez 20h par semaine",
    description: "Automatisez 80% de vos tâches administratives. Feuilles de présence, attestations, conventions... tout est généré en 1 clic.",
    stat: 80,
    statSuffix: "%",
    statLabel: "moins d'admin",
    icon: Clock,
    size: 'large' as const,
  },
  {
    title: "Passez Qualiopi sereinement",
    description: "Tous vos documents sont automatiquement conformes aux critères Qualiopi. Préparez votre audit en quelques clics, pas en quelques semaines.",
    stat: 100,
    statSuffix: "%",
    statLabel: "conforme",
    icon: FileCheck,
    size: 'large' as const,
  },
  {
    title: "Augmentez vos revenus",
    description: "Proposez des formations e-learning 24/7, gérez plus de stagiaires avec moins d'effort et réduisez vos coûts opérationnels.",
    stat: 30,
    statPrefix: "+",
    statSuffix: "%",
    statLabel: "de CA moyen",
    icon: TrendingUp,
    size: 'small' as const,
  },
  {
    title: "Sécurisez vos données",
    description: "Cryptage bancaire AES-256, hébergement en France, conformité RGPD totale. Vos données et celles de vos stagiaires sont en sécurité.",
    stat: 99.9,
    statSuffix: "%",
    statLabel: "disponibilité",
    icon: ShieldCheck,
    size: 'small' as const,
  },
]

// 3D tilt bento card
function BentoCard({ card, index, isInView }: { card: typeof bentoCards[0]; index: number; isInView: boolean }) {
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

  const isLarge = card.size === 'large'
  const Icon = card.icon

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
      className={`relative group cursor-default ${isLarge ? 'md:col-span-1' : ''}`}
    >
      {/* Animated gradient border */}
      <div className="absolute -inset-[1px] rounded-[28px] overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue bg-[length:200%_auto] animate-gradient-x" />
      </div>

      {/* Card */}
      <div className={`relative h-full rounded-[26px] bg-white transition-all duration-700 overflow-hidden ${
        isLarge
          ? 'border-2 border-brand-blue/10 shadow-xl group-hover:shadow-2xl group-hover:shadow-brand-blue/10'
          : 'border border-gray-200/60 shadow-lg group-hover:shadow-xl group-hover:shadow-brand-blue/5'
      }`}>
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

        <div className={`relative ${isLarge ? 'p-10 md:p-12' : 'p-8 md:p-10'}`}>
          {/* Icon */}
          <motion.div
            className="relative w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-lg shadow-brand-blue/20 mb-8"
            whileHover={{ scale: 1.1, rotate: 4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            <Icon className="w-7 h-7 relative z-10" strokeWidth={1.5} />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-cyan opacity-30 blur-xl group-hover:opacity-60 group-hover:blur-2xl transition-all duration-700" />
          </motion.div>

          {/* Title */}
          <h3 className={`font-bold text-gray-900 font-display leading-tight tracking-tight mb-4 ${
            isLarge ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'
          }`}>
            {card.title}
          </h3>

          {/* Description */}
          <p className={`text-gray-500 leading-relaxed font-light tracking-[-0.01em] mb-8 ${
            isLarge ? 'text-[15px] md:text-base' : 'text-[15px]'
          }`}>
            {card.description}
          </p>

          {/* Stat block */}
          <div className={`relative rounded-2xl border border-brand-blue-pale/30 bg-gradient-to-br from-brand-blue-ghost/40 to-white ${
            isLarge ? 'p-8' : 'p-6'
          }`}>
            {/* Stat number */}
            <motion.div
              className={`font-black text-brand-blue font-display tracking-tighter ${
                isLarge ? 'text-6xl md:text-7xl' : 'text-5xl md:text-6xl'
              }`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.8, delay: index * 0.1 + 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              {card.stat === 99.9 ? (
                <span>99.9<span className="text-brand-cyan">%</span></span>
              ) : (
                <AnimatedCounter
                  end={card.stat}
                  prefix={card.statPrefix || ''}
                  suffix={card.statSuffix || ''}
                />
              )}
            </motion.div>

            {/* Stat label */}
            <p className="text-sm text-gray-400 font-medium tracking-tight mt-2">
              {card.statLabel}
            </p>

            {/* Progress bar */}
            <motion.div
              className="mt-4 h-[3px] rounded-full bg-brand-blue-pale/30 overflow-hidden"
            >
              <motion.div
                className="h-full bg-gradient-to-r from-brand-blue to-brand-cyan rounded-full"
                initial={{ scaleX: 0 }}
                animate={isInView ? { scaleX: 1 } : {}}
                transition={{ duration: 1.2, delay: index * 0.1 + 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: 'left', width: `${Math.min(card.stat, 100)}%` }}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function BentoShowcase() {
  const { ref: bgRef1, y: bg1Y } = useParallax(60)
  const { ref: bgRef2, y: bg2Y } = useParallax(100)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-80px' })
  const headerRef = useRef<HTMLDivElement>(null)
  const headerInView = useInView(headerRef, { once: true, margin: '-50px' })

  return (
    <section className="relative py-16 md:py-20 lg:py-24 overflow-hidden bg-gradient-to-b from-white via-gray-50/20 to-white">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(39,68,114,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(39,68,114,0.02)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_50%,black,transparent)]" />

        <motion.div
          ref={bgRef1}
          style={{ y: bg1Y }}
          className="absolute top-[10%] left-[-5%] w-[500px] h-[500px] bg-gradient-to-br from-brand-cyan/8 to-brand-blue/5 rounded-full blur-[100px]"
        />
        <motion.div
          ref={bgRef2}
          style={{ y: bg2Y }}
          className="absolute bottom-[5%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-tr from-brand-blue/6 to-brand-cyan/4 rounded-full blur-[120px]"
        />

        <div className="absolute top-[30%] right-[12%] w-1.5 h-1.5 rounded-full bg-brand-blue/20 animate-float" />
        <div className="absolute bottom-[35%] left-[18%] w-2 h-2 rounded-full bg-brand-cyan/15 animate-float" style={{ animationDelay: '2s' }} />
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
            <Sparkles className="w-4 h-4 text-brand-cyan" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-brand-blue-darker/80 font-display">
              Résultats concrets
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 50, filter: 'blur(8px)' }}
            animate={headerInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl md:text-6xl lg:text-7xl tracking-tightest text-gray-900 mb-8 leading-tighter font-display"
          >
            <span className="font-extralight italic tracking-luxe">Concentrez-vous sur</span>
            <br />
            <span className="relative inline-block">
              <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue bg-[length:200%_auto] animate-gradient-x font-black not-italic">
                l'essentiel
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
            Pendant que vous formez vos stagiaires,{' '}
            <span className="font-medium text-gray-700">EduZen s'occupe de tout le reste.</span>
          </motion.p>
        </div>

        {/* Bento Grid */}
        <div ref={containerRef} className="max-w-7xl mx-auto">
          {/* Top row - 2 large cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-7 mb-5 md:mb-7">
            {bentoCards.slice(0, 2).map((card, index) => (
              <BentoCard key={index} card={card} index={index} isInView={isInView} />
            ))}
          </div>

          {/* Bottom row - 2 smaller cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-7">
            {bentoCards.slice(2).map((card, index) => (
              <BentoCard key={index + 2} card={card} index={index + 2} isInView={isInView} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
