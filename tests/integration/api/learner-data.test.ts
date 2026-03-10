/**
 * Tests pour GET /api/learner/data
 * Aligné sur docs/openapi-learner.yaml (paramètres type, access_token)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/learner/data/route'

const mockRpc = vi.fn()
const mockFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
  })),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
  })),
}))

function studentChain(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  }
}

describe('API GET /api/learner/data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  })

  it('devrait retourner 400 si type manquant (avec access_token)', async () => {
    mockRpc.mockResolvedValue({
      data: [{ is_valid: true, student_id: 'student-1' }],
      error: null,
    })
    const req = new NextRequest('http://localhost/api/learner/data?access_token=valid')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/type|supporté/i)
  })

  it('accepte le token via header Authorization Bearer (préféré au query)', async () => {
    mockRpc.mockResolvedValue({
      data: [{ is_valid: true, student_id: 'student-1' }],
      error: null,
    })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'student-1', first_name: 'Test' }, error: null }),
    })
    const req = new NextRequest('http://localhost/api/learner/data?type=student', {
      headers: { Authorization: 'Bearer valid-token' },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(mockRpc).toHaveBeenCalledWith('validate_learner_access_token', { p_token: 'valid-token' })
  })

  it('devrait retourner 400 si type non supporté', async () => {
    mockRpc.mockResolvedValue({
      data: [{ is_valid: true, student_id: 'student-1' }],
      error: null,
    })
    const req = new NextRequest('http://localhost/api/learner/data?type=invalid&access_token=valid')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/supporté/i)
  })

  it('devrait retourner 500 si SUPABASE_SERVICE_ROLE_KEY absent (avec access_token)', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const req = new NextRequest('http://localhost/api/learner/data?type=student&access_token=valid')
    const res = await GET(req)
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toMatch(/Configuration|manquante/i)
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  })

  it('devrait retourner 401 si access_token invalide', async () => {
    mockRpc.mockResolvedValue({
      data: [{ is_valid: false }],
      error: null,
    })
    const req = new NextRequest('http://localhost/api/learner/data?type=student&access_token=invalid')
    const res = await GET(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toMatch(/invalide|expiré/i)
  })

  it('devrait retourner 401 si RPC token retourne une erreur', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } })
    const req = new NextRequest('http://localhost/api/learner/data?type=student&access_token=any')
    const res = await GET(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBeDefined()
  })

  it('devrait retourner 200 avec data pour type=student et token valide', async () => {
    mockRpc.mockResolvedValue({
      data: [{ is_valid: true, student_id: 'student-1' }],
      error: null,
    })
    const studentData = { id: 'student-1', first_name: 'Jean', last_name: 'Dupont', email: 'jean@test.com' }
    mockFrom.mockReturnValue(studentChain(studentData, null))

    const req = new NextRequest('http://localhost/api/learner/data?type=student&access_token=valid')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data).toEqual(studentData)
    expect(mockFrom).toHaveBeenCalledWith('students')
  })

  it('devrait retourner 500 si récupération student échoue', async () => {
    mockRpc.mockResolvedValue({
      data: [{ is_valid: true, student_id: 'student-1' }],
      error: null,
    })
    mockFrom.mockReturnValue(studentChain(null, { message: 'DB error' }))

    const req = new NextRequest('http://localhost/api/learner/data?type=student&access_token=valid')
    const res = await GET(req)
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toMatch(/récupération|données/i)
  })

  it('devrait retourner 401 sans access_token (auth normale non implémentée)', async () => {
    const req = new NextRequest('http://localhost/api/learner/data?type=student')
    const res = await GET(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toMatch(/authentifié/i)
  })
})
