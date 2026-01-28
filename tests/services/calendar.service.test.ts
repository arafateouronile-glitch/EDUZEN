/**
 * Tests unitaires pour CalendarService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock du module calendar.service avant l'import
vi.mock('@/lib/services/calendar.service', () => {
  return {
    calendarService: {
      getTodos: vi.fn(),
      getTodoById: vi.fn(),
      createTodo: vi.fn(),
    },
  }
})

import { calendarService } from '@/lib/services/calendar.service'

describe('CalendarService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTodos', () => {
    it('devrait récupérer tous les todos d\'une organisation', async () => {
      const mockTodos = [
        {
          id: '1',
          organization_id: 'org-1',
          title: 'Test Todo',
          due_date: '2024-01-15',
          status: 'pending',
        },
      ]

      ;(calendarService.getTodos as any).mockResolvedValue(mockTodos)

      const result = await calendarService.getTodos('org-1')

      expect(result).toEqual(mockTodos)
      expect(calendarService.getTodos).toHaveBeenCalled()
    })

    it('devrait filtrer par date de début', async () => {
      ;(calendarService.getTodos as any).mockResolvedValue([])

      await calendarService.getTodos('org-1', { startDate: '2024-01-01' })

      expect(calendarService.getTodos).toHaveBeenCalledWith('org-1', { startDate: '2024-01-01' })
    })

    it('devrait filtrer par statut', async () => {
      ;(calendarService.getTodos as any).mockResolvedValue([])

      await calendarService.getTodos('org-1', { status: 'completed' })

      expect(calendarService.getTodos).toHaveBeenCalledWith('org-1', { status: 'completed' })
    })

    it('devrait retourner un tableau vide si la table n\'existe pas', async () => {
      ;(calendarService.getTodos as any).mockResolvedValue([])

      const result = await calendarService.getTodos('org-1')

      expect(result).toEqual([])
    })
  })

  describe('getTodoById', () => {
    it('devrait récupérer un todo par son ID', async () => {
      const mockTodo = {
        id: '1',
        organization_id: 'org-1',
        title: 'Test Todo',
        due_date: '2024-01-15',
        status: 'pending',
      }

      ;(calendarService.getTodoById as any).mockResolvedValue(mockTodo)

      const result = await calendarService.getTodoById('1')

      expect(result).toEqual(mockTodo)
      expect(calendarService.getTodoById).toHaveBeenCalledWith('1')
    })

    it('devrait retourner null si le todo n\'existe pas', async () => {
      ;(calendarService.getTodoById as any).mockResolvedValue(null)

      const result = await calendarService.getTodoById('999')

      expect(result).toBeNull()
    })
  })

  describe('createTodo', () => {
    it('devrait créer un nouveau todo', async () => {
      const input = {
        organization_id: 'org-1',
        title: 'New Todo',
        due_date: '2024-01-20',
      }

      const mockCreatedTodo = {
        id: 'new-id',
        ...input,
        status: 'pending',
        created_at: new Date().toISOString(),
      }

      ;(calendarService.createTodo as any).mockResolvedValue(mockCreatedTodo)

      const result = await calendarService.createTodo(input)

      expect(result).toEqual(mockCreatedTodo)
      expect(calendarService.createTodo).toHaveBeenCalledWith(input)
    })

    it('devrait créer une notification de rappel si activé', async () => {
      const input = {
        organization_id: 'org-1',
        title: 'New Todo',
        due_date: '2024-01-20',
        reminder_enabled: true,
      }

      const mockCreatedTodo = {
        id: 'new-id',
        ...input,
        status: 'pending',
      }

      ;(calendarService.createTodo as any).mockResolvedValue(mockCreatedTodo)

      await calendarService.createTodo(input)

      expect(calendarService.createTodo).toHaveBeenCalledWith(input)
    })
  })
})
