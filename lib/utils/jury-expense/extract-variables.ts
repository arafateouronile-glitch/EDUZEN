/**
 * Variables de l'attestation de défraiement d'un membre du jury
 * (document_templates, type='attestation_defraiement').
 *
 * Réutilise extractDocumentVariables() pour les variables {ecole_*}/{date_*}
 * (organisation), puis ajoute {jury_*}, {examen_*} et {defraiement_*}.
 * Les montants sont formatés sans symbole : le modèle affiche « € ».
 */

import type { TableRow } from '@/lib/types/supabase-helpers'
import type { DocumentVariables } from '@/lib/types/document-templates'
import { extractDocumentVariables } from '@/lib/utils/document-generation/variable-extractor'
import { formatAmount, type JuryExpense } from '@/lib/services/jury-expense.service'

type Organization = TableRow<'organizations'>

export interface DefraiementVariablesOptions {
  organization?: Organization
  juryMember: {
    first_name: string
    last_name: string
    email?: string | null
    qualite?: string | null
    company?: string | null
    address?: string | null
    postal_code?: string | null
    city?: string | null
    iban?: string | null
    bic?: string | null
  }
  session: {
    name?: string | null
    exam_date?: string | null
    location?: string | null
    formation_name?: string | null
    formation_code?: string | null
  }
  expense: Pick<
    JuryExpense,
    'reference' | 'hours' | 'hourly_rate' | 'fees' | 'distance_km' | 'km_rate' | 'transport' | 'meals' | 'lodging' | 'total' | 'notes'
  >
}

function formatFrDate(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

/** Quantité sans zéros inutiles : 7 → « 7 », 7,5 → « 7,5 » */
function formatQuantity(value: number | null | undefined): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(Number(value ?? 0)).replace(/ | /g, ' ')
}

export function extractDefraiementVariables(options: DefraiementVariablesOptions): DocumentVariables {
  const { organization, juryMember, session, expense } = options
  const base = extractDocumentVariables({ organization, language: 'fr' })

  return {
    ...base,
    jury_nom: juryMember.last_name?.toUpperCase() || '',
    jury_prenom: juryMember.first_name || '',
    // À défaut de qualité renseignée, l'entreprise du membre donne le contexte
    jury_qualite: juryMember.qualite || juryMember.company || '',
    jury_email: juryMember.email || '',
    jury_adresse: juryMember.address || '',
    jury_code_postal: juryMember.postal_code || '',
    jury_ville: juryMember.city || '',
    jury_iban: juryMember.iban || '',
    jury_bic: juryMember.bic || '',
    session_nom: session.name || '',
    examen_nom: session.formation_name || session.name || '',
    examen_date: formatFrDate(session.exam_date),
    examen_lieu: session.location || '',
    examen_reference: session.formation_code || session.name || '',
    examen_type: 'Jury d\'examen',
    defraiement_reference: expense.reference || '',
    defraiement_nb_heures: formatQuantity(expense.hours),
    defraiement_taux_vacation: formatAmount(expense.hourly_rate),
    defraiement_vacations: formatAmount(expense.fees),
    defraiement_distance_km: formatQuantity(expense.distance_km),
    defraiement_taux_km: formatQuantity(expense.km_rate),
    defraiement_transport: formatAmount(expense.transport),
    defraiement_repas: formatAmount(expense.meals),
    defraiement_hebergement: formatAmount(expense.lodging),
    defraiement_total: formatAmount(expense.total),
    defraiement_notes: expense.notes || '',
  } as DocumentVariables
}
