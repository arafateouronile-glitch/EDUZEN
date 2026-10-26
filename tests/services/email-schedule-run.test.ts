import { describe, it, expect } from 'vitest'
import {
  alreadyRanToday,
  isTriggerDay,
  parisDay,
  resolveScheduleScope,
  runStatus,
  shiftDay,
  slotInLaunchWindow,
  studentsWithPendingHotEvaluation,
} from '@/lib/services/email-schedule-run'
import { AUTOMATION_EMAIL_DEFAULTS } from '@/lib/constants/automation-email-defaults'
import { PRESET_AUTOMATIONS, presetDocumentFields } from '@/lib/constants/automation-presets'
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

describe('isTriggerDay (heure de Paris)', () => {
  // 26/10/2026 07:10 UTC = 08:10 à Paris (passage à l'heure d'hiver le 25/10)
  const now = new Date('2026-10-26T07:10:00Z')

  it('J-14 / J-3 avant le début', () => {
    expect(isTriggerDay('before_session_start', { start_date: '2026-11-09' }, 14, now)).toBe(true)
    expect(isTriggerDay('before_session_start', { start_date: '2026-10-29' }, 3, now)).toBe(true)
    expect(isTriggerDay('before_session_start', { start_date: '2026-10-30' }, 3, now)).toBe(false)
  })

  it('J+1 / J+30 après la fin, changement de mois', () => {
    expect(isTriggerDay('after_session_end', { end_date: '2026-10-25' }, 1, now)).toBe(true)
    expect(isTriggerDay('after_session_end', { end_date: '2026-09-26' }, 30, now)).toBe(true)
  })

  it('minuit à Paris compte pour le nouveau jour', () => {
    // 23:30 UTC le 25 = 00:30 le 26 à Paris
    expect(isTriggerDay('before_session_start', { start_date: '2026-10-26' }, 0, new Date('2026-10-25T23:30:00Z'))).toBe(true)
  })

  it('type non daté ou date absente → faux', () => {
    expect(isTriggerDay('after_seance_start', { start_date: '2026-10-26' }, 0, now)).toBe(false)
    expect(isTriggerDay('before_session_start', {}, 0, now)).toBe(false)
  })

  it('shiftDay', () => {
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28')
    expect(shiftDay('2026-12-31T00:00:00', 1)).toBe('2027-01-01')
  })
})

describe('resolveScheduleScope', () => {
  const sessions = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  const rules = [
    { session_id: 'b', email_type: 'rappel_j3' }, // règle propre à la session b
    { session_id: 'c', email_type: 'convocation_j14' }, // autre type
  ]

  it('règle de session : uniquement sa session', () => {
    expect(resolveScheduleScope({ session_id: 'b', email_type: 'rappel_j3' }, sessions, rules)).toEqual([{ id: 'b' }])
  })

  it("règle d'organisme : toutes sauf les sessions qui ont leur propre règle du même type", () => {
    expect(resolveScheduleScope({ session_id: null, email_type: 'rappel_j3' }, sessions, rules)).toEqual([{ id: 'a' }, { id: 'c' }])
  })
})

describe('studentsWithPendingHotEvaluation', () => {
  it('évaluation attribuée et non complétée uniquement', () => {
    const pending = studentsWithPendingHotEvaluation(
      [
        { id: 'g1', student_id: 's1' },
        { id: 'g2', student_id: 's2' },
        { id: 'g3', student_id: 's3' }, // sans questionnaire
      ],
      [
        { grade_id: 'g1', completed_at: null },
        { grade_id: 'g2', completed_at: '2026-10-20T10:00:00Z' },
      ]
    )
    expect([...pending]).toEqual(['s1'])
  })
})

describe('slotInLaunchWindow (heure de Paris)', () => {
  const now = new Date('2026-10-26T08:12:00Z') // 09:12 à Paris

  it('séance commencée il y a 5 à 15 minutes', () => {
    expect(slotInLaunchWindow('09:00:00', now)).toBe(true) // +12 min
    expect(slotInLaunchWindow('09:07', now)).toBe(true) // +5 min
    expect(slotInLaunchWindow('08:57:00', now)).toBe(true) // +15 min
  })

  it('trop tôt, trop tard ou heure absente', () => {
    expect(slotInLaunchWindow('09:10:00', now)).toBe(false) // +2 min
    expect(slotInLaunchWindow('08:50:00', now)).toBe(false) // +22 min
    expect(slotInLaunchWindow(null, now)).toBe(false)
  })
})

describe('automatisations prédéfinies', () => {
  it('chaque automatisation par email a un email intégré', () => {
    for (const preset of PRESET_AUTOMATIONS.filter((p) => p.trigger_type !== 'after_seance_start')) {
      const tpl = AUTOMATION_EMAIL_DEFAULTS[preset.email_type]
      expect(tpl, preset.email_type).toBeDefined()
      expect(tpl.subject.length).toBeGreaterThan(0)
      expect(tpl.body_html).toContain('{organization_name}')
    }
  })

  it('attestation et certificat joignent leur document', () => {
    const byType = Object.fromEntries(PRESET_AUTOMATIONS.map((p) => [p.email_type, presetDocumentFields(p)]))
    expect(byType.attestation_presence).toEqual({ send_document: true, document_type: 'attestation_assiduite' })
    expect(byType.certificat_realisation).toEqual({ send_document: true, document_type: 'certificat_realisation' })
    expect(byType.rappel_j3).toEqual({})
  })
})
