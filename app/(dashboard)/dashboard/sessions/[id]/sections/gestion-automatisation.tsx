'use client'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { GlassCard } from '@/components/ui/glass-card'
import {
  Bell,
  Clock,
  Calendar,
  Users,
  Settings,
  Info,
  Zap,
  CheckCircle2,
  FileText,
  Star,
  Award,
  RefreshCw,
  CreditCard,
  FileCheck,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { emailScheduleService } from '@/lib/services/email-schedule.service.client'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { SessionWithRelations } from '@/lib/types/query-types'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import {
  PRESET_AUTOMATIONS,
  PRESET_EMAIL_TYPES,
  type PresetAutomation,
} from '@/lib/constants/automation-presets'

// ─────────────────────────────────────────────────────────────────────────────
// Icônes par email_type (uniquement dans ce fichier UI)
// ─────────────────────────────────────────────────────────────────────────────

const PRESET_ICONS: Record<string, React.ElementType> = {
  convocation_j14: FileText,
  rappel_j7: Bell,
  rappel_j3: Clock,
  evaluation_post_formation: Star,
  attestation_presence: FileCheck,
  certificat_realisation: Award,
  relance_evaluation: RefreshCw,
  relance_paiement: CreditCard,
}

const CATEGORIES: {
  key: PresetAutomation['category']
  label: string
  icon: React.ElementType
  color: string
}[] = [
  { key: 'avant', label: 'Avant la session', icon: Calendar, color: 'text-blue-600' },
  { key: 'apres', label: 'Après la session', icon: CheckCircle2, color: 'text-green-600' },
  { key: 'paiement', label: 'Paiement', icon: CreditCard, color: 'text-red-600' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface GestionAutomatisationProps {
  sessionId: string
  sessionData: SessionWithRelations | undefined
}

export function GestionAutomatisation({ sessionId }: GestionAutomatisationProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['email-schedules', user?.organization_id, sessionId],
    queryFn: async () => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')
      const all = await emailScheduleService.getAllSchedules(user.organization_id)
      return all.filter((s: any) => {
        if (s.session_id === sessionId) return true
        if (!s.session_id && (s.target_type === 'session' || s.target_type === 'all')) return true
        return false
      })
    },
    enabled: !!user?.organization_id && !!sessionId,
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      emailScheduleService.updateSchedule(id, { is_active: isActive }),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['email-schedules'] })
      addToast({
        title: isActive ? 'Automatisation activée' : 'Automatisation désactivée',
        description: isActive
          ? "L'automatisation est maintenant active pour cette session."
          : "L'automatisation a été désactivée.",
        type: 'success',
      })
    },
    onError: (error: Error) => {
      addToast({ title: 'Erreur', description: error.message, type: 'error' })
    },
  })

  const createScheduleMutation = useMutation({
    mutationFn: async (preset: PresetAutomation) => {
      if (!user?.organization_id) throw new Error('Organisation manquante')
      return emailScheduleService.createSchedule(user.organization_id, {
        name: preset.name,
        description: preset.description,
        email_type: preset.email_type,
        trigger_type: preset.trigger_type,
        trigger_days: preset.trigger_days,
        trigger_time: preset.trigger_time,
        send_to_students: preset.send_to_students,
        send_to_teachers: preset.send_to_teachers,
        send_to_coordinators: preset.send_to_coordinators,
        target_type: preset.target_type,
        session_id: sessionId,
        is_active: true,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-schedules'] })
      addToast({
        title: 'Automatisation activée',
        description: "L'automatisation a été créée et activée pour cette session.",
        type: 'success',
      })
    },
    onError: (error: Error) => {
      addToast({ title: 'Erreur', description: error.message, type: 'error' })
    },
  })

  const isMutating = toggleActiveMutation.isPending || createScheduleMutation.isPending

  const handleTogglePreset = (preset: PresetAutomation) => {
    const existing = schedules?.find(
      (s: any) => s.email_type === preset.email_type && s.session_id === sessionId
    )
    if (existing) {
      toggleActiveMutation.mutate({ id: existing.id, isActive: !existing.is_active })
    } else {
      createScheduleMutation.mutate(preset)
    }
  }

  // Règles non-preset (custom, créées via paramètres avancés)
  const customSchedules =
    schedules?.filter((s: any) => !PRESET_EMAIL_TYPES.has(s.email_type)) ?? []

  // Stats rapides
  const activeCount =
    schedules?.filter(
      (s: any) => s.is_active && (PRESET_EMAIL_TYPES.has(s.email_type) ? s.session_id === sessionId : true)
    ).length ?? 0

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    },
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue" />
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* En-tête */}
      <motion.div variants={itemVariants} className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl shadow-lg shadow-brand-blue/20">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Automatisations</h2>
            <p className="text-sm text-gray-500 font-medium">
              Activez les communications automatiques pour cette session
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {activeCount} active{activeCount > 1 ? 's' : ''}
            </div>
          )}
          <Link href="/dashboard/settings/email-schedules">
            <Button className="bg-white text-brand-blue border border-gray-200 hover:bg-gray-50 hover:border-brand-blue/30 shadow-sm transition-all">
              <Settings className="h-4 w-4 mr-2" />
              Règles avancées
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Bandeau info */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="subtle" className="p-4 border-l-4 border-l-brand-blue bg-blue-50/30">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-700 leading-relaxed">
              Activez les automatisations pour cette session d'un simple interrupteur. Chaque
              automatisation enverra un email aux destinataires au moment configuré. Pour
              personnaliser les contenus d'emails, utilisez les{' '}
              <Link
                href="/dashboard/settings/email-schedules"
                className="underline font-medium hover:text-blue-800"
              >
                règles avancées
              </Link>
              .
            </p>
          </div>
        </GlassCard>
      </motion.div>

      {/* Sections par catégorie */}
      {CATEGORIES.map((category) => {
        const presets = PRESET_AUTOMATIONS.filter((p) => p.category === category.key)
        const CategoryIcon = category.icon
        return (
          <motion.div key={category.key} variants={itemVariants} className="space-y-3">
            <h3 className={cn('text-sm font-bold uppercase tracking-wide flex items-center gap-2', category.color)}>
              <CategoryIcon className="h-4 w-4" />
              {category.label}
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {presets.map((preset) => {
                const existing = schedules?.find(
                  (s: any) => s.email_type === preset.email_type && s.session_id === sessionId
                )
                const isActive = existing?.is_active ?? false
                return (
                  <PresetCard
                    key={preset.email_type}
                    preset={preset}
                    isActive={isActive}
                    isLoading={isMutating}
                    onToggle={() => handleTogglePreset(preset)}
                  />
                )
              })}
            </div>
          </motion.div>
        )
      })}

      {/* Règles personnalisées (non-preset) */}
      {customSchedules.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Règles personnalisées
          </h3>
          <div className="grid gap-3">
            {customSchedules.map((schedule: any) => (
              <CustomScheduleCard
                key={schedule.id}
                schedule={schedule}
                isLoading={isMutating}
                onToggle={(checked) =>
                  toggleActiveMutation.mutate({ id: schedule.id, isActive: checked })
                }
              />
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PresetCard
// ─────────────────────────────────────────────────────────────────────────────

function PresetCard({
  preset,
  isActive,
  isLoading,
  onToggle,
}: {
  preset: PresetAutomation
  isActive: boolean
  isLoading: boolean
  onToggle: () => void
}) {
  const Icon = PRESET_ICONS[preset.email_type] ?? FileText

  const recipients = [
    preset.send_to_students && 'Étudiants',
    preset.send_to_teachers && 'Formateurs',
    preset.send_to_coordinators && 'Coordinateurs',
  ].filter(Boolean) as string[]

  const triggerLabel =
    preset.trigger_type === 'before_session_start'
      ? `${preset.trigger_days}j avant le début`
      : preset.trigger_type === 'after_session_end'
        ? `${preset.trigger_days}j après la fin`
        : ''

  return (
    <div
      className={cn(
        'relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-200',
        isActive
          ? 'bg-white border-brand-blue/25 shadow-sm'
          : 'bg-gray-50/60 border-gray-200 hover:bg-white hover:border-gray-300'
      )}
    >
      {/* Barre d'état gauche */}
      {isActive && (
        <div className="absolute top-0 left-0 w-1 h-full bg-brand-blue rounded-l-xl" />
      )}

      {/* Icône */}
      <div className={cn('p-2 rounded-lg shrink-0 mt-0.5', preset.colorClass)}>
        <Icon className={cn('h-5 w-5', preset.textColorClass)} />
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">{preset.name}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{preset.description}</p>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={onToggle}
            disabled={isLoading}
            className="shrink-0 mt-0.5"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            <Clock className="h-3 w-3" />
            {triggerLabel} · {preset.trigger_time}
          </span>
          {recipients.map((label) => (
            <span
              key={label}
              className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full"
            >
              <Users className="h-3 w-3" />
              {label}
            </span>
          ))}
          {isActive && (
            <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
              Actif
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CustomScheduleCard (règles créées via paramètres avancés)
// ─────────────────────────────────────────────────────────────────────────────

function CustomScheduleCard({
  schedule,
  isLoading,
  onToggle,
}: {
  schedule: any
  isLoading: boolean
  onToggle: (checked: boolean) => void
}) {
  return (
    <div
      className={cn(
        'relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-200',
        schedule.is_active
          ? 'bg-white border-brand-blue/25 shadow-sm'
          : 'bg-gray-50/60 border-gray-200'
      )}
    >
      {schedule.is_active && (
        <div className="absolute top-0 left-0 w-1 h-full bg-brand-blue rounded-l-xl" />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-gray-900">{schedule.name}</span>
          <Badge
            variant="secondary"
            className={cn(
              'text-xs',
              schedule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            )}
          >
            {schedule.is_active ? 'Actif' : 'Inactif'}
          </Badge>
        </div>
        {schedule.description && (
          <p className="text-xs text-gray-500 mb-2">{schedule.description}</p>
        )}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {schedule.email_type}
          </span>
          {schedule.trigger_days != null && (
            <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              <Clock className="h-3 w-3" />
              {schedule.trigger_days}j · {schedule.trigger_time ?? '09:00'}
            </span>
          )}
        </div>
      </div>

      <Switch
        checked={schedule.is_active ?? false}
        onCheckedChange={onToggle}
        disabled={isLoading}
        className="shrink-0"
      />
    </div>
  )
}
