'use client'

import { motion } from '@/components/ui/motion'
import Link from 'next/link'
import {
  Calendar,
  BookOpen,
  Users,
  DollarSign,
} from 'lucide-react'

const adminQuickActions = [
  {
    icon: Calendar,
    label: 'Nouvelle session',
    href: '/dashboard/sessions/new',
    color: 'bg-gradient-to-br from-brand-blue via-brand-blue-light to-brand-cyan',
    iconColor: 'text-white',
    description: 'Planifier',
  },
  {
    icon: Users,
    label: 'Gérer apprenants',
    href: '/dashboard/students',
    color: 'bg-gradient-to-br from-brand-cyan via-brand-blue-light to-brand-blue',
    iconColor: 'text-white',
    description: 'Consulter',
  },
  {
    icon: BookOpen,
    label: 'Gérer sessions',
    href: '/dashboard/sessions',
    color: 'bg-gradient-to-br from-brand-blue-light via-brand-cyan to-brand-blue',
    iconColor: 'text-white',
    description: 'Organiser',
  },
  {
    icon: DollarSign,
    label: 'Suivre paiements',
    href: '/dashboard/payments',
    color: 'bg-gradient-to-br from-brand-cyan via-brand-cyan-dark to-brand-blue-dark',
    iconColor: 'text-white',
    description: 'Gérer',
  },
]

export function AdminQuickActions() {
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
        ease: 'easeInOut' as const,
      },
    },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
    >
      {adminQuickActions.map((action, index) => (
        <motion.div key={action.href} variants={itemVariants}>
          <Link href={action.href}>
            <motion.div
              whileHover={{ scale: 1.05, y: -8 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="group relative overflow-hidden rounded-3xl cursor-pointer shadow-[0_10px_40px_-15px_rgba(0,0,0,0.2)] hover:shadow-[0_20px_60px_-15px_rgba(51,90,207,0.4)] transition-all duration-500"
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
              <div className="relative z-10 flex flex-col items-center gap-5 text-center p-8">
                <motion.div
                  className="relative p-5 bg-white/20 backdrop-blur-md rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/30"
                  whileHover={{ scale: 1.15, rotate: 8 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  {/* Icon glow */}
                  <motion.div
                    className="absolute inset-0 bg-white/30 rounded-3xl blur-xl opacity-0 group-hover:opacity-100"
                    transition={{ duration: 0.3 }}
                  />
                  <action.icon className={`h-8 w-8 ${action.iconColor} drop-shadow-lg relative z-10`} />
                </motion.div>
                <div>
                  <motion.span
                    className="text-xs font-bold text-white/95 block mb-2 uppercase tracking-widest drop-shadow-md"
                    whileHover={{ scale: 1.05 }}
                  >
                    {action.description}
                  </motion.span>
                  <motion.span
                    className="text-lg font-display font-bold text-white tracking-tight leading-tight drop-shadow-xl block"
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
