'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring } from '@/components/ui/motion'
import { ArrowDown, Sparkles } from 'lucide-react'
import { lightenHexColor } from '@/lib/utils'
import { CatalogTrustBar } from '@/components/public/catalog-trust-bar'

interface CatalogHeroProps {
  title: string
  subtitle?: string | null
  description?: string | null
  buttonText: string
  buttonLink: string
  coverImageUrl?: string | null
  primaryColor: string
  hasQualiopi?: boolean
  cpfEligibleCount?: number
  totalLearners?: number | string | null
}

// Bouton CTA "magnétique" : suit légèrement le curseur (repris de components/landing/Hero.tsx),
// désactivé sur tactile/prefers-reduced-motion.
function MagneticButton({ children, className, href, style }: { children: React.ReactNode; className?: string; href: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const frameRef = useRef<number | null>(null)
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  const [isMagneticEnabled, setIsMagneticEnabled] = useState(false)

  const springConfig = { damping: 15, stiffness: 150, mass: 0.1 }
  const springX = useSpring(x, springConfig)
  const springY = useSpring(y, springConfig)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hoverFine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const update = () => setIsMagneticEnabled(hoverFine.matches && !reducedMotion.matches)
    update()

    hoverFine.addEventListener('change', update)
    reducedMotion.addEventListener('change', update)

    return () => {
      hoverFine.removeEventListener('change', update)
      reducedMotion.removeEventListener('change', update)
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [])

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isMagneticEnabled || !ref.current) return
    pointerRef.current = { x: e.clientX, y: e.clientY }
    if (frameRef.current !== null) return

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      if (!ref.current || !pointerRef.current) return
      const { left, top, width, height } = ref.current.getBoundingClientRect()
      const centerX = left + width / 2
      const centerY = top + height / 2
      x.set((pointerRef.current.x - centerX) * 0.2)
      y.set((pointerRef.current.y - centerY) * 0.2)
    })
  }

  const handleMouseLeave = () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    pointerRef.current = null
    x.set(0)
    y.set(0)
  }

  return (
    <motion.a
      ref={ref}
      href={href}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY, ...style }}
      className={className}
    >
      {children}
    </motion.a>
  )
}

// Blobs de couleur flottants en arrière-plan (motif landing page)
function HeroBlobs({ primaryColor, accentColor }: { primaryColor: string; accentColor: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <motion.div
        className="absolute left-[-6%] top-[10%] w-[420px] h-[420px] rounded-full blur-[110px]"
        style={{ backgroundColor: accentColor, opacity: 0.25 }}
        animate={{ y: [0, -24, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-[-8%] bottom-[-5%] w-[520px] h-[520px] rounded-full blur-[130px]"
        style={{ backgroundColor: primaryColor, opacity: 0.3 }}
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />
    </div>
  )
}

export function CatalogHero({
  title,
  subtitle,
  description,
  buttonText,
  buttonLink,
  coverImageUrl,
  primaryColor,
  hasQualiopi = false,
  cpfEligibleCount = 0,
  totalLearners,
}: CatalogHeroProps) {
  const fadeInUp = {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: 'easeInOut' as const },
  }
  const accentColor = lightenHexColor(primaryColor, 0.4)

  if (coverImageUrl) {
    return (
      <section className="relative h-[650px] lg:h-[750px] w-full overflow-hidden">
        {/* Image de couverture avec effet Ken Burns et overlay gradient sophistiqué */}
        <motion.div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${coverImageUrl})` }}
          initial={{ scale: 1 }}
          animate={{ scale: 1.07 }}
          transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        >
          {/* Multi-layer overlay pour plus de profondeur */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />

          {/* Grille en pointillés masquée (motif landing page) */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff14_1px,transparent_1px),linear-gradient(to_bottom,#ffffff14_1px,transparent_1px)] bg-[size:56px_56px] opacity-60 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_60%,transparent_100%)]" />
        </motion.div>

        <HeroBlobs primaryColor={primaryColor} accentColor={accentColor} />

        <div className="relative container mx-auto px-6 lg:px-8 h-full flex items-center">
          <div className="max-w-5xl">
            {/* Badge accent */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full mb-6"
            >
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: accentColor }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: accentColor }} />
              </span>
              <span className="text-sm font-medium text-white">Formations certifiées et éligibles CPF</span>
            </motion.div>

            <motion.h1
              {...fadeInUp}
              className="font-display text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white mb-6 leading-[1.05] tracking-tight"
              style={{
                textShadow: '0 4px 20px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              {title}
            </motion.h1>
            {subtitle && (
              <motion.p
                {...fadeInUp}
                transition={{ ...fadeInUp.transition, delay: 0.15 }}
                className="text-xl md:text-2xl lg:text-3xl text-white/95 mb-6 leading-relaxed font-light max-w-3xl"
                style={{
                  textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                }}
              >
                {subtitle}
              </motion.p>
            )}
            {description && (
              <motion.p
                {...fadeInUp}
                transition={{ ...fadeInUp.transition, delay: 0.25 }}
                className="text-lg md:text-xl text-white/90 mb-10 leading-relaxed max-w-3xl"
                style={{
                  textShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              >
                {description}
              </motion.p>
            )}
            <motion.div
              {...fadeInUp}
              transition={{ ...fadeInUp.transition, delay: 0.35 }}
            >
              <MagneticButton
                href={buttonLink}
                className="group relative inline-flex items-center gap-3 px-10 py-5 bg-white text-gray-900 rounded-full font-bold text-lg hover:bg-gray-50 transition-colors duration-300 shadow-2xl shadow-black/30 hover:shadow-black/40 overflow-hidden"
              >
                {/* Effet de brillance au hover */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="relative z-10">{buttonText}</span>
                <ArrowDown className="w-5 h-5 relative z-10 group-hover:translate-y-1 transition-transform duration-300" />
              </MagneticButton>
            </motion.div>

            <CatalogTrustBar
              primaryColor={primaryColor}
              hasQualiopi={hasQualiopi}
              cpfEligibleCount={cpfEligibleCount}
              totalLearners={totalLearners}
            />
          </div>
        </div>

        {/* Scroll indicator amélioré */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-7 h-11 border-2 border-white/60 rounded-full flex justify-center p-2.5 backdrop-blur-sm bg-white/5"
          >
            <motion.div
              animate={{ y: [0, 16, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-2 h-2 bg-white/80 rounded-full"
            />
          </motion.div>
        </motion.div>
      </section>
    )
  }

  return (
    <section className="relative text-white py-28 lg:py-36 overflow-hidden" style={{ backgroundColor: primaryColor }}>
      {/* Grille en pointillés masquée (motif landing page) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff14_1px,transparent_1px),linear-gradient(to_bottom,#ffffff14_1px,transparent_1px)] bg-[size:56px_56px] opacity-70 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_60%,transparent_100%)]" />

      {/* Gradient overlays multiples pour profondeur */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/20" />

      <HeroBlobs primaryColor="rgba(255,255,255,0.5)" accentColor={accentColor} />

      <div className="relative container mx-auto px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge accent */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full mb-8"
          >
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: accentColor }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: accentColor }} />
            </span>
            <span className="text-sm font-medium text-white">Formations certifiées et éligibles CPF</span>
          </motion.div>

          <motion.h1
            {...fadeInUp}
            className="font-display text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-8 leading-[1.05] tracking-tight text-white"
            style={{
              textShadow: '0 4px 20px rgba(0,0,0,0.2)',
            }}
          >
            {title}
          </motion.h1>
          {subtitle && (
            <motion.p
              {...fadeInUp}
              transition={{ ...fadeInUp.transition, delay: 0.15 }}
              className="text-xl md:text-2xl lg:text-3xl opacity-95 mb-8 leading-relaxed font-light max-w-3xl mx-auto"
              style={{
                textShadow: '0 2px 10px rgba(0,0,0,0.15)',
              }}
            >
              {subtitle}
            </motion.p>
          )}
          {description && (
            <motion.p
              {...fadeInUp}
              transition={{ ...fadeInUp.transition, delay: 0.25 }}
              className="text-lg md:text-xl opacity-90 mb-12 leading-relaxed max-w-3xl mx-auto"
              style={{
                textShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              {description}
            </motion.p>
          )}
          <motion.div
            {...fadeInUp}
            transition={{ ...fadeInUp.transition, delay: 0.35 }}
          >
            <MagneticButton
              href={buttonLink}
              className="group relative inline-flex items-center gap-3 px-10 py-5 bg-white rounded-full font-bold text-lg hover:bg-gray-50 transition-colors duration-300 shadow-2xl shadow-black/30 hover:shadow-black/40 overflow-hidden"
              style={{ color: primaryColor }}
            >
              {/* Effet de brillance au hover */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <span className="relative z-10">{buttonText}</span>
              <ArrowDown className="w-5 h-5 relative z-10 group-hover:translate-y-1 transition-transform duration-300" />
            </MagneticButton>
          </motion.div>

          <CatalogTrustBar
            primaryColor={primaryColor}
            hasQualiopi={hasQualiopi}
            cpfEligibleCount={cpfEligibleCount}
            totalLearners={totalLearners}
            align="center"
          />
        </div>
      </div>
    </section>
  )
}
