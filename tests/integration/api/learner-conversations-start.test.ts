/**
 * Tests pour POST /api/learner/conversations/start
 * Aligné sur docs/openapi-learner.yaml
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/learner/conversations/start/route'
import { createLearnerSessionToken } from '@/lib/api/learner-auth'

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}))

describe('API POST /api/learner/conversations/start', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SIGNATURE_EVIDENCE_SECRET = 'test-secret-min-16-chars'
  })

  it('devrait retourner 401 sans token', async () => {
    const req = new NextRequest('http://localhost/api/learner/conversations/start', {
      method: 'POST',
      body: JSON.stringify({ recipientUserId: 'user-1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toMatch(/Token|Bearer|x-learner/)
  })

  it('devrait retourner 400 si body JSON invalide', async () => {
    const token = createLearnerSessionToken('student-1')
    const req = new NextRequest('http://localhost/api/learner/conversations/start', {
      method: 'POST',
      body: 'not json',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/JSON|invalide/i)
  })

  it('devrait retourner 400 si recipientUserId manquant', async () => {
    const token = createLearnerSessionToken('student-1')
    const req = new NextRequest('http://localhost/api/learner/conversations/start', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/recipientUserId|requis/i)
  })

  it('devrait retourner 404 si apprenant non trouvé', async () => {
    const token = createLearnerSessionToken('student-1')
    const studentChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    }
    mockFrom.mockReturnValue(studentChain)

    const req = new NextRequest('http://localhost/api/learner/conversations/start', {
      method: 'POST',
      body: JSON.stringify({ recipientUserId: 'user-1' }),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toMatch(/Apprenant|trouvé/i)
  })

  it('devrait retourner 404 si destinataire non trouvé', async () => {
    const token = createLearnerSessionToken('student-1')
    const studentChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'student-1', organization_id: 'org-1' },
        error: null,
      }),
    }
    const recipientChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    }
    mockFrom.mockImplementation((table: string) => {
      if (table === 'students') return studentChain
      if (table === 'users') return recipientChain
      return {}
    })

    const req = new NextRequest('http://localhost/api/learner/conversations/start', {
      method: 'POST',
      body: JSON.stringify({ recipientUserId: 'user-1' }),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toMatch(/Destinataire|trouvé/i)
  })

  it('devrait retourner 403 si le contact ne peut pas recevoir de messages (rôle non autorisé)', async () => {
    const token = createLearnerSessionToken('student-1')
    const studentChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'student-1', organization_id: 'org-1' },
        error: null,
      }),
    }
    const recipientChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'user-1', organization_id: 'org-1', role: 'viewer' },
        error: null,
      }),
    }
    mockFrom.mockImplementation((table: string) => (table === 'students' ? studentChain : recipientChain))

    const req = new NextRequest('http://localhost/api/learner/conversations/start', {
      method: 'POST',
      body: JSON.stringify({ recipientUserId: 'user-1' }),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toMatch(/contact|messages/i)
  })

  it('devrait retourner 403 si destinataire autre organisation', async () => {
    const token = createLearnerSessionToken('student-1')
    const studentChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'student-1', organization_id: 'org-1' },
        error: null,
      }),
    }
    const recipientChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'user-1', organization_id: 'org-2', role: 'teacher' },
        error: null,
      }),
    }
    mockFrom.mockImplementation((table: string) => (table === 'students' ? studentChain : recipientChain))

    const req = new NextRequest('http://localhost/api/learner/conversations/start', {
      method: 'POST',
      body: JSON.stringify({ recipientUserId: 'user-1' }),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toMatch(/organisation|autre/i)
  })

  it('devrait retourner 200 avec conversationId et existing: false pour nouvelle conversation', async () => {
    const token = createLearnerSessionToken('student-1')
    const studentChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'student-1', organization_id: 'org-1' },
        error: null,
      }),
    }
    const recipientChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'user-1', organization_id: 'org-1', role: 'teacher' },
        error: null,
      }),
    }
    const convSelectChain: { select: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn> } = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn(),
    }
    convSelectChain.eq.mockReturnValueOnce(convSelectChain).mockResolvedValueOnce({ data: [], error: null })
    const insertConvChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'conv-new-1' }, error: null }),
    }
    const insertPartChain = { insert: vi.fn().mockResolvedValue({ error: null }) }
    const insertMsgChain = { insert: vi.fn().mockResolvedValue({ error: null }) }
    const updateConvChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }

    mockFrom
      .mockReturnValueOnce(studentChain)
      .mockReturnValueOnce(recipientChain)
      .mockReturnValueOnce(convSelectChain)
      .mockReturnValueOnce(insertConvChain)
      .mockReturnValueOnce(insertPartChain)
      .mockReturnValueOnce(insertPartChain)
      .mockReturnValueOnce(insertMsgChain)
      .mockReturnValueOnce(updateConvChain)

    const req = new NextRequest('http://localhost/api/learner/conversations/start', {
      method: 'POST',
      body: JSON.stringify({ recipientUserId: 'user-1', firstMessage: 'Bonjour' }),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.conversationId).toBe('conv-new-1')
    expect(data.existing).toBe(false)
  })

  it('devrait retourner 200 avec existing: true si conversation directe déjà existante', async () => {
    const token = createLearnerSessionToken('student-1')
    const studentChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'student-1', organization_id: 'org-1' },
        error: null,
      }),
    }
    const recipientChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'user-1', organization_id: 'org-1', role: 'teacher' },
        error: null,
      }),
    }
    const convSelectChain: { select: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn> } = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn(),
    }
    convSelectChain.eq.mockReturnValueOnce(convSelectChain).mockResolvedValueOnce({
      data: [{ id: 'conv-existing-1' }],
      error: null,
    })
    const studentPartsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [{ conversation_id: 'conv-existing-1' }], error: null }),
    }
    const recipientPartChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { conversation_id: 'conv-existing-1' },
        error: null,
      }),
    }

    mockFrom
      .mockReturnValueOnce(studentChain)
      .mockReturnValueOnce(recipientChain)
      .mockReturnValueOnce(convSelectChain)
      .mockReturnValueOnce(studentPartsChain)
      .mockReturnValueOnce(recipientPartChain)

    const req = new NextRequest('http://localhost/api/learner/conversations/start', {
      method: 'POST',
      body: JSON.stringify({ recipientUserId: 'user-1' }),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.conversationId).toBe('conv-existing-1')
    expect(data.existing).toBe(true)
  })
})
