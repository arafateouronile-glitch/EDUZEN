'use client'

import { useState, useCallback, useMemo, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { programService } from '@/lib/services/program.service'
import { ProgramsContent } from './programs-content'
import type { Program } from './types'
import { RoleGuard, FORMATION_MANAGEMENT_ROLES } from '@/components/auth/role-guard'

const PAGE_SIZE = 24

// Cache agressif: 5 min pour les données, 30 min en mémoire
const CACHE_CONFIG = {
  staleTime: 1000 * 60 * 5, // 5 minutes - données considérées fraîches
  gcTime: 1000 * 60 * 30,   // 30 minutes - garder en cache
  refetchOnWindowFocus: false,
  refetchOnMount: false,
}

export default function ProgramsPage() {
  return (
    <RoleGuard allowedRoles={FORMATION_MANAGEMENT_ROLES}>
      <ProgramsPageContent />
    </RoleGuard>
  )
}

function ProgramsPageContent() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [page, setPage] = useState(0)
  const [isPending, startTransition] = useTransition()

  // Reset page when filters change avec transition pour éviter le blocage UI
  const handleSearchChange = useCallback((value: string) => {
    startTransition(() => {
      setSearch(value)
      setPage(0)
    })
  }, [])

  const handleActiveOnlyChange = useCallback((value: boolean) => {
    startTransition(() => {
      setShowActiveOnly(value)
      setPage(0)
    })
  }, [])

  // Prefetch de la page suivante
  const prefetchNextPage = useCallback(() => {
    const orgId = user?.organization_id
    if (!orgId) return
    queryClient.prefetchQuery({
      queryKey: ['programs', orgId, search, showActiveOnly, page + 1],
      queryFn: async () => {
        const result = await programService.getAllPrograms(orgId, {
          search,
          isActive: showActiveOnly || undefined,
          limit: PAGE_SIZE,
          offset: (page + 1) * PAGE_SIZE,
        })
        return result as { data: Program[]; count: number; hasMore: boolean }
      },
      ...CACHE_CONFIG,
    })
  }, [queryClient, user?.organization_id, search, showActiveOnly, page])

  // Pagination optimisée avec cache agressif
  const { data: programsResult, isLoading, isFetching } = useQuery({
    queryKey: ['programs', user?.organization_id, search, showActiveOnly, page],
    queryFn: async () => {
      if (!user?.organization_id) return { data: [], count: 0, hasMore: false }
      const result = await programService.getAllPrograms(user.organization_id, {
        search,
        isActive: showActiveOnly || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      })
      return result as { data: Program[]; count: number; hasMore: boolean }
    },
    enabled: !!user?.organization_id,
    ...CACHE_CONFIG,
    placeholderData: (previousData) => previousData,
  })

  // Stats avec cache très long (10 min)
  const { data: globalStats } = useQuery({
    queryKey: ['programs-global-stats', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      return await programService.getGlobalStats(user.organization_id)
    },
    enabled: !!user?.organization_id,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60,    // 1 heure
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  if (!user?.organization_id) {
    return (
      <div className="p-6">
        <p>Aucune organisation</p>
      </div>
    )
  }

  // Prefetch page suivante quand hasMore
  const hasMore = programsResult?.hasMore ?? false
  useMemo(() => {
    if (hasMore) prefetchNextPage()
  }, [hasMore, prefetchNextPage])

  return (
    <ProgramsContent
      programs={(programsResult?.data as Program[]) || []}
      isLoading={isLoading}
      isFetching={isFetching || isPending}
      globalStats={globalStats}
      search={search}
      setSearch={handleSearchChange}
      showActiveOnly={showActiveOnly}
      setShowActiveOnly={handleActiveOnlyChange}
      page={page}
      setPage={setPage}
      totalCount={programsResult?.count ?? 0}
      hasMore={hasMore}
      pageSize={PAGE_SIZE}
    />
  )
}