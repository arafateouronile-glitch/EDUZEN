'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { X, ChevronDown, ChevronUp, Lock, CheckCircle2, Sparkles, Zap, Rocket, Trophy } from 'lucide-react'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { JeaneQuota } from '@/lib/services/jeane-limits'

const STORAGE_HIDDEN = 'dashboard_checklist_hidden'
const STORAGE_DISMISSED = 'dashboard_checklist_completed_dismissed'
const STORAGE_FIRST_VISIT = 'dashboard_checklist_first_visit'
const DELAY_MS = 5 * 1000

const LEVELS = [
  { level: 1, label: 'Démarrage',  icon: Sparkles, color: 'text-gray-500',   bg: 'bg-gray-100',   border: 'border-gray-200' },
  { level: 2, label: 'En route',   icon: Zap,       color: 'text-blue-600',  bg: 'bg-blue-50',    border: 'border-blue-200' },
  { level: 3, label: 'Actif',      icon: Rocket,    color: 'text-indigo-600',bg: 'bg-indigo-50',  border: 'border-indigo-200' },
  { level: 4, label: 'Prêt',       icon: Trophy,    color: 'text-amber-600', bg: 'bg-amber-50',   border: 'border-amber-200' },
]

function getStored(key: string): boolean {
  if (typeof window === 'undefined') return false
  try { return localStorage.getItem(key) === 'true' } catch { return false }
}

function JeaneCounter({ quota }: { quota: JeaneQuota | null }) {
  if (!quota?.isTrial) return null
  const total = quota.remaining.programs + quota.remaining.formations + quota.remaining.sessions
  const max = quota.limits.programs + quota.limits.formations + quota.limits.sessions

  return (
    <div className="mt-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-violet-700">🤖 Créations Jeane restantes</span>
        <span className="text-xs font-bold text-violet-700">{total}/{max}</span>
      </div>
      <div className="flex gap-2 text-xs text-violet-600">
        <span className={cn('flex items-center gap-1', quota.remaining.programs === 0 && 'text-red-400')}>
          <span className="font-bold">{quota.remaining.programs}</span> prog.
        </span>
        <span className="text-violet-300">·</span>
        <span className={cn('flex items-center gap-1', quota.remaining.formations === 0 && 'text-red-400')}>
          <span className="font-bold">{quota.remaining.formations}</span> form.
        </span>
        <span className="text-violet-300">·</span>
        <span className={cn('flex items-center gap-1', quota.remaining.sessions === 0 && 'text-red-400')}>
          <span className="font-bold">{quota.remaining.sessions}</span> sess.
        </span>
      </div>
      <div className="mt-1.5 h-1 bg-violet-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(total / max) * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

export function OnboardingChecklist() {
  const { user } = useAuth()
  const supabase = createClient()
  const [isExpanded, setIsExpanded] = useState(true)
  const [isHidden, setIsHidden] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [delayElapsed, setDelayElapsed] = useState(false)
  const [celebratingStep, setCelebratingStep] = useState<string | null>(null)
  const prevCompleted = useRef<Set<string>>(new Set())

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
    } catch { setDelayElapsed(true) }
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

  const { data: org } = useQuery({
    queryKey: ['org-setup', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const { data } = await supabase.from('organizations').select('logo_url, nda_number, address').eq('id', user.organization_id).single()
      return data
    },
    enabled: !!user?.organization_id,
  })

  const { data: templatesCount } = useQuery({
    queryKey: ['templates-count', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return 0
      const { count } = await supabase.from('document_templates').select('id', { count: 'exact', head: true }).eq('organization_id', user.organization_id)
      return count ?? 0
    },
    enabled: !!user?.organization_id,
  })

  const { data: programsCount } = useQuery({
    queryKey: ['programs-count', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return 0
      const { count } = await supabase.from('programs').select('id', { count: 'exact', head: true }).eq('organization_id', user.organization_id)
      return count ?? 0
    },
    enabled: !!user?.organization_id,
  })

  const { data: formationsCount } = useQuery({
    queryKey: ['formations-count', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return 0
      const { count } = await supabase.from('formations').select('id', { count: 'exact', head: true }).eq('organization_id', user.organization_id)
      return count ?? 0
    },
    enabled: !!user?.organization_id,
  })

  const { data: sessionsCount } = useQuery({
    queryKey: ['sessions-count', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return 0
      const { count } = await supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('organization_id', user.organization_id)
      return count ?? 0
    },
    enabled: !!user?.organization_id,
  })

  const { data: documentsCount } = useQuery({
    queryKey: ['documents-count', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return 0
      const { count } = await supabase.from('documents').select('id', { count: 'exact', head: true }).eq('organization_id', user.organization_id)
      return count ?? 0
    },
    enabled: !!user?.organization_id,
  })

  const { data: quota } = useQuery<JeaneQuota>({
    queryKey: ['jeane-quota', user?.organization_id],
    queryFn: async () => {
      const res = await fetch('/api/jeane/usage')
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!user?.organization_id,
    refetchInterval: 30_000,
  })

  const orgConfigured = !!(org?.logo_url && org?.nda_number && org?.address)
  const catalogueReady = (programsCount ?? 0) > 0 && (formationsCount ?? 0) > 0 && (sessionsCount ?? 0) > 0

  const steps = [
    {
      id: 'configure-org',
      label: 'Configurer votre organisme',
      description: 'Logo, adresse, NDA et coordonnées de contact',
      unlock: '✨ Vos documents auront votre identité',
      link: '/dashboard/settings',
      completed: orgConfigured,
      locked: false,
    },
    {
      id: 'document-templates',
      label: 'Vérifier vos modèles',
      description: '17 modèles prêts — personnalisez-les en 2 clics',
      unlock: '✨ Génération automatique activée',
      link: '/dashboard/settings/document-templates',
      completed: (templatesCount ?? 0) > 0,
      locked: false,
    },
    {
      id: 'ask-jeane',
      label: 'Lancer Jeane',
      description: 'Jeane crée programme, formation et session en quelques secondes',
      unlock: '✨ Émargements et suivi Qualiopi activés',
      onClick: () => window.dispatchEvent(new CustomEvent('ai-chat:open', {
        detail: { message: 'Crée-moi un programme de formation, une formation et une session.' },
      })),
      completed: catalogueReady,
      locked: false,
      hasJeaneCounter: true,
    },
    {
      id: 'generate-document',
      label: 'Générer votre premier document',
      description: 'Convention, attestation ou facture en quelques secondes',
      unlock: '🏆 Accès complet débloqué — badge Fondateur',
      link: '/dashboard/documents/generate',
      completed: (documentsCount ?? 0) > 0,
      locked: !catalogueReady,
    },
  ]

  const completedCount = steps.filter(s => s.completed).length
  const progress = (completedCount / steps.length) * 100
  const isComplete = completedCount === steps.length
  const currentLevel = LEVELS[Math.min(completedCount, 3)]
  const LevelIcon = currentLevel.icon
  const nextStep = steps.find(s => !s.completed)

  // Sauvegarder progression en DB + détecter nouvelles complétion pour célébrer
  useEffect(() => {
    const completedIds = new Set(steps.filter(s => s.completed).map(s => s.id))
    for (const id of completedIds) {
      if (!prevCompleted.current.has(id)) {
        setCelebratingStep(id)
        setTimeout(() => setCelebratingStep(null), 1500)
        fetch('/api/onboarding/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stepId: id, completed: true }),
        }).catch(() => {})
      }
    }
    prevCompleted.current = completedIds
  }, [orgConfigured, templatesCount, catalogueReady, documentsCount]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted || isDismissed || !delayElapsed) return null

  if (isHidden) {
    return (
      <motion.button
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => setHidden(false)}
        className={cn(
          'fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg text-xs font-bold border',
          currentLevel.bg, currentLevel.border, currentLevel.color
        )}
      >
        <LevelIcon className="w-3.5 h-3.5" />
        <span>{completedCount}/{steps.length}</span>
      </motion.button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="fixed bottom-4 right-4 w-96 shadow-2xl z-50 rounded-2xl overflow-hidden border border-gray-100"
    >
      {/* Header */}
      <div
        className={cn('px-4 pt-4 pb-3 cursor-pointer select-none', currentLevel.bg)}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <motion.div
              className={cn('p-1.5 rounded-lg', currentLevel.bg, currentLevel.border, 'border')}
              animate={isComplete ? { rotate: [0, -10, 10, -10, 0] } : {}}
              transition={{ duration: 0.5, repeat: isComplete ? Infinity : 0, repeatDelay: 3 }}
            >
              <LevelIcon className={cn('w-4 h-4', currentLevel.color)} />
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn('text-xs font-bold uppercase tracking-wider', currentLevel.color)}>
                  Niveau {currentLevel.level}
                </span>
                <span className={cn('text-xs font-semibold', currentLevel.color, 'opacity-70')}>
                  — {currentLevel.label}
                </span>
              </div>
              <div className="mt-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full', completedCount === 4 ? 'bg-amber-500' : completedCount >= 2 ? 'bg-indigo-500' : 'bg-blue-500')}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
            </div>
            <span className={cn('text-xs font-bold tabular-nums', currentLevel.color)}>
              {completedCount}/{steps.length}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-1">
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setHidden(true) }}
              className={cn('p-1 rounded hover:bg-black/10 transition-colors', currentLevel.color)}
              aria-label="Masquer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            {isExpanded
              ? <ChevronDown className={cn('w-4 h-4', currentLevel.color)} />
              : <ChevronUp className={cn('w-4 h-4', currentLevel.color)} />
            }
          </div>
        </div>
      </div>

      {/* Steps */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden bg-white"
          >
            <div className="divide-y divide-gray-50">
              {steps.map((step, index) => {
                const isCurrent = step.id === nextStep?.id
                const isCelebrating = celebratingStep === step.id

                return (
                  <motion.div
                    key={step.id}
                    animate={isCelebrating ? { backgroundColor: ['#ffffff', '#f0fdf4', '#ffffff'] } : {}}
                    transition={{ duration: 1 }}
                    className={cn(
                      'px-4 py-3 transition-colors',
                      step.locked && 'opacity-50',
                      isCurrent && !step.locked && 'bg-blue-50/40',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icône état */}
                      <div className="pt-0.5 shrink-0">
                        {step.completed ? (
                          <motion.div
                            initial={isCelebrating ? { scale: 0.5 } : { scale: 1 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 400 }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          </motion.div>
                        ) : step.locked ? (
                          <Lock className="w-5 h-5 text-gray-300" />
                        ) : (
                          <div className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                            isCurrent ? 'border-blue-500 bg-blue-500' : 'border-gray-200'
                          )}>
                            {isCurrent && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                        )}
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-semibold leading-snug',
                          step.completed ? 'text-gray-400 line-through' : step.locked ? 'text-gray-300' : isCurrent ? 'text-blue-700' : 'text-gray-700'
                        )}>
                          {step.label}
                        </p>

                        {step.completed ? (
                          <p className="text-xs text-green-600 mt-0.5 font-medium">{step.unlock}</p>
                        ) : step.locked ? (
                          <p className="text-xs text-gray-300 mt-0.5">Terminez l'étape {index} pour débloquer</p>
                        ) : (
                          <p className="text-xs text-gray-400 mt-0.5">{step.description}</p>
                        )}

                        {/* Compteur Jeane intégré */}
                        {step.hasJeaneCounter && !step.completed && (
                          <JeaneCounter quota={quota ?? null} />
                        )}
                      </div>

                      {/* Bouton action */}
                      {!step.completed && !step.locked && (
                        <div className="shrink-0">
                          {step.onClick ? (
                            <Button
                              size="sm"
                              onClick={step.onClick}
                              className={cn(
                                'text-xs h-7 px-3',
                                isCurrent
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                  : 'variant-ghost'
                              )}
                            >
                              Lancer
                            </Button>
                          ) : step.link ? (
                            <Link href={step.link}>
                              <Button
                                size="sm"
                                className={cn(
                                  'text-xs h-7 px-3',
                                  isCurrent
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                    : 'variant-ghost'
                                )}
                              >
                                Ouvrir
                              </Button>
                            </Link>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Footer complet */}
            {isComplete && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-4 py-3 border-t bg-gradient-to-r from-amber-50 to-yellow-50 flex items-center justify-between gap-2"
              >
                <p className="text-sm font-bold text-amber-700">🏆 Badge Fondateur débloqué !</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7 text-amber-700 hover:bg-amber-100"
                  onClick={setDismissed}
                >
                  Fermer
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
