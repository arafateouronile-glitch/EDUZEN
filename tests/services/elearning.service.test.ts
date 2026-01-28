/**
 * Tests unitaires pour ELearningService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ELearningService } from '@/lib/services/elearning.service'

// Mock Supabase client
const { mockSupabase } = vi.hoisted(() => {
  const mock: any = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  
  const chainableMethods = ['from', 'select', 'eq', 'or', 'order', 'insert', 'update', 'delete']
  chainableMethods.forEach((method) => {
    mock[method].mockImplementation(() => mock)
  })
  
  mock.single.mockResolvedValue({ data: null, error: null })
  mock.maybeSingle.mockResolvedValue({ data: null, error: null })
  
  return { mockSupabase: mock }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

describe('ELearningService', () => {
  let service: ELearningService

  beforeEach(() => {
    vi.clearAllMocks()
    const chainableMethods = ['from', 'select', 'eq', 'order', 'insert', 'update', 'delete', 'or']
    chainableMethods.forEach((method) => {
      ;(mockSupabase as any)[method].mockImplementation(() => mockSupabase)
    })
    ;(mockSupabase as any).single.mockResolvedValue({ data: null, error: null })
    ;(mockSupabase as any).maybeSingle.mockResolvedValue({ data: null, error: null })
    service = new ELearningService(mockSupabase as any)
  })

  describe('getCourses', () => {
    it('devrait récupérer tous les cours d\'une organisation', async () => {
      const organizationId = 'org-1'
      const mockCourses = [
        {
          id: 'course-1',
          organization_id: organizationId,
          title: 'Introduction à React',
          description: 'Cours d\'introduction',
          status: 'published',
        },
      ]

      const mockQueryChain = {
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockCourses,
          error: null,
        }),
      }

      ;(mockSupabase as any).select.mockReturnValue(mockQueryChain)

      const result = await service.getCourses(organizationId)

      expect(result).toEqual(mockCourses)
      expect(mockSupabase.from).toHaveBeenCalledWith('courses')
    })

    it('devrait retourner un tableau vide si la table n\'existe pas encore', async () => {
      const organizationId = 'org-1'
      const mockError = {
        message: 'relation "public.courses" does not exist',
        code: '42P01',
      }

      const mockQueryChain = {
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      }

      ;(mockSupabase as any).select.mockReturnValue(mockQueryChain)

      const result = await service.getCourses(organizationId)

      expect(result).toEqual([])
    })
  })

  describe('getCourseBySlug', () => {
    it('devrait récupérer un cours par son slug', async () => {
      const slug = 'introduction-react'
      const organizationId = 'org-1'
      const mockCourse = {
        id: 'course-1',
        slug,
        title: 'Introduction à React',
        description: 'Cours d\'introduction',
        status: 'published',
        lessons: [],
      }

      const mockQueryChain = {
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: mockCourse,
          error: null,
        }),
      }

      ;(mockSupabase as any).select.mockReturnValue(mockQueryChain)

      const result = await service.getCourseBySlug(slug, organizationId)

      expect(result).toEqual(mockCourse)
      expect(mockSupabase.from).toHaveBeenCalledWith('courses')
      expect(mockQueryChain.eq).toHaveBeenCalledWith('slug', slug)
      expect(mockQueryChain.eq).toHaveBeenCalledWith('organization_id', organizationId)
    })

    it('devrait retourner null si le cours n\'existe pas', async () => {
      const slug = 'course-inexistant'
      const organizationId = 'org-1'
      const mockError = {
        message: 'relation "public.courses" does not exist',
        code: '42P01',
      }

      const mockQueryChain = {
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      }

      ;(mockSupabase as any).select.mockReturnValue(mockQueryChain)

      const result = await service.getCourseBySlug(slug, organizationId)

      expect(result).toBeNull()
    })
  })

  describe('getCourseSections', () => {
    it('devrait récupérer les sections d\'un cours', async () => {
      const courseId = 'course-1'
      const mockSections = [
        {
          id: 'section-1',
          course_id: courseId,
          title: 'Section 1',
          order_index: 1,
        },
      ]

      const mockQueryChain = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockSections,
          error: null,
        }),
      }

      ;(mockSupabase as any).select.mockReturnValue(mockQueryChain)

      const result = await service.getCourseSections(courseId)

      expect(result).toEqual(mockSections)
      expect(mockSupabase.from).toHaveBeenCalledWith('course_sections')
      expect(mockQueryChain.eq).toHaveBeenCalledWith('course_id', courseId)
    })
  })
})
