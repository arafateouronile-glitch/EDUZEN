/**
 * Tests unitaires pour usePagination
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { usePagination } from '@/lib/hooks/use-pagination'
import type { PaginatedResponse } from '@/lib/utils/pagination'

// Wrapper pour QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('usePagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait initialiser avec les valeurs par défaut', async () => {
    const mockQueryFn = vi.fn().mockResolvedValue({
      data: [],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    })

    const { result } = renderHook(
      () =>
        usePagination({
          queryKey: ['test'],
          queryFn: mockQueryFn,
        }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.pagination.page).toBe(1)
    expect(result.current.pagination.pageSize).toBe(20)
    expect(result.current.data).toEqual([])
  })

  it('devrait utiliser les valeurs initiales personnalisées', async () => {
    const mockQueryFn = vi.fn().mockResolvedValue({
      data: [],
      pagination: {
        page: 2,
        pageSize: 10,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    })

    const { result } = renderHook(
      () =>
        usePagination({
          queryKey: ['test'],
          queryFn: mockQueryFn,
          initialPage: 2,
          initialPageSize: 10,
        }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.pagination.page).toBe(2)
    expect(result.current.pagination.pageSize).toBe(10)
  })

  it('devrait appeler queryFn avec les bons paramètres', async () => {
    const mockQueryFn = vi.fn().mockResolvedValue({
      data: ['item1', 'item2'],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    })

    renderHook(
      () =>
        usePagination({
          queryKey: ['test'],
          queryFn: mockQueryFn,
        }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(mockQueryFn).toHaveBeenCalledWith({ page: 1, pageSize: 20 })
    })
  })

  it('devrait changer de page avec goToPage', async () => {
    const mockQueryFn = vi.fn().mockResolvedValue({
      data: [],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    })

    const { result } = renderHook(
      () =>
        usePagination({
          queryKey: ['test'],
          queryFn: mockQueryFn,
        }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.goToPage(3)
    })

    await waitFor(() => {
      expect(mockQueryFn).toHaveBeenCalledWith({ page: 3, pageSize: 20 })
    })
  })

  it('devrait passer à la page suivante avec nextPage', async () => {
    const mockQueryFn = vi.fn().mockResolvedValue({
      data: [],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 50,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: false,
      },
    })

    const { result } = renderHook(
      () =>
        usePagination({
          queryKey: ['test'],
          queryFn: mockQueryFn,
        }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.nextPage()
    })

    await waitFor(() => {
      expect(mockQueryFn).toHaveBeenCalledWith({ page: 2, pageSize: 20 })
    })
  })

  it('ne devrait pas passer à la page suivante si hasNextPage est false', async () => {
    const mockQueryFn = vi.fn().mockResolvedValue({
      data: [],
      pagination: {
        page: 3,
        pageSize: 20,
        total: 50,
        totalPages: 3,
        hasNextPage: false,
        hasPreviousPage: true,
      },
    })

    const { result } = renderHook(
      () =>
        usePagination({
          queryKey: ['test'],
          queryFn: mockQueryFn,
          initialPage: 3,
        }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const initialPage = result.current.pagination.page

    act(() => {
      result.current.nextPage()
    })

    // La page ne devrait pas changer
    expect(result.current.pagination.page).toBe(initialPage)
  })

  it('devrait revenir à la page précédente avec previousPage', async () => {
    const mockQueryFn = vi.fn().mockResolvedValue({
      data: [],
      pagination: {
        page: 2,
        pageSize: 20,
        total: 50,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      },
    })

    const { result } = renderHook(
      () =>
        usePagination({
          queryKey: ['test'],
          queryFn: mockQueryFn,
          initialPage: 2,
        }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.previousPage()
    })

    await waitFor(() => {
      expect(mockQueryFn).toHaveBeenCalledWith({ page: 1, pageSize: 20 })
    })
  })

  it('devrait changer la taille de page avec changePageSize', async () => {
    const mockQueryFn = vi.fn().mockResolvedValue({
      data: [],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    })

    const { result } = renderHook(
      () =>
        usePagination({
          queryKey: ['test'],
          queryFn: mockQueryFn,
        }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.changePageSize(50)
    })

    await waitFor(() => {
      expect(mockQueryFn).toHaveBeenCalledWith({ page: 1, pageSize: 50 })
    })

    // La page devrait être réinitialisée à 1
    expect(result.current.pagination.page).toBe(1)
  })

  it('devrait retourner les données de pagination correctement', async () => {
    const mockData = ['item1', 'item2', 'item3']
    const mockQueryFn = vi.fn().mockResolvedValue({
      data: mockData,
      pagination: {
        page: 1,
        pageSize: 20,
        total: 3,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    })

    const { result } = renderHook(
      () =>
        usePagination({
          queryKey: ['test'],
          queryFn: mockQueryFn,
        }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.pagination.total).toBe(3)
    expect(result.current.pagination.totalPages).toBe(1)
  })

  it('devrait gérer les erreurs', async () => {
    const mockError = new Error('Test error')
    const mockQueryFn = vi.fn().mockRejectedValue(mockError)

    const { result } = renderHook(
      () =>
        usePagination({
          queryKey: ['test'],
          queryFn: mockQueryFn,
        }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })

    expect(result.current.error).toEqual(mockError)
  })

  it('devrait respecter enabled: false', () => {
    const mockQueryFn = vi.fn()

    renderHook(
      () =>
        usePagination({
          queryKey: ['test'],
          queryFn: mockQueryFn,
          enabled: false,
        }),
      {
        wrapper: createWrapper(),
      }
    )

    // La fonction ne devrait pas être appelée si enabled est false
    expect(mockQueryFn).not.toHaveBeenCalled()
  })
})
