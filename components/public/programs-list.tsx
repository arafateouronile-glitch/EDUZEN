'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from '@/components/ui/motion'
import { Calendar, ArrowRight, BookOpen } from 'lucide-react'
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
}

export function PublicProgramsList({ programs, primaryColor = BRAND_COLORS.primary }: PublicProgramsListProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
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
          >
            <Link href={`/programmes/${program.id}`} className="block h-full">
              <GlassCard 
                variant="premium"
                hoverable
                className="h-full flex flex-col p-0 overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-500 group bg-white cursor-pointer"
              >
              {/* Image de couverture avec effet de zoom au survol */}
              <div className="relative h-56 w-full overflow-hidden">
                {program.public_image_url ? (
                  <Image
                    src={program.public_image_url}
                    alt={program.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                ) : (
                  <div 
                    className="w-full h-full"
                    style={{ backgroundColor: `${primaryColor}10` }}
                  />
                )}
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-80" />
                
                {/* Badge catégorie/type (simulé) */}
                <div className="absolute top-4 left-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/90 backdrop-blur-md text-gray-900 shadow-sm">
                    <BookOpen className="w-3 h-3 mr-1.5" style={{ color: primaryColor }} />
                    Formation
                  </span>
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col relative">
                {/* Titre */}
                <h3 className="text-xl font-bold mb-3 text-gray-900 group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                  {program.name}
                </h3>

                {/* Description courte */}
                {(program.public_description || program.description) && (
                  <p className="text-gray-600 text-sm line-clamp-2 mb-6 leading-relaxed">
                    {program.public_description || program.description}
                  </p>
                )}

                <div className="mt-auto space-y-4">
                  {/* Infos clés */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 pb-4 border-b border-gray-100">
                    {program.formations && program.formations.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-gray-400" />
                        <span>{program.formations.length} module{program.formations.length > 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {totalSessions > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{totalSessions} session{totalSessions > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>

                  {/* Sessions à venir (Aperçu) */}
                  {program.formations && program.formations.some(f => f.sessions && f.sessions.length > 0) && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Prochaines sessions</p>
                      {program.formations
                        .flatMap(f => f.sessions || [])
                        .filter(s => s.status === 'scheduled' || s.status === 'ongoing')
                        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
                        .slice(0, 2)
                        .map(session => (
                          <div key={session.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded-lg">
                            <span className="font-medium text-gray-900">{formatDate(session.start_date)}</span>
                            {session.location && (
                              <span className="text-xs text-gray-500 truncate max-w-[120px]">{session.location}</span>
                            )}
                          </div>
                        ))
                      }
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
