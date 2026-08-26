/**
 * Extrait les variables pour la génération d'une convention de prestation
 * formateur à partir d'un modèle (document_templates, type='convention_formateur').
 *
 * Réutilise extractDocumentVariables() pour les variables {ecole_*}/{date_*}
 * (organisation) — student est volontairement omis, cette fonction n'a pas
 * de rapport avec un apprenant — puis ajoute les variables {formateur_*} et
 * {convention_*} attendues par ce modèle.
 */

import type { TableRow } from '@/lib/types/supabase-helpers'
import type { DocumentVariables } from '@/lib/types/document-templates'
import { extractDocumentVariables } from '@/lib/utils/document-generation/variable-extractor'

type Organization = TableRow<'organizations'>

export interface TeacherConventionVariablesOptions {
  organization?: Organization
  teacherUser: {
    first_name?: string | null
    last_name?: string | null
    full_name?: string | null
    email?: string | null
    phone?: string | null
  }
  /** Ligne teachers (statut/siret/specialization) — peut être absente si le formateur n'a pas encore de fiche complète */
  teacherProfile?: {
    statut?: string | null
    siret?: string | null
    specialization?: string | null
  } | null
  convention: {
    period_start?: string | null
    period_end?: string | null
    intervention_days?: number | null
    daily_rate?: number | null
    location?: string | null
    custom_notes?: string | null
  }
}

function formatFrDate(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR')
}

export function extractTeacherConventionVariables(
  options: TeacherConventionVariablesOptions
): DocumentVariables {
  const { organization, teacherUser, teacherProfile, convention } = options

  const base = extractDocumentVariables({ organization, language: 'fr' })

  const [autoLastName, ...autoFirstNameParts] = (teacherUser.full_name || '').trim().split(/\s+/)
  const lastName = teacherUser.last_name || (teacherUser.full_name ? autoLastName : '') || ''
  const firstName = teacherUser.first_name || (teacherUser.full_name ? autoFirstNameParts.join(' ') : '') || ''

  const statutLabel =
    teacherProfile?.statut === 'independant' ? 'Indépendant' :
    teacherProfile?.statut === 'salarie' ? 'Salarié' : ''

  const montantTotal =
    convention.intervention_days != null && convention.daily_rate != null
      ? (convention.intervention_days * convention.daily_rate).toFixed(2)
      : ''

  return {
    ...base,
    formateur_nom: lastName,
    formateur_prenom: firstName,
    formateur_email: teacherUser.email || '',
    formateur_telephone: teacherUser.phone || '',
    formateur_specialite: teacherProfile?.specialization || '',
    formateur_statut: statutLabel,
    formateur_siret: teacherProfile?.siret || '',
    // Non collectées aujourd'hui dans le formulaire "Intervenants" — laissées
    // vides plutôt qu'inventées (le modèle affichera juste un champ blanc).
    formateur_adresse: '',
    formateur_code_postal: '',
    formateur_ville: '',
    convention_date_debut: formatFrDate(convention.period_start),
    convention_date_fin: formatFrDate(convention.period_end),
    convention_lieu_formation: convention.location || '',
    convention_montant_total: montantTotal,
    convention_notes: convention.custom_notes || '',
    // Non collectées aujourd'hui (le formulaire ne saisit qu'un tarif
    // journalier, pas horaire, ni les modalités de paiement).
    convention_heures_total: '',
    convention_tarif_horaire: '',
    convention_modalites_paiement: '',
  } as DocumentVariables
}
