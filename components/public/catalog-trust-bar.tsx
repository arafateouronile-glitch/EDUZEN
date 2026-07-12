'use client'

import { motion } from '@/components/ui/motion'
import { ShieldCheck, BadgeEuro, Users } from 'lucide-react'

interface CatalogTrustBarProps {
  primaryColor: string
  hasQualiopi: boolean
  /** Nombre de formations éligibles CPF (catalogue) ou simple booléen (une seule formation, page programme). */
  cpfEligible: boolean | number
  totalLearners?: number | string | null
  align?: 'left' | 'center'
  /** 'onColor' (texte blanc, hero coloré) ou 'onLight' (texte sombre, carte blanche). */
  theme?: 'onColor' | 'onLight'
}

export function CatalogTrustBar({ primaryColor, hasQualiopi, cpfEligible, totalLearners, align = 'left', theme = 'onColor' }: CatalogTrustBarProps) {
  const items: { icon: typeof ShieldCheck; label: string }[] = []

  if (hasQualiopi) {
    items.push({ icon: ShieldCheck, label: 'Certifié Qualiopi' })
  }
  if (typeof cpfEligible === 'number' && cpfEligible > 0) {
    items.push({
      icon: BadgeEuro,
      label: `${cpfEligible} formation${cpfEligible > 1 ? 's' : ''} éligible${cpfEligible > 1 ? 's' : ''} CPF`,
    })
  } else if (cpfEligible === true) {
    items.push({ icon: BadgeEuro, label: 'Éligible CPF' })
  }
  if (totalLearners) {
    items.push({ icon: Users, label: `${totalLearners} apprenants formés` })
  }

  if (items.length === 0) return null

  const textClass = theme === 'onLight' ? 'text-gray-700' : 'text-white/90'
  const iconColor = theme === 'onLight' ? primaryColor : 'white'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={`relative z-10 flex flex-wrap items-center gap-x-8 gap-y-3 py-6 ${align === 'center' ? 'justify-center' : 'justify-start'}`}
    >
      {items.map((item, index) => (
        <div key={index} className={`inline-flex items-center gap-2 ${textClass}`}>
          <item.icon className="w-4 h-4" style={{ color: iconColor }} />
          <span className="text-sm font-medium">{item.label}</span>
        </div>
      ))}
    </motion.div>
  )
}
