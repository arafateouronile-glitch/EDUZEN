/**
 * Tests unitaires pour StudentService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StudentService, createStudentService } from '@/lib/services/student.service'

// Mock Supabase client avec vi.hoisted pour résoudre les problèmes d'initialisation
const { mockSupabase } = vi.hoisted(() => {
  // Créer le mock directement ici pour éviter les problèmes d'import
  const mock: any = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    in: vi.fn(),
    or: vi.fn(),
    like: vi.fn(),
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
  const chainableMethods = ['from', 'select', 'eq', 'neq', 'in', 'or', 'like', 'insert', 'update', 'upsert', 'delete', 'order', 'limit']
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

vi.mock('@/lib/utils/number-generator', () => ({
  generateUniqueNumber: vi.fn().mockResolvedValue('EDU-ORG25-000001'),
}))

describe('StudentService', () => {
  let service: StudentService

  beforeEach(() => {
    vi.clearAllMocks()
    // Réinitialiser le chaînage après clearAllMocks
    // Utiliser mockImplementation pour que cela persiste même après mockClear()
    const chainableMethods = ['from', 'select', 'eq', 'neq', 'in', 'or', 'like', 'insert', 'update', 'upsert', 'delete', 'order', 'limit']
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
          classes: null,
        },
        {
          id: 'student-2',
          organization_id: organizationId,
          first_name: 'Jane',
          last_name: 'Smith',
          student_number: 'STU002',
          classes: null,
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

    it('devrait filtrer par classId (résolu via les inscriptions de session)', async () => {
      // getAll() traite classId comme un alias de sessionId : il résout d'abord
      // les student_id inscrits (non annulés) via la table enrollments avant de
      // filtrer les étudiants, plutôt que d'appliquer un .eq('class_id', ...).
      const enrollmentsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockResolvedValue({ data: [{ student_id: 's1' }], error: null }),
      }
      const fromImpl = vi.fn((table: string) => (table === 'enrollments' ? enrollmentsChain : mockSupabase))
      ;(mockSupabase as any).from.mockImplementation(fromImpl)

      await service.getAll('org-1', { classId: 'class-1' })

      expect(enrollmentsChain.eq).toHaveBeenCalledWith('session_id', 'class-1')
      expect(enrollmentsChain.neq).toHaveBeenCalledWith('status', 'cancelled')
      expect(mockSupabase.in).toHaveBeenCalledWith('id', ['s1'])
    })

    it('devrait ignorer erreur récupération classes (catch l.97-100) et enrichir avec classesMap vide', async () => {
      const students = [
        { id: 's1', organization_id: 'org-1', first_name: 'John', last_name: 'Doe', class_id: 'c1' },
      ]
      mockSupabase.range.mockResolvedValueOnce({ data: students, error: null, count: 1 })
      const classesChain = {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockRejectedValue(new Error('classes fetch failed')),
        }),
      }
      const fromImpl = vi.fn((table: string) => {
        if (table === 'classes') return classesChain
        return mockSupabase
      })
      ;(mockSupabase as any).from.mockImplementation(fromImpl)

      const { logger } = await import('@/lib/utils/logger')
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})

      const result = await service.getAll('org-1', { page: 1, limit: 10 })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].class_id).toBe('c1')
      expect(result.data[0].classes).toBeNull()
      expect(warnSpy).toHaveBeenCalledWith(
        'Erreur récupération classes pour enrichissement',
        expect.objectContaining({ error: expect.any(Error) })
      )
      warnSpy.mockRestore()
    })

    it('devrait filtrer par status', async () => {
      mockSupabase.range.mockResolvedValueOnce({ data: [], error: null, count: 0 })
      await service.getAll('org-1', { status: 'active' })
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'active')
    })

    it('devrait appliquer la recherche (search)', async () => {
      mockSupabase.range.mockResolvedValueOnce({ data: [], error: null, count: 0 })
      await service.getAll('org-1', { search: 'Doe' })
      expect(mockSupabase.or).toHaveBeenCalled()
      const orArg = (mockSupabase.or as any).mock.calls[0][0]
      expect(orArg).toContain('Doe')
      expect(orArg).toContain('ilike')
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
        classes: null,
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

    it('devrait lancer createDatabaseError si data null et error null (l.153-158)', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

      await expect(service.getById('student-1')).rejects.toThrow(/introuvable/)
    })

    it('devrait enrichir avec la classe quand student.class_id est défini', async () => {
      const student = {
        id: 'student-1',
        organization_id: 'org-1',
        first_name: 'John',
        last_name: 'Doe',
        class_id: 'class-1',
      }
      const classData = { id: 'class-1', name: 'Classe A', level: 1 }
      ;(mockSupabase.single as any).mockResolvedValueOnce({ data: student, error: null })
      ;(mockSupabase.maybeSingle as any).mockResolvedValueOnce({ data: classData, error: null })

      const result = await service.getById('student-1')

      expect(result).toMatchObject({ ...student, classes: classData })
      expect(mockSupabase.from).toHaveBeenCalledWith('classes')
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'class-1')
    })

    it('devrait retourner classes null si récupération classe échoue (catch l.174-181)', async () => {
      const student = {
        id: 'student-1',
        organization_id: 'org-1',
        first_name: 'John',
        last_name: 'Doe',
        class_id: 'class-1',
      }
      ;(mockSupabase.single as any).mockResolvedValueOnce({ data: student, error: null })
      ;(mockSupabase.maybeSingle as any).mockRejectedValueOnce(new Error('classes fetch failed'))
      const { logger } = await import('@/lib/utils/logger')
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})

      const result = await service.getById('student-1')

      expect(result).toMatchObject({ ...student, classes: null })
      expect(warnSpy).toHaveBeenCalledWith(
        'Erreur récupération classe pour enrichissement',
        expect.objectContaining({ error: expect.any(Error) })
      )
      warnSpy.mockRestore()
    })
  })

  describe('getByNumber', () => {
    it('devrait récupérer un étudiant par numéro', async () => {
      const student = {
        id: 'student-1',
        organization_id: 'org-1',
        first_name: 'John',
        last_name: 'Doe',
        student_number: 'STU001',
      }
      mockSupabase.single.mockResolvedValueOnce({ data: student, error: null })

      const result = await service.getByNumber('org-1', 'STU001')

      expect(result).toEqual(student)
      expect(mockSupabase.from).toHaveBeenCalledWith('students')
      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', 'org-1')
      expect(mockSupabase.eq).toHaveBeenCalledWith('student_number', 'STU001')
    })

    it('devrait rejeter si non trouvé (PGRST116)', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows' },
      })

      await expect(service.getByNumber('org-1', 'INVALID')).rejects.toThrow()
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

    it('devrait propager l\'erreur si la mise à jour échoue', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed', code: 'PGRST_ERROR' },
      })

      await expect(service.update('student-1', { first_name: 'Jane' })).rejects.toThrow()
    })

    it('devrait rejeter si update retourne data null et error null (!data)', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

      await expect(service.update('student-1', { first_name: 'Jane' })).rejects.toThrow()
    })

    it('devrait propager erreur non-AppError (catch update) si chain rejette', async () => {
      mockSupabase.single.mockRejectedValueOnce(new Error('update chain failed'))

      await expect(service.update('student-1', { first_name: 'Jane' })).rejects.toThrow()
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

    it('devrait propager l\'erreur si la suppression (update) échoue', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Delete failed', code: 'PGRST_ERROR' },
      })

      await expect(service.delete('student-1')).rejects.toThrow()
    })
  })

  describe('constructor', () => {
    it('devrait lever si supabaseClient est null', () => {
      expect(() => new StudentService(null as any)).toThrow(
        'StudentService requires a Supabase client to be passed in constructor'
      )
    })
  })

  describe('createStudentService', () => {
    it('devrait retourner une instance de StudentService', () => {
      const instance = createStudentService(mockSupabase as any)
      expect(instance).toBeInstanceOf(StudentService)
    })
  })

  describe('import', () => {
    it('devrait rejeter si students vide ou null', async () => {
      await expect(service.import('org-1', [])).rejects.toThrow()
      await expect(service.import('org-1', null as any)).rejects.toThrow()
    })

    it('devrait importer des étudiants avec numéros générés', async () => {
      const orgChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { code: 'ORG' }, error: null }),
      }
      // import() interroge d'abord `students` pour trouver le dernier numéro
      // séquentiel existant (select/eq/like/order/limit/maybeSingle), avant
      // d'appeler une seconde fois `students` pour l'insert(...).select().
      const lookupChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        like: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      const inserted = [
        { id: 's1', organization_id: 'org-1', first_name: 'A', last_name: 'B', student_number: 'EDU-ORG25-000001' },
      ]
      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: inserted, error: null }),
      }
      let studentsCallCount = 0
      const fromImpl = vi.fn((table: string) => {
        if (table === 'organizations') return orgChain
        if (table === 'students') {
          studentsCallCount++
          return studentsCallCount === 1 ? lookupChain : insertChain
        }
        return insertChain
      })
      ;(mockSupabase as any).from.mockImplementation(fromImpl)

      const result = await service.import('org-1', [
        { organization_id: 'org-1', first_name: 'A', last_name: 'B', status: 'active' } as any,
      ])

      expect(result).toEqual(inserted)
      expect(orgChain.single).toHaveBeenCalled()
      expect(lookupChain.maybeSingle).toHaveBeenCalled()
      expect(insertChain.insert).toHaveBeenCalled()
    })

    it('devrait propager erreur 23505 (contrainte unique)', async () => {
      const orgChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { code: 'ORG' }, error: null }),
      }
      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'Duplicate key' },
        }),
      }
      ;(mockSupabase as any).from.mockImplementation((table: string) =>
        table === 'organizations' ? orgChain : insertChain
      )

      await expect(
        service.import('org-1', [
          { organization_id: 'org-1', first_name: 'A', last_name: 'B', student_number: 'X', status: 'active' } as any,
        ])
      ).rejects.toThrow()
    })

    it('devrait propager handleError pour erreur insert non-23505', async () => {
      const orgChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { code: 'ORG' }, error: null }),
      }
      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '22P02', message: 'invalid input syntax' },
        }),
      }
      ;(mockSupabase as any).from.mockImplementation((table: string) =>
        table === 'organizations' ? orgChain : insertChain
      )

      await expect(
        service.import('org-1', [
          { organization_id: 'org-1', first_name: 'A', last_name: 'B', status: 'active' } as any,
        ])
      ).rejects.toThrow()
    })

    it('devrait propager handleError en catch si fetch organisations rejette', async () => {
      const orgChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('Connection refused')),
      }
      ;(mockSupabase as any).from.mockImplementation((table: string) =>
        table === 'organizations' ? orgChain : (mockSupabase as any)
      )

      await expect(
        service.import('org-1', [
          { organization_id: 'org-1', first_name: 'A', last_name: 'B', status: 'active' } as any,
        ])
      ).rejects.toThrow()
    })
  })
})
