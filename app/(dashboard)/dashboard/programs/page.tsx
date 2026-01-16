'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { programService } from '@/lib/services/program.service'
import { ProgramsContent } from './programs-content'
import type { Program } from './types'
import { RoleGuard, FORMATION_MANAGEMENT_ROLES } from '@/components/auth/role-guard'

export default function ProgramsPage() {
  return (
    <RoleGuard allowedRoles={FORMATION_MANAGEMENT_ROLES}>
      <ProgramsPageContent />
    </RoleGuard>
  )
}

function ProgramsPageContent() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [showActiveOnly, setShowActiveOnly] = useState(true)

  const { data: programs, isLoading } = useQuery({
    queryKey: ['programs', user?.organization_id, search, showActiveOnly],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return programService.getAllPrograms(user.organization_id, {
        search,
        isActive: showActiveOnly || undefined,
      })
    },
    enabled: !!user?.organization_id,
  })

  const { data: globalStats } = useQuery({
    queryKey: ['programs-global-stats', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      return await programService.getGlobalStats(user.organization_id)
    },
    enabled: !!user?.organization_id,
  })

  if (!user?.organization_id) {
    return (
      <div className="p-6">
        <p>Aucune organisation</p>
      </div>
    )
  }

  return (
    <ProgramsContent
      programs={(programs as Program[]) || []}
      isLoading={isLoading}
      globalStats={globalStats}
      search={search}
      setSearch={setSearch}
      showActiveOnly={showActiveOnly}
      setShowActiveOnly={setShowActiveOnly}
    />
  )
}