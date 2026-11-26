import { describe, it, expect } from 'vitest'
import { computeQualiopiScore, scoreVerdict } from '@/lib/outils/qualiopi-score'
import { outilRequestSchema, parseLearners } from '@/lib/outils/schemas'
import { nurtureSendDate, isNurtureActive, NURTURE_STEPS } from '@/lib/outils/nurture-schedule'
import { buildToolVariables, frDate } from '@/lib/outils/generate'
import { buildLeadNurtureEmail, buildLeadDeliveryEmail } from '@/lib/emails/lead-nurture-emails'
import { QUALIOPI_REFERENTIAL } from '@/lib/constants/qualiopi-referential'
import type { QualiopiAnswer } from '@/lib/outils/tools'

const allIndicators = QUALIOPI_REFERENTIAL.flatMap((c) => c.indicators.map((i) => i.number))
const answerAll = (a: QualiopiAnswer) => Object.fromEntries(allIndicators.map((n) => [n, a]))

describe('computeQualiopiScore', () => {
  it('100 % si tout est conforme, 0 % si rien ne l’est', () => {
    expect(computeQualiopiScore(answerAll('oui')).score).toBe(100)
    expect(computeQualiopiScore(answerAll('non')).score).toBe(0)
    expect(computeQualiopiScore(answerAll('partiel')).score).toBe(50)
  })

  it('exclut les indicateurs non concernés', () => {
    const answers = { ...answerAll('oui'), 1: 'na' as const, 2: 'non' as const }
    const result = computeQualiopiScore(answers)
    expect(result.score).toBe(Math.round((30 / 31) * 100))
    expect(result.criteria[0].applicable).toBe(2)
    expect(result.toImprove.map((i) => i.number)).toEqual([2])
  })

  it('critère sans indicateur applicable : score null', () => {
    const answers = { ...answerAll('oui'), 1: 'na' as const, 2: 'na' as const, 3: 'na' as const }
    expect(computeQualiopiScore(answers).criteria[0].score).toBeNull()
    expect(scoreVerdict(null)).toMatch(/Aucun/)
  })

  it('liste les « Non » avant les « En partie »', () => {
    const answers = { ...answerAll('oui'), 5: 'partiel' as const, 20: 'non' as const }
    expect(computeQualiopiScore(answers).toImprove.map((i) => i.number)).toEqual([20, 5])
  })
})

const base = {
  organisme: { nom: 'OF Test', ville: 'Paris' },
  lead: { first_name: 'Marie', last_name: 'Dupont', email: 'Marie@Exemple.FR' },
}

describe('outilRequestSchema', () => {
  const certificat = { eleve_nom: 'DUPONT', eleve_prenom: 'Marie', formation_nom: 'SSIAP 1', formation_duree: '67 h', session_debut: '2026-11-02', session_fin: '2026-11-13' }

  it('accepte un certificat valide et met l’email en minuscules', () => {
    const r = outilRequestSchema('certificat').safeParse({ ...base, fields: certificat })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.lead.email).toBe('marie@exemple.fr')
  })

  it('refuse un logo qui n’est pas une data: URL', () => {
    const r = outilRequestSchema('certificat').safeParse({ ...base, organisme: { ...base.organisme, logo: 'https://evil.test/logo.png' }, fields: certificat })
    expect(r.success).toBe(false)
  })

  it('refuse une date de fin avant la date de début', () => {
    const r = outilRequestSchema('certificat').safeParse({ ...base, fields: { ...certificat, session_fin: '2026-11-01' } })
    expect(r.success).toBe(false)
  })

  it('refuse un email invalide', () => {
    const r = outilRequestSchema('reglement').safeParse({ ...base, lead: { ...base.lead, email: 'pas-un-email' }, fields: {} })
    expect(r.success).toBe(false)
  })
})

describe('parseLearners', () => {
  it('lit « NOM Prénom ; Entreprise » ligne par ligne', () => {
    expect(parseLearners('DUPONT Marie ; ACME\n\nMARTIN Jean Paul')).toEqual([
      { last_name: 'DUPONT', first_name: 'Marie', company: 'ACME' },
      { last_name: 'MARTIN', first_name: 'Jean Paul', company: null },
    ])
  })
})

describe('buildToolVariables', () => {
  it('remplit le certificat avec des dates françaises', () => {
    const r = outilRequestSchema('certificat').parse({ ...base, fields: { eleve_nom: 'DUPONT', eleve_prenom: 'Marie', entreprise_nom: 'ACME', formation_nom: 'SSIAP 1', formation_duree: '67 h', session_debut: '2026-11-02', session_fin: '2026-11-13' } })
    const v = buildToolVariables('certificat', r) as Record<string, string>
    expect(v).toMatchObject({ ecole_nom: 'OF Test', ecole_ville: 'Paris', entreprise_nom: 'ACME', session_debut: '02/11/2026', session_fin: '13/11/2026' })
    expect(frDate('2027-03-15')).toBe('15/03/2027')
  })
})

describe('séquence marketing', () => {
  it('planifie J+2, J+5, J+9, J+14, J+21 puis s’arrête', () => {
    const created = new Date('2026-11-01T10:00:00Z')
    const days = Array.from({ length: NURTURE_STEPS }, (_, s) => (nurtureSendDate(created, s)!.getTime() - created.getTime()) / 86_400_000)
    expect(days).toEqual([2, 5, 9, 14, 21])
    expect(nurtureSendDate(created, NURTURE_STEPS)).toBeNull()
  })

  it('arrête la séquence d’un lead désabonné, en rebond ou converti', () => {
    const lead = { nurture_step: 1, unsubscribed_at: null, bounced_at: null, converted_at: null }
    expect(isNurtureActive(lead)).toBe(true)
    expect(isNurtureActive({ ...lead, unsubscribed_at: 'x' })).toBe(false)
    expect(isNurtureActive({ ...lead, converted_at: 'x' })).toBe(false)
    expect(isNurtureActive({ ...lead, nurture_step: NURTURE_STEPS })).toBe(false)
  })

  it('chaque email contient le lien de désabonnement', () => {
    for (let step = 0; step < NURTURE_STEPS; step++) {
      const email = buildLeadNurtureEmail(step, { prenom: 'Marie', firstTool: 'certificat', hasQualiopiScore: false, unsubscribeUrl: 'https://x/desabonnement?t=abc' })
      expect(email?.html).toContain('https://x/desabonnement?t=abc')
    }
    expect(buildLeadNurtureEmail(NURTURE_STEPS, { prenom: null, firstTool: 'convention', hasQualiopiScore: false, unsubscribeUrl: 'u' })).toBeNull()
    expect(buildLeadDeliveryEmail({ prenom: '<b>', tool: 'qualiopi', unsubscribeUrl: 'u', qualiopiScore: 72 }).html).toContain('&lt;b&gt;')
  })
})
