'use client'

import { useAuth } from '@/lib/hooks/use-auth'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Bell, Menu, Search, Sparkles, ChevronDown, Settings, LogOut, User, Command } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from '@/components/ui/motion'
import Link from 'next/link'

interface LearnerHeaderProps {
  onMenuClick: () => void
}

export function LearnerHeader({ onMenuClick }: LearnerHeaderProps) {
  const { user, logout } = useAuth()
  const supabase = createClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Récupérer les notifications non lues
  const { data: unreadCount } = useQuery({
    queryKey: ['learner-notifications-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)

      return count || 0
    },
    enabled: !!user?.id,
    staleTime: 30000,
  })

  const userInitials = (user?.full_name || user?.email || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <header className="sticky top-0 z-40">
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-2xl border-b border-gray-200/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]" />

      <div className="relative flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Mobile Menu Button */}
        <motion.button
          onClick={onMenuClick}
          className="lg:hidden p-2.5 -ml-2 rounded-xl bg-gray-50/80 hover:bg-gray-100 border border-gray-200/50 transition-all duration-200"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Menu className="h-5 w-5 text-gray-700" />
        </motion.button>

        {/* Search Bar (Desktop) - Premium Style */}
        <div className="hidden md:flex flex-1 max-w-lg">
          <motion.div
            className="relative w-full"
            animate={{
              scale: isSearchFocused ? 1.02 : 1,
            }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          >
            {/* Search glow effect when focused */}
            <AnimatePresence>
              {isSearchFocused && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute -inset-1 bg-gradient-to-r from-brand-blue/20 to-brand-cyan/20 rounded-2xl blur-xl"
                />
              )}
            </AnimatePresence>

            <div className="relative">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${isSearchFocused ? 'text-brand-blue' : 'text-gray-400'}`} />
              <Input
                type="search"
                placeholder="Rechercher une formation, un cours..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="pl-11 pr-20 h-11 bg-gray-50/80 hover:bg-gray-100/80 border-gray-200/80 rounded-xl focus:bg-white focus:border-brand-blue/30 focus:ring-2 focus:ring-brand-blue/10 transition-all duration-200 text-sm font-medium placeholder:text-gray-400"
              />
              {/* Keyboard shortcut hint */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-1 px-2 py-1 bg-gray-100/80 rounded-lg border border-gray-200/50">
                <Command className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-400 font-medium">K</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search Button (Mobile) */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-10 w-10 rounded-xl bg-gray-50/80 hover:bg-gray-100 border border-gray-200/50"
            >
              <Search className="h-5 w-5 text-gray-600" />
            </Button>
          </motion.div>

          {/* Notifications - Premium Style */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-10 w-10 rounded-xl bg-gray-50/80 hover:bg-gray-100 border border-gray-200/50 group"
            >
              <Bell className="h-5 w-5 text-gray-600 group-hover:text-brand-blue transition-colors" />
              {unreadCount && unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 h-5 w-5 bg-gradient-to-br from-brand-blue to-brand-cyan text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-brand-blue/30 border-2 border-white"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
            </Button>
          </motion.div>

          {/* User Profile - Premium Dropdown */}
          <div className="relative" ref={profileRef}>
            <motion.button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="hidden sm:flex items-center gap-3 pl-3 sm:pl-4 pr-2 py-1.5 rounded-2xl border border-gray-200/50 bg-gray-50/50 hover:bg-white hover:border-gray-300/50 hover:shadow-lg transition-all duration-300 group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-brand-blue transition-colors">
                  {user?.full_name || user?.email?.split('@')[0] || 'Utilisateur'}
                </p>
                <div className="flex items-center justify-end gap-1">
                  <Sparkles className="h-3 w-3 text-brand-cyan" />
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Apprenant</p>
                </div>
              </div>

              {/* Avatar with gradient ring */}
              <div className="relative">
                <div className="absolute -inset-0.5 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-full opacity-75 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center text-white font-bold text-sm shadow-inner">
                  {userInitials}
                </div>
              </div>

              <motion.div
                animate={{ rotate: isProfileOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-brand-blue transition-colors" />
              </motion.div>
            </motion.button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                  className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-2xl shadow-gray-200/50 overflow-hidden"
                >
                  {/* Profile Header */}
                  <div className="p-4 bg-gradient-to-br from-brand-blue/5 to-brand-cyan-ghost/50 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-full opacity-75" />
                        <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center text-white font-bold">
                          {userInitials}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {user?.full_name || 'Utilisateur'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="p-2">
                    <Link href="/learner/profile" onClick={() => setIsProfileOpen(false)}>
                      <motion.div
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 hover:text-brand-blue transition-colors group"
                        whileHover={{ x: 4 }}
                      >
                        <div className="p-1.5 bg-gray-100 rounded-lg group-hover:bg-brand-blue/10 transition-colors">
                          <User className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-sm">Mon profil</span>
                      </motion.div>
                    </Link>

                    <Link href="/learner/settings" onClick={() => setIsProfileOpen(false)}>
                      <motion.div
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 hover:text-brand-blue transition-colors group"
                        whileHover={{ x: 4 }}
                      >
                        <div className="p-1.5 bg-gray-100 rounded-lg group-hover:bg-brand-blue/10 transition-colors">
                          <Settings className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-sm">Paramètres</span>
                      </motion.div>
                    </Link>
                  </div>

                  {/* Logout */}
                  <div className="p-2 border-t border-gray-100">
                    <motion.button
                      onClick={() => {
                        setIsProfileOpen(false)
                        logout()
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors group"
                      whileHover={{ x: 4 }}
                    >
                      <div className="p-1.5 bg-red-50 rounded-lg group-hover:bg-red-100 transition-colors">
                        <LogOut className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-sm">Déconnexion</span>
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Avatar */}
          <motion.div
            className="sm:hidden"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-full opacity-75" />
              <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center text-white font-bold text-sm">
                {userInitials}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </header>
  )
}





