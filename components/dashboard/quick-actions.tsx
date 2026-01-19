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
import { Button } from '@/components/ui/button'

const quickActions = [
  {
    icon: PlayCircle,
    label: 'Reprendre un cours',
    href: '/learner/elearning',
    color: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    iconColor: 'text-white',
  },
  {
    icon: Calendar,
    label: 'Planning',
    href: '/learner/planning',
    color: 'bg-gradient-to-br from-purple-500 to-pink-600',
    iconColor: 'text-white',
  },
  {
    icon: FileText,
    label: 'Mes documents',
    href: '/learner/documents',
    color: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    iconColor: 'text-white',
  },
  {
    icon: MessageCircle,
    label: 'Messages',
    href: '/learner/messages',
    color: 'bg-gradient-to-br from-orange-500 to-red-600',
    iconColor: 'text-white',
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
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 md:grid-cols-4 gap-3"
    >
      {quickActions.map((action, index) => (
        <motion.div key={action.href} variants={itemVariants}>
          <Link href={action.href}>
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className="group relative overflow-hidden rounded-2xl p-4 cursor-pointer transition-shadow hover:shadow-2xl"
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 ${action.color} opacity-90 group-hover:opacity-100 transition-opacity`} />

              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center gap-2 text-center">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl group-hover:bg-white/30 transition-colors">
                  <action.icon className={`h-6 w-6 ${action.iconColor}`} />
                </div>
                <span className="text-sm font-semibold text-white">{action.label}</span>
              </div>

              {/* Shine effect on hover */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6 }}
              />
            </motion.div>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  )
}
