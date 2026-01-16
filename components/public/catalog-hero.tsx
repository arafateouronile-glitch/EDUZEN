'use client'

import { motion } from '@/components/ui/motion'
import { ArrowDown, Sparkles } from 'lucide-react'

interface CatalogHeroProps {
  title: string
  subtitle?: string | null
  description?: string | null
  buttonText: string
  buttonLink: string
  coverImageUrl?: string | null
  primaryColor: string
}

export function CatalogHero({
  title,
  subtitle,
  description,
  buttonText,
  buttonLink,
  coverImageUrl,
  primaryColor,
}: CatalogHeroProps) {
  const fadeInUp = {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: [0.23, 1, 0.32, 1] },
  }

  if (coverImageUrl) {
    return (
      <section className="relative h-[650px] lg:h-[750px] w-full overflow-hidden">
        {/* Image de couverture avec overlay gradient sophistiqué */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${coverImageUrl})` }}
        >
          {/* Multi-layer overlay pour plus de profondeur */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />
          
          {/* Pattern overlay subtil avec plus de détail */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:80px_80px] opacity-50" />
          
          {/* Effet de lumière dynamique */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              background: `radial-gradient(circle at 30% 50%, ${primaryColor}40 0%, transparent 50%)`,
            }}
          />
        </div>

        <div className="relative container mx-auto px-6 lg:px-8 h-full flex items-center">
          <div className="max-w-5xl">
            {/* Badge accent */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full mb-6"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-sm font-medium text-white">Formations certifiées et éligibles CPF</span>
            </motion.div>

            <motion.h1
              {...fadeInUp}
              className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold text-white mb-6 leading-[1.1] tracking-tight"
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
              <a
                href={buttonLink}
                className="group relative inline-flex items-center gap-3 px-10 py-5 bg-white text-gray-900 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all duration-500 shadow-2xl shadow-black/30 hover:shadow-black/40 hover:scale-[1.02] overflow-hidden"
              >
                {/* Effet de brillance au hover */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="relative z-10">{buttonText}</span>
                <ArrowDown className="w-5 h-5 relative z-10 group-hover:translate-y-1 transition-transform duration-300" />
              </a>
            </motion.div>
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
      {/* Background pattern sophistiqué */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0d_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0d_1px,transparent_1px)] bg-[size:80px_80px]" />
      
      {/* Gradient overlays multiples pour profondeur */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/20" />
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(circle at 20% 30%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.05) 0%, transparent 50%)`,
        }}
      />
      
      {/* Effet de lumière dynamique basé sur la couleur primaire */}
      <div 
        className="absolute inset-0 opacity-15"
        style={{
          background: `radial-gradient(ellipse at center, ${primaryColor} 0%, transparent 70%)`,
        }}
      />
      
      <div className="relative container mx-auto px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge accent */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full mb-8"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span className="text-sm font-medium text-white">Formations certifiées et éligibles CPF</span>
          </motion.div>

          <motion.h1
            {...fadeInUp}
            className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold mb-8 leading-[1.1] tracking-tight"
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
            <a
              href={buttonLink}
              className="group relative inline-flex items-center gap-3 px-10 py-5 bg-white rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all duration-500 shadow-2xl shadow-black/30 hover:shadow-black/40 hover:scale-[1.02] overflow-hidden"
              style={{ color: primaryColor }}
            >
              {/* Effet de brillance au hover */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <span className="relative z-10">{buttonText}</span>
              <ArrowDown className="w-5 h-5 relative z-10 group-hover:translate-y-1 transition-transform duration-300" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
