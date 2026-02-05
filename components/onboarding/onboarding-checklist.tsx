'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  Circle,
  X,
  Gift,
  ChevronDown,
  ChevronUp,
  ListChecks,
} from 'lucide-react'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const STORAGE_HIDDEN = 'dashboard_checklist_hidden'
const STORAGE_DISMISSED = 'dashboard_checklist_completed_dismissed'

interface ChecklistItem {
  id: string
  label: string
  description?: string
  link?: string
  reward?: string
  completed: boolean
}

function getStoredHidden(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(STORAGE_HIDDEN) === 'true'
  } catch {
    return false
  }
}

function getStoredDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(STORAGE_DISMISSED) === 'true'
  } catch {
    return false
  }
}

export function OnboardingChecklist() {
  const { user } = useAuth()
  const supabase = createClient()
  const [isExpanded, setIsExpanded] = useState(true)
  const [localCompleted, setLocalCompleted] = useState<Set<string>>(new Set())
  const [isHidden, setIsHidden] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsHidden(getStoredHidden())
    setIsDismissed(getStoredDismissed())
  }, [])

  const setHidden = (value: boolean) => {
    setIsHidden(value)
    try {
      if (value) localStorage.setItem(STORAGE_HIDDEN, 'true')
      else localStorage.removeItem(STORAGE_HIDDEN)
    } catch {}
  }

  const setDismissed = () => {
    setIsDismissed(true)
    try {
      localStorage.setItem(STORAGE_DISMISSED, 'true')
      localStorage.removeItem(STORAGE_HIDDEN)
    } catch {}
  }

  // Récupérer les données pour vérifier l'état de complétion
  const { data: students } = useQuery({
    queryKey: ['students-count', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return 0
      const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', user.organization_id)
      return count || 0
    },
    enabled: !!user?.organization_id,
  })

  const { data: programs } = useQuery({
    queryKey: ['programs-count', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return 0
      const { count } = await supabase
        .from('programs')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', user.organization_id)
      return count || 0
    },
    enabled: !!user?.organization_id,
  })

  const { data: documents } = useQuery({
    queryKey: ['documents-count', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return 0
      const { count } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', user.organization_id)
      return count || 0
    },
    enabled: !!user?.organization_id,
  })

  // Définir les items de la checklist
  const checklistItems: ChecklistItem[] = [
    {
      id: 'create-program',
      label: 'Créer mon premier programme',
      description: 'Définissez votre premier parcours de formation',
      link: '/dashboard/programs/new',
      completed: (programs || 0) > 0,
    },
    {
      id: 'import-students',
      label: 'Inscrire mon premier stagiaire',
      description: 'Ajoutez vos apprenants à la plateforme',
      link: '/dashboard/students/new',
      reward: 'Gagnez 10 jours d\'essai gratuit en complétant cette étape',
      completed: (students || 0) > 0,
    },
    {
      id: 'generate-convention',
      label: 'Générer ma première convention',
      description: 'Créez votre premier document de formation',
      link: '/dashboard/documents/generate',
      completed: (documents || 0) > 0,
    },
    {
      id: 'configure-qualiopi',
      label: 'Configurer Qualiopi',
      description: 'Paramétrez vos indicateurs de conformité',
      link: '/dashboard/qualiopi',
      completed: localCompleted.has('configure-qualiopi'),
    },
    {
      id: 'setup-payments',
      label: 'Configurer les paiements',
      description: 'Activez Stripe ou SEPA pour recevoir les paiements',
      link: '/dashboard/settings/payments',
      completed: localCompleted.has('setup-payments'),
    },
  ]

  const completedCount = checklistItems.filter((item) => item.completed).length
  const totalCount = checklistItems.length
  const progress = (completedCount / totalCount) * 100
  const isComplete = completedCount === totalCount

  const handleToggle = (id: string) => {
    setLocalCompleted((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (!mounted) return null
  if (isDismissed) return null

  if (isHidden) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setHidden(false)}
        className="fixed bottom-4 right-4 z-50 shadow-lg bg-white hover:bg-gray-50 border-gray-200 gap-2"
      >
        <ListChecks className="w-4 h-4" />
        Afficher la checklist de démarrage
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-xl z-50">
      <CardContent className="p-0">
        {/* Header */}
        <div
          className="p-4 bg-gradient-to-r from-brand-blue to-brand-cyan text-white cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">Checklist de démarrage</h3>
              <p className="text-sm opacity-90">
                {completedCount}/{totalCount} complétés
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {isComplete && (
                <Gift className="w-5 h-5 text-yellow-300" />
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setHidden(true)
                }}
                className="p-1 rounded hover:bg-white/20 transition-colors"
                aria-label="Masquer la checklist"
              >
                <X className="w-5 h-5" />
              </button>
              {isExpanded ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronUp className="w-5 h-5" />
              )}
            </div>
          </div>
          {/* Progress Bar */}
          <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {checklistItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                      item.completed
                        ? 'bg-green-50 border-green-200'
                        : 'bg-white border-gray-200 hover:border-brand-blue'
                    )}
                  >
                    <div className="pt-0.5">
                      {item.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p
                            className={cn(
                              'font-medium text-sm',
                              item.completed ? 'text-green-800 line-through' : 'text-gray-900'
                            )}
                          >
                            {item.label}
                          </p>
                          {item.description && (
                            <p className="text-xs text-gray-500 mt-1">
                              {item.description}
                            </p>
                          )}
                          {item.reward && !item.completed && (
                            <p className="text-xs text-brand-cyan font-medium mt-1 flex items-center gap-1">
                              <Gift className="w-3 h-3" />
                              {item.reward}
                            </p>
                          )}
                        </div>
                        {!item.completed && item.link && (
                          <Link href={item.link}>
                            <Button size="sm" variant="ghost" className="text-xs">
                              Faire
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-4 border-t bg-gray-50 flex flex-col gap-2">
                {isComplete ? (
                  <Button
                    size="sm"
                    className="w-full text-xs bg-green-600 hover:bg-green-700 text-white"
                    onClick={setDismissed}
                  >
                    Masquer définitivement
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setIsExpanded(false)}
                  >
                    Réduire
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
