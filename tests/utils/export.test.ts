/**
 * Tests pour lib/utils/export.ts (exportData, prepareStudentsExport, prepareDocumentsExport, preparePaymentsExport)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  exportData,
  prepareStudentsExport,
  prepareDocumentsExport,
  preparePaymentsExport,
} from '@/lib/utils/export'

vi.mock('@/lib/services/export-history.service', () => ({
  exportHistoryService: { create: vi.fn().mockResolvedValue(null) },
  ExportHistoryService: vi.fn(),
}))

describe('export utils', () => {
  describe('exportData', () => {
    it('lance une erreur si aucune donnee a exporter', async () => {
      await expect(exportData([])).rejects.toThrow('Aucune donnée à exporter')
      await expect(exportData(null as any)).rejects.toThrow('Aucune donnée à exporter')
    })
  })

  describe('prepareStudentsExport', () => {
    it('devrait mapper les champs étudiants vers les libellés export', () => {
      const students = [
        {
          student_number: 'STU-001',
          first_name: 'Jean',
          last_name: 'Dupont',
          email: 'jean@test.com',
          status: 'active',
          classes: { name: 'Terminale', level: 'L1' },
        },
      ]
      const result = prepareStudentsExport(students)
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        'Numéro': 'STU-001',
        'Prénom': 'Jean',
        'Nom': 'Dupont',
        'Email': 'jean@test.com',
        'Statut': 'Actif',
        'Classe': 'Terminale',
        'Niveau': 'L1',
      })
    })

    it('devrait gérer les valeurs nulles ou manquantes', () => {
      const result = prepareStudentsExport([{}])
      expect(result[0]['Numéro']).toBe('')
      expect(result[0]['Statut']).toBe('Inactif')
    })
  })

  describe('prepareDocumentsExport', () => {
    it('devrait mapper les champs documents et concaténer le nom étudiant', () => {
      const documents = [
        {
          title: 'Attestation',
          type: 'certificate',
          file_url: 'https://example.com/doc.pdf',
          students: { first_name: 'Marie', last_name: 'Martin' },
        },
      ]
      const result = prepareDocumentsExport(documents)
      expect(result[0]).toMatchObject({
        'Titre': 'Attestation',
        'Type': 'certificate',
        'Étudiant': 'Marie Martin',
        'URL': 'https://example.com/doc.pdf',
      })
    })
  })

  describe('preparePaymentsExport', () => {
    it('devrait mapper les champs paiements', () => {
      const payments = [
        {
          id: 'pay-1',
          amount: 500,
          currency: 'EUR',
          status: 'completed',
          payment_method: 'card',
          paid_at: '2025-01-15T10:00:00Z',
        },
      ]
      const result = preparePaymentsExport(payments)
      expect(result[0]).toMatchObject({
        'ID': 'pay-1',
        'Montant': 500,
        'Devise': 'EUR',
        'Statut': 'completed',
        'Méthode': 'card',
      })
    })
  })
})
