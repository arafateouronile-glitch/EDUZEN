import type { DocumentVariables } from '@/lib/types/document-templates'
import type { StudentWithRelations } from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { formatDate } from '@/lib/utils'

type Organization = TableRow<'organizations'>
type Invoice = TableRow<'invoices'>
type Payment = TableRow<'payments'>
type Session = TableRow<'sessions'>
type Formation = TableRow<'formations'>

/** Organisation avec champs optionnels (website, siret, postal_code, rcs, representative_name) */
type OrgExtended = Organization & {
  website?: string | null
  siret?: string | null
  postal_code?: string | null
  rcs?: string | null
  representative_name?: string | null
}
/** Étudiant avec champs optionnels (postal_code, city, etc.) */
type StudentExtended = StudentWithRelations & {
  postal_code?: string | null
  city?: string | null
}
/** Formation avec objectifs */
type FormationExtended = Formation & { objectives?: string | null }

/**
 * Mappe les données d'un étudiant vers les variables de document
 */
export function mapStudentToVariables(
  student: StudentWithRelations | null | undefined,
  organization?: Organization | null,
  session?: Session | null,
  formation?: Formation | null
): DocumentVariables {
  const now = new Date()
  const org = organization as OrgExtended | undefined
  const stud = student as StudentExtended | undefined
  const form = formation as FormationExtended | undefined

  return {
    // Établissement
    ecole_nom: organization?.name || '',
    ecole_logo: organization?.logo_url || '',
    ecole_adresse: organization?.address || '',
    ecole_ville: organization?.city || '',
    ecole_telephone: organization?.phone || '',
    ecole_email: organization?.email || '',
    ecole_site_web: org?.website || '',
    ecole_siret: org?.siret || '',
    ecole_code_postal: org?.postal_code || '',

    // Élève
    eleve_nom: student?.last_name || '',
    eleve_prenom: student?.first_name || '',
    eleve_numero: student?.student_number || '',
    eleve_date_naissance: student?.date_of_birth ? formatDate(student.date_of_birth) : '',
    eleve_classe: session?.name || '',
    eleve_photo: student?.photo_url || '',
    eleve_adresse: student?.address || '',
    eleve_code_postal: stud?.postal_code || '',
    eleve_ville: stud?.city || '',
    eleve_telephone: student?.phone || '',
    eleve_email: student?.email || '',

    // Formation
    formation_nom: formation?.name || '',
    formation_code: formation?.code || '',
    formation_duree: formation?.duration_hours ? `${formation.duration_hours} heures` : '',
    formation_prix: formation?.price ? `${formation.price} ${formation.currency || 'EUR'}` : '',
    formation_dates: session ? `${formatDate(session.start_date)} - ${formatDate(session.end_date)}` : '',
    formation_description: formation?.description || '',
    formation_objectifs: form?.objectives || '',
    
    // Session
    session_nom: session?.name || '',
    session_debut: session?.start_date ? formatDate(session.start_date) : '',
    session_fin: session?.end_date ? formatDate(session.end_date) : '',
    session_lieu: session?.location || '',
    session_horaires: session?.start_time && session?.end_time 
      ? `${session.start_time} - ${session.end_time}` 
      : '',
    
    // Dates
    date_jour: formatDate(now),
    date_emission: formatDate(now),
    date_generation: formatDate(now),
    annee_actuelle: now.getFullYear().toString(),
    heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    
    // Divers
    numero_document: `DOC-${now.getTime()}`,
    numero_page: 1,
    total_pages: 1,
  }
}

/**
 * Mappe les données d'une facture vers les variables de document
 */
export function mapInvoiceToVariables(
  invoice: Invoice | null | undefined,
  student?: StudentWithRelations | null,
  organization?: Organization | null
): DocumentVariables {
  const now = new Date()
  const org = organization as OrgExtended | undefined
  const stud = student as StudentExtended | undefined

  return {
    // Établissement
    ecole_nom: organization?.name || '',
    ecole_logo: organization?.logo_url || '',
    ecole_adresse: organization?.address || '',
    ecole_ville: organization?.city || '',
    ecole_telephone: organization?.phone || '',
    ecole_email: organization?.email || '',
    ecole_siret: org?.siret || '',

    // Élève
    eleve_nom: student?.last_name || '',
    eleve_prenom: student?.first_name || '',
    eleve_numero: student?.student_number || '',
    eleve_adresse: student?.address || '',
    eleve_code_postal: stud?.postal_code || '',
    eleve_ville: stud?.city || '',
    
    // Finances
    montant: invoice?.total_amount ? `${invoice.total_amount} ${invoice.currency || 'EUR'}` : '',
    montant_ht: invoice?.amount ? `${invoice.amount} ${invoice.currency || 'EUR'}` : '',
    montant_ttc: invoice?.total_amount ? `${invoice.total_amount} ${invoice.currency || 'EUR'}` : '',
    tva: invoice?.tax_amount ? `${invoice.tax_amount} ${invoice.currency || 'EUR'}` : '',
    taux_tva: invoice?.tax_amount && invoice?.amount 
      ? `${((invoice.tax_amount / invoice.amount) * 100).toFixed(2)}%` 
      : '',
    numero_facture: invoice?.invoice_number || '',
    numero_devis: invoice?.invoice_number || '',
    devis_numero: invoice?.invoice_number || '',
    date_echeance: invoice?.due_date ? formatDate(invoice.due_date) : '',
    
    // Dates
    date_jour: formatDate(now),
    date_emission: invoice?.issue_date ? formatDate(invoice.issue_date) : formatDate(now),
    date_generation: formatDate(now),
    
    // Divers
    numero_document: invoice?.invoice_number || `DOC-${now.getTime()}`,
    numero_page: 1,
    total_pages: 1,
  }
}

/**
 * Mappe les données d'un paiement vers les variables de document
 */
export function mapPaymentToVariables(
  payment: Payment | null | undefined,
  invoice?: Invoice | null,
  student?: StudentWithRelations | null,
  organization?: Organization | null
): DocumentVariables {
  const now = new Date()
  
  return {
    // Établissement
    ecole_nom: organization?.name || '',
    ecole_logo: organization?.logo_url || '',
    ecole_adresse: organization?.address || '',
    ecole_telephone: organization?.phone || '',
    ecole_email: organization?.email || '',
    
    // Élève
    eleve_nom: student?.last_name || '',
    eleve_prenom: student?.first_name || '',
    eleve_numero: student?.student_number || '',
    
    // Finances
    montant: payment?.amount ? `${payment.amount} ${payment.currency || 'EUR'}` : '',
    date_paiement: payment?.paid_at ? formatDate(payment.paid_at) : '',
    mode_paiement: payment?.payment_method || '',
    numero_facture: invoice?.invoice_number || '',
    
    // Dates
    date_jour: formatDate(now),
    date_emission: formatDate(now),
    date_generation: formatDate(now),
    
    // Divers
    numero_document: (payment as { payment_number?: string })?.payment_number ?? `DOC-${now.getTime()}`,
    numero_page: 1,
    total_pages: 1,
  }
}

/**
 * Mappe les données d'une session vers les variables de document
 */
export function mapSessionToVariables(
  session: Session | null | undefined,
  formation?: Formation | null,
  organization?: Organization | null
): DocumentVariables {
  const now = new Date()
  const org = organization as OrgExtended | undefined
  const form = formation as FormationExtended | undefined

  const variables: DocumentVariables = {
    // Établissement
    ecole_nom: organization?.name || '',
    ecole_logo: organization?.logo_url || '',
    ecole_adresse: organization?.address || '',
    ecole_ville: organization?.city || '',
    ecole_telephone: organization?.phone || '',
    ecole_email: organization?.email || '',
    ecole_siret: org?.siret || '',
    ecole_rcs: org?.rcs || '',
    ecole_representant: org?.representative_name || '',

    // Formation
    formation_nom: formation?.name || '',
    formation_code: formation?.code || '',
    formation_duree: formation?.duration_hours ? `${formation.duration_hours} heures` : '',
    formation_prix: formation?.price ? `${formation.price} ${formation.currency || 'EUR'}` : '',
    formation_description: formation?.description || '',
    formation_objectifs: form?.objectives || '',
    
    // Session
    session_nom: session?.name || '',
    session_debut: session?.start_date ? formatDate(session.start_date) : '',
    session_fin: session?.end_date ? formatDate(session.end_date) : '',
    session_lieu: session?.location || '',
    session_horaires: session?.start_time && session?.end_time 
      ? `${session.start_time} - ${session.end_time}` 
      : '',
    
    // Dates
    date_jour: formatDate(now),
    date_emission: formatDate(now),
    date_generation: formatDate(now),
    annee_actuelle: now.getFullYear().toString(),
    
    // Divers
    numero_document: `DOC-${now.getTime()}`,
    numero_page: 1,
    total_pages: 1,
  }
  return variables
}

/**
 * Fonction générique pour mapper les données vers les variables selon le type de document
 */
export function mapDataToVariables(
  type: 'invoice' | 'quote' | 'certificate' | 'contract' | 'report' | 'other',
  data: {
    student?: StudentWithRelations | null
    invoice?: Invoice | null
    payment?: Payment | null
    session?: Session | Session[] | null
    formation?: Formation | null
    organization?: Organization | null
  }
): DocumentVariables {
  const { student, invoice, payment, session, formation, organization } = data

  // Déterminer la session (peut être un tableau ou un objet)
  const sessionObj = Array.isArray(session) ? session[0] : session

  switch (type) {
    case 'invoice':
      if (invoice) {
        return mapInvoiceToVariables(invoice, student, organization)
      }
      break
    case 'certificate':
      if (student && sessionObj) {
        return mapStudentToVariables(student, organization, sessionObj, formation)
      }
      break
    case 'contract':
    case 'report':
    case 'other':
      if (student) {
        return mapStudentToVariables(student, organization, sessionObj, formation)
      }
      if (sessionObj) {
        return mapSessionToVariables(sessionObj, formation, organization)
      }
      break
  }

  // Fallback: retourner des variables vides avec les données de base disponibles
  const now = new Date()
  const fallbackStud = student as StudentExtended | undefined
  return {
    ecole_nom: organization?.name || '',
    ecole_logo: organization?.logo_url || '',
    ecole_adresse: organization?.address || '',
    ecole_ville: organization?.city || '',
    ecole_telephone: organization?.phone || '',
    ecole_email: organization?.email || '',
    eleve_nom: student?.last_name || '',
    eleve_prenom: student?.first_name || '',
    eleve_numero: student?.student_number || '',
    eleve_adresse: student?.address || '',
    eleve_code_postal: fallbackStud?.postal_code || '',
    eleve_ville: fallbackStud?.city || '',
    date_jour: formatDate(now),
    date_emission: formatDate(now),
    date_generation: formatDate(now),
    annee_actuelle: now.getFullYear().toString(),
    numero_document: `DOC-${now.getTime()}`,
    numero_page: 1,
    total_pages: 1,
  }
}
