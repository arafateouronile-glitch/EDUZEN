'use client'

import { useLearnerContext } from '@/lib/contexts/learner-context'
import { GlassCard } from '@/components/ui/glass-card'
import { motion } from '@/components/ui/motion'
import { secureSessionStorage } from '@/lib/utils/secure-storage'
import {
  Bell,
  Globe,
  LogOut,
  Moon,
  Shield,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'

const LEARNER_STORAGE_KEY = 'learner_student_id'

export default function LearnerSettingsPage() {
  const { student } = useLearnerContext()
  const [notifications, setNotifications] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  const handleLogout = () => {
    try { secureSessionStorage.remove(LEARNER_STORAGE_KEY) } catch {}
    window.location.href = '/'
  }

  const sections = [
    {
      title: 'Préférences',
      items: [
        {
          icon: Bell,
          label: 'Notifications',
          description: 'Recevoir des rappels de formation',
          toggle: true,
          value: notifications,
          onChange: () => setNotifications(v => !v),
        },
        {
          icon: Moon,
          label: 'Mode sombre',
          description: 'Bientôt disponible',
          toggle: true,
          value: darkMode,
          onChange: () => setDarkMode(v => !v),
          disabled: true,
        },
      ],
    },
    {
      title: 'Confidentialité',
      items: [
        {
          icon: Shield,
          label: 'Données personnelles',
          description: 'Vos données sont sécurisées et chiffrées',
          toggle: false,
        },
        {
          icon: Globe,
          label: 'Langue',
          description: 'Français',
          toggle: false,
        },
      ],
    },
  ]

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-6 px-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gérez vos préférences pour l'espace apprenant
        </p>
      </motion.div>

      {/* Account info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <GlassCard className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-white font-bold text-lg">
                {student
                  ? `${student.first_name?.[0] ?? ''}${student.last_name?.[0] ?? ''}`.toUpperCase()
                  : 'A'}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {student ? `${student.first_name} ${student.last_name}` : '—'}
              </p>
              <p className="text-sm text-gray-500">{student?.email ?? '—'}</p>
              <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-brand-blue/10 text-brand-blue rounded-full">
                Apprenant
              </span>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Settings sections */}
      {sections.map((section, si) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 + si * 0.05 }}
        >
          <GlassCard className="overflow-hidden p-0">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                {section.title}
              </p>
            </div>
            <ul className="divide-y divide-gray-50">
              {section.items.map((item) => (
                <li key={item.label}>
                  <div
                    className={`flex items-center justify-between px-5 py-4 ${item.toggle && !item.disabled ? 'cursor-pointer hover:bg-gray-50/60 transition-colors' : ''}`}
                    onClick={item.toggle && !item.disabled ? item.onChange : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <item.icon className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.label}</p>
                        <p className="text-xs text-gray-400">{item.description}</p>
                      </div>
                    </div>
                    {item.toggle ? (
                      <button
                        type="button"
                        disabled={item.disabled}
                        onClick={e => { e.stopPropagation(); item.onChange?.() }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          item.value ? 'bg-brand-blue' : 'bg-gray-200'
                        } ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            item.value ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </GlassCard>
        </motion.div>
      ))}

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </button>
      </motion.div>
    </div>
  )
}
