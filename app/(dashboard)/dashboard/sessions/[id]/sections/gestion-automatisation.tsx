'use client'

import { CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { GlassCard } from '@/components/ui/glass-card'
import {
  Mail,
  Play,
  Pause,
  Clock,
  Calendar,
  Users,
  Settings,
  Info,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { emailScheduleService } from '@/lib/services/email-schedule.service.client'
import { emailTemplateService } from '@/lib/services/email-template.service.client'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { SessionWithRelations } from '@/lib/types/query-types'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'

interface GestionAutomatisationProps {
  sessionId: string
  sessionData: SessionWithRelations | undefined
}

export function GestionAutomatisation({
  sessionId,
  sessionData,
}: GestionAutomatisationProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['email-schedules', user?.organization_id, sessionId],
    queryFn: async () => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')
      const allSchedules = await emailScheduleService.getAllSchedules(user.organization_id)
      
      return allSchedules.filter((schedule: any) => {
        if (schedule.session_id === sessionId) {
          return true
        }
        if (!schedule.session_id && (schedule.target_type === 'session' || schedule.target_type === 'all')) {
          return true
        }
        return false
      })
    },
    enabled: !!user?.organization_id && !!sessionId,
  })

  const { data: emailTemplates } = useQuery({
    queryKey: ['email-templates', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')
      return emailTemplateService.getAll(user.organization_id)
    },
    enabled: !!user?.organization_id,
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return emailScheduleService.updateSchedule(id, { is_active: isActive })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-schedules'] })
      addToast({
        title: 'Règle mise à jour',
        description: 'Le statut de la règle a été mis à jour.',
        type: 'success',
      })
    },
    onError: (error: Error) => {
      addToast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la mise à jour de la règle.',
        type: 'error',
      })
    },
  })

  const activeSchedules = schedules?.filter((s) => s.is_active) || []
  const inactiveSchedules = schedules?.filter((s) => !s.is_active) || []

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
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
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl shadow-lg shadow-brand-blue/20">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Automatisation d'emails</h2>
            <p className="text-sm text-gray-500 font-medium">Pilotez vos communications automatiques</p>
          </div>
        </div>
        <Link href="/dashboard/settings/email-schedules">
          <Button
            className="bg-white text-brand-blue border border-gray-200 hover:bg-gray-50 hover:border-brand-blue/30 shadow-sm transition-all"
          >
            <Settings className="h-4 w-4 mr-2" />
            Gérer les règles
          </Button>
        </Link>
      </motion.div>

      {/* Message d'information */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="subtle" className="p-6 border-l-4 border-l-brand-blue bg-blue-50/30">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600 mt-0.5">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-blue-900 mb-1">Fonctionnement des règles</h4>
              <p className="text-sm text-blue-700 leading-relaxed">
                Cette page affiche les règles d'automatisation actives pour cette session. 
                Vous pouvez activer ou désactiver les règles existantes ici. 
                Pour créer de nouvelles règles ou modifier leur contenu, rendez-vous dans les paramètres globaux.
              </p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Liste des règles actives */}
      {activeSchedules.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 px-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Règles actives ({activeSchedules.length})
          </h3>
          <div className="grid gap-4">
            {activeSchedules.map((schedule: any) => {
              const template = emailTemplates?.find((t: any) => t.id === schedule.template_id)
              return (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  template={template}
                  onToggleActive={(id, isActive) => {
                    toggleActiveMutation.mutate({ id, isActive })
                  }}
                />
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Liste des règles inactives */}
      {inactiveSchedules.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 px-1 opacity-75">
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            Règles inactives ({inactiveSchedules.length})
          </h3>
          <div className="grid gap-4">
            {inactiveSchedules.map((schedule: any) => {
              const template = emailTemplates?.find((t: any) => t.id === schedule.template_id)
              return (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  template={template}
                  onToggleActive={(id, isActive) => {
                    toggleActiveMutation.mutate({ id, isActive })
                  }}
                />
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Message si aucune règle */}
      {(!schedules || schedules.length === 0) && (
        <motion.div variants={itemVariants}>
          <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 text-center">
            <div className="p-4 bg-white rounded-full shadow-sm mb-4">
              <Mail className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Aucune règle d'automatisation
            </h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Configurez des emails automatiques pour gagner du temps (rappels, convocations, suivis...).
            </p>
            <Link href="/dashboard/settings/email-schedules">
              <Button className="bg-brand-blue hover:bg-brand-blue-dark text-white shadow-lg shadow-brand-blue/20 transition-all hover:scale-105">
                <Settings className="h-4 w-4 mr-2" />
                Configurer une règle
              </Button>
            </Link>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

function ScheduleCard({
  schedule,
  template,
  onToggleActive,
}: {
  schedule: any
  template?: any
  onToggleActive: (id: string, isActive: boolean) => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: schedule.is_active ? 1 : 0.8, scale: 1 }}
      className={cn(
        "group relative overflow-hidden rounded-xl border transition-all duration-300",
        schedule.is_active 
          ? "bg-white border-brand-blue/20 shadow-sm hover:shadow-md hover:border-brand-blue/40" 
          : "bg-gray-50/50 border-gray-200 hover:bg-white hover:border-gray-300"
      )}
    >
      {schedule.is_active && (
        <div className="absolute top-0 left-0 w-1 h-full bg-brand-blue" />
      )}
      
      <div className="p-6 flex items-start justify-between gap-6">
        <div className="flex-1 space-y-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-lg font-bold text-gray-900">{schedule.name}</h3>
              <Badge variant={schedule.is_active ? 'default' : 'secondary'} className={cn(
                "capitalize",
                schedule.is_active ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-600"
              )}>
                {schedule.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {schedule.description && (
              <p className="text-sm text-gray-500">{schedule.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50/80 p-2 rounded-lg border border-gray-100">
              <Mail className="h-4 w-4 text-brand-blue" />
              <span className="font-medium">{schedule.email_type}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50/80 p-2 rounded-lg border border-gray-100">
              <Clock className="h-4 w-4 text-brand-cyan" />
              <span>
                {schedule.trigger_type === 'before_start' && 'Avant le début'}
                {schedule.trigger_type === 'after_end' && 'Après la fin'}
                {schedule.trigger_type === 'specific_date' && 'Date précise'}
              </span>
            </div>

            {(schedule.trigger_days !== null && schedule.trigger_days !== undefined) && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50/80 p-2 rounded-lg border border-gray-100">
                <Calendar className="h-4 w-4 text-purple-500" />
                <span>
                  {schedule.trigger_days} jour(s)
                  {schedule.trigger_time && ` à ${schedule.trigger_time}`}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {schedule.send_to_students && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Users className="h-3 w-3 mr-1" /> Étudiants
              </Badge>
            )}
            {schedule.send_to_teachers && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                <Users className="h-3 w-3 mr-1" /> Enseignants
              </Badge>
            )}
            {schedule.send_to_coordinators && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                <Users className="h-3 w-3 mr-1" /> Coordinateurs
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center self-center">
          <Button
            size="icon"
            variant={schedule.is_active ? 'outline' : 'default'}
            className={cn(
              "h-12 w-12 rounded-full transition-all duration-300 shadow-sm",
              schedule.is_active 
                ? "border-2 border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 hover:text-red-700" 
                : "bg-green-600 hover:bg-green-700 text-white shadow-green-200"
            )}
            onClick={() => onToggleActive(schedule.id, !schedule.is_active)}
            title={schedule.is_active ? 'Désactiver' : 'Activer'}
          >
            {schedule.is_active ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-1" />}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
