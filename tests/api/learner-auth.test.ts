/**
 * Tests pour l'authentification des routes API espace apprenant (token session).
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'
import { createLearnerSessionToken, getStudentIdFromLearnerRequest } from '@/lib/api/learner-auth'

const TEST_SECRET = 'test-secret-for-learner-session'

beforeAll(() => {
  process.env.SIGNATURE_EVIDENCE_SECRET = TEST_SECRET
})

describe('learner-auth', () => {

  describe('createLearnerSessionToken', () => {
    it('devrait générer un token non vide', () => {
      const studentId = '550e8400-e29b-41d4-a716-446655440000'
      const token = createLearnerSessionToken(studentId)
      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      expect(token.startsWith('eduzen_learner_')).toBe(true)
      expect(token.split('_').length).toBeGreaterThanOrEqual(4)
    })

    it('devrait produire des tokens différents à des timestamps différents', async () => {
      const studentId = '550e8400-e29b-41d4-a716-446655440000'
      const t1 = createLearnerSessionToken(studentId)
      await new Promise((r) => setTimeout(r, 1100))
      const t2 = createLearnerSessionToken(studentId)
      expect(t1).not.toBe(t2)
    })
  })

  describe('verifySessionToken (via getStudentIdFromLearnerRequest)', () => {
    it('devrait accepter un token de session valide et retourner le student_id', async () => {
      const studentId = '550e8400-e29b-41d4-a716-446655440000'
      const token = createLearnerSessionToken(studentId)
      const req = new NextRequest('http://localhost/api/learner/contacts', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await getStudentIdFromLearnerRequest(req)
      expect(result).not.toBeNull()
      expect(result!.studentId).toBe(studentId)
    })

    it('devrait accepter le token via x-learner-access-token', async () => {
      const studentId = '550e8400-e29b-41d4-a716-446655440000'
      const token = createLearnerSessionToken(studentId)
      const req = new NextRequest('http://localhost/api/learner/contacts', {
        headers: { 'x-learner-access-token': token },
      })
      const result = await getStudentIdFromLearnerRequest(req)
      expect(result).not.toBeNull()
      expect(result!.studentId).toBe(studentId)
    })

    it('devrait rejeter une requête sans token', async () => {
      const req = new NextRequest('http://localhost/api/learner/contacts')
      const result = await getStudentIdFromLearnerRequest(req)
      expect(result).toBeNull()
    })

    it('devrait rejeter un token de session invalide (format)', async () => {
      const req = new NextRequest('http://localhost/api/learner/contacts', {
        headers: { Authorization: 'Bearer invalid_token_format' },
      })
      const result = await getStudentIdFromLearnerRequest(req)
      expect(result).toBeNull()
    })

    it('devrait rejeter un token de session avec mauvaise signature', async () => {
      const studentId = '550e8400-e29b-41d4-a716-446655440000'
      const token = createLearnerSessionToken(studentId)
      const tampered = token.slice(0, -4) + '0000'
      const req = new NextRequest('http://localhost/api/learner/contacts', {
        headers: { Authorization: `Bearer ${tampered}` },
      })
      const result = await getStudentIdFromLearnerRequest(req)
      expect(result).toBeNull()
    })

    it('devrait rejeter un token expiré', async () => {
      const studentId = '550e8400-e29b-41d4-a716-446655440000'
      const oldTimestamp = Math.floor(Date.now() / 1000) - 60 * 60 * 25
      const payload = `eduzen_learner_${oldTimestamp}_${studentId}`
      const crypto = await import('crypto')
      const hmac = crypto.createHmac('sha256', process.env.SIGNATURE_EVIDENCE_SECRET || TEST_SECRET)
      hmac.update(payload)
      const mac = hmac.digest('hex')
      const expiredToken = `${payload}_${mac}`
      const req = new NextRequest('http://localhost/api/learner/contacts', {
        headers: { Authorization: `Bearer ${expiredToken}` },
      })
      const result = await getStudentIdFromLearnerRequest(req)
      expect(result).toBeNull()
    })
  })
})
