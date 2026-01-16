'use client'

import { motion, useInView } from '@/components/ui/motion'
import { useRef, useState, useEffect } from 'react'
import { TrendingUp, Users, BookOpen, Award } from 'lucide-react'
import { useParallax } from '@/lib/hooks/useParallax'

// Counter component with count-up animation
function AnimatedCounter({ end, duration = 2000, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  useEffect(() => {
    if (!isInView) return

    const startTime = Date.now()
    const endTime = startTime + duration

    const updateCount = () => {
      const now = Date.now()
      const progress = Math.min((now - startTime) / duration, 1)

      // Easing function (easeOutCubic)
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      const currentCount = Math.floor(easedProgress * end)

      setCount(currentCount)

      if (progress < 1) {
        requestAnimationFrame(updateCount)
      }
    }

    requestAnimationFrame(updateCount)
  }, [isInView, end, duration])

  return <span ref={ref}>{count}{suffix}</span>
}

export function BentoShowcase() {
  const { ref: bgRef, y: bgY } = useParallax(60)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })

  return (
    <section className="relative py-32 md:py-40 lg:py-48 overflow-hidden bg-gradient-to-b from-white via-gray-50 to-white">
      {/* Background Parallax */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        {/* Animated mesh gradient */}
        <div className="absolute inset-0 bg-gradient-mesh opacity-60" />

        <motion.div
          ref={bgRef}
          style={{ y: bgY }}
          className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-gradient-radial-cyan rounded-full blur-[100px] opacity-30 animate-pulse-premium"
        />

        <motion.div
          className="absolute bottom-[30%] right-[15%] w-[400px] h-[400px] bg-gradient-radial-blue rounded-full blur-[100px] opacity-25 animate-wave"
        />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-20 md:mb-24 lg:mb-28"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-cyan-ghost border border-brand-cyan-pale mb-8"
          >
            <Award className="w-4 h-4 text-brand-cyan" />
            <span className="text-sm md:text-base font-medium text-brand-cyan-darker">Plateforme de référence</span>
          </motion.div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tightest text-gray-900 mb-6 leading-tighter font-display">
            <span className="font-extralight italic tracking-luxe">Une solution</span>{' '}
            <span className="text-gradient-animated font-black not-italic">
              complète
            </span>
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed font-light tracking-tight">
            Tout ce dont vous avez besoin pour{' '}
            <span className="italic font-normal text-brand-blue">gérer votre organisme</span>{' '}
            de formation avec{' '}
            <span className="font-semibold">excellence</span>
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {/* Large Card - Dashboard Preview (2x2) */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-2 md:row-span-2 lg:col-span-2 lg:row-span-2"
          >
            <motion.div
              whileHover={{ y: -12, scale: 1.02 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="group h-full rounded-3xl bg-gradient-to-br from-brand-blue via-brand-blue-dark to-brand-blue p-1 shadow-xl hover:shadow-2xl transition-all duration-600 relative overflow-hidden"
            >
              {/* Shimmer effect on hover */}
              <div className="absolute inset-0 bg-gradient-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-600" />

              <div className="h-full rounded-[22px] bg-white/95 backdrop-blur-xl p-10 md:p-12 flex flex-col relative z-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-brand-blue flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 font-display">Dashboard Analytics</h3>
                    <p className="text-gray-600">Suivi en temps réel</p>
                  </div>
                </div>

                {/* Mock Stats */}
                <div className="flex-1 grid grid-cols-2 gap-6 mb-8">
                  <motion.div
                    whileHover={{ scale: 1.05, rotateY: 5 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="p-6 rounded-2xl bg-gradient-aurora border border-brand-blue-pale hover-glow"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <p className="text-sm text-gray-600 mb-2 font-light">Stagiaires actifs</p>
                    <p className="text-3xl font-bold text-brand-blue font-display">
                      <AnimatedCounter end={1247} suffix="+" />
                    </p>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05, rotateY: -5 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="p-6 rounded-2xl bg-gradient-aurora border border-brand-cyan-pale hover-glow"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <p className="text-sm text-gray-600 mb-2 font-light">Formations</p>
                    <p className="text-3xl font-bold text-brand-cyan font-display">
                      <AnimatedCounter end={89} suffix="+" />
                    </p>
                  </motion.div>
                </div>

                {/* Mock Chart */}
                <div className="h-40 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-200 flex items-end p-4 gap-2">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 95].map((height, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={isInView ? { height: `${height}%` } : {}}
                      transition={{ duration: 0.8, delay: 0.5 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                      className="flex-1 bg-gradient-to-t from-brand-blue to-brand-cyan rounded-lg"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Tall Card - Timeline Features (1x2) */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-1 md:row-span-2 lg:col-span-1 lg:row-span-2"
          >
            <motion.div
              whileHover={{ y: -12, scale: 1.02 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="group h-full rounded-3xl bg-white border-2 border-gray-200 hover:border-brand-cyan-pale p-10 shadow-xl hover:shadow-2xl transition-all duration-600 hover-lift"
            >
              <motion.div
                className="w-12 h-12 rounded-2xl bg-brand-cyan flex items-center justify-center mb-6"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <BookOpen className="w-6 h-6 text-white" />
              </motion.div>
              <h3 className="text-xl font-bold text-gray-900 mb-8 font-display tracking-tight">Process simplifié</h3>

              <div className="space-y-6">
                {[
                  { label: 'Inscription', delay: 0.3 },
                  { label: 'Formation', delay: 0.4 },
                  { label: 'Évaluation', delay: 0.5 },
                  { label: 'Certification', delay: 0.6 },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.6, delay: item.delay, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center gap-4 group/item"
                  >
                    <motion.div
                      className="w-8 h-8 rounded-full bg-brand-cyan/10 border-2 border-brand-cyan flex items-center justify-center font-bold text-brand-cyan text-sm"
                      whileHover={{ scale: 1.2, rotate: 360 }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {i + 1}
                    </motion.div>
                    <span className="text-lg text-gray-700 font-medium group-hover/item:text-brand-cyan transition-colors duration-300">
                      {item.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Small Card - User Counter (1x1) */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-1 md:row-span-1 lg:col-span-1 lg:row-span-1"
          >
            <motion.div
              whileHover={{ y: -12, scale: 1.03, rotateZ: 2 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="group h-full min-h-[280px] rounded-3xl bg-gradient-to-br from-brand-cyan via-brand-cyan to-brand-cyan-dark p-10 shadow-xl hover:shadow-2xl transition-all duration-600 relative overflow-hidden"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Animated gradient overlay */}
              <div className="absolute inset-0 bg-gradient-aurora opacity-30 animate-gradient-xy" />
              <motion.div
                className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6"
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <Users className="w-6 h-6 text-white" />
              </motion.div>
              <p className="text-white/80 mb-2 text-lg">Organismes clients</p>
              <p className="text-6xl font-bold text-white mb-4 font-display">
                <AnimatedCounter end={500} suffix="+" />
              </p>
              <p className="text-white/70">Nous font confiance</p>
            </motion.div>
          </motion.div>

          {/* Small Card - Feature Highlight (1x1) */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-1 md:row-span-1 lg:col-span-1 lg:row-span-1"
          >
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="group h-full min-h-[280px] rounded-3xl bg-white border-2 border-gray-200 hover:border-brand-blue-pale p-10 shadow-xl hover:shadow-2xl transition-all duration-600 flex flex-col justify-between"
            >
              <div>
                <motion.div
                  className="w-12 h-12 rounded-2xl bg-brand-blue flex items-center justify-center mb-6"
                  whileHover={{ rotate: -360, scale: 1.1 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Award className="w-6 h-6 text-white" />
                </motion.div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3 font-display">Certifié Qualiopi</h3>
                <p className="text-gray-600 leading-relaxed">
                  Conformité garantie aux exigences de qualité
                </p>
              </div>
              <motion.div
                className="w-full h-1 bg-gradient-to-r from-brand-blue to-brand-cyan rounded-full"
                initial={{ scaleX: 0 }}
                animate={isInView ? { scaleX: 1 } : {}}
                transition={{ duration: 1, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: 'left' }}
              />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
