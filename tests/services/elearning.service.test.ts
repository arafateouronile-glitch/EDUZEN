/**
 * Tests unitaires pour ELearningService
 * Couverture : getCourses, getCourseBySlug, getCourseSections, getCourseLessons (audit P2-13)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ELearningService } from '@/lib/services/elearning.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

function createChain(result: { data: unknown; error: unknown }, terminal: 'order' | 'maybeSingle' = 'order') {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  return chain
}

function createMockSupabase(result: { data: unknown; error: unknown }, useMaybeSingle = false) {
  const chain = createChain(result, useMaybeSingle ? 'maybeSingle' : 'order')
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>
}

describe('ELearningService', () => {
  let service: ELearningService
  let mockSupabase: SupabaseClient<Database>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCourses', () => {
    it('devrait retourner [] si erreur table absente (PGRST116)', async () => {
      mockSupabase = createMockSupabase({ data: null, error: { code: 'PGRST116', message: 'No rows' } })
      service = new ELearningService(mockSupabase)

      const result = await service.getCourses('org-1')

      expect(result).toEqual([])
    })

    it('devrait retourner les cours d\'une organisation', async () => {
      const mockCourses = [
        { id: 'c1', organization_id: 'org-1', title: 'Cours 1', slug: 'cours-1' },
      ]
      mockSupabase = createMockSupabase({ data: mockCourses, error: null })
      service = new ELearningService(mockSupabase)

      const result = await service.getCourses('org-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('courses')
      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1')
      expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toEqual(mockCourses)
    })

    it('devrait appliquer les filtres instructorId, isPublished, difficulty, search si fournis', async () => {
      mockSupabase = createMockSupabase({ data: [], error: null })
      service = new ELearningService(mockSupabase)

      await service.getCourses('org-1', {
        instructorId: 'u1',
        isPublished: true,
        difficulty: 'beginner',
        search: 'test',
      })

      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      expect(chain.eq).toHaveBeenCalledWith('instructor_id', 'u1')
      expect(chain.eq).toHaveBeenCalledWith('is_published', true)
      expect(chain.eq).toHaveBeenCalledWith('difficulty_level', 'beginner')
      expect(chain.or).toHaveBeenCalled()
    })
  })

  describe('getCourseBySlug', () => {
    it('devrait retourner un cours par slug et organisation', async () => {
      const mockCourse = { id: 'c1', slug: 'mon-cours', organization_id: 'org-1', title: 'Mon cours' }
      mockSupabase = createMockSupabase({ data: mockCourse, error: null }, true)
      service = new ELearningService(mockSupabase)

      const result = await service.getCourseBySlug('mon-cours', 'org-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('courses')
      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      expect(chain.eq).toHaveBeenCalledWith('slug', 'mon-cours')
      expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1')
      expect(chain.maybeSingle).toHaveBeenCalled()
      expect(result).toEqual(mockCourse)
    })

    it('devrait retourner null si le cours n\'existe pas', async () => {
      mockSupabase = createMockSupabase({ data: null, error: null }, true)
      service = new ELearningService(mockSupabase)

      const result = await service.getCourseBySlug('inexistant', 'org-1')

      expect(result).toBeNull()
    })
  })

  describe('getCourseSections', () => {
    it('devrait retourner les sections d\'un cours', async () => {
      const mockSections = [
        { id: 's1', course_id: 'c1', title: 'Section 1', order_index: 0 },
      ]
      mockSupabase = createMockSupabase({ data: mockSections, error: null })
      service = new ELearningService(mockSupabase)

      const result = await service.getCourseSections('c1')

      expect(mockSupabase.from).toHaveBeenCalledWith('course_sections')
      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      expect(chain.eq).toHaveBeenCalledWith('course_id', 'c1')
      expect(chain.order).toHaveBeenCalledWith('order_index', { ascending: true })
      expect(result).toEqual(mockSections)
    })

    it('devrait retourner un tableau vide en cas d\'erreur 409', async () => {
      mockSupabase = createMockSupabase({ data: null, error: { code: '409', status: 409 } })
      service = new ELearningService(mockSupabase)

      const result = await service.getCourseSections('c1')

      expect(result).toEqual([])
    })
  })

  describe('getCourseLessons', () => {
    it('devrait retourner les leçons d\'un cours', async () => {
      const mockLessons = [
        { id: 'l1', course_id: 'c1', title: 'Leçon 1', order_index: 0 },
      ]
      mockSupabase = createMockSupabase({ data: mockLessons, error: null })
      service = new ELearningService(mockSupabase)

      const result = await service.getCourseLessons('c1')

      expect(mockSupabase.from).toHaveBeenCalledWith('lessons')
      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      expect(chain.eq).toHaveBeenCalledWith('course_id', 'c1')
      expect(result).toEqual(mockLessons)
    })
  })
})
