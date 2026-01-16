'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  GraduationCap,
  PlayCircle,
  FileText,
  User,
} from 'lucide-react'

const mobileNavItems = [
  { name: 'Accueil', href: '/learner', icon: LayoutDashboard },
  { name: 'Formations', href: '/learner/formations', icon: GraduationCap },
  { name: 'E-Learning', href: '/learner/elearning', icon: PlayCircle },
  { name: 'Documents', href: '/learner/documents', icon: FileText },
  { name: 'Profil', href: '/learner/profile', icon: User },
]

export function LearnerMobileNav() {
  const pathname = usePathname()

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe">
      <nav className="flex items-center justify-around h-16">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/learner' && pathname?.startsWith(item.href))

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full transition-colors',
                isActive ? 'text-brand-blue' : 'text-gray-500'
              )}
            >
              <item.icon className={cn(
                'h-5 w-5 mb-1',
                isActive && 'text-brand-blue'
              )} />
              <span className={cn(
                'text-[10px] font-medium',
                isActive && 'font-semibold'
              )}>
                {item.name}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}





