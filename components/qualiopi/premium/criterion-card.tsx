'use client'

import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import {
  Megaphone,
  Target,
  Users,
  Wrench,
  GraduationCap,
  Building2,
  MessageSquare,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react'
import { GlassCardPremium } from './glass-card-premium'

// Icônes pour chaque critère
const CRITERION_ICONS = {
  1: Megaphone, // Information du public
  2: Target, // Objectifs
  3: Users, // Adaptation publics
  4: Wrench, // Moyens pédagogiques
  5: GraduationCap, // Compétences
  6: Building2, // Environnement pro
  7: MessageSquare, // Appréciations
}

interface CriterionCardProps {
  number: number
  name: string
  indicatorCount: number
  compliantCount: number
  completionRate: number
  isSelected?: boolean
  onClick?: () => void
  delay?: number
}

export function CriterionCard({
  number,
  name,
  indicatorCount,
  compliantCount,
  completionRate,
  isSelected = false,
  onClick,
  delay = 0,
}: CriterionCardProps) {
  const Icon = CRITERION_ICONS[number as keyof typeof CRITERION_ICONS] || Target

  // Couleur de progression
  const getProgressColor = (rate: number) => {
    if (rate >= 90) return 'from-green-400 to-green-600'
    if (rate >= 75) return 'from-[#34B9EE] to-[#0EA5E9]'
    if (rate >= 50) return 'from-amber-400 to-amber-600'
    return 'from-red-400 to-red-600'
  }

  const getProgressBg = (rate: number) => {
    if (rate >= 90) return 'bg-green-100'
    if (rate >= 75) return 'bg-cyan-100'
    if (rate >= 50) return 'bg-amber-100'
    return 'bg-red-100'
  }

  return (
    <GlassCardPremium
      variant={isSelected ? 'cyan-accent' : 'default'}
      hoverable
      glow={isSelected}
      delay={delay}
      className={cn(
        'p-4 transition-all duration-300',
        isSelected && 'ring-2 ring-[#34B9EE]/50'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Icône du critère */}
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            'bg-gradient-to-br from-[#274472] to-[#1a2f4a]',
            'shadow-lg shadow-[#274472]/20'
          )}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          {/* Numéro et nom */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#34B9EE]">
                Critère {number}
              </span>
              <h3 className="font-space-grotesk font-semibold text-sm text-slate-800 dark:text-white line-clamp-1">
                {name}
              </h3>
            </div>
            <ChevronRight
              className={cn(
                'h-4 w-4 text-slate-400 transition-transform duration-200',
                isSelected && 'text-[#34B9EE] rotate-90'
              )}
            />
          </div>

          {/* Barre de progression */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span>
                  {compliantCount}/{indicatorCount} indicateurs
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-700">
                {completionRate}%
              </span>
            </div>

            {/* Progress bar custom */}
            <div className={cn('h-1.5 w-full rounded-full', getProgressBg(completionRate))}>
              <motion.div
                className={cn(
                  'h-full rounded-full bg-gradient-to-r',
                  getProgressColor(completionRate)
                )}
                initial={{ width: 0 }}
                animate={{ width: `${completionRate}%` }}
                transition={{ duration: 1, delay: delay + 0.3, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Badge si 100% conforme */}
      {completionRate === 100 && (
        <motion.div
          className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 shadow-lg"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.5, type: 'spring' }}
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-white" />
        </motion.div>
      )}
    </GlassCardPremium>
  )
}

// Liste des 7 critères avec navigation
interface CriteriaNavigationProps {
  criteria: {
    number: number
    name: string
    indicatorCount: number
    compliantCount: number
    completionRate: number
  }[]
  selectedCriterion: number | null
  onSelectCriterion: (number: number) => void
}

export function CriteriaNavigation({
  criteria,
  selectedCriterion,
  onSelectCriterion,
}: CriteriaNavigationProps) {
  return (
    <div className="space-y-3">
      <h2 className="font-space-grotesk text-lg font-bold text-[#274472] mb-4">
        Les 7 Critères Qualiopi
      </h2>

      <div className="space-y-2">
        {criteria.map((criterion, index) => (
          <CriterionCard
            key={criterion.number}
            {...criterion}
            isSelected={selectedCriterion === criterion.number}
            onClick={() => onSelectCriterion(criterion.number)}
            delay={index * 0.1}
          />
        ))}
      </div>
    </div>
  )
}
