'use client'

import { motion, useInView, useMotionValue, useTransform, useSpring } from '@/components/ui/motion'
import { useRef, useState, useCallback } from 'react'
import {
  CreditCard,
  FileText,
  GraduationCap,
  BookOpen,
  PenTool,
  UserCheck,
  Clock,
  Scale,
  Lock,
  ArrowRight,
  Sparkles,
  Zap,
} from 'lucide-react'
import { useParallax } from '@/lib/hooks/useParallax'

const features = [
  {
    icon: PenTool,
    title: "Signature Électronique eIDAS",
    description: "Signez vos documents en ligne avec une valeur juridique équivalente à un acte notarié. Conformité eIDAS garantie, horodatage certifié et preuve infalsifiable.",
    stat: "3 jours",
    statLabel: "gagnés par contrat",
    badges: ["Valeur légale", "Gain de temps", "Sécurisé"],
    featured: true,
  },
  {
    icon: UserCheck,
    title: "Émargements Numériques",
    description: "Émargement par QR code, signature tactile ou géolocalisation. Vos stagiaires signent en 2 secondes, vous économisez 5h/semaine en gestion administrative.",
    stat: "5h/sem",
    statLabel: "économisées",
    badges: ["Conforme Qualiopi", "Zéro papier"],
    featured: true,
  },
  {
    icon: Lock,
    title: "Sécurité Maximale",
    description: "Cryptage AES-256 (standards bancaires), hébergement certifié ISO 27001, sauvegardes automatiques et 992 tests de sécurité quotidiens. Conformité RGPD totale.",
    stat: "AES-256",
    statLabel: "cryptage bancaire",
    badges: ["Cryptage bancaire", "ISO 27001", "RGPD"],
    featured: true,
  },
  {
    icon: GraduationCap,
    title: "Gestion Complète",
    description: "Automatisez toutes vos tâches : sessions, stagiaires, formateurs. Concentrez-vous sur l'essentiel — la pédagogie.",
    stat: "20h/sem",
    statLabel: "gagnées",
  },
  {
    icon: Scale,
    title: "Conformité Légale",
    description: "Conventions, attestations, certificats conformes au Code du Travail et aux exigences OPCO, CPF, Pôle Emploi.",
    stat: "100%",
    statLabel: "conforme",
    badges: ["Code du Travail", "OPCO", "CPF"],
  },
  {
    icon: Clock,
    title: "Gain de Temps",
    description: "Documents en 1 clic, emails automatiques, relances programmées. Ce qui prenait des heures ne prend plus que des minutes.",
    stat: "-80%",
    statLabel: "temps admin",
    badges: ["-80% admin", "1 clic"],
  },
  {
    icon: BookOpen,
    title: "E-Learning Intégré",
    description: "Proposez des formations en ligne 24/7. Multipliez vos sessions et diversifiez vos revenus sans coûts supplémentaires.",
    stat: "24/7",
    statLabel: "accessible",
  },
  {
    icon: FileText,
    title: "Conformité Qualiopi",
    description: "Passez vos audits en toute sérénité. Documents générés automatiquement et conformes. Certification sans stress.",
    stat: "100%",
    statLabel: "audit-ready",
  },
  {
    icon: CreditCard,
    title: "Facturation CPF",
    description: "Facturation CPF et subrogations automatisées. Zéro erreur, conformité garantie, tranquillité d'esprit assurée.",
    stat: "0",
    statLabel: "erreur facturation",
  },
]

// 3D tilt card
function FeatureCard({ feature, index, isInView }: { feature: typeof features[0]; index: number; isInView: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), { stiffness: 200, damping: 20 })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-6, 6]), { stiffness: 200, damping: 20 })

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

  const isFeatured = feature.featured

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 60, filter: 'blur(8px)' }}
      animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
      transition={{
        duration: 0.8,
        delay: index * 0.07,
        ease: [0.16, 1, 0.3, 1],
      }}
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
      {/* Animated gradient border on hover */}
      <div className="absolute -inset-[1px] rounded-[28px] overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue bg-[length:200%_auto] animate-gradient-x" />
      </div>

      {/* Card body */}
      <div className={`relative h-full rounded-[26px] p-8 md:p-10 bg-white transition-all duration-700 ${
        isFeatured
          ? 'border-2 border-brand-blue/10 shadow-xl group-hover:shadow-2xl group-hover:shadow-brand-blue/10'
          : 'border border-gray-200/60 shadow-lg group-hover:shadow-xl group-hover:shadow-brand-blue/5'
      }`}>
        {/* Subtle radial glow on hover */}
        <div
          className="absolute inset-0 rounded-[26px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
          style={{
            background: 'radial-gradient(600px circle at 50% 0%, rgba(52, 185, 238, 0.06), transparent 50%)',
          }}
        />

        {/* Shimmer line at top */}
        <div className="absolute top-0 left-10 right-10 h-[1px] overflow-hidden rounded-full">
          <div className="h-full bg-gradient-to-r from-brand-blue/40 via-brand-cyan/60 to-brand-blue/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent animate-shimmer-slow opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        </div>

        {/* Featured badge */}
        {isFeatured && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: index * 0.07 + 0.3 }}
            className="absolute -top-3.5 right-6"
          >
            <span className="relative inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-white shadow-lg shadow-brand-blue/25 overflow-hidden">
              <span className="absolute inset-0 bg-gradient-to-r from-brand-blue to-brand-cyan" />
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-slow" />
              <Sparkles className="w-3 h-3 relative z-10" />
              <span className="relative z-10 text-[10px] font-bold tracking-widest uppercase">Essentiel</span>
            </span>
          </motion.div>
        )}

        {/* Icon */}
        <div className="relative mb-8">
          <motion.div
            className="relative w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-lg shadow-brand-blue/20"
            whileHover={{ scale: 1.1, rotate: 4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            <feature.icon className="w-7 h-7 relative z-10" strokeWidth={1.5} />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-cyan opacity-30 blur-xl group-hover:opacity-60 group-hover:blur-2xl transition-all duration-700" />
          </motion.div>
        </div>

        {/* Stat */}
        <div className="flex items-baseline gap-2.5 mb-4">
          <motion.span
            className="text-3xl md:text-4xl font-black text-brand-blue font-display tracking-tighter"
            initial={{ opacity: 0, x: -15 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: index * 0.07 + 0.15 }}
          >
            {feature.stat}
          </motion.span>
          <span className="text-sm text-gray-400 font-medium tracking-tight">{feature.statLabel}</span>
        </div>

        {/* Title */}
        <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 font-display leading-tight tracking-tight">
          {feature.title}
        </h3>

        {/* Description */}
        <p className="text-[15px] text-gray-500 leading-relaxed mb-6 font-light tracking-[-0.01em]">
          {feature.description}
        </p>

        {/* Badges */}
        {'badges' in feature && feature.badges && (
          <div className="flex flex-wrap gap-2 mb-6">
            {feature.badges.map((badge, badgeIndex) => (
              <motion.span
                key={badgeIndex}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.4, delay: index * 0.07 + 0.35 + badgeIndex * 0.05 }}
                className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase text-brand-blue-darker/70 bg-brand-blue-ghost/60 border border-brand-blue-pale/40"
              >
                {badge}
              </motion.span>
            ))}
          </div>
        )}

        {/* Learn more */}
        <div className="flex items-center gap-2 text-sm font-medium text-gray-300 group-hover:text-brand-cyan transition-colors duration-500 tracking-tight">
          <span>En savoir plus</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
        </div>
      </div>
    </motion.div>
  )
}

export function Features() {
  const { ref: bgRef1, y: bg1Y } = useParallax(60)
  const { ref: bgRef2, y: bg2Y } = useParallax(100)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-80px' })
  const headerRef = useRef<HTMLDivElement>(null)
  const headerInView = useInView(headerRef, { once: true, margin: '-50px' })

  return (
    <section id="features" className="relative py-16 md:py-20 lg:py-24 overflow-hidden bg-gradient-to-b from-white via-gray-50/20 to-white">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(39,68,114,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(39,68,114,0.02)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_50%,black,transparent)]" />

        {/* Parallax blobs */}
        <motion.div
          ref={bgRef1}
          style={{ y: bg1Y }}
          className="absolute top-[5%] right-[-5%] w-[500px] h-[500px] bg-gradient-to-br from-brand-blue/8 to-brand-cyan/5 rounded-full blur-[100px]"
        />
        <motion.div
          ref={bgRef2}
          style={{ y: bg2Y }}
          className="absolute bottom-[10%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-tr from-brand-cyan/6 to-brand-blue/4 rounded-full blur-[120px]"
        />

        {/* Floating dots */}
        <div className="absolute top-[20%] left-[15%] w-1.5 h-1.5 rounded-full bg-brand-cyan/25 animate-float" />
        <div className="absolute top-[45%] right-[18%] w-1 h-1 rounded-full bg-brand-blue/20 animate-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-[25%] left-[22%] w-2 h-2 rounded-full bg-brand-cyan/15 animate-float" style={{ animationDelay: '3s' }} />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div ref={headerRef} className="text-center max-w-4xl mx-auto mb-14 md:mb-16 lg:mb-20">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={headerInView ? { opacity: 1, scale: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-md mb-10"
          >
            <Zap className="w-4 h-4 text-brand-cyan" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-brand-blue-darker/80 font-display">
              9 modules intégrés
            </span>
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 50, filter: 'blur(8px)' }}
            animate={headerInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl md:text-6xl lg:text-7xl tracking-tightest text-gray-900 mb-8 leading-tighter font-display"
          >
            <span className="font-extralight italic tracking-luxe">Tout ce dont vous avez</span>
            <br />
            <span className="font-extralight italic tracking-luxe">besoin pour </span>
            <span className="relative inline-block">
              <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue bg-[length:200%_auto] animate-gradient-x font-black not-italic">
                réussir
              </span>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={headerInView ? { scaleX: 1 } : {}}
                transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="absolute -bottom-2 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue rounded-full origin-left"
              />
            </span>
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-xl lg:text-2xl text-gray-400 leading-relaxed max-w-3xl mx-auto font-light tracking-tight"
          >
            Découvrez comment EduZen transforme la gestion de votre organisme pour{' '}
            <span className="font-medium text-gray-700">générer plus de revenus</span>,{' '}
            <span className="font-medium text-gray-700">économiser du temps</span>{' '}
            et améliorer la satisfaction de vos stagiaires.
          </motion.p>
        </div>

        {/* Cards */}
        <div ref={containerRef} className="max-w-7xl mx-auto">
          {/* Featured row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-7 mb-5 md:mb-7">
            {features.slice(0, 3).map((feature, index) => (
              <FeatureCard key={index} feature={feature} index={index} isInView={isInView} />
            ))}
          </div>

          {/* Secondary row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-7">
            {features.slice(3).map((feature, index) => (
              <FeatureCard key={index + 3} feature={feature} index={index + 3} isInView={isInView} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
