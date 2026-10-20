import { describe, it, expect } from 'vitest'
import { alreadyRanToday, runStatus, parisDay } from '@/lib/services/email-schedule-run'
import { isSchedulableDocumentType, scheduledDocumentFilename } from '@/lib/utils/document-generation/schedulable-document-types'

describe('runStatus', () => {
  it('succès, partiel, échec', () => {
    expect(runStatus(5, 0)).toBe('success')
    expect(runStatus(0, 0)).toBe('success')
    expect(runStatus(1, 1)).toBe('partial') // ancien calcul : 'failed'
    expect(runStatus(0, 3)).toBe('failed')
  })
})

describe('alreadyRanToday (heure de Paris)', () => {
  const now = new Date('2026-10-21T05:10:00Z') // 07:10 à Paris

  it('déjà exécutée ce matin → ignorée', () => {
    expect(alreadyRanToday('2026-10-21T05:00:00Z', 'success', now)).toBe(true)
    expect(alreadyRanToday('2026-10-21T05:00:00Z', 'partial', now)).toBe(true)
  })

  it('exécution entièrement en échec → rejouable', () => {
    expect(alreadyRanToday('2026-10-21T05:00:00Z', 'failed', now)).toBe(false)
  })

  it('veille au soir en UTC mais même jour à Paris', () => {
    // 22:30 UTC le 20 = 00:30 le 21 à Paris
    expect(alreadyRanToday('2026-10-20T22:30:00Z', 'success', now)).toBe(true)
  })

  it('veille → à exécuter, jamais exécutée → à exécuter', () => {
    expect(alreadyRanToday('2026-10-20T05:00:00Z', 'success', now)).toBe(false)
    expect(alreadyRanToday(null, null, now)).toBe(false)
  })

  it('parisDay', () => {
    expect(parisDay(now)).toBe('2026-10-21')
  })
})

describe('documents joignables', () => {
  it('documents nominatifs apprenant acceptés, autres exclus', () => {
    for (const t of ['convocation', 'certificat_realisation', 'attestation_assiduite', 'convention', 'livret_accueil', 'programme']) {
      expect(isSchedulableDocumentType(t)).toBe(true)
    }
    for (const t of ['facture', 'devis', 'emargement', 'convention_formateur', 'ordre_de_mission', 'attestation_defraiement', 'formulaire_inscription', '', null]) {
      expect(isSchedulableDocumentType(t as string | null)).toBe(false)
    }
  })

  it('nom de fichier sans accents ni espaces', () => {
    expect(scheduledDocumentFilename('convocation', { first_name: 'Hélène', last_name: 'Le Gall' })).toBe('convocation_LE_GALL_Helene.pdf')
    expect(scheduledDocumentFilename('attestation_assiduite', { first_name: null, last_name: null })).toBe('attestation_assiduite.pdf')
  })
})
