/**
 * Tests pour GET /api/learner/contacts
 * Aligné sur docs/openapi-learner.yaml
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/learner/contacts/route'
import { createLearnerSessionToken } from '@/lib/api/learner-auth'

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}))

describe('API GET /api/learner/contacts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SIGNATURE_EVIDENCE_SECRET = 'test-secret-min-16-chars'
  })

  it('devrait retourner 401 sans token', async () => {
    const req = new NextRequest('http://localhost/api/learner/contacts')
    const res = await GET(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toMatch(/Token|Bearer|x-learner/)
  })

  it('devrait retourner 404 si apprenant non trouvé', async () => {
    const token = createLearnerSessionToken('student-1')
    const studentChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    }
    mockFrom.mockReturnValue(studentChain)

    const req = new NextRequest('http://localhost/api/learner/contacts', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const res = await GET(req)
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toMatch(/Apprenant|trouvé/i)
  })

  it('devrait retourner 404 si organisation_id manquant', async () => {
    const token = createLearnerSessionToken('student-1')
    const studentChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'student-1', organization_id: null }, error: null }),
    }
    mockFrom.mockReturnValue(studentChain)

    const req = new NextRequest('http://localhost/api/learner/contacts', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const res = await GET(req)
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toMatch(/Organisation|introuvable/i)
  })

  it('devrait retourner 200 avec liste de contacts', async () => {
    const token = createLearnerSessionToken('student-1')
    const studentChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'student-1', organization_id: 'org-1' },
        error: null,
      }),
    }
    const usersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { id: 'u1', full_name: 'Jean Admin', email: 'jean@org.com', role: 'admin' },
          { id: 'u2', full_name: null, email: 'formateur@org.com', role: 'teacher' },
        ],
        error: null,
      }),
    }
    mockFrom.mockImplementation((table: string) => {
      if (table === 'students') return studentChain
      if (table === 'users') return usersChain
      return {}
    })

    const req = new NextRequest('http://localhost/api/learner/contacts', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.contacts).toHaveLength(2)
    expect(data.contacts[0]).toMatchObject({ id: 'u1', full_name: 'Jean Admin', role: 'admin' })
    expect(data.contacts[1].full_name).toBe('formateur@org.com')
  })

  it('devrait retourner 500 si récupération users échoue', async () => {
    const token = createLearnerSessionToken('student-1')
    const studentChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'student-1', organization_id: 'org-1' },
        error: null,
      }),
    }
    const usersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    }
    mockFrom.mockImplementation((table: string) => (table === 'students' ? studentChain : usersChain))

    const req = new NextRequest('http://localhost/api/learner/contacts', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const res = await GET(req)
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toMatch(/contacts|récupération/i)
  })
})
