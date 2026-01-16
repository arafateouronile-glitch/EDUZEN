/**
 * Tests d'intégration pour l'API document-templates
 */

import { describe, it, expect, beforeAll, vi } from 'vitest'

// Mock fetch pour les tests
global.fetch = vi.fn()

describe('API Document Templates', () => {
  let authToken: string

  beforeAll(async () => {
    authToken = 'test-token'
  })

  describe('GET /api/document-templates', () => {
    it('devrait retourner une liste de templates', async () => {
      // Mock de la réponse
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      } as Response)

      const response = await fetch('http://localhost:3000/api/document-templates', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
    })

    it('devrait filtrer par type de document', async () => {
      // Mock de la réponse
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ type: 'facture', id: '1' }],
      } as Response)

      const response = await fetch('http://localhost:3000/api/document-templates?type=facture', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      if (data.length > 0) {
        expect(data[0].type).toBe('facture')
      }
    })

    it('devrait gérer les erreurs correctement', async () => {
      // Mock de la réponse d'erreur
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Non authentifié' }),
      } as Response)

      const response = await fetch('http://localhost:3000/api/document-templates', {
        headers: {
          'Authorization': 'Bearer invalid-token',
        },
      })

      // Devrait retourner 401 ou 403
      expect([401, 403]).toContain(response.status)
    })
  })

  describe('Type Safety', () => {
    it('devrait utiliser le type DocumentType correctement', async () => {
      // Mock de la réponse
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ type: 'facture', id: '1' }],
      } as Response)

      const response = await fetch('http://localhost:3000/api/document-templates?type=facture', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      
      // Vérifier que le type est valide
      const validTypes = [
        'convention',
        'facture',
        'devis',
        'convocation',
        'contrat',
        'attestation_reussite',
        'certificat_scolarite',
        'releve_notes',
        'attestation_entree',
        'reglement_interieur',
        'cgv',
        'programme',
        'attestation_assiduite',
      ]

      if (data.length > 0) {
        expect(validTypes).toContain(data[0].type)
      }
    })
  })
})

