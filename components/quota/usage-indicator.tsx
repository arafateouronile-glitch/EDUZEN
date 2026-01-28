'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { QuotaService, type OrganizationUsage } from '@/lib/services/quota.service'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Users, Calendar, AlertCircle, Infinity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from '@/components/ui/motion'

export function UsageIndicator() {
  const { user } = useAuth()
  
  // Créer une instance du service avec le client côté client
  const quotaService = useMemo(() => {
    const supabase = createClient()
    return new QuotaService(supabase)
  }, [])

  const { data: usage, isLoading } = useQuery<OrganizationUsage | null>({
    queryKey: ['organization-usage', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      return quotaService.getUsage(user.organization_id)
    },
    enabled: !!user?.organization_id,
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
  })

  if (isLoading || !usage || !usage.plan_name) {
    return null
  }

  const studentProgress =
    usage.max_students !== null
      ? (usage.current_student_count / usage.max_students) * 100
      : 0

  const sessionProgress =
    usage.max_sessions_per_month !== null
      ? (usage.current_sessions_count / usage.max_sessions_per_month) * 100
      : 0

  const isStudentLimitReached = usage.max_students !== null && usage.current_student_count >= usage.max_students
  const isSessionLimitReached = usage.max_sessions_per_month !== null && usage.current_sessions_count >= usage.max_sessions_per_month

  return (
    <Card className="mb-4 border-brand-blue/20">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-blue" />
                <span className="text-sm font-medium">Étudiants</span>
              </div>
              <span className="text-sm text-gray-600">
                {usage.current_student_count}
                {usage.max_students !== null ? ` / ${usage.max_students}` : <Infinity className="w-4 h-4 inline ml-1" />}
              </span>
            </div>
            {usage.max_students !== null ? (
              <>
                <Progress
                  value={studentProgress}
                  className={cn(
                    'h-2',
                    isStudentLimitReached && 'bg-red-100'
                  )}
                />
                {isStudentLimitReached && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-600 mt-1 flex items-center gap-1"
                  >
                    <AlertCircle className="w-3 h-3" />
                    Limite atteinte
                  </motion.p>
                )}
              </>
            ) : (
              <p className="text-xs text-gray-500">Illimité</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-cyan" />
                <span className="text-sm font-medium">Sessions (mois)</span>
              </div>
              <span className="text-sm text-gray-600">
                {usage.current_sessions_count}
                {usage.max_sessions_per_month !== null ? ` / ${usage.max_sessions_per_month}` : <Infinity className="w-4 h-4 inline ml-1" />}
              </span>
            </div>
            {usage.max_sessions_per_month !== null ? (
              <>
                <Progress
                  value={sessionProgress}
                  className={cn(
                    'h-2',
                    isSessionLimitReached && 'bg-red-100'
                  )}
                />
                {isSessionLimitReached && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-600 mt-1 flex items-center gap-1"
                  >
                    <AlertCircle className="w-3 h-3" />
                    Limite mensuelle atteinte
                  </motion.p>
                )}
              </>
            ) : (
              <p className="text-xs text-gray-500">Illimité</p>
            )}
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500">
              Plan: <span className="font-medium text-brand-blue">{usage.plan_name}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
