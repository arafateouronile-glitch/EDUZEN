'use client'

import { motion } from '@/components/ui/motion'
import Link from 'next/link'
import {
  PlayCircle,
  Calendar,
  FileText,
  MessageCircle,
  BookOpen,
  Award,
  Clock,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const quickActions = [
  {
    icon: PlayCircle,
    label: 'Reprendre un cours',
    href: '/learner/elearning',
    cardBg: 'bg-gradient-to-br from-brand-blue/5 via-brand-blue/10 to-brand-cyan/5',
    iconBg: 'bg-gradient-to-br from-brand-blue to-brand-blue-dark',
    borderColor: 'border-brand-blue/20',
    textColor: 'text-brand-blue',
    glowColor: 'rgba(39, 68, 114, 0.15)',
    description: 'E-Learning',
  },
  {
    icon: Calendar,
    label: 'Mon planning',
    href: '/learner/planning',
    cardBg: 'bg-gradient-to-br from-brand-cyan/5 via-brand-cyan/10 to-brand-blue/5',
    iconBg: 'bg-gradient-to-br from-brand-cyan to-brand-cyan-dark',
    borderColor: 'border-brand-cyan/20',
    textColor: 'text-brand-cyan-dark',
    glowColor: 'rgba(52, 185, 238, 0.15)',
    description: 'Calendrier',
  },
  {
    icon: FileText,
    label: 'Mes documents',
    href: '/learner/documents',
    cardBg: 'bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-teal-50',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    glowColor: 'rgba(16, 185, 129, 0.15)',
    description: 'Télécharger',
  },
  {
    icon: MessageCircle,
    label: 'Messages',
    href: '/learner/messages',
    cardBg: 'bg-gradient-to-br from-purple-50 via-purple-100/50 to-pink-50',
    iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    glowColor: 'rgba(168, 85, 247, 0.15)',
    description: 'Communiquer',
  },
]

export function QuickActions() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      },
    },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
    >
      {quickActions.map((action, index) => (
        <motion.div
          key={action.href}
          variants={itemVariants}
          whileHover={{ y: -6, scale: 1.02 }}
          className="group relative"
        >
          <Link href={action.href}>
            <div
              className={cn(
                "relative overflow-hidden rounded-2xl p-5 md:p-6 border-2 transition-all duration-500 shadow-lg hover:shadow-2xl cursor-pointer",
                action.cardBg,
                action.borderColor
              )}
              style={{
                boxShadow: `0 10px 40px -10px ${action.glowColor}, 0 0 0 1px rgba(255, 255, 255, 0.1)`
              }}
            >
              {/* Shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6, ease: "easeInOut" as const }}
              />

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center text-center gap-4">
                <motion.div
                  className={cn('p-3.5 rounded-2xl shadow-xl', action.iconBg)}
                  whileHover={{ rotate: 12, scale: 1.15 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  <action.icon className="h-6 w-6 md:h-7 md:w-7 text-white" />
                </motion.div>

                <div>
                  <p className={cn("text-[10px] md:text-xs font-bold uppercase tracking-widest mb-1", action.textColor)}>
                    {action.description}
                  </p>
                  <p className="text-sm md:text-base font-display font-bold text-gray-900 tracking-tight leading-tight">
                    {action.label}
                  </p>
                </div>

                {/* Bottom accent bar */}
                <motion.div
                  className={cn("h-1 w-12 rounded-full mt-1", action.iconBg)}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: index * 0.05 + 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                />
              </div>

              {/* Glow effect on hover */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: `radial-gradient(circle at 50% 50%, ${action.glowColor} 0%, transparent 70%)`
                }}
              />
            </div>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  )
}
