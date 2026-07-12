'use client'

import { motion } from '@/components/ui/motion'
import { Users, Award, BookOpen, GraduationCap } from 'lucide-react'
import { lightenHexColor } from '@/lib/utils'
import { AnimatedCounter } from '@/components/public/animated-counter'

interface CatalogStatsProps {
  primaryColor: string
  stats?: {
    learners?: number
    courses?: number
    certifications?: number
    successRate?: number
  }
}

export function CatalogStats({ primaryColor, stats }: CatalogStatsProps) {
  const accentColor = lightenHexColor(primaryColor, 0.4)
  const items = [
    {
      icon: Users,
      numericValue: typeof stats?.learners === 'number' ? stats.learners : 5000,
      suffix: typeof stats?.learners === 'number' ? '' : '+',
      label: 'Apprenants formés',
      delay: 0.1,
    },
    {
      icon: BookOpen,
      numericValue: typeof stats?.courses === 'number' ? stats.courses : 50,
      suffix: typeof stats?.courses === 'number' ? '' : '+',
      label: 'Programmes de formation',
      delay: 0.2,
    },
    {
      icon: Award,
      numericValue: typeof stats?.certifications === 'number' ? stats.certifications : 98,
      suffix: '%',
      label: 'Taux de satisfaction',
      delay: 0.3,
    },
    {
      icon: GraduationCap,
      numericValue: typeof stats?.successRate === 'number' ? stats.successRate : 95,
      suffix: '%',
      label: 'Taux de réussite',
      delay: 0.4,
    },
  ]

  return (
    <section className="py-16 bg-white relative overflow-hidden">
      <div className="container mx-auto px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: item.delay }}
              className="text-center group"
            >
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 text-white shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`, boxShadow: `0 8px 24px -8px ${primaryColor}50` }}
              >
                <item.icon className="w-8 h-8" />
              </div>
              <h3 className="font-display text-4xl font-bold text-gray-900 mb-2 tracking-tight">
                <AnimatedCounter value={item.numericValue} suffix={item.suffix} />
              </h3>
              <p className="text-gray-500 font-medium">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
