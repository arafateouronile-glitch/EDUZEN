/**
 * Extrait les variables pour la génération de documents
 */

import type { DocumentVariables } from '@/lib/types/document-templates'
import type { StudentWithRelations, SessionWithRelations, InvoiceWithRelations } from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'

type Organization = TableRow<'organizations'>
type Student = TableRow<'students'>
type Session = TableRow<'sessions'>
type Invoice = TableRow<'invoices'>

type Program = TableRow<'programs'>

export interface ExtractVariablesOptions {
  student?: StudentWithRelations | Student
  organization?: Organization
  session?: SessionWithRelations | Session
  invoice?: InvoiceWithRelations | Invoice
  program?: Program & { formations?: Array<{ id: string; name: string; duration_hours?: number }> }
  academicYear?: { name: string } | null
  language?: 'fr' | 'en'
  issueDate?: string
}

/**
 * Extrait les variables de document depuis les données fournies
 */
export function extractDocumentVariables(options: ExtractVariablesOptions): DocumentVariables {
  const {
    student,
    organization,
    session,
    invoice,
    program,
    academicYear,
    language = 'fr',
    issueDate = new Date().toISOString(),
  } = options

  const variables: DocumentVariables = {
    // Date actuelle
    date_emission: new Date().toLocaleDateString('fr-FR'),
    date_aujourd_hui: new Date().toLocaleDateString('fr-FR'),
    date_jour: new Date().toLocaleDateString('fr-FR'),
    annee_courante: new Date().getFullYear().toString(),
    annee_actuelle: new Date().getFullYear().toString(),
    date_generation: new Date().toLocaleDateString('fr-FR'),
    heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),

    // Organisation/École (utiliser les deux formats pour compatibilité)
    // Format standard (ecole_*)
    ecole_nom: organization?.name || '',
    ecole_logo: organization?.logo_url || '',
    ecole_adresse: organization?.address || '',
    ecole_ville: (organization?.address || '').split(',').pop()?.trim() || '',
    ecole_telephone: organization?.phone || '',
    ecole_email: organization?.email || '',
    ecole_site_web: organization?.website || '',
    ecole_code_postal: (organization?.address || '').match(/\d{5}/)?.[0] || '',
    
    // Format alternatif (organisation_*) pour compatibilité avec anciens templates
    organisation_nom: organization?.name || '',
    organisation_adresse: organization?.address || '',
    organisation_telephone: organization?.phone || '',
    organisation_email: organization?.email || '',
    organisation_logo: organization?.logo_url || '',
    organisation_site_web: organization?.website || '',

    // Étudiant/Élève (utiliser les deux formats pour compatibilité)
    // Format standard (eleve_*)
    eleve_nom: student?.last_name || '',
    eleve_prenom: student?.first_name || '',
    eleve_numero: student?.student_number || '',
    eleve_date_naissance: student?.date_of_birth
      ? new Date(student.date_of_birth).toLocaleDateString('fr-FR')
      : '',
    eleve_classe: (student as StudentWithRelations)?.classes
      ? ((student as StudentWithRelations).classes as { name: string }).name
      : '',
    eleve_photo: (student as any)?.photo_url || '',
    eleve_adresse: (student as any)?.address || '',
    eleve_telephone: (student as any)?.phone || '',
    eleve_email: (student as any)?.email || '',
    
    // Format alternatif (etudiant_*) pour compatibilité
    etudiant_nom: student?.last_name || '',
    etudiant_prenom: student?.first_name || '',
    etudiant_nom_complet: student
      ? `${student.first_name} ${student.last_name}`
      : '',
    etudiant_numero: student?.student_number || '',
    etudiant_date_naissance: student?.date_of_birth
      ? new Date(student.date_of_birth).toLocaleDateString('fr-FR')
      : '',
    etudiant_adresse: (student as any)?.address || '',
    etudiant_telephone: (student as any)?.phone || '',
    etudiant_email: (student as any)?.email || '',
    etudiant_photo: (student as any)?.photo_url || '',

    // Classe
    classe_nom: (student as StudentWithRelations)?.classes
      ? ((student as StudentWithRelations).classes as { name: string }).name
      : '',

    // Année académique
    annee_academique: academicYear?.name || new Date().getFullYear().toString(),
    annee_scolaire: academicYear?.name || new Date().getFullYear().toString(),

    // Session/Formation
    session_nom: session?.name || '',
    session_debut: session?.start_date
      ? new Date(session.start_date).toLocaleDateString('fr-FR')
      : '',
    session_fin: session?.end_date
      ? new Date(session.end_date).toLocaleDateString('fr-FR')
      : '',
    session_date_debut: session?.start_date
      ? new Date(session.start_date).toLocaleDateString('fr-FR')
      : '',
    session_date_fin: session?.end_date
      ? new Date(session.end_date).toLocaleDateString('fr-FR')
      : '',
    formation_nom: (session as SessionWithRelations)?.formations?.name || '',
    formation_duree: (session as SessionWithRelations)?.formations?.duration_hours
      ? `${(session as SessionWithRelations).formations?.duration_hours} heures`
      : '',
    formation_objectifs: (session as SessionWithRelations)?.formations?.objectives || (program as any)?.objectives || '',
    formation_public_concerne: (session as SessionWithRelations)?.formations?.target_audience || (program as any)?.target_audience || '',
    formation_prerequis: (session as SessionWithRelations)?.formations?.prerequisites || (program as any)?.prerequisites || '',
    formation_qualite_et_resultats: (session as SessionWithRelations)?.formations?.quality_indicators || (program as any)?.quality_indicators || '',
    formation_contenu: (session as SessionWithRelations)?.formations?.content || (program as any)?.content || '',
    formation_equipe_pedagogique: (session as SessionWithRelations)?.formations?.pedagogical_team || (program as any)?.pedagogical_team || '',
    formation_ressources: (session as SessionWithRelations)?.formations?.resources || (program as any)?.resources || '',
    formation_supports: (session as SessionWithRelations)?.formations?.materials || (program as any)?.materials || '',
    session_lieu: (session as any)?.location || (session as any)?.venue || '',
    session_effectif: (session as any)?.enrollment_count?.toString() || (session as any)?.student_count?.toString() || '',
    diplome_ou_certification: (session as SessionWithRelations)?.formations?.certification || (program as any)?.certification || '',
    ecole_region: (organization as any)?.region || (organization as any)?.administrative_region || '',
    // Programme
    programme_nom: program?.name || (session as SessionWithRelations)?.formations?.programs?.name || '',
    programme_code: (program as any)?.code || '',
    programme_description: (program as any)?.description || '',
    programme_objectifs: (program as any)?.objectives || '',
    programme_duree_totale: program?.formations
      ? `${program.formations.reduce((total, f) => total + (f.duration_hours || 0), 0)} heures`
      : '',
    programme_nombre_formations: program?.formations ? `${program.formations.length}` : '',
    programme_nombre_sessions: '', // À calculer si nécessaire
    programme_public_concerne: (program as any)?.target_audience || '',
    programme_modalites: (program as any)?.modalities || '',
    programme_certification: (program as any)?.certification || '',

    // Facture
    numero_facture: invoice?.invoice_number || '',
    facture_numero: invoice?.invoice_number || '',
    facture_date_emission: invoice?.issue_date
      ? new Date(invoice.issue_date).toLocaleDateString('fr-FR')
      : '',
    facture_date_echeance: invoice?.due_date
      ? new Date(invoice.due_date).toLocaleDateString('fr-FR')
      : '',
    date_echeance: invoice?.due_date
      ? new Date(invoice.due_date).toLocaleDateString('fr-FR')
      : '',
    montant: invoice?.amount ? Number(invoice.amount).toFixed(2) : '0.00',
    montant_ht: invoice?.amount ? Number(invoice.amount).toFixed(2) : '0.00',
    montant_ttc: invoice?.total_amount
      ? Number(invoice.total_amount).toFixed(2)
      : '0.00',
    tva: invoice?.tax_amount
      ? Number(invoice.tax_amount).toFixed(2)
      : '0.00',
    taux_tva: invoice?.tax_amount && invoice?.amount
      ? ((Number(invoice.tax_amount) / Number(invoice.amount)) * 100).toFixed(2)
      : '0.00',
    facture_montant: invoice?.amount ? Number(invoice.amount).toFixed(2) : '0.00',
    facture_tva: invoice?.tax_amount
      ? Number(invoice.tax_amount).toFixed(2)
      : '0.00',
    facture_total: invoice?.total_amount
      ? Number(invoice.total_amount).toFixed(2)
      : '0.00',
    facture_devise: invoice?.currency || 'EUR',
    facture_items: invoice?.items
      ? JSON.stringify(invoice.items)
      : '[]',

    // Variables supplémentaires pour factures
    montant_lettres: invoice?.total_amount
      ? convertNumberToWords(Number(invoice.total_amount), language)
      : '',
    mode_paiement: (invoice as any)?.payment_method || '',
    date_paiement: (invoice as any)?.paid_at
      ? new Date((invoice as any).paid_at).toLocaleDateString('fr-FR')
      : '',
    ecole_siret: (organization as any)?.siret || '',
    ecole_numero_declaration: (organization as any)?.declaration_number || '',
    ecole_representant: (organization as any)?.representative_name || '',

    // Langue
    langue: language,
  }

  return variables
}

/**
 * Convertit un nombre en lettres (français)
 */
function convertNumberToWords(num: number, language: 'fr' | 'en' = 'fr'): string {
  if (language === 'en') {
    return convertNumberToWordsEN(num)
  }
  return convertNumberToWordsFR(num)
}

/**
 * Convertit un nombre en lettres en français
 */
function convertNumberToWordsFR(num: number): string {
  if (num === 0) return 'zéro euro'
  if (num < 0) return 'moins ' + convertNumberToWordsFR(-num)
  
  const integerPart = Math.floor(num)
  const decimalPart = Math.round((num - integerPart) * 100)
  
  let result = convertIntegerToWordsFR(integerPart)
  
  if (decimalPart > 0) {
    result += ' virgule ' + convertIntegerToWordsFR(decimalPart)
  }
  
  return result + (integerPart > 1 ? ' euros' : ' euro')
}

function convertIntegerToWordsFR(num: number): string {
  if (num === 0) return ''
  if (num < 10) {
    const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf']
    return units[num]
  }
  if (num < 20) {
    const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
    return teens[num - 10]
  }
  if (num < 100) {
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']
    const ten = Math.floor(num / 10)
    const unit = num % 10
    let result = tens[ten]
    if (ten === 7 || ten === 9) {
      result += '-' + (unit === 1 ? 'et-' : '') + convertIntegerToWordsFR(10 + unit)
    } else if (unit > 0) {
      result += (unit === 1 && ten !== 8 ? '-et-' : '-') + convertIntegerToWordsFR(unit)
    } else if (ten === 8) {
      result += 's'
    }
    return result
  }
  if (num < 1000) {
    const hundred = Math.floor(num / 100)
    const remainder = num % 100
    let result = hundred === 1 ? 'cent' : convertIntegerToWordsFR(hundred) + '-cent'
    if (remainder > 0) {
      result += '-' + convertIntegerToWordsFR(remainder)
    } else if (hundred > 1) {
      result += 's'
    }
    return result
  }
  if (num < 1000000) {
    const thousand = Math.floor(num / 1000)
    const remainder = num % 1000
    let result = thousand === 1 ? 'mille' : convertIntegerToWordsFR(thousand) + '-mille'
    if (remainder > 0) {
      result += '-' + convertIntegerToWordsFR(remainder)
    }
    return result
  }
  // Pour les nombres plus grands, on simplifie
  return num.toString()
}

function convertNumberToWordsEN(num: number): string {
  // Implémentation simplifiée en anglais
  return num.toFixed(2) + ' euros'
}

/**
 * Mappe les anciens types de documents vers les nouveaux types
 */
export function mapDocumentTypeToTemplateType(
  oldType: string
): string {
  const mapping: Record<string, string> = {
    // Mapping vers les valeurs valides de l'enum document_type
    attestation: 'attestation_reussite', // Utilise attestation_reussite (peut être changé selon le contexte)
    certificate: 'certificat_scolarite',
    invoice: 'facture',
    receipt: 'facture', // Les reçus utilisent le même type que les factures
    transcript: 'releve_notes',
    report_card: 'releve_notes',
    convocation: 'convocation',
    contract: 'contrat',
  }

  return mapping[oldType] || oldType
}

