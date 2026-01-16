'use client'

import { motion } from '@/components/ui/motion'
import {
  FileText,
  Bell,
  Award,
  DollarSign,
  Building2,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'

type GestionTab = 'conventions' | 'convocations' | 'evaluations' | 'finances' | 'espace_entreprise' | 'automatisation'

interface GestionTabsProps {
  activeTab: GestionTab
  onTabChange: (tab: GestionTab) => void
}

const gestionTabs = [
  { id: 'conventions' as const, label: 'Conventions', icon: FileText, color: 'from-purple-500 to-purple-600' },
  { id: 'convocations' as const, label: 'Convocations', icon: Bell, color: 'from-brand-blue to-brand-cyan' },
  { id: 'evaluations' as const, label: 'Évaluations', icon: Award, color: 'from-amber-500 to-amber-600' },
  { id: 'finances' as const, label: 'Finances', icon: DollarSign, color: 'from-emerald-500 to-emerald-600' },
  { id: 'espace_entreprise' as const, label: 'Espace entreprise', icon: Building2, color: 'from-blue-500 to-blue-600' },
  { id: 'automatisation' as const, label: 'Automatisation', icon: Zap, color: 'from-orange-500 to-orange-600' },
]

export function GestionTabs({ activeTab, onTabChange }: GestionTabsProps) {
  return (
    <div className="flex flex-wrap gap-3 p-1.5 bg-gray-50/50 rounded-2xl border-2 border-gray-100">
      {gestionTabs.map((tab, index) => {
        const isActive = activeTab === tab.id
        const Icon = tab.icon

        return (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: index * 0.05,
              duration: 0.3,
              ease: [0.16, 1, 0.3, 1]
            }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'relative px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2.5 tracking-tight',
              'shadow-sm hover:shadow-lg',
              isActive
                ? 'bg-white text-gray-900 shadow-xl'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/70'
            )}
          >
            {/* Icon with gradient background */}
            <motion.div
              className={cn(
                'p-1.5 rounded-lg',
                isActive ? `bg-gradient-to-br ${tab.color}` : 'bg-gray-100'
              )}
              whileHover={{ rotate: 5, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Icon className={cn(
                'h-4 w-4',
                isActive ? 'text-white' : 'text-gray-500'
              )} />
            </motion.div>

            {/* Label */}
            <span>{tab.label}</span>

            {/* Active indicator bar */}
            {isActive && (
              <motion.div
                layoutId="activeGestionTab"
                className={cn(
                  'absolute bottom-0 left-0 right-0 h-1 rounded-full',
                  `bg-gradient-to-r ${tab.color}`
                )}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30
                }}
              />
            )}

            {/* Shine effect on hover */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-xl"
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            />
          </motion.button>
        )
      })}
    </div>
  )
}






















