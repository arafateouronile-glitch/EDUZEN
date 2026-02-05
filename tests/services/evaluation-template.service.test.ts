/**
 * Tests unitaires pour EvaluationTemplateService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EvaluationTemplateService } from '@/lib/services/evaluation-template.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

function chain(opts: {
  eq?: (v?: unknown) => unknown
  or?: (v?: unknown) => unknown
  order?: (v?: unknown) => unknown
  select?: (v?: unknown) => unknown
  insert?: (v?: unknown) => unknown
  update?: (v?: unknown) => unknown
  delete?: (v?: unknown) => unknown
  single?: () => Promise<{ data: unknown; error: unknown }>
} = {}) {
  const c: any = {
    eq: vi.fn().mockImplementation(function (this: any) { return opts.eq ? opts.eq(...arguments) : this }),
    or: vi.fn().mockImplementation(function (this: any) { return opts.or ? opts.or(...arguments) : this }),
    order: vi.fn().mockImplementation(function (this: any) { return opts.order ? opts.order(...arguments) : this }),
    select: vi.fn().mockImplementation(function (this: any) { return opts.select ? opts.select(...arguments) : this }),
    insert: vi.fn().mockImplementation(function (this: any) { return opts.insert ? opts.insert(...arguments) : this }),
    update: vi.fn().mockImplementation(function (this: any) { return opts.update ? opts.update(...arguments) : this }),
    delete: vi.fn().mockImplementation(function (this: any) { return opts.delete ? opts.delete(...arguments) : this }),
    single: opts.single ?? vi.fn().mockResolvedValue({ data: null, error: null }),
  }
  if (!opts.eq) c.eq.mockReturnValue(c)
  if (!opts.or) c.or.mockReturnValue(c)
  if (!opts.order) c.order.mockReturnValue(c)
  if (!opts.select) c.select.mockReturnValue(c)
  if (!opts.insert) c.insert.mockReturnValue(c)
  if (!opts.update) c.update.mockReturnValue(c)
  if (!opts.delete) c.delete.mockReturnValue(c)
  return c
}

vi.mock('@/lib/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  sanitizeError: (e: unknown) => (e && typeof e === 'object' && 'message' in e ? { message: (e as { message: string }).message } : {}),
}))

describe('EvaluationTemplateService', () => {
  let service: EvaluationTemplateService
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = { from: vi.fn() }
    service = new EvaluationTemplateService(mockSupabase as SupabaseClient<Database>)
    vi.clearAllMocks()
  })

  describe('getTemplates', () => {
    it('devrait retourner la liste des modèles en cas de succès', async () => {
      const mockTemplates = [
        { id: 'tpl-1', name: 'Satisfaction', organization_id: 'org-1', is_active: true, questions: [] },
      ]
      const orderRet = Promise.resolve({ data: mockTemplates, error: null })
      const q: any = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue(orderRet),
      }
      mockSupabase.from.mockReturnValue(q)

      const result = await service.getTemplates('org-1')

      expect(result).toEqual(mockTemplates)
      expect(mockSupabase.from).toHaveBeenCalledWith('evaluation_templates')
    })

    it('devrait retourner [] si erreur', async () => {
      const q: any = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }
      mockSupabase.from.mockReturnValue(q)

      const result = await service.getTemplates('org-1')

      expect(result).toEqual([])
    })
  })

  describe('getTemplateById', () => {
    it('devrait retourner null si erreur', async () => {
      const c = chain({
        single: () => Promise.resolve({ data: null, error: { message: 'Not found' } }),
      })
      mockSupabase.from.mockReturnValue(c)

      const result = await service.getTemplateById('tpl-1')

      expect(result).toBeNull()
    })

    it('devrait retourner le modèle si succès', async () => {
      const tpl = { id: 'tpl-1', name: 'Satisfaction', organization_id: 'org-1', questions: [] }
      const c = chain({
        single: () => Promise.resolve({ data: tpl, error: null }),
      })
      mockSupabase.from.mockReturnValue(c)

      const result = await service.getTemplateById('tpl-1')

      expect(result).toEqual(tpl)
    })
  })

  describe('deleteTemplate', () => {
    it('devrait supprimer sans erreur', async () => {
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabase.from.mockReturnValue(deleteChain)

      await expect(service.deleteTemplate('tpl-1')).resolves.toBeUndefined()
      expect(mockSupabase.from).toHaveBeenCalledWith('evaluation_templates')
      expect(deleteChain.eq).toHaveBeenCalledWith('id', 'tpl-1')
    })

    it('devrait propager l\'erreur si delete échoue', async () => {
      const err = { message: 'FK violation', code: '23503' }
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: err }),
      }
      mockSupabase.from.mockReturnValue(deleteChain)

      await expect(service.deleteTemplate('tpl-1')).rejects.toEqual(err)
    })
  })

  describe('updateTemplate', () => {
    it('devrait propager insertError si insert questions échoue (l.176)', async () => {
      const updateChain = chain({
        update: () => chain({ eq: () => Promise.resolve({ error: null }) }),
      })
      const deleteChain = chain({
        delete: () => chain({ eq: () => Promise.resolve({ error: null }) }),
      })
      const insertChain = chain({
        insert: () => Promise.resolve({ data: null, error: { message: 'Insert failed', code: '23505' } }),
      })
      mockSupabase.from
        .mockReturnValueOnce(updateChain)
        .mockReturnValueOnce(deleteChain)
        .mockReturnValueOnce(insertChain)

      await expect(
        service.updateTemplate('tpl-1', { name: 'Updated' }, [{ text: 'Q1', order_index: 1 }])
      ).rejects.toMatchObject({ message: 'Insert failed' })
    })
  })

  describe('getInstanceByGradeId', () => {
    it('devrait retourner null si error.code === PGRST116 (l.249)', async () => {
      const c = chain({
        single: () => Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'No rows' } }),
      })
      mockSupabase.from.mockReturnValue(c)

      const result = await service.getInstanceByGradeId('grade-1')

      expect(result).toBeNull()
      expect(mockSupabase.from).toHaveBeenCalledWith('evaluation_template_instances')
    })

    it('devrait propager erreur puis retourner null via catch si error.code !== PGRST116 (l.250)', async () => {
      const c = chain({
        single: () => Promise.resolve({ data: null, error: { code: '22P02', message: 'invalid uuid' } }),
      })
      mockSupabase.from.mockReturnValue(c)

      const result = await service.getInstanceByGradeId('grade-1')

      expect(result).toBeNull()
    })

    it('devrait retourner l\'instance si succès', async () => {
      const inst = {
        id: 'inst-1',
        grade_id: 'grade-1',
        template_id: 'tpl-1',
        template: { id: 'tpl-1', questions: [] },
        grade: { id: 'grade-1' },
      }
      const c = chain({
        single: () => Promise.resolve({ data: inst, error: null }),
      })
      mockSupabase.from.mockReturnValue(c)

      const result = await service.getInstanceByGradeId('grade-1')

      expect(result).toEqual(inst)
    })
  })

  describe('getResponses', () => {
    it('devrait filtrer par studentId quand fourni (l.259)', async () => {
      const orderRet = Promise.resolve({ data: [], error: null })
      const q: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue(orderRet),
      }
      mockSupabase.from.mockReturnValue(q)

      await service.getResponses('inst-1', 'student-1')

      expect(q.eq).toHaveBeenCalledWith('instance_id', 'inst-1')
      expect(q.eq).toHaveBeenCalledWith('student_id', 'student-1')
    })

    it('devrait retourner [] si erreur', async () => {
      const q: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }
      mockSupabase.from.mockReturnValue(q)

      const result = await service.getResponses('inst-1')

      expect(result).toEqual([])
    })
  })
})
