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
    description: 'Vue d\'ensemble'
  },
  { 
    name: 'Mes formations', 
    href: '/learner/formations', 
    icon: GraduationCap,
    description: 'Parcours et sessions'
  },
  { 
    name: 'E-Learning', 
    href: '/learner/elearning', 
    icon: PlayCircle,
    description: 'Cours en ligne'
  },
  { 
    name: 'Planning', 
    href: '/learner/planning', 
    icon: Calendar,
    description: 'Emploi du temps'
  },
  { 
    name: 'Documents', 
    href: '/learner/documents', 
    icon: FileText,
    description: 'Convocations, attestations'
  },
  { 
    name: 'Évaluations', 
    href: '/learner/evaluations', 
    icon: ClipboardCheck,
    description: 'Quiz et questionnaires'
  },
  { 
    name: 'Certificats', 
    href: '/learner/certificates', 
    icon: Award,
    description: 'Diplômes obtenus'
  },
  { 
    name: 'Paiements', 
    href: '/learner/payments', 
    icon: CreditCard,
    description: 'Factures et règlements'
  },
  { 
    name: 'Messages', 
    href: '/learner/messages', 
    icon: MessageSquare,
    description: 'Communication'
  },
]

const secondaryNavigation = [
  { name: 'Mon profil', href: '/learner/profile', icon: User },
  { name: 'Paramètres', href: '/learner/settings', icon: Settings },
]

export function LearnerSidebar({ isOpen, onClose }: LearnerSidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100">
        <Link href="/learner" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-indigo-600 flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">EDUZEN</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Espace Apprenant</p>
          </div>
        </Link>
        <button
          onClick={onClose}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* User Info */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-brand-blue/5 to-indigo-50 border border-brand-blue/10">
          <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center">
            <span className="text-brand-blue font-semibold">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Navigation
        </div>
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/learner' && pathname?.startsWith(item.href))
          
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200',
                isActive
                  ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/25'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 flex-shrink-0 transition-colors',
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-brand-blue'
                )}
              />
              <div className="flex-1">
                <span>{item.name}</span>
                {!isActive && (
                  <p className="text-[10px] text-gray-400 group-hover:text-gray-500 mt-0.5">
                    {item.description}
                  </p>
                )}
              </div>
            </Link>
          )
        })}

        <div className="px-3 py-2 mt-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Compte
        </div>
        {secondaryNavigation.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200',
                isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0 text-gray-400" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-all duration-200"
        >
          <LogOut className="h-5 w-5" />
          Déconnexion
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white/80 backdrop-blur-xl border-r border-gray-200/50 shadow-xl">
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
              className="lg:hidden fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm"
              onClick={onClose}
            />
            
            {/* Sidebar */}
            <motion.div
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}





