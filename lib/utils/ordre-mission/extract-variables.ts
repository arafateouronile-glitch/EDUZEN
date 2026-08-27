/**
 * Extrait les variables pour la génération d'un ordre de mission formateur à
 * partir d'un modèle (document_templates, type='ordre_de_mission').
 *
 * Réutilise extractDocumentVariables() pour les variables {ecole_*}/{date_*}
 * (organisation), puis ajoute les variables {formateur_*} (identité du
 * missionnaire) et {mission_*} (objet, lieu, dates) attendues par ce modèle.
 *
 * Les frais de mission (indemnités km, repas, hébergement, avance) ne sont
 * pas encore collectés ailleurs dans l'app — laissés vides plutôt qu'inventés,
 * le modèle affichera juste un champ blanc à compléter manuellement.
 */

import type { TableRow } from '@/lib/types/supabase-helpers'
import type { DocumentVariables } from '@/lib/types/document-templates'
import { extractDocumentVariables } from '@/lib/utils/document-generation/variable-extractor'

type Organization = TableRow<'organizations'>

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  secretary: 'Secrétaire',
  super_admin: 'Administrateur',
}

export interface OrdreMissionVariablesOptions {
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
  mission: {
    session_name?: string | null
    session_ref?: string | null
    period_start?: string | null
    period_end?: string | null
    location?: string | null
    intervention_days?: number | null
  }
  /** Utilisateur générant le document, utilisé pour "Représenté par" si l'organisation n'a pas de représentant légal renseigné */
  authorizedBy?: {
    full_name?: string | null
    role?: string | null
  }
}

function formatFrDate(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR')
}

export function extractOrdreMissionVariables(
  options: OrdreMissionVariablesOptions
): DocumentVariables {
  const { organization, teacherUser, teacherProfile, mission, authorizedBy } = options

  const base = extractDocumentVariables({ organization, language: 'fr' })

  const [autoLastName, ...autoFirstNameParts] = (teacherUser.full_name || '').trim().split(/\s+/)
  const lastName = teacherUser.last_name || (teacherUser.full_name ? autoLastName : '') || ''
  const firstName = teacherUser.first_name || (teacherUser.full_name ? autoFirstNameParts.join(' ') : '') || ''

  const statutLabel =
    teacherProfile?.statut === 'independant' ? 'Indépendant' :
    teacherProfile?.statut === 'salarie' ? 'Salarié' : ''

  const autorisantNom = (base.ecole_representant as string) || authorizedBy?.full_name || ''
  const autorisantQualite = base.ecole_representant
    ? 'Représentant légal'
    : (authorizedBy?.role ? ROLE_LABELS[authorizedBy.role] || '' : '')

  return {
    ...base,
    mission_reference: `OM-${Date.now().toString().slice(-6)}`,
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
    mission_objet: mission.session_name || 'Session de formation',
    mission_formation: teacherProfile?.specialization || mission.session_name || '',
    mission_session_ref: mission.session_ref || '',
    mission_lieu: mission.location || '',
    mission_lieu_adresse: '',
    mission_date_debut: formatFrDate(mission.period_start),
    mission_date_fin: formatFrDate(mission.period_end),
    mission_autorisant_nom: autorisantNom,
    mission_autorisant_qualite: autorisantQualite,
    mission_duree_jours: mission.intervention_days != null ? String(mission.intervention_days) : '',
    // Non collectés aujourd'hui : horaires, durée en heures, transport
    // autorisé, barèmes de frais professionnels (km, repas, hébergement,
    // avance) — aucune donnée équivalente dans l'app à ce jour.
    mission_horaires: '',
    mission_duree_heures: '',
    mission_transport_autorise: '',
    mission_distance_aller: '',
    mission_indemnite_km: '',
    mission_frais_repas_midi: '',
    mission_frais_repas_soir: '',
    mission_frais_hebergement: '',
    mission_avance: '',
    mission_notes: '',
  } as DocumentVariables
}
