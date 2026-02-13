'use client'

import { motion, useInView } from '@/components/ui/motion'
import { useRef } from 'react'

// Composants SVG de logos stylisés pour chaque organisme
function LogoHaufe() {
  return (
    <svg viewBox="0 0 140 40" className="h-8 w-auto">
      <rect x="0" y="8" width="24" height="24" rx="4" fill="#E63946" />
      <rect x="4" y="12" width="8" height="8" rx="1" fill="white" />
      <rect x="14" y="20" width="6" height="8" rx="1" fill="white" opacity="0.7" />
      <text x="30" y="26" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="700" fill="#1a1a1a">haufe</text>
      <text x="30" y="35" fontFamily="Arial, sans-serif" fontSize="8" fontWeight="400" fill="#888" letterSpacing="2">AKADEMIE</text>
    </svg>
  )
}

function LogoBerlitz() {
  return (
    <svg viewBox="0 0 120 40" className="h-8 w-auto">
      <circle cx="16" cy="20" r="14" fill="none" stroke="#0066CC" strokeWidth="2.5" />
      <path d="M10 14 L22 20 L10 26Z" fill="#0066CC" />
      <text x="36" y="25" fontFamily="Georgia, serif" fontSize="17" fontWeight="700" fill="#1a1a1a">Berlitz</text>
    </svg>
  )
}

function LogoGBS() {
  return (
    <svg viewBox="0 0 130 40" className="h-8 w-auto">
      <rect x="0" y="6" width="32" height="28" rx="3" fill="#2D3748" />
      <text x="5" y="26" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="800" fill="white">GBS</text>
      <text x="38" y="22" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="600" fill="#2D3748">Group</text>
      <text x="38" y="33" fontFamily="Arial, sans-serif" fontSize="7" fontWeight="400" fill="#888" letterSpacing="1.5">TRAINING</text>
    </svg>
  )
}

function LogoPitman() {
  return (
    <svg viewBox="0 0 150 40" className="h-8 w-auto">
      <path d="M2 30 L12 8 L22 30" stroke="#D4A843" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="12" cy="14" r="3" fill="#D4A843" />
      <text x="28" y="22" fontFamily="Georgia, serif" fontSize="14" fontWeight="700" fill="#1a1a1a">PITMAN</text>
      <text x="28" y="33" fontFamily="Arial, sans-serif" fontSize="8" fontWeight="500" fill="#D4A843" letterSpacing="3">TRAINING</text>
    </svg>
  )
}

function LogoTUV() {
  return (
    <svg viewBox="0 0 150 40" className="h-8 w-auto">
      <circle cx="16" cy="20" r="14" fill="none" stroke="#003D7C" strokeWidth="2" />
      <text x="9" y="24" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="800" fill="#003D7C">TÜV</text>
      <text x="36" y="18" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="700" fill="#003D7C">TÜV</text>
      <text x="36" y="30" fontFamily="Arial, sans-serif" fontSize="9" fontWeight="500" fill="#003D7C">Rheinland</text>
    </svg>
  )
}

function LogoKaplan() {
  return (
    <svg viewBox="0 0 140 40" className="h-8 w-auto">
      <rect x="0" y="10" width="6" height="20" rx="1" fill="#5B2D8E" />
      <rect x="8" y="6" width="6" height="28" rx="1" fill="#5B2D8E" opacity="0.7" />
      <rect x="16" y="14" width="6" height="16" rx="1" fill="#5B2D8E" opacity="0.4" />
      <text x="28" y="25" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="700" fill="#5B2D8E">Kaplan</text>
    </svg>
  )
}

function LogoDEKRA() {
  return (
    <svg viewBox="0 0 140 40" className="h-8 w-auto">
      <polygon points="14,4 28,20 14,36 0,20" fill="#007A3D" />
      <text x="7" y="24" fontFamily="Arial, sans-serif" fontSize="8" fontWeight="800" fill="white">D</text>
      <text x="34" y="24" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="800" fill="#007A3D" letterSpacing="1">DEKRA</text>
      <text x="34" y="34" fontFamily="Arial, sans-serif" fontSize="7" fontWeight="400" fill="#888" letterSpacing="2">AKADEMIE</text>
    </svg>
  )
}

function LogoCityGuilds() {
  return (
    <svg viewBox="0 0 150 40" className="h-8 w-auto">
      <rect x="0" y="8" width="28" height="24" rx="12" fill="none" stroke="#C8102E" strokeWidth="2" />
      <path d="M8 20 L12 24 L20 16" stroke="#C8102E" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <text x="34" y="18" fontFamily="Georgia, serif" fontSize="11" fontWeight="700" fill="#1a1a1a">City &amp;</text>
      <text x="34" y="31" fontFamily="Georgia, serif" fontSize="11" fontWeight="700" fill="#1a1a1a">Guilds</text>
    </svg>
  )
}

function LogoIHK() {
  return (
    <svg viewBox="0 0 140 40" className="h-8 w-auto">
      <rect x="0" y="6" width="34" height="28" rx="2" fill="#004B87" />
      <text x="5" y="25" fontFamily="Arial, sans-serif" fontSize="15" fontWeight="800" fill="white">IHK</text>
      <text x="40" y="22" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="600" fill="#004B87">Akademie</text>
      <line x1="40" y1="27" x2="105" y2="27" stroke="#004B87" strokeWidth="1" />
    </svg>
  )
}

function LogoLearningTree() {
  return (
    <svg viewBox="0 0 160 40" className="h-8 w-auto">
      <circle cx="14" cy="14" r="8" fill="#4CAF50" />
      <rect x="12" y="18" width="4" height="16" rx="1" fill="#795548" />
      <circle cx="8" cy="18" r="5" fill="#66BB6A" />
      <circle cx="20" cy="18" r="5" fill="#66BB6A" />
      <text x="30" y="18" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700" fill="#1a1a1a">Learning</text>
      <text x="30" y="31" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="400" fill="#4CAF50">Tree</text>
    </svg>
  )
}

function LogoWBS() {
  return (
    <svg viewBox="0 0 140 40" className="h-8 w-auto">
      <path d="M0 30 L6 10 L12 24 L18 10 L24 30" stroke="#FF6B00" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <text x="32" y="24" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="800" fill="#FF6B00">WBS</text>
      <text x="32" y="34" fontFamily="Arial, sans-serif" fontSize="7" fontWeight="500" fill="#888" letterSpacing="2">TRAINING</text>
    </svg>
  )
}

function LogoReed() {
  return (
    <svg viewBox="0 0 150 40" className="h-8 w-auto">
      <rect x="0" y="10" width="28" height="20" rx="4" fill="#E4002B" />
      <text x="5" y="25" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="800" fill="white">R</text>
      <circle cx="20" cy="16" r="3" fill="white" opacity="0.6" />
      <text x="34" y="22" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="700" fill="#1a1a1a">Reed</text>
      <text x="34" y="33" fontFamily="Arial, sans-serif" fontSize="8" fontWeight="400" fill="#888" letterSpacing="1.5">LEARNING</text>
    </svg>
  )
}

function LogoComcave() {
  return (
    <svg viewBox="0 0 160 40" className="h-8 w-auto">
      <rect x="0" y="10" width="8" height="20" rx="1" fill="#0072CE" />
      <rect x="10" y="6" width="8" height="28" rx="1" fill="#0072CE" opacity="0.8" />
      <rect x="20" y="14" width="8" height="16" rx="1" fill="#0072CE" opacity="0.6" />
      <text x="34" y="22" fontFamily="Arial, sans-serif" fontSize="13" fontWeight="700" fill="#0072CE">COMCAVE</text>
      <text x="34" y="33" fontFamily="Arial, sans-serif" fontSize="7" fontWeight="500" fill="#888" letterSpacing="2">COLLEGE</text>
    </svg>
  )
}

function LogoCorndel() {
  return (
    <svg viewBox="0 0 140 40" className="h-8 w-auto">
      <circle cx="14" cy="20" r="12" fill="none" stroke="#6366F1" strokeWidth="2" />
      <circle cx="14" cy="20" r="5" fill="#6366F1" />
      <text x="32" y="25" fontFamily="Georgia, serif" fontSize="15" fontWeight="700" fill="#1a1a1a">Corndel</text>
    </svg>
  )
}

function LogoDAA() {
  return (
    <svg viewBox="0 0 140 40" className="h-8 w-auto">
      <polygon points="16,4 32,36 0,36" fill="none" stroke="#C4161C" strokeWidth="2" />
      <text x="10" y="30" fontFamily="Arial, sans-serif" fontSize="9" fontWeight="700" fill="#C4161C">A</text>
      <text x="38" y="22" fontFamily="Arial, sans-serif" fontSize="15" fontWeight="800" fill="#C4161C">DAA</text>
      <text x="38" y="33" fontFamily="Arial, sans-serif" fontSize="7" fontWeight="500" fill="#888" letterSpacing="2">GROUP</text>
    </svg>
  )
}

function LogoQA() {
  return (
    <svg viewBox="0 0 140 40" className="h-8 w-auto">
      <rect x="0" y="6" width="30" height="28" rx="6" fill="#1E1E1E" />
      <text x="5" y="26" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="800" fill="white">QA</text>
      <text x="36" y="22" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="600" fill="#1E1E1E">Training</text>
      <rect x="36" y="27" width="50" height="2" rx="1" fill="#00B4D8" />
    </svg>
  )
}

// Logos avec composants SVG et metadata
const logosRow1 = [
  { name: 'Haufe Akademie', country: 'DE' as const, Logo: LogoHaufe },
  { name: 'Berlitz', country: 'DE' as const, Logo: LogoBerlitz },
  { name: 'GBS Group', country: 'UK' as const, Logo: LogoGBS },
  { name: 'Pitman Training', country: 'UK' as const, Logo: LogoPitman },
  { name: 'TUV Rheinland', country: 'DE' as const, Logo: LogoTUV },
  { name: 'Kaplan International', country: 'UK' as const, Logo: LogoKaplan },
  { name: 'DEKRA Akademie', country: 'DE' as const, Logo: LogoDEKRA },
  { name: 'City & Guilds', country: 'UK' as const, Logo: LogoCityGuilds },
]

const logosRow2 = [
  { name: 'IHK Akademie', country: 'DE' as const, Logo: LogoIHK },
  { name: 'Learning Tree', country: 'UK' as const, Logo: LogoLearningTree },
  { name: 'WBS Training', country: 'DE' as const, Logo: LogoWBS },
  { name: 'Reed Learning', country: 'UK' as const, Logo: LogoReed },
  { name: 'Comcave College', country: 'DE' as const, Logo: LogoComcave },
  { name: 'Corndel', country: 'UK' as const, Logo: LogoCorndel },
  { name: 'DAA Group', country: 'DE' as const, Logo: LogoDAA },
  { name: 'QA Training', country: 'UK' as const, Logo: LogoQA },
]

type LogoItem = typeof logosRow1[number]

function MarqueeRow({ logos, direction = 'left', speed = 30 }: { logos: LogoItem[]; direction?: 'left' | 'right'; speed?: number }) {
  const doubled = [...logos, ...logos]

  return (
    <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div
        className={`flex gap-6 md:gap-10 shrink-0 ${direction === 'left' ? 'animate-marquee-left' : 'animate-marquee-right'}`}
        style={{ animationDuration: `${speed}s` }}
      >
        {doubled.map((logo, index) => (
          <div
            key={`${logo.name}-${index}`}
            className="group flex items-center gap-4 px-6 py-4 rounded-2xl bg-white border border-gray-100 hover:border-brand-blue-pale hover:shadow-lg transition-all duration-300 shrink-0 grayscale hover:grayscale-0"
          >
            <logo.Logo />
            <div className="flex items-center gap-1.5">
              <span className={`w-4 h-3 rounded-sm overflow-hidden shrink-0 border border-gray-200 ${
                logo.country === 'UK' ? '' : ''
              }`}>
                {logo.country === 'UK' ? (
                  <svg viewBox="0 0 60 40" className="w-full h-full">
                    <rect width="60" height="40" fill="#012169" />
                    <path d="M0 0L60 40M60 0L0 40" stroke="white" strokeWidth="6" />
                    <path d="M0 0L60 40M60 0L0 40" stroke="#C8102E" strokeWidth="3" />
                    <path d="M30 0V40M0 20H60" stroke="white" strokeWidth="10" />
                    <path d="M30 0V40M0 20H60" stroke="#C8102E" strokeWidth="5" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 60 40" className="w-full h-full">
                    <rect width="20" height="40" fill="#000" />
                    <rect x="20" width="20" height="40" fill="#DD0000" />
                    <rect x="40" width="20" height="40" fill="#FFCC00" />
                  </svg>
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function LogoCloud() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-50px' })

  return (
    <section className="relative py-16 md:py-20 overflow-hidden bg-white border-b border-gray-100">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-10"
        >
          <p className="text-sm md:text-base font-medium text-gray-500 uppercase tracking-wider">
            Ils nous font confiance en Europe
          </p>
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-2 text-2xl md:text-3xl font-bold text-gray-900"
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">
              Utilisée par des organismes
            </span>{' '}
            en France, au UK et en Allemagne
          </motion.p>
        </motion.div>
      </div>

      {/* Marquee rows */}
      <div className="space-y-4">
        <MarqueeRow logos={logosRow1} direction="left" speed={35} />
        <MarqueeRow logos={logosRow2} direction="right" speed={40} />
      </div>

      {/* Certifications badges */}
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-4 md:gap-8 mt-12 pt-10 border-t border-gray-100"
        >
          {[
            { label: 'Certifié Qualiopi', color: 'brand-blue' },
            { label: 'RGPD Conforme', color: 'brand-cyan' },
            { label: 'Hébergé en France', color: 'brand-blue' },
            { label: 'Support 24/7', color: 'brand-cyan' },
          ].map((badge) => (
            <motion.div
              key={badge.label}
              whileHover={{ scale: 1.05 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full bg-${badge.color}/5 border border-${badge.color}/20`}
            >
              <div className={`w-2 h-2 rounded-full bg-${badge.color}`} />
              <span className="text-sm font-medium text-gray-700">{badge.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
