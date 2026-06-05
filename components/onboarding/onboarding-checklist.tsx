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
  ChevronDown,
  ChevronUp,
  ListChecks,
} from 'lucide-react'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const STORAGE_HIDDEN = 'dashboard_checklist_hidden'
const STORAGE_DISMISSED = 'dashboard_checklist_completed_dismissed'
const STORAGE_FIRST_VISIT = 'dashboard_checklist_first_visit'
const DELAY_MS = 2 * 60 * 1000 // 2 minutes

interface ChecklistItem {
  id: string
  label: string
  description: string
  link?: string
  onClick?: () => void
  completed: boolean
}

function getStored(key: string): boolean {
  if (typeof window === 'undefined') return false
  try { return localStorage.getItem(key) === 'true' } catch { return false }
}

export function OnboardingChecklist() {
  const { user } = useAuth()
  const supabase = createClient()
  const [isExpanded, setIsExpanded] = useState(true)
  const [isHidden, setIsHidden] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [delayElapsed, setDelayElapsed] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsHidden(getStored(STORAGE_HIDDEN))
    setIsDismissed(getStored(STORAGE_DISMISSED))

    try {
      const stored = localStorage.getItem(STORAGE_FIRST_VISIT)
      const firstVisit = stored ? parseInt(stored, 10) : Date.now()
      if (!stored) localStorage.setItem(STORAGE_FIRST_VISIT, String(firstVisit))
      const elapsed = Date.now() - firstVisit
      if (elapsed >= DELAY_MS) {
        setDelayElapsed(true)
      } else {
        const timer = setTimeout(() => setDelayElapsed(true), DELAY_MS - elapsed)
        return () => clearTimeout(timer)
      }
    } catch {
      setDelayElapsed(true)
    }
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

  // ① Organisme configuré (logo + NDA renseignés)
  const { data: org } = useQuery({
    queryKey: ['org-setup', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const { data } = await supabase
        .from('organizations')
        .select('logo_url, nda_number, address')
        .eq('id', user.organization_id)
        .single()
      return data
    },
    enabled: !!user?.organization_id,
  })

  // ② Modèles de documents présents
  const { data: templatesCount } = useQuery({
    queryKey: ['templates-count', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return 0
      const { count } = await supabase
        .from('document_templates')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', user.organization_id)
      return count ?? 0
    },
    enabled: !!user?.organization_id,
  })

  // ③ Programme créé
  const { data: programsCount } = useQuery({
    queryKey: ['programs-count', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return 0
      const { count } = await supabase
        .from('programs')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', user.organization_id)
      return count ?? 0
    },
    enabled: !!user?.organization_id,
  })

  // ③ Programme + formation + session créés (step Jeane)
  const { data: formationsCount } = useQuery({
    queryKey: ['formations-count', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return 0
      const { count } = await supabase
        .from('formations')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', user.organization_id)
      return count ?? 0
    },
    enabled: !!user?.organization_id,
  })

  const { data: sessionsCount } = useQuery({
    queryKey: ['sessions-count', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return 0
      const { count } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', user.organization_id)
      return count ?? 0
    },
    enabled: !!user?.organization_id,
  })

  // ④ Premier document généré
  const { data: documentsCount } = useQuery({
    queryKey: ['documents-count', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return 0
      const { count } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', user.organization_id)
      return count ?? 0
    },
    enabled: !!user?.organization_id,
  })

  const orgConfigured = !!(org?.logo_url && org?.nda_number && org?.address)
  const catalogueReady = (programsCount ?? 0) > 0 && (formationsCount ?? 0) > 0 && (sessionsCount ?? 0) > 0

  const openJeane = () => {
    window.dispatchEvent(new CustomEvent('ai-chat:open', {
      detail: { message: 'Crée-moi un programme de formation, une formation et une session.' },
    }))
  }

  const checklistItems: ChecklistItem[] = [
    {
      id: 'configure-org',
      label: 'Configurer votre organisme',
      description: 'Logo, adresse, NDA et coordonnées de contact',
      link: '/dashboard/settings',
      completed: orgConfigured,
    },
    {
      id: 'document-templates',
      label: 'Vérifier vos modèles de documents',
      description: 'Vos 17 modèles sont prêts — personnalisez-les avec les infos de votre organisme',
      link: '/dashboard/settings/document-templates',
      completed: (templatesCount ?? 0) > 0,
    },
    {
      id: 'ask-jeane',
      label: 'Demander à Jeane de tout créer',
      description: 'Jeane crée votre programme, votre formation et votre session en quelques secondes',
      onClick: openJeane,
      completed: catalogueReady,
    },
    {
      id: 'generate-document',
      label: 'Générer votre premier document',
      description: 'Convention, attestation ou facture en quelques secondes',
      link: '/dashboard/documents/generate',
      completed: (documentsCount ?? 0) > 0,
    },
  ]

  const completedCount = checklistItems.filter(i => i.completed).length
  const totalCount = checklistItems.length
  const progress = (completedCount / totalCount) * 100
  const isComplete = completedCount === totalCount

  // Trouver la prochaine étape non complétée (pour mettre en avant)
  const nextItem = checklistItems.find(i => !i.completed)

  if (!mounted || isDismissed || !delayElapsed) return null

  if (isHidden) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setHidden(false)}
        className="fixed bottom-4 right-4 z-50 shadow-lg bg-white hover:bg-gray-50 border-gray-200 gap-2"
      >
        <ListChecks className="w-4 h-4" />
        <span>{completedCount}/{totalCount}</span>
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-xl z-50 border-0 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div
          className="px-4 py-3 bg-gradient-to-r from-brand-blue to-brand-cyan text-white cursor-pointer select-none"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <ListChecks className="w-4 h-4 shrink-0" />
                <span className="font-semibold text-sm">Démarrage</span>
                <span className="text-xs opacity-80 font-medium">{completedCount}/{totalCount}</span>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setHidden(true) }}
                className="p-1 rounded hover:bg-white/20 transition-colors"
                aria-label="Masquer"
              >
                <X className="w-4 h-4" />
              </button>
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {/* Items */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="divide-y divide-gray-100 max-h-[340px] overflow-y-auto">
                {checklistItems.map(item => {
                  const isNext = item.id === nextItem?.id
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 transition-colors',
                        item.completed ? 'bg-white' : isNext ? 'bg-blue-50/60' : 'bg-white'
                      )}
                    >
                      <div className="pt-0.5 shrink-0">
                        {item.completed
                          ? <CheckCircle2 className="w-4.5 h-4.5 text-green-500" />
                          : <Circle className={cn('w-4.5 h-4.5', isNext ? 'text-brand-blue' : 'text-gray-300')} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-medium leading-snug',
                          item.completed ? 'text-gray-400 line-through' : isNext ? 'text-brand-blue' : 'text-gray-700'
                        )}>
                          {item.label}
                        </p>
                        {!item.completed && (
                          <p className="text-xs text-gray-400 mt-0.5 leading-snug">{item.description}</p>
                        )}
                      </div>
                      {!item.completed && (
                        item.onClick ? (
                          <Button
                            size="sm"
                            variant={isNext ? 'default' : 'ghost'}
                            className={cn(
                              'text-xs h-7 px-2.5 shrink-0',
                              isNext && 'bg-brand-blue hover:bg-brand-blue/90 text-white'
                            )}
                            onClick={item.onClick}
                          >
                            Demander
                          </Button>
                        ) : item.link ? (
                          <Link href={item.link} className="shrink-0">
                            <Button
                              size="sm"
                              variant={isNext ? 'default' : 'ghost'}
                              className={cn(
                                'text-xs h-7 px-2.5',
                                isNext && 'bg-brand-blue hover:bg-brand-blue/90 text-white'
                              )}
                            >
                              Faire
                            </Button>
                          </Link>
                        ) : null
                      )}
                    </div>
                  )
                })}
              </div>

              {isComplete && (
                <div className="px-4 py-3 border-t bg-green-50 flex items-center justify-between gap-2">
                  <p className="text-xs text-green-700 font-medium">🎉 Vous êtes prêt !</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 text-green-700 hover:text-green-800 hover:bg-green-100"
                    onClick={setDismissed}
                  >
                    Fermer
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
