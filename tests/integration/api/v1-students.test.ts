import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/v1/students/route'
import { createClient } from '@/lib/supabase/server'
import { createStudentService } from '@/lib/services/student.service'
import { createAPIService } from '@/lib/services/api.service'

// Mock services
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/services/student.service', () => ({
  createStudentService: vi.fn(),
}))

vi.mock('@/lib/services/api.service', () => ({
  createAPIService: vi.fn(),
}))

// Mock API middleware
vi.mock('@/app/api/v1/middleware', () => ({
  apiMiddleware: vi.fn().mockResolvedValue({
    key: { id: 'api-key-123' },
    organizationId: 'org-123',
    scopes: ['read:students'],
    rateLimit: {
      remaining: 100,
      resetAt: new Date(Date.now() + 3600000),
    },
  }),
  hasScope: vi.fn((scopes, scope) => scopes.includes(scope)),
}))

describe('API /api/v1/students', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait retourner la liste des étudiants avec pagination', async () => {
    const mockStudents = [
      { id: 'student-1', first_name: 'John', last_name: 'Doe' },
      { id: 'student-2', first_name: 'Jane', last_name: 'Smith' },
    ]

    const mockStudentService = {
      getAll: vi.fn().mockResolvedValue({
        data: mockStudents,
        total: 2,
      }),
    }

    const mockAPIService = {
      logAPIRequest: vi.fn().mockResolvedValue(undefined),
    }

    const mockSupabaseClient = {}

    vi.mocked(createClient).mockResolvedValue(mockSupabaseClient as any)
    vi.mocked(createStudentService).mockReturnValue(mockStudentService as any)
    vi.mocked(createAPIService).mockReturnValue(mockAPIService as any)

    const request = new NextRequest('http://localhost:3000/api/v1/students?page=1&limit=50')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('data')
    expect(data).toHaveProperty('meta')
    expect(data.data).toHaveLength(2)
    expect(data.meta.page).toBe(1)
    expect(data.meta.limit).toBe(50)
    expect(data.meta.total).toBe(2)
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('100')
  })

  it('devrait rejeter si le scope est insuffisant', async () => {
    const { apiMiddleware } = await import('@/app/api/v1/middleware')
    
    vi.mocked(apiMiddleware).mockResolvedValueOnce({
      key: { id: 'api-key-123' },
      organizationId: 'org-123',
      scopes: ['read:invoices'], // Pas read:students
      rateLimit: {
        remaining: 100,
        resetAt: new Date(Date.now() + 3600000),
      },
    })

    const request = new NextRequest('http://localhost:3000/api/v1/students')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Insufficient permissions')
  })

  it('devrait gérer la recherche d\'étudiants', async () => {
    const mockStudents = [
      { id: 'student-1', first_name: 'John', last_name: 'Doe' },
    ]

    const mockStudentService = {
      getAll: vi.fn().mockResolvedValue({
        data: mockStudents,
        total: 1,
      }),
    }

    const mockAPIService = {
      logAPIRequest: vi.fn().mockResolvedValue(undefined),
    }

    const mockSupabaseClient = {}

    vi.mocked(createClient).mockResolvedValue(mockSupabaseClient as any)
    vi.mocked(createStudentService).mockReturnValue(mockStudentService as any)
    vi.mocked(createAPIService).mockReturnValue(mockAPIService as any)

    const request = new NextRequest('http://localhost:3000/api/v1/students?search=John')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockStudentService.getAll).toHaveBeenCalledWith(
      'org-123',
      expect.objectContaining({
        search: 'John',
      })
    )
  })

  it('devrait gérer les erreurs serveur', async () => {
    const mockStudentService = {
      getAll: vi.fn().mockRejectedValue(new Error('Database error')),
    }

    const mockAPIService = {
      logAPIRequest: vi.fn().mockResolvedValue(undefined),
    }

    const mockSupabaseClient = {}

    vi.mocked(createClient).mockResolvedValue(mockSupabaseClient as any)
    vi.mocked(createStudentService).mockReturnValue(mockStudentService as any)
    vi.mocked(createAPIService).mockReturnValue(mockAPIService as any)

    const request = new NextRequest('http://localhost:3000/api/v1/students')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})
