'use client'

import { motion } from '@/components/ui/motion'
import { ShieldCheck, BadgeEuro, Users } from 'lucide-react'

interface CatalogTrustBarProps {
  primaryColor: string
  hasQualiopi: boolean
  cpfEligibleCount: number
  totalLearners?: number | string | null
  align?: 'left' | 'center'
}

export function CatalogTrustBar({ primaryColor, hasQualiopi, cpfEligibleCount, totalLearners, align = 'left' }: CatalogTrustBarProps) {
  const items: { icon: typeof ShieldCheck; label: string }[] = []

  if (hasQualiopi) {
    items.push({ icon: ShieldCheck, label: 'Certifié Qualiopi' })
  }
  if (cpfEligibleCount > 0) {
    items.push({
      icon: BadgeEuro,
      label: `${cpfEligibleCount} formation${cpfEligibleCount > 1 ? 's' : ''} éligible${cpfEligibleCount > 1 ? 's' : ''} CPF`,
    })
  }
  if (totalLearners) {
    items.push({ icon: Users, label: `${totalLearners} apprenants formés` })
  }

  if (items.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={`relative z-10 flex flex-wrap items-center gap-x-8 gap-y-3 py-6 ${align === 'center' ? 'justify-center' : 'justify-start'}`}
    >
      {items.map((item, index) => (
        <div key={index} className="inline-flex items-center gap-2 text-white/90">
          <item.icon className="w-4 h-4" style={{ color: 'white' }} />
          <span className="text-sm font-medium">{item.label}</span>
        </div>
      ))}
    </motion.div>
  )
}
