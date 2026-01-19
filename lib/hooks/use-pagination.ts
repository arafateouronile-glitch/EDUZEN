/**
 * Hook React pour la pagination serveur
 * 
 * Utilise React Query pour gérer la pagination côté serveur
 */

'use client'

import React from 'react'
import { useQuery, UseQueryOptions, keepPreviousData } from '@tanstack/react-query'
import { parsePaginationParams, type PaginationParams, type PaginatedResponse } from '@/lib/utils/pagination'

export interface UsePaginationOptions<T> {
  queryKey: (string | number | undefined)[]
  queryFn: (params: PaginationParams) => Promise<PaginatedResponse<T>>
  initialPage?: number
  initialPageSize?: number
  enabled?: boolean
  keepPreviousData?: boolean
}

export function usePagination<T>({
  queryKey,
  queryFn,
  initialPage = 1,
  initialPageSize = 20,
  enabled = true,
  keepPreviousData: useKeepPreviousData = true,
}: UsePaginationOptions<T>) {
  const [page, setPage] = React.useState(initialPage)
  const [pageSize, setPageSize] = React.useState(initialPageSize)

  const { data, isLoading, error, refetch, isFetching } = useQuery<PaginatedResponse<T>>({
    queryKey: [...queryKey, page, pageSize],
    queryFn: () => queryFn({ page, pageSize }),
    enabled,
    placeholderData: useKeepPreviousData ? keepPreviousData : undefined,
    staleTime: 30 * 1000, // 30 secondes
  })

  const response = data as PaginatedResponse<T> | undefined

  const goToPage = React.useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  const nextPage = React.useCallback(() => {
    if (response?.pagination?.hasNextPage) {
      setPage((p) => p + 1)
    }
  }, [response])

  const previousPage = React.useCallback(() => {
    if (response?.pagination?.hasPreviousPage) {
      setPage((p) => p - 1)
    }
  }, [response])

  const changePageSize = React.useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setPage(1) // Reset à la première page
  }, [])
  return {
    data: response?.data || [],
    pagination: response?.pagination || {
      page,
      pageSize,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    isLoading,
    isFetching,
    error,
    refetch,
    // Actions
    goToPage,
    nextPage,
    previousPage,
    changePageSize,
    setPage,
    setPageSize,
  }
}






