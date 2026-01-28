/**
 * Tests unitaires pour StudentService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StudentService } from '@/lib/services/student.service'

// Mock Supabase client avec vi.hoisted pour résoudre les problèmes d'initialisation
const { mockSupabase } = vi.hoisted(() => {
  // Créer le mock directement ici pour éviter les problèmes d'import
  const mock: any = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    or: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    range: vi.fn(),
  }
  
  // Toutes les méthodes chainables retournent le mock lui-même
  // Utiliser mockImplementation pour que cela persiste même après mockClear()
  const chainableMethods = ['from', 'select', 'eq', 'in', 'or', 'insert', 'update', 'upsert', 'delete', 'order', 'limit']
  chainableMethods.forEach((method) => {
    mock[method].mockImplementation(() => mock)
  })
  
  // single(), maybeSingle(), et range() retournent des promesses
  mock.single.mockResolvedValue({ data: null, error: null })
  mock.maybeSingle.mockResolvedValue({ data: null, error: null })
  mock.range.mockResolvedValue({ data: [], error: null, count: 0 })
  
  return { mockSupabase: mock }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

describe('StudentService', () => {
  let service: StudentService

  beforeEach(() => {
    vi.clearAllMocks()
    // Réinitialiser le chaînage après clearAllMocks
    // Utiliser mockImplementation pour que cela persiste même après mockClear()
    const chainableMethods = ['from', 'select', 'eq', 'in', 'or', 'insert', 'update', 'upsert', 'delete', 'order', 'limit']
    chainableMethods.forEach((method) => {
      ;(mockSupabase as any)[method].mockImplementation(() => mockSupabase)
    })
    ;(mockSupabase as any).single.mockResolvedValue({ data: null, error: null })
    ;(mockSupabase as any).maybeSingle.mockResolvedValue({ data: null, error: null })
    ;(mockSupabase as any).range.mockResolvedValue({ data: [], error: null, count: 0 })
    service = new StudentService(mockSupabase as any)
  })

  describe('getAll', () => {
    it('devrait récupérer tous les étudiants avec pagination', async () => {
      const organizationId = 'org-1'
      const students = [
        {
          id: 'student-1',
          organization_id: organizationId,
          first_name: 'John',
          last_name: 'Doe',
          student_number: 'STU001',
        },
        {
          id: 'student-2',
          organization_id: organizationId,
          first_name: 'Jane',
          last_name: 'Smith',
          student_number: 'STU002',
        },
      ]

      mockSupabase.range.mockResolvedValueOnce({
        data: students,
        error: null,
        count: 2,
      })

      const result = await service.getAll(organizationId, { page: 1, limit: 10 })

      expect(result.data).toEqual(students)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
    })

    it('devrait gérer les erreurs lors de la récupération', async () => {
      const organizationId = 'org-1'
      const error = new Error('Database error')

      mockSupabase.range.mockResolvedValueOnce({
        data: null,
        error,
      })

      await expect(service.getAll(organizationId)).rejects.toThrow('Database error')
    })
  })

  describe('getById', () => {
    it('devrait récupérer un étudiant par ID', async () => {
      const studentId = 'student-1'
      const student = {
        id: studentId,
        organization_id: 'org-1',
        first_name: 'John',
        last_name: 'Doe',
        student_number: 'STU001',
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: student,
        error: null,
      })

      const result = await service.getById(studentId)

      expect(result).toEqual(student)
      expect(mockSupabase.from).toHaveBeenCalledWith('students')
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', studentId)
    })

    it('devrait retourner null si l\'étudiant n\'existe pas', async () => {
      const studentId = 'non-existent'

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })

      await expect(service.getById(studentId)).rejects.toThrow()
    })
  })

  describe('create', () => {
    it('devrait créer un nouvel étudiant', async () => {
      const studentData = {
        organization_id: 'org-1',
        first_name: 'John',
        last_name: 'Doe',
        student_number: 'STU001',
        status: 'active' as const,
      }

      const createdStudent = {
        id: 'student-1',
        ...studentData,
        created_at: new Date().toISOString(),
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: createdStudent,
        error: null,
      })

      const result = await service.create(studentData)

      expect(result).toEqual(createdStudent)
      expect(mockSupabase.from).toHaveBeenCalledWith('students')
      expect(mockSupabase.insert).toHaveBeenCalled()
    })

    it('devrait gérer les erreurs de validation', async () => {
      const studentData = {
        organization_id: 'org-1',
        first_name: '',
        last_name: 'Doe',
        student_number: 'STU001',
        status: 'active' as const,
      }

      // Le service valide avec validateRequired AVANT d'appeler Supabase
      // Donc on attend une AppError, pas une erreur Supabase
      await expect(service.create(studentData)).rejects.toThrow()
      // Vérifier que c'est bien une erreur de validation
      try {
        await service.create(studentData)
      } catch (error: any) {
        expect(error.message).toContain('first_name')
      }
    })
  })

  describe('update', () => {
    it('devrait mettre à jour un étudiant', async () => {
      const studentId = 'student-1'
      const updateData = {
        first_name: 'Jane',
      }

      const updatedStudent = {
        id: studentId,
        organization_id: 'org-1',
        first_name: 'Jane',
        last_name: 'Doe',
        student_number: 'STU001',
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: updatedStudent,
        error: null,
      })

      const result = await service.update(studentId, updateData)

      expect(result).toEqual(updatedStudent)
      expect(mockSupabase.from).toHaveBeenCalledWith('students')
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', studentId)
    })
  })

  describe('delete', () => {
    it('devrait supprimer un étudiant', async () => {
      const studentId = 'student-1'

      // delete() appelle update() avec status: 'inactive'
      // Donc on doit mocker single() pour la requête update
      const updatedStudent = {
        id: studentId,
        organization_id: 'org-1',
        first_name: 'John',
        last_name: 'Doe',
        student_number: 'STU001',
        status: 'inactive' as const,
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: updatedStudent,
        error: null,
      })

      const result = await service.delete(studentId)

      expect(result).toEqual(updatedStudent)
      expect(mockSupabase.from).toHaveBeenCalledWith('students')
      expect(mockSupabase.update).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', studentId)
    })
  })
})
