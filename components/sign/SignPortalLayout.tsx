'use client'

import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

const BRAND = {
  deepBlue: '#274472',
  electricCyan: '#34B9EE',
  glass: 'rgba(255,255,255,0.12)',
  glassBorder: 'rgba(255,255,255,0.2)',
  glassBg: 'rgba(255,255,255,0.06)',
}

export interface SignPortalLayoutProps {
  children: React.ReactNode
  className?: string
}

/**
 * Layout Glassmorphism "Apple-like" pour le portail de signature /sign/[token].
 * Couleurs : Bleu profond (#274472), Cyan électrique (#34B9EE).
 */
export function SignPortalLayout({ children, className }: SignPortalLayoutProps) {
  return (
    <div
      className={cn(
        'min-h-screen w-full overflow-x-hidden',
        'bg-gradient-to-br from-[#274472] via-[#1e3a5f] to-[#0f2847]',
        'relative',
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${BRAND.deepBlue} 0%, #1e3a5f 50%, #0f2847 100%)`,
      }}
    >
      {/* Fond décoratif */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: BRAND.electricCyan }}
        />
        <div
          className="absolute top-1/2 -left-32 w-80 h-80 rounded-full opacity-10 blur-3xl"
          style={{ background: BRAND.electricCyan }}
        />
        <div
          className="absolute bottom-20 right-1/4 w-64 h-64 rounded-full opacity-15 blur-2xl"
          style={{ background: BRAND.electricCyan }}
        />
      </div>

      <motion.main
        className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:py-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {children}
      </motion.main>
    </div>
  )
}

/**
 * Carte glassmorphism pour le contenu du portail.
 */
export function SignPortalCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      className={cn(
        'w-full max-w-lg rounded-2xl p-6 sm:p-8 shadow-2xl',
        'backdrop-blur-xl border border-white/20',
        'bg-white/10',
        className
      )}
      style={{
        background: BRAND.glassBg,
        borderColor: BRAND.glassBorder,
        boxShadow: `0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px ${BRAND.glassBorder}`,
      }}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
    >
      {children}
    </motion.div>
  )
}

export { BRAND }
