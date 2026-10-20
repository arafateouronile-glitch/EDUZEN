import { describe, it, expect } from 'vitest'
import { computeExpense, formatAmount, juryMemberFullName } from '@/lib/services/jury-expense.service'
import { extractDefraiementVariables } from '@/lib/utils/jury-expense/extract-variables'

describe('computeExpense', () => {
  it('vacations + km × taux + autres transports + repas + hébergement', () => {
    // Même jeu de données que le test SQL des colonnes générées
    expect(
      computeExpense({ hours: 7, hourly_rate: 45, distance_km: 120, km_rate: 0.603, other_transport: 12.5, meals: 25, lodging: 89 })
    ).toEqual({ fees: 315, transport: 84.86, total: 513.86 })
  })

  it('accepte les saisies du formulaire (virgule, vide, négatif ignoré)', () => {
    expect(computeExpense({ hours: '3,5', hourly_rate: '40', distance_km: '', meals: '-10' })).toEqual({ fees: 140, transport: 0, total: 140 })
  })

  it('tout à zéro par défaut', () => {
    expect(computeExpense({})).toEqual({ fees: 0, transport: 0, total: 0 })
  })
})

describe('formatAmount / juryMemberFullName', () => {
  it('format français à 2 décimales, espace normale', () => {
    expect(formatAmount(1234.5)).toBe('1 234,50')
    expect(formatAmount(null)).toBe('0,00')
  })

  it('Prénom NOM', () => {
    expect(juryMemberFullName({ first_name: 'Marie', last_name: 'Dupont' })).toBe('Marie DUPONT')
    expect(juryMemberFullName(null)).toBe('Membre du jury')
  })
})

describe('extractDefraiementVariables', () => {
  const base = {
    juryMember: { first_name: 'Marie', last_name: 'Dupont', email: 'm.dupont@x.fr', company: 'Ministère du Travail', iban: 'FR7612345', bic: 'AGRIFRPP' },
    session: { name: 'TFP APS déc. 2025', exam_date: '2026-01-21T08:00:00.000Z', location: 'Paris', formation_name: 'TFP Agent de Prévention et de Sécurité' },
    expense: {
      reference: 'DEF-2026-0007',
      hours: 7,
      hourly_rate: 45,
      fees: 315,
      distance_km: 120,
      km_rate: 0.603,
      transport: 84.86,
      meals: 25,
      lodging: 89,
      total: 513.86,
      notes: null,
    },
  }

  it('remplit les variables jury, examen et défraiement', () => {
    const v = extractDefraiementVariables(base)
    expect(v).toMatchObject({
      jury_nom: 'DUPONT',
      jury_prenom: 'Marie',
      jury_email: 'm.dupont@x.fr',
      jury_qualite: 'Ministère du Travail', // repli sur l'entreprise
      jury_iban: 'FR7612345',
      examen_nom: 'TFP Agent de Prévention et de Sécurité',
      examen_date: '21 janvier 2026',
      examen_lieu: 'Paris',
      defraiement_reference: 'DEF-2026-0007',
      defraiement_nb_heures: '7',
      defraiement_taux_vacation: '45,00',
      defraiement_vacations: '315,00',
      defraiement_distance_km: '120',
      defraiement_taux_km: '0,603',
      defraiement_transport: '84,86',
      defraiement_repas: '25,00',
      defraiement_hebergement: '89,00',
      defraiement_total: '513,86',
      defraiement_notes: '',
    })
  })

  it('qualité renseignée prioritaire, champs absents vides', () => {
    const v = extractDefraiementVariables({ ...base, juryMember: { first_name: 'Paul', last_name: 'Martin', qualite: 'Formateur expert' } })
    expect(v).toMatchObject({ jury_qualite: 'Formateur expert', jury_adresse: '', jury_iban: '', jury_email: '' })
  })
})
