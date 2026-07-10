'use client'

import type { CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from '@/components/ui/motion'
import { Calendar, ArrowRight, BookOpen, Euro } from 'lucide-react'
import { GlassCard } from '@/components/ui/glass-card'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { BRAND_COLORS } from '@/lib/config/app-config'

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

export function PublicProgramsList({ programs, primaryColor = BRAND_COLORS.primary, isEmbed = false }: PublicProgramsListProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {programs.map((program, index) => {
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
          .filter(s => s.status === 'scheduled' || s.status === 'ongoing')
          .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()) || []
        const nextSession = upcomingSessions[0]

        return (
          <motion.div
            key={program.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{
              duration: 0.5,
              delay: index * 0.1,
              ease: "easeOut"
            }}
            className="h-full"
            style={{ '--card-accent': primaryColor } as CSSProperties}
          >
            <Link href={`/programmes/${program.id}`} className="block h-full" target={isEmbed ? '_blank' : undefined} rel={isEmbed ? 'noopener noreferrer' : undefined}>
              <GlassCard
                variant="premium"
                hoverable
                className="h-full flex flex-col p-0 overflow-hidden rounded-[28px] border border-black/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_45px_-15px_color-mix(in_srgb,var(--card-accent)_40%,transparent)] transition-all duration-500 group bg-white cursor-pointer"
              >
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
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
                  className="text-xl font-bold mb-3 text-gray-900 transition-colors line-clamp-2 leading-tight group-hover:text-[var(--card-accent)]"
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
                      style={{ backgroundColor: primaryColor }}
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
      })}
    </div>
  )
}
