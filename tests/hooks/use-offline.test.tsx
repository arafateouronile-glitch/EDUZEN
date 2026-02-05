/**
 * Tests unitaires pour useOffline
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useOffline, useOfflineCourse } from '@/lib/hooks/use-offline'

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

// Mock localStorage : les clés doivent être des propriétés énumérables pour Object.keys(localStorage)
// car useOffline utilise Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX))
const localStorageMock = (() => {
  const store: Record<string, string> = {}
  const mock: Record<string, unknown> = {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString()
      mock[key] = value.toString()
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
      delete mock[key]
    }),
    clear: vi.fn(() => {
      for (const k of Object.keys(store)) {
        delete store[k]
        delete mock[k]
      }
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  }
  return mock
})()

describe('useOffline', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    })
    localStorageMock.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('devrait initialiser avec l\'état online', () => {
    const { result } = renderHook(() => useOffline())
    expect(result.current.isOnline).toBe(true)
  })

  it('devrait détecter l\'état offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })

    const { result } = renderHook(() => useOffline())
    expect(result.current.isOnline).toBe(false)
  })

  it('devrait mettre en cache des données', () => {
    const { result } = renderHook(() => useOffline())

    act(() => {
      result.current.cacheData('test-key', { data: 'test' })
    })

    expect(localStorageMock.setItem).toHaveBeenCalled()
    const cached = result.current.getCachedData('test-key')
    expect(cached).toEqual({ data: 'test' })
  })

  it('devrait récupérer des données du cache', () => {
    const { result } = renderHook(() => useOffline())

    act(() => {
      result.current.cacheData('test-key', { data: 'test' })
    })

    const cached = result.current.getCachedData('test-key')
    expect(cached).toEqual({ data: 'test' })
  })

  it('devrait retourner null pour des données expirées', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useOffline())

    // Mettre en cache avec une durée très courte (1ms)
    act(() => {
      result.current.cacheData('test-key', { data: 'test' }, 1)
    })

    // Avancer le temps pour que ça expire (Date.now() avance avec fake timers)
    act(() => {
      vi.advanceTimersByTime(10)
    })

    const cached = result.current.getCachedData('test-key')
    expect(cached).toBeNull()
    vi.useRealTimers()
  })

  it('devrait supprimer des données du cache', () => {
    const { result } = renderHook(() => useOffline())

    act(() => {
      result.current.cacheData('test-key', { data: 'test' })
      result.current.clearCachedData('test-key')
    })

    const cached = result.current.getCachedData('test-key')
    expect(cached).toBeNull()
  })

  it('devrait vider tout le cache', async () => {
    const { result } = renderHook(() => useOffline())

    act(() => {
      result.current.cacheData('key1', { data: 'test1' })
      result.current.cacheData('key2', { data: 'test2' })
      result.current.clearAllCache()
    })

    expect(result.current.getCachedData('key1')).toBeNull()
    expect(result.current.getCachedData('key2')).toBeNull()
    await waitFor(() => {
      expect(result.current.isOfflineReady).toBe(false)
    })
  })

  it('devrait mettre en file d\'attente des actions pour sync', () => {
    const { result } = renderHook(() => useOffline())

    act(() => {
      result.current.queueForSync({
        type: 'create',
        table: 'students',
        data: { name: 'Test' },
        method: 'insert',
      })
    })

    expect(result.current.pendingSyncs).toBeGreaterThan(0)
  })

  it('devrait détecter si offline est prêt', async () => {
    const { result } = renderHook(() => useOffline())

    act(() => {
      result.current.cacheData('test-key', { data: 'test' })
    })

    await waitFor(() => {
      expect(result.current.isOfflineReady).toBe(true)
    })
  })

  it('devrait réagir aux événements online/offline', async () => {
    const { result } = renderHook(() => useOffline())
    expect(result.current.isOnline).toBe(true)

    await act(async () => {
      window.dispatchEvent(new Event('offline'))
    })
    await waitFor(() => {
      expect(result.current.isOnline).toBe(false)
    })

    await act(async () => {
      window.dispatchEvent(new Event('online'))
    })
    await waitFor(() => {
      expect(result.current.isOnline).toBe(true)
    })
  })

  it('devrait retourner null pour getCachedData si JSON invalide', () => {
    const { result } = renderHook(() => useOffline())
    const rawKey = 'eduzen_offline_bad-json'
    localStorageMock.setItem(rawKey, 'not valid json')

    const cached = result.current.getCachedData('bad-json')
    expect(cached).toBeNull()
  })

  it('devrait retourner false si cacheData échoue (localStorage.setItem throw)', () => {
    const { result } = renderHook(() => useOffline())
    const setItem = vi.mocked(localStorageMock.setItem as ReturnType<typeof vi.fn>)
    setItem.mockImplementationOnce(() => {
      throw new Error('QuotaExceeded')
    })

    let ok: boolean = true
    act(() => {
      ok = result.current.cacheData('fail-key', { x: 1 })
    })
    expect(ok).toBe(false)
  })

  it('devrait appeler syncPendingData sans erreur si online et pending vide', async () => {
    const { result } = renderHook(() => useOffline())
    await act(async () => {
      await result.current.syncPendingData()
    })
  })

  it('devrait synchroniser les actions en attente quand online', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockFrom = vi.fn(() => ({ insert: mockInsert }))
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any)

    const { result } = renderHook(() => useOffline())
    act(() => {
      result.current.queueForSync({
        type: 'create',
        table: 'students',
        data: { name: 'Sync Test' },
        method: 'insert',
      })
    })

    await act(async () => {
      await result.current.syncPendingData()
    })

    expect(mockFrom).toHaveBeenCalledWith('students')
    expect(mockInsert).toHaveBeenCalled()
  })

  it('devrait synchroniser une action update en attente', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const mockEq = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn(() => ({ update: mockUpdate }))
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any)

    const { result } = renderHook(() => useOffline())
    act(() => {
      result.current.queueForSync({
        type: 'update',
        table: 'students',
        data: { id: 'id-1', name: 'Updated' },
        method: 'update',
      })
    })

    await act(async () => {
      await result.current.syncPendingData()
    })

    expect(mockFrom).toHaveBeenCalledWith('students')
    expect(mockUpdate).toHaveBeenCalledWith({ id: 'id-1', name: 'Updated' })
    expect(mockEq).toHaveBeenCalledWith('id', 'id-1')
  })

  it('devrait synchroniser une action delete en attente', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn(() => ({ delete: mockDelete }))
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any)

    const { result } = renderHook(() => useOffline())
    act(() => {
      result.current.queueForSync({
        type: 'delete',
        table: 'students',
        data: { id: 'id-2' },
        method: 'delete',
      })
    })

    await act(async () => {
      await result.current.syncPendingData()
    })

    expect(mockFrom).toHaveBeenCalledWith('students')
    expect(mockDelete).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', 'id-2')
  })

  it('devrait conserver les actions échouées et mettre à jour pendingSyncs (échec partiel)', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockEq = vi.fn().mockRejectedValue(new Error('Update failed'))
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn((table: string) =>
      table === 'students'
        ? { insert: mockInsert }
        : { update: mockUpdate }
    )
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any)

    const { result } = renderHook(() => useOffline())
    act(() => {
      result.current.queueForSync({
        type: 'create',
        table: 'students',
        data: { name: 'Ok' },
        method: 'insert',
      })
      result.current.queueForSync({
        type: 'update',
        table: 'attendance',
        data: { id: 'a1', present: true },
        method: 'update',
      })
    })

    await act(async () => {
      await result.current.syncPendingData()
    })

    expect(mockInsert).toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalled()
    const raw = localStorageMock.getItem('eduzen_offline_pending_sync')
    const failed = raw ? JSON.parse(raw) : []
    expect(failed).toHaveLength(1)
    expect(failed[0].method).toBe('update')
    expect(failed[0].table).toBe('attendance')
    expect(result.current.pendingSyncs).toBe(1)
  })
})

describe('useOfflineCourse', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
    Object.defineProperty(navigator, 'onLine', { writable: true, value: true })
    localStorageMock.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('devrait exposer isOnline, isOfflineReady, downloadCourseForOffline, getCachedCourse, isCourseAvailableOffline', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    vi.mocked(createClient).mockReturnValue({ from: vi.fn() } as any)
    const { result } = renderHook(() => useOfflineCourse('intro-ts'))
    expect(result.current).toHaveProperty('isOnline')
    expect(result.current).toHaveProperty('isOfflineReady')
    expect(result.current).toHaveProperty('downloadCourseForOffline')
    expect(result.current).toHaveProperty('getCachedCourse')
    expect(result.current).toHaveProperty('isCourseAvailableOffline')
  })

  it('devrait télécharger un cours pour offline et le mettre en cache', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const course = {
      id: 'c1',
      slug: 'intro-ts',
      title: 'Intro TypeScript',
      course_sections: [
        {
          id: 's1',
          lessons: [
            { id: 'l1', title: 'Lesson 1', content: 'Hello' },
            { id: 'l2', title: 'Lesson 2', content: null },
          ],
        },
      ],
    }
    const mockSingle = vi.fn().mockResolvedValue({ data: course, error: null })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn(() => ({ select: mockSelect }))
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any)

    const { result } = renderHook(() => useOfflineCourse('intro-ts'))

    let ok = false
    await act(async () => {
      ok = await result.current.downloadCourseForOffline()
    })

    expect(ok).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith('courses')
    expect(mockEq).toHaveBeenCalledWith('slug', 'intro-ts')
    expect(result.current.getCachedCourse()).toEqual(course)
    expect(result.current.isCourseAvailableOffline()).toBe(true)
  })

  it('devrait retourner false si le cours est introuvable', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn(() => ({ select: mockSelect }))
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any)

    const { result } = renderHook(() => useOfflineCourse('missing'))

    let ok = true
    await act(async () => {
      ok = await result.current.downloadCourseForOffline()
    })

    expect(ok).toBe(false)
    expect(result.current.isCourseAvailableOffline()).toBe(false)
  })

  it('devrait retourner false si la requête Supabase échoue', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const mockSingle = vi.fn().mockRejectedValue(new Error('Network error'))
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn(() => ({ select: mockSelect }))
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any)

    const { result } = renderHook(() => useOfflineCourse('intro-ts'))

    let ok = true
    await act(async () => {
      ok = await result.current.downloadCourseForOffline()
    })

    expect(ok).toBe(false)
  })

  it('devrait retourner le cours en cache via getCachedCourse', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    vi.mocked(createClient).mockReturnValue({ from: vi.fn() } as any)
    const { result: offline } = renderHook(() => useOffline())
    const cached = { id: 'c1', title: 'Cached', slug: 'intro-ts' }
    act(() => {
      offline.current.cacheData('course_intro-ts', cached)
    })
    const { result: course } = renderHook(() => useOfflineCourse('intro-ts'))
    expect(course.current.getCachedCourse()).toEqual(cached)
    expect(course.current.isCourseAvailableOffline()).toBe(true)
  })

  it('devrait indiquer cours non disponible si pas en cache', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    vi.mocked(createClient).mockReturnValue({ from: vi.fn() } as any)
    const { result } = renderHook(() => useOfflineCourse('intro-ts'))
    expect(result.current.getCachedCourse()).toBeNull()
    expect(result.current.isCourseAvailableOffline()).toBe(false)
  })
})
