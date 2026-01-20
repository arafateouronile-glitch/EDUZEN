'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/use-auth'
import { motion, AnimatePresence } from '@/components/ui/motion'
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Calendar,
  FileText,
  ClipboardCheck,
  Award,
  CreditCard,
  MessageSquare,
  User,
  Settings,
  LogOut,
  X,
  PlayCircle,
  Sparkles,
  ChevronRight,
  Zap,
} from 'lucide-react'

interface LearnerSidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navigation = [
  {
    name: 'Tableau de bord',
    href: '/learner',
    icon: LayoutDashboard,
    description: 'Vue d\'ensemble',
    gradient: 'from-brand-blue to-brand-blue-dark',
  },
  {
    name: 'Mes formations',
    href: '/learner/formations',
    icon: GraduationCap,
    description: 'Parcours et sessions',
    gradient: 'from-brand-blue to-brand-cyan',
  },
  {
    name: 'E-Learning',
    href: '/learner/elearning',
    icon: PlayCircle,
    description: 'Cours en ligne',
    gradient: 'from-brand-cyan to-brand-cyan-dark',
  },
  {
    name: 'Planning',
    href: '/learner/planning',
    icon: Calendar,
    description: 'Emploi du temps',
    gradient: 'from-brand-blue-light to-brand-cyan',
  },
  {
    name: 'Documents',
    href: '/learner/documents',
    icon: FileText,
    description: 'Convocations, attestations',
    gradient: 'from-brand-blue to-brand-blue-light',
  },
  {
    name: 'Évaluations',
    href: '/learner/evaluations',
    icon: ClipboardCheck,
    description: 'Quiz et questionnaires',
    gradient: 'from-brand-cyan to-brand-blue',
  },
  {
    name: 'Certificats',
    href: '/learner/certificates',
    icon: Award,
    description: 'Diplômes obtenus',
    gradient: 'from-brand-blue-dark to-brand-blue',
  },
  {
    name: 'Paiements',
    href: '/learner/payments',
    icon: CreditCard,
    description: 'Factures et règlements',
    gradient: 'from-brand-cyan-light to-brand-cyan',
  },
  {
    name: 'Messages',
    href: '/learner/messages',
    icon: MessageSquare,
    description: 'Communication',
    gradient: 'from-brand-blue to-brand-cyan-light',
  },
]

const secondaryNavigation = [
  { name: 'Mon profil', href: '/learner/profile', icon: User },
  { name: 'Paramètres', href: '/learner/settings', icon: Settings },
]

export function LearnerSidebar({ isOpen, onClose }: LearnerSidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const userInitials = (user?.full_name || user?.email || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const sidebarContent = (
    <div className="flex flex-col h-full relative">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50/50 to-gray-100/30 pointer-events-none" />

      {/* Logo */}
      <div className="relative flex items-center justify-between h-16 px-5 border-b border-gray-100/80">
        <Link href="/learner" className="flex items-center gap-3 group">
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <div className="absolute -inset-1 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl opacity-75 blur-sm group-hover:opacity-100 transition-opacity" />
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center shadow-lg">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
          </motion.div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">EDUZEN</h1>
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-brand-cyan" />
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Espace Apprenant</p>
            </div>
          </div>
        </Link>
        <motion.button
          onClick={onClose}
          className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200/50"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <X className="h-5 w-5 text-gray-500" />
        </motion.button>
      </div>

      {/* User Info Card - Premium Design */}
      <div className="relative px-4 py-4">
        <motion.div
          className="relative overflow-hidden rounded-2xl"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          {/* Card gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-blue to-brand-cyan opacity-95" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />

          {/* Floating orbs */}
          <motion.div
            animate={{
              y: [-5, 5, -5],
              x: [-3, 3, -3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute top-2 right-2 w-16 h-16 bg-white/10 rounded-full blur-xl"
          />

          <div className="relative z-10 flex items-center gap-3 p-4">
            {/* Avatar with glow */}
            <div className="relative">
              <div className="absolute -inset-0.5 bg-white/30 rounded-full blur-sm" />
              <div className="relative w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-inner">
                <span className="text-white font-bold text-sm">{userInitials}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate drop-shadow-md">
                {user?.full_name || user?.email?.split('@')[0] || 'Utilisateur'}
              </p>
              <p className="text-[11px] text-white/70 truncate">{user?.email}</p>
            </div>
            <motion.div
              className="p-1.5 bg-white/10 rounded-lg border border-white/20"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Zap className="h-4 w-4 text-brand-cyan-light" />
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto relative">
        <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
          Navigation
        </div>
        {navigation.map((item, index) => {
          const isActive = pathname === item.href ||
            (item.href !== '/learner' && pathname?.startsWith(item.href))

          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                href={item.href}
                onClick={onClose}
              >
                <motion.div
                  className={cn(
                    'group relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-300',
                    isActive
                      ? 'text-white'
                      : 'text-gray-600 hover:bg-gray-50/80'
                  )}
                  whileHover={!isActive ? { x: 4 } : undefined}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Active background with gradient */}
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className={`absolute inset-0 bg-gradient-to-r ${item.gradient} rounded-xl shadow-lg`}
                      style={{
                        boxShadow: '0 10px 30px -10px rgba(59, 130, 246, 0.5)',
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}

                  {/* Hover background */}
                  {!isActive && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-gray-100/0 to-gray-100/0 group-hover:from-gray-100/80 group-hover:to-gray-50/50 rounded-xl transition-all duration-300"
                    />
                  )}

                  {/* Icon container */}
                  <div className={cn(
                    'relative z-10 p-2 rounded-lg transition-all duration-300',
                    isActive
                      ? 'bg-white/20'
                      : 'bg-gray-100/80 group-hover:bg-gray-200/80'
                  )}>
                    <item.icon
                      className={cn(
                        'h-4 w-4 flex-shrink-0 transition-all duration-300',
                        isActive ? 'text-white' : 'text-gray-500 group-hover:text-brand-blue'
                      )}
                    />
                  </div>

                  {/* Text content */}
                  <div className="flex-1 relative z-10">
                    <span className={cn(
                      'block font-semibold transition-colors',
                      isActive ? 'text-white' : 'group-hover:text-gray-900'
                    )}>
                      {item.name}
                    </span>
                    {!isActive && (
                      <p className="text-[10px] text-gray-400 group-hover:text-gray-500 mt-0.5 transition-colors">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Arrow indicator */}
                  <ChevronRight className={cn(
                    'h-4 w-4 relative z-10 transition-all duration-300',
                    isActive
                      ? 'text-white/70 translate-x-0'
                      : 'text-gray-300 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 group-hover:text-gray-400'
                  )} />
                </motion.div>
              </Link>
            </motion.div>
          )
        })}

        {/* Divider */}
        <div className="my-4 mx-3 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

        <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
          Compte
        </div>
        {secondaryNavigation.map((item, index) => {
          const isActive = pathname === item.href

          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: (navigation.length + index) * 0.05 }}
            >
              <Link
                href={item.href}
                onClick={onClose}
              >
                <motion.div
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50/80'
                  )}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={cn(
                    'p-2 rounded-lg transition-colors',
                    isActive ? 'bg-gray-200' : 'bg-gray-100/80 group-hover:bg-gray-200/80'
                  )}>
                    <item.icon className="h-4 w-4 text-gray-500" />
                  </div>
                  <span className="font-medium">{item.name}</span>
                </motion.div>
              </Link>
            </motion.div>
          )
        })}
      </nav>

      {/* Logout - Premium Style */}
      <div className="relative p-4 border-t border-gray-100/80">
        <motion.button
          onClick={() => logout()}
          className="w-full group flex items-center gap-3 px-3 py-3 text-sm font-semibold text-red-600 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100 transition-all duration-300"
          whileHover={{ scale: 1.02, x: 4 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="p-2 bg-red-50 group-hover:bg-red-100 rounded-lg transition-colors">
            <LogOut className="h-4 w-4" />
          </div>
          <span>Déconnexion</span>
        </motion.button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white/90 backdrop-blur-2xl border-r border-gray-200/50 shadow-[4px_0_30px_rgba(0,0,0,0.03)]">
          {sidebarContent}
        </div>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: -288, opacity: 0.8 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -288, opacity: 0.8 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-[10px_0_50px_rgba(0,0,0,0.15)]"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}





