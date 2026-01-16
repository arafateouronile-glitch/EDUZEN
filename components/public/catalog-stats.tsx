'use client'

import { motion } from '@/components/ui/motion'
import { Users, Award, BookOpen, GraduationCap } from 'lucide-react'

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
  const items = [
    {
      icon: Users,
      value: typeof stats?.learners === 'number' ? stats.learners.toLocaleString('fr-FR') : (stats?.learners || '5000+'),
      label: 'Apprenants formés',
      delay: 0.1,
    },
    {
      icon: BookOpen,
      value: typeof stats?.courses === 'number' ? stats.courses.toString() : (stats?.courses || '50+'),
      label: 'Programmes de formation',
      delay: 0.2,
    },
    {
      icon: Award,
      value: typeof stats?.certifications === 'number' ? `${stats.certifications}%` : (stats?.certifications || '98%'),
      label: 'Taux de satisfaction',
      delay: 0.3,
    },
    {
      icon: GraduationCap,
      value: typeof stats?.successRate === 'number' ? `${stats.successRate}%` : (stats?.successRate || '95%'),
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
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
                style={{ backgroundColor: `${primaryColor}10` }}
              >
                <item.icon 
                  className="w-8 h-8" 
                  style={{ color: primaryColor }} 
                />
              </div>
              <h3 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">
                {item.value}
              </h3>
              <p className="text-gray-500 font-medium">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
