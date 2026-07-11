'use client'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useMotionValue, useSpring, useTransform } from '@/components/ui/motion'
import { Calendar, ArrowRight, BookOpen, Euro } from 'lucide-react'
import { GlassCard } from '@/components/ui/glass-card'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { BRAND_COLORS } from '@/lib/config/app-config'
import { lightenHexColor } from '@/lib/utils'

type Program = TableRow<'programs'> & {
  formations?: Array<TableRow<'formations'> & {
    sessions?: TableRow<'sessions'>[]
  }>
}

interface PublicProgramsListProps {
  programs: Program[]
  primaryColor?: string
  isEmbed?: boolean
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function PublicProgramsList({ programs, primaryColor = BRAND_COLORS.primary, isEmbed = false }: PublicProgramsListProps) {
  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {programs.map((program, index) => (
        <ProgramCard key={program.id} program={program} primaryColor={primaryColor} isEmbed={isEmbed} index={index} />
      ))}
    </div>
  )
}

interface ProgramCardProps {
  program: Program
  primaryColor: string
  isEmbed: boolean
  index: number
}

function ProgramCard({ program, primaryColor, isEmbed, index }: ProgramCardProps) {
  // Compter le total de sessions dans toutes les formations
  const totalSessions = program.formations?.reduce(
    (acc, formation) => acc + (formation.sessions?.length || 0),
    0
  ) || 0
  const programExt = program as { price?: number; price_enterprise?: number; currency?: string; photo_url?: string }
  const price = programExt.price ?? programExt.price_enterprise ?? program.formations?.[0]?.price
  const currency = programExt.currency || 'EUR'
  const formatPrice = (value: number) => value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const currencySymbol = currency === 'EUR' ? '€' : currency === 'XOF' ? 'FCFA' : currency
  const upcomingSessions = program.formations
    ?.flatMap(f => f.sessions || [])
    .filter(s => s.status === 'planned' || s.status === 'ongoing')
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()) || []
  const nextSession = upcomingSessions[0]
  const accentColor = lightenHexColor(primaryColor, 0.4)

  // Tilt 3D + halo suivant le curseur (repris de components/landing/Features.tsx),
  // désactivés sur tactile/prefers-reduced-motion.
  const cardRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | null>(null)
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null)
  const [canUseTilt, setCanUseTilt] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), { stiffness: 200, damping: 20 })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), { stiffness: 200, damping: 20 })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hoverFineQuery = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const update = () => setCanUseTilt(hoverFineQuery.matches && !reducedMotionQuery.matches)
    update()
    hoverFineQuery.addEventListener('change', update)
    reducedMotionQuery.addEventListener('change', update)

    return () => {
      hoverFineQuery.removeEventListener('change', update)
      reducedMotionQuery.removeEventListener('change', update)
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    // Halo qui suit le curseur (mise à jour directe des variables CSS, sans re-render)
    cardRef.current.style.setProperty('--spot-x', `${e.clientX - rect.left}px`)
    cardRef.current.style.setProperty('--spot-y', `${e.clientY - rect.top}px`)

    if (!canUseTilt) return
    lastMouseRef.current = { x: e.clientX, y: e.clientY }
    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      if (!cardRef.current || !lastMouseRef.current) return
      const r = cardRef.current.getBoundingClientRect()
      mouseX.set((lastMouseRef.current.x - r.left) / r.width - 0.5)
      mouseY.set((lastMouseRef.current.y - r.top) / r.height - 0.5)
    })
  }, [canUseTilt, mouseX, mouseY])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    mouseX.set(0)
    mouseY.set(0)
  }, [mouseX, mouseY])

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: "easeOut"
      }}
      className="h-full relative group/wrap"
      style={{
        '--card-accent': primaryColor,
        '--card-accent-2': accentColor,
        rotateX: isHovered && canUseTilt ? rotateX : 0,
        rotateY: isHovered && canUseTilt ? rotateY : 0,
        transformPerspective: 1200,
      } as CSSProperties}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Contour dégradé au survol (motif landing page) */}
      <div
        className="absolute -inset-[2px] rounded-[30px] opacity-0 group-hover/wrap:opacity-100 transition-opacity duration-500"
        style={{ background: `linear-gradient(120deg, var(--card-accent), var(--card-accent-2), var(--card-accent))`, backgroundSize: '200% auto' }}
      />
      <Link href={`/programmes/${program.id}`} className="relative block h-full" target={isEmbed ? '_blank' : undefined} rel={isEmbed ? 'noopener noreferrer' : undefined}>
        <GlassCard
          variant="premium"
          hoverable
          className="h-full flex flex-col p-0 overflow-hidden rounded-[28px] border border-black/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_45px_-15px_color-mix(in_srgb,var(--card-accent)_40%,transparent)] transition-all duration-500 group bg-white cursor-pointer"
        >
        {/* Halo qui suit le curseur */}
        <div
          className="absolute inset-0 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: `radial-gradient(240px circle at var(--spot-x, 50%) var(--spot-y, 50%), ${primaryColor}14, transparent 70%)` }}
        />

        {/* Image de couverture avec effet de zoom au survol */}
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          {(program.public_image_url || programExt.photo_url) ? (
            <>
              <Image
                src={(program.public_image_url || programExt.photo_url) as string}
                alt={program.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              />
              {/* Teinte duotone couleur de marque */}
              <div className="absolute inset-0" style={{ backgroundColor: primaryColor, mixBlendMode: 'color', opacity: 0.45 }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
            </>
          ) : (
            <div
              className="w-full h-full flex items-center justify-center bg-gradient-to-br"
              style={{ backgroundImage: `linear-gradient(135deg, ${primaryColor}14, ${primaryColor}05)` }}
            >
              <BookOpen className="w-12 h-12" style={{ color: `${primaryColor}40` }} />
            </div>
          )}

          {/* Badge catégorie/type */}
          <div className="absolute top-4 left-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/90 backdrop-blur-md text-gray-900 shadow-sm">
              <BookOpen className="w-3 h-3 mr-1.5" style={{ color: primaryColor }} />
              Formation
            </span>
          </div>

          {/* Prix en évidence sur l'image */}
          {price != null && Number(price) > 0 && (
            <div className="absolute bottom-4 right-4">
              <span
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold text-white shadow-lg backdrop-blur-md"
                style={{ backgroundColor: `${primaryColor}e6` }}
              >
                {formatPrice(Number(price))} {currencySymbol}
              </span>
            </div>
          )}
        </div>

        <div className="p-6 flex-1 flex flex-col relative">
          {/* Titre */}
          <h3
            className="font-display text-xl font-bold mb-3 text-gray-900 transition-colors line-clamp-2 leading-tight group-hover:text-[var(--card-accent)]"
          >
            {program.name}
          </h3>

          {/* Description courte */}
          {(program.public_description || program.description) && (
            <p className="text-gray-600 text-sm line-clamp-2 mb-5 leading-relaxed">
              {program.public_description || program.description}
            </p>
          )}

          <div className="mt-auto space-y-4">
            {/* Infos clés — chips */}
            <div className="flex flex-wrap gap-2 pb-4 border-b border-gray-100">
              {program.formations && program.formations.length > 0 && (
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-gray-50 pl-1.5 pr-2.5 py-1 rounded-full">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full" style={{ backgroundColor: `${primaryColor}15` }}>
                    <BookOpen className="w-3 h-3" style={{ color: primaryColor }} />
                  </span>
                  {program.formations.length} module{program.formations.length > 1 ? 's' : ''}
                </div>
              )}
              {totalSessions > 0 && (
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-gray-50 pl-1.5 pr-2.5 py-1 rounded-full">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full" style={{ backgroundColor: `${primaryColor}15` }}>
                    <Calendar className="w-3 h-3" style={{ color: primaryColor }} />
                  </span>
                  {totalSessions} session{totalSessions > 1 ? 's' : ''}
                </div>
              )}
              {(price == null || Number(price) <= 0) && (
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-gray-50 pl-1.5 pr-2.5 py-1 rounded-full">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full" style={{ backgroundColor: `${primaryColor}15` }}>
                    <Euro className="w-3 h-3" style={{ color: primaryColor }} />
                  </span>
                  Sur devis
                </div>
              )}
            </div>

            {/* Prochaine session */}
            {nextSession && (
              <div
                className="flex items-center gap-3 rounded-xl border-l-[3px] bg-gray-50/80 px-3 py-2.5"
                style={{ borderColor: primaryColor }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Prochaine session</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {formatDate(nextSession.start_date)}
                    {nextSession.location && (
                      <span className="font-normal text-gray-500"> · {nextSession.location}</span>
                    )}
                  </p>
                </div>
                {upcomingSessions.length > 1 && (
                  <span className="shrink-0 text-[11px] font-medium text-gray-400">
                    +{upcomingSessions.length - 1}
                  </span>
                )}
              </div>
            )}

            {/* Bouton d'action */}
            <div className="group/btn block w-full">
              <div
                className="relative w-full py-3.5 rounded-xl font-bold text-white text-center overflow-hidden transition-all duration-300 shadow-md group-hover/btn:shadow-lg hover:-translate-y-0.5"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Voir le programme
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </span>
                {/* Effet de brillance au survol du bouton */}
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
              </div>
            </div>
          </div>
        </div>
        </GlassCard>
      </Link>
    </motion.div>
  )
}
