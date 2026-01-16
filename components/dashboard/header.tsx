'use client'

import React from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { User, ChevronDown, Settings, LogOut, Menu } from 'lucide-react'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { MobileSidebar } from './mobile-sidebar'
import { ThemeToggle } from './theme-toggle'
import { GlobalSearch } from '@/components/search/global-search'
import { FeedbackButton } from '@/components/feedback/feedback-button'
import { NotificationBadge } from '@/components/notifications/notification-badge'
import { NotificationCenter } from '@/components/notifications/notification-center'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <React.Fragment>
      <MobileSidebar 
        isOpen={isMobileSidebarOpen} 
        onClose={() => setIsMobileSidebarOpen(false)} 
      />
      <NotificationCenter 
        open={isNotificationCenterOpen} 
        onOpenChange={setIsNotificationCenterOpen} 
      />
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-bg-gray-50 border-b border-bg-gray-200 px-4 md:px-6 py-3 md:py-4 sticky top-0 z-30 shadow-sm"
      >
        <div className="flex items-center justify-between gap-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="md:hidden h-10 w-10 rounded-xl"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Search Premium - Recherche globale */}
          <GlobalSearch />

                   {/* Right Section */}
                   <div className="flex items-center space-x-2 md:space-x-4">
                     {/* Feedback Button */}
                     <FeedbackButton variant="ghost" size="icon" className="hidden md:flex" />

                     {/* Language Switcher */}
                     <LanguageSwitcher />

                     {/* Theme Toggle */}
                     <ThemeToggle />

                     {/* Notifications - Nouveau système de notifications */}
                     <NotificationBadge onClick={() => setIsNotificationCenterOpen(true)} />

          {/* User Menu Premium */}
          <div className="relative" ref={userMenuRef}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-bg-gray-100 transition-colors duration-200 min-touch-target touch-manipulation group"
            >
              <div className="flex items-center space-x-3">
                <Avatar
                  fallback={user?.full_name || 'Utilisateur'}
                  userId={user?.id || 'default'}
                  size="md"
                  variant="auto"
                  className="shadow-lg group-hover:shadow-xl transition-shadow duration-300 rounded-xl border-2 border-bg-gray-200"
                />
                <div className="text-right hidden md:block">
                  <p className="text-sm font-medium text-text-primary">{user?.full_name || 'Utilisateur'}</p>
                  <p className="text-xs text-text-tertiary">{user?.role || 'Rôle'}</p>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-text-tertiary transition-transform duration-200 hidden md:block",
                  isUserMenuOpen && "rotate-180"
                )}
              />
            </motion.button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isUserMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-bg-gray-200 backdrop-blur-md overflow-hidden z-50"
                >
                  {/* User Info */}
                  <div className="px-4 py-3 bg-gradient-to-r from-brand-blue-ghost to-transparent border-b border-bg-gray-200">
                    <p className="text-sm font-semibold text-text-primary">{user?.full_name || 'Utilisateur'}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">{user?.email || ''}</p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <motion.button
                      whileHover={{ x: 4 }}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-text-secondary hover:bg-bg-gray-100 transition-colors duration-200"
                    >
                      <User className="h-4 w-4 mr-3 text-text-tertiary" />
                      Mon profil
                    </motion.button>
                    <motion.button
                      whileHover={{ x: 4 }}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-text-secondary hover:bg-bg-gray-100 transition-colors duration-200"
                    >
                      <Settings className="h-4 w-4 mr-3 text-text-tertiary" />
                      Paramètres
                    </motion.button>
                    <div className="border-t border-bg-gray-200 my-2" />
                    <motion.button
                      whileHover={{ x: 4 }}
                      onClick={() => logout()}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-danger-primary hover:bg-danger-bg transition-colors duration-200"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Déconnexion
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.header>
    </React.Fragment>
  )
}
