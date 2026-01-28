'use client'

import { motion, useMotionValue, useTransform, useSpring } from '@/components/ui/motion'
import { ArrowRight, CheckCircle2, PlayCircle, Sparkles, Zap } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useParallax } from '@/lib/hooks/useParallax'
import { useEffect, useState } from 'react'

export function Hero() {
  // Désactiver les animations parallaxes au chargement initial pour améliorer LCP
  const [animationsEnabled, setAnimationsEnabled] = useState(false)
  
  useEffect(() => {
    // Activer les animations après le chargement initial (améliore LCP)
    const timer = setTimeout(() => setAnimationsEnabled(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const { ref: blobRef1, y: blob1Y } = useParallax(animationsEnabled ? 100 : 0)
  const { ref: blobRef2, y: blob2Y } = useParallax(animationsEnabled ? 150 : 0)
  const { ref: blobRef3, y: blob3Y } = useParallax(animationsEnabled ? 80 : 0)

  // Mouse tracking for magnetic effect
  const [isHovered, setIsHovered] = useState(false)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const buttonX = useSpring(useTransform(mouseX, [-100, 100], [-8, 8]), {
    stiffness: 200,
    damping: 20
  })
  const buttonY = useSpring(useTransform(mouseY, [-100, 100], [-8, 8]), {
    stiffness: 200,
    damping: 20
  })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    mouseX.set(e.clientX - centerX)
    mouseY.set(e.clientY - centerY)
  }

  return (
    <section className="relative pt-40 pb-32 md:pt-56 md:pb-48 lg:pt-72 lg:pb-72 overflow-hidden bg-gradient-to-b from-white via-gray-50/30 to-white">
      {/* Enhanced Background with Multiple Layers */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        {/* Animated gradient mesh with aurora effect */}
        <div className="absolute inset-0 bg-gradient-mesh" />

        {/* Parallax blobs with enhanced effects */}
        <motion.div
          ref={blobRef1}
          style={{ y: blob1Y }}
          className="absolute top-[-10%] right-[-5%] w-[700px] h-[700px] bg-gradient-to-br from-brand-blue/25 to-brand-cyan/15 rounded-full blur-[120px] opacity-50 animate-bounce-slow"
        />
        <motion.div
          ref={blobRef2}
          style={{ y: blob2Y }}
          className="absolute bottom-[-10%] left-[-10%] w-[800px] h-[800px] bg-gradient-to-tr from-brand-cyan/20 to-brand-blue/12 rounded-full blur-[120px] opacity-50 animate-wave"
          transition={{ delay: 1 }}
        />
        <motion.div
          ref={blobRef3}
          style={{ y: blob3Y }}
          className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[500px] h-[500px] bg-gradient-radial-blue rounded-full blur-[100px] opacity-40 animate-pulse-premium"
        />

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(39,68,114,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(39,68,114,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col items-center text-center max-w-7xl mx-auto">
          {/* Premium Badge with shimmer effect */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="relative inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-white/80 to-white/60 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(39,68,114,0.12)] mb-12 md:mb-16 overflow-hidden group"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent" />

            <div className="relative flex items-center gap-3">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-cyan shadow-lg shadow-brand-cyan/50"></span>
              </span>
              <span className="text-sm md:text-base font-bold bg-gradient-to-r from-brand-blue-darker to-brand-cyan-dark bg-clip-text text-transparent">
                La référence pour les organismes de formation
              </span>
              <Sparkles className="w-4 h-4 text-brand-cyan animate-pulse" />
            </div>
          </motion.div>

          {/* Headline with 3D effect - animations réduites pour LCP */}
          <motion.div
            initial={false}
            animate={animationsEnabled ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
            transition={animationsEnabled ? { duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } : { duration: 0 }}
            className="relative mb-12 md:mb-16"
          >
            {/* Glow effect behind text */}
            <div className="absolute inset-0 blur-[100px] bg-gradient-to-r from-brand-blue/20 via-brand-cyan/20 to-brand-blue/20 animate-gradient-shift" />

            <h1 className="relative text-5xl md:text-7xl lg:text-8xl font-black tracking-tightest leading-tightest font-display">
              <motion.span
                className="block text-gray-900 drop-shadow-sm font-extralight tracking-luxe"
                initial={false}
                animate={animationsEnabled ? { opacity: 1, x: 0 } : { opacity: 1, x: 0 }}
                transition={animationsEnabled ? { duration: 0.8, delay: 0.3 } : { duration: 0 }}
              >
                Gérez votre organisme
              </motion.span>
              <motion.span
                className="block text-gray-900 drop-shadow-sm italic font-medium tracking-tight"
                initial={false}
                animate={animationsEnabled ? { opacity: 1, x: 0 } : { opacity: 1, x: 0 }}
                transition={animationsEnabled ? { duration: 0.8, delay: 0.5 } : { duration: 0 }}
              >
                de formation avec
              </motion.span>
              <motion.span
                className="block relative mt-4"
                initial={false}
                animate={animationsEnabled ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1 }}
                transition={animationsEnabled ? { duration: 0.8, delay: 0.7 } : { duration: 0 }}
              >
                <span className="relative inline-block">
                  <span className="absolute inset-0 blur-3xl bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue opacity-60 animate-gradient-xy" />
                  <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue animate-gradient-shift bg-[length:200%_auto] font-black not-italic">
                    simplicité
                  </span>
                </span>
              </motion.span>
            </h1>
          </motion.div>

          {/* Enhanced Subtitle - visible immédiatement pour LCP */}
          <motion.p
            initial={false}
            animate={animationsEnabled ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
            transition={animationsEnabled ? { duration: 1, delay: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } : { duration: 0 }}
            className="text-lg md:text-xl lg:text-2xl text-gray-700 mb-16 md:mb-20 max-w-4xl leading-relaxed font-light tracking-tight"
          >
            Une plateforme{' '}
            <span className="italic font-normal">complète</span> pour{' '}
            <span className="relative inline-block">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan font-extrabold tracking-tighter not-italic bg-[length:200%_auto] animate-gradient-shift">
                digitaliser et optimiser
              </span>
            </span>{' '}
            la gestion de votre organisme de formation.{' '}
            <span className="font-medium">De l'inscription des stagiaires à la facturation CPF</span>, en passant par la{' '}
            <span className="italic text-brand-blue font-semibold">conformité Qualiopi</span>.
          </motion.p>

          {/* Premium CTAs with magnetic effect - visible immédiatement */}
          <motion.div
            initial={false}
            animate={animationsEnabled ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1, y: 0, scale: 1 }}
            transition={animationsEnabled ? { duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } : { duration: 0 }}
            className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto mb-20 md:mb-24"
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
              setIsHovered(false)
              mouseX.set(0)
              mouseY.set(0)
            }}
          >
            <Link href="/auth/register">
              <motion.div
                style={{ x: buttonX, y: buttonY }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="relative group"
              >
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue rounded-full opacity-75 group-hover:opacity-100 blur-xl group-hover:blur-2xl transition-all duration-600 animate-gradient-shift bg-[length:200%_auto]" />

                <Button
                  size="lg"
                  className="relative h-18 px-12 text-xl font-bold rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan hover:from-brand-blue-dark hover:to-brand-cyan-dark text-white shadow-2xl w-full sm:w-auto transition-all duration-600 border-2 border-white/20"
                >
                  <Zap className="w-6 h-6 mr-3 animate-pulse" />
                  Essayer gratuitement
                  <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            </Link>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="relative group"
            >
              <Button
                size="lg"
                variant="outline"
                className="relative h-18 px-12 text-xl font-bold rounded-full border-2 border-gray-300 hover:border-brand-blue bg-white/80 backdrop-blur-xl hover:bg-white text-gray-900 hover:text-brand-blue shadow-xl hover:shadow-2xl w-full sm:w-auto transition-all duration-600 overflow-hidden"
              >
                {/* Shimmer on hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-brand-blue/10 to-transparent" />

                <PlayCircle className="relative w-6 h-6 mr-3" />
                <span className="relative">Voir la démo</span>
              </Button>
            </motion.div>
          </motion.div>

          {/* Premium trust badges - visible immédiatement */}
          <motion.div
            initial={false}
            animate={animationsEnabled ? { opacity: 1 } : { opacity: 1 }}
            transition={animationsEnabled ? { duration: 1, delay: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } : { duration: 0 }}
            className="flex flex-wrap items-center justify-center gap-8 md:gap-12"
          >
            {[
              { icon: CheckCircle2, text: "14 jours d'essai gratuit" },
              { icon: CheckCircle2, text: "Pas de carte requise" },
              { icon: CheckCircle2, text: "Support 24/7" }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.9 + index * 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                whileHover={{ scale: 1.05, y: -2 }}
                className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-white/40 shadow-lg"
              >
                <item.icon className="w-5 h-5 text-brand-cyan" />
                <span className="text-base md:text-lg font-semibold text-gray-800">{item.text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Dashboard Preview - lazy load pour améliorer LCP */}
          <motion.div
            initial={false}
            animate={animationsEnabled ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1, y: 0, scale: 1 }}
            transition={animationsEnabled ? { duration: 1.2, delay: 1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } : { duration: 0 }}
            className="mt-32 md:mt-40 lg:mt-48 relative w-full max-w-7xl"
          >
            <motion.div
              whileHover={{ y: -16, rotateX: 2, scale: 1.02 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="relative rounded-[2rem] md:rounded-[3rem] border-4 border-white/50 bg-white/40 backdrop-blur-xl p-4 md:p-6 shadow-[0_60px_120px_rgba(39,68,114,0.25)] hover:shadow-[0_80px_160px_rgba(39,68,114,0.3)] transition-all duration-800"
              style={{
                transformStyle: 'preserve-3d',
                perspective: '2000px'
              }}
            >
              {/* Inner glow */}
              <div className="absolute inset-0 rounded-[1.5rem] md:rounded-[2.5rem] bg-gradient-to-br from-brand-blue/10 via-transparent to-brand-cyan/10" />

              <div className="relative rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-gray-100 via-gray-50 to-white aspect-[16/9] group">
                {/* Animated gradient background */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-brand-blue-pale/20 via-white to-brand-cyan-pale/20"
                  animate={{
                    backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
                  }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  style={{ backgroundSize: '400% 400%' }}
                />

                {/* Content placeholder */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.5, 0.8, 0.5]
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue bg-[length:200%_auto] animate-gradient-shift font-display"
                    >
                      Interface Dashboard Premium
                    </motion.div>
                  </div>
                </div>

                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-transparent pointer-events-none" />

                {/* Floating badge */}
                <motion.div
                  className="absolute bottom-8 right-8 px-6 py-3 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-white/50"
                  animate={{
                    y: [-8, 0, -8],
                    rotateY: [0, 5, 0, -5, 0]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-cyan"></span>
                    </div>
                    <span className="text-base md:text-lg font-bold bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">
                      Plateforme complète
                    </span>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Decorative elements */}
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-brand-cyan/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-brand-blue/20 rounded-full blur-3xl" />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
