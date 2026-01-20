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
    color: 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700',
    iconColor: 'text-white',
    description: 'E-Learning',
  },
  {
    icon: Calendar,
    label: 'Mon planning',
    href: '/learner/planning',
    color: 'bg-gradient-to-br from-purple-500 via-purple-600 to-pink-700',
    iconColor: 'text-white',
    description: 'Calendrier',
  },
  {
    icon: FileText,
    label: 'Mes documents',
    href: '/learner/documents',
    color: 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700',
    iconColor: 'text-white',
    description: 'Telecharger',
  },
  {
    icon: MessageCircle,
    label: 'Messages',
    href: '/learner/messages',
    color: 'bg-gradient-to-br from-orange-500 via-orange-600 to-red-700',
    iconColor: 'text-white',
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
        ease: [0.16, 1, 0.3, 1] as const,
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
        <motion.div key={action.href} variants={itemVariants}>
          <Link href={action.href}>
            <motion.div
              whileHover={{ scale: 1.05, y: -8 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="group relative overflow-hidden rounded-3xl cursor-pointer shadow-[0_10px_40px_-15px_rgba(0,0,0,0.2)] hover:shadow-[0_20px_60px_-15px_rgba(59,130,246,0.4)] transition-all duration-500"
            >
              {/* Animated gradient background */}
              <motion.div
                className={`absolute inset-0 ${action.color}`}
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.5,
                }}
                style={{ backgroundSize: '200% 200%' }}
              />

              {/* Mesh gradient overlay */}
              <div className="absolute inset-0 opacity-30" style={{
                backgroundImage: 'radial-gradient(at 40% 20%, rgba(255, 255, 255, 0.3) 0px, transparent 50%), radial-gradient(at 80% 80%, rgba(255, 255, 255, 0.2) 0px, transparent 50%)',
              }} />

              {/* Floating orb */}
              <motion.div
                animate={{
                  y: [0, -10, 0],
                  x: [0, 5, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 4 + index,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"
              />

              {/* Shimmer effect on hover */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />

              {/* Glow effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center gap-4 text-center p-6 md:p-8">
                <motion.div
                  className="relative p-4 md:p-5 bg-white/20 backdrop-blur-md rounded-2xl md:rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/30"
                  whileHover={{ scale: 1.15, rotate: 8 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  {/* Icon glow */}
                  <motion.div
                    className="absolute inset-0 bg-white/30 rounded-2xl md:rounded-3xl blur-xl opacity-0 group-hover:opacity-100"
                    transition={{ duration: 0.3 }}
                  />
                  <action.icon className={`h-6 w-6 md:h-8 md:w-8 ${action.iconColor} drop-shadow-lg relative z-10`} />
                </motion.div>
                <div>
                  <motion.span
                    className="text-[10px] md:text-xs font-bold text-white/95 block mb-1.5 uppercase tracking-widest drop-shadow-md"
                    whileHover={{ scale: 1.05 }}
                  >
                    {action.description}
                  </motion.span>
                  <motion.span
                    className="text-sm md:text-base font-display font-bold text-white tracking-tight leading-tight drop-shadow-xl block"
                    whileHover={{ scale: 1.05 }}
                  >
                    {action.label}
                  </motion.span>
                </div>
              </div>

              {/* Bottom gradient accent */}
              <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            </motion.div>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  )
}
