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

export type SessionModule = { id: string; name: string; amount: number; currency: string }

export interface ExtractVariablesOptions {
  student?: StudentWithRelations | Student
  organization?: Organization
  session?: SessionWithRelations | Session
  invoice?: InvoiceWithRelations | Invoice
  program?: Program & { formations?: Array<{ id: string; name: string; duration_hours?: number }> }
  sessionModules?: SessionModule[]
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
    sessionModules,
    academicYear,
    language = 'fr',
    issueDate = new Date().toISOString(),
  } = options

  const formation = (session as SessionWithRelations)?.formations
  const formationName = formation?.name || (program as any)?.name || session?.name || ''
  const fallbackDesignation = formationName || 'Formation'
  const sessionDebut = session?.start_date ? new Date(session.start_date).toLocaleDateString('fr-FR') : ''
  const sessionFin = session?.end_date ? new Date(session.end_date).toLocaleDateString('fr-FR') : ''
  const formationDuree = (formation as any)?.duration_hours
    ? `${(formation as any).duration_hours} heures`
    : (program as any)?.duration_hours
      ? `${(program as any).duration_hours} heures`
      : ''
  const orgSettings = (organization as any)?.settings as Record<string, unknown> | undefined
  const orgCity = (organization as any)?.city ?? orgSettings?.city
  const orgPostalCode = (organization as any)?.postal_code ?? orgSettings?.postal_code
  const orgSiret = (organization as any)?.siret ?? orgSettings?.siret
  const orgDeclarationNumber = (organization as any)?.declaration_number ?? (organization as any)?.nda_number ?? orgSettings?.declaration_number ?? orgSettings?.nda_number
  const orgRepresentative = (organization as any)?.representative_name ?? orgSettings?.representative_name
  const orgRegion = (organization as any)?.region ?? (organization as any)?.administrative_region ?? orgSettings?.region
  const sessionLieu = (session as any)?.location || (session as any)?.venue || (organization?.address ? `${organization.address}` : '')
  const formationContenu = ((session as SessionWithRelations)?.formations as any)?.content || (program as any)?.content || ''

  let montantHt: string
  let modulesLignes: string

  if (sessionModules && sessionModules.length > 0) {
    const total = sessionModules.reduce((s, m) => s + Number(m.amount), 0)
    montantHt = total.toFixed(2)
    const currency = sessionModules[0]?.currency || 'EUR'
    // Générer une ligne par module avec 3 colonnes (Désignation, Durée, Prix HT)
    modulesLignes = sessionModules.map((m) => {
      const a = Number(m.amount).toFixed(2)
      return `<tr><td style="padding: 12px; border-bottom: 1px solid #e9ecef;"><p style="margin: 0; font-weight: 500;">${escapeHtml(m.name)}</p><p style="margin: 4px 0 0 0; font-size: 9pt; color: #666;">Du ${sessionDebut} au ${sessionFin}</p></td><td style="padding: 12px; text-align: center; border-bottom: 1px solid #e9ecef;">${formationDuree}</td><td style="padding: 12px; text-align: right; border-bottom: 1px solid #e9ecef; font-weight: 500;">${a} ${currency}</td></tr>`
    }).join('')
  } else {
    const fallbackAmount = (invoice?.amount != null ? Number(invoice.amount) : (formation as any)?.price != null ? Number((formation as any).price) : 0)
    montantHt = fallbackAmount.toFixed(2)
    const cur = (formation as any)?.currency || invoice?.currency || 'EUR'
    // Ligne par défaut avec le nom de la formation (3 colonnes)
    modulesLignes = `<tr><td style="padding: 12px; border-bottom: 1px solid #e9ecef;"><p style="margin: 0; font-weight: 500;">${escapeHtml(formationName)}</p><p style="margin: 4px 0 0 0; font-size: 9pt; color: #666;">Du ${sessionDebut} au ${sessionFin}</p></td><td style="padding: 12px; text-align: center; border-bottom: 1px solid #e9ecef;">${formationDuree}</td><td style="padding: 12px; text-align: right; border-bottom: 1px solid #e9ecef; font-weight: 500;">${montantHt} ${cur}</td></tr>`
  }

  function escapeHtml (s: string) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  const variables: any = {
    // Date actuelle
    date_emission: (issueDate ? new Date(issueDate).toLocaleDateString('fr-FR') : invoice?.issue_date ? new Date(invoice.issue_date).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')),
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
    ecole_ville: (typeof orgCity === 'string' ? orgCity : '') || (organization?.address || '').split(',').pop()?.trim() || '',
    ecole_telephone: organization?.phone || '',
    ecole_email: organization?.email || '',
    ecole_site_web: (organization as any)?.website || '',
    ecole_code_postal: (typeof orgPostalCode === 'string' ? orgPostalCode : '') || (organization?.address || '').match(/\d{5}/)?.[0] || '',
    
    // Format alternatif (organisation_*) pour compatibilité avec anciens templates
    organisation_nom: organization?.name || '',
    organisation_adresse: organization?.address || '',
    organisation_telephone: organization?.phone || '',
    organisation_email: organization?.email || '',
    organisation_logo: organization?.logo_url || '',
    organisation_site_web: (organization as any)?.website || '',

    // Étudiant/Élève (utiliser les deux formats pour compatibilité)
    // Format standard (eleve_*)
    eleve_nom: student?.last_name || '',
    eleve_prenom: student?.first_name || '',
    eleve_numero: student?.student_number || '',
    eleve_date_naissance: student?.date_of_birth
      ? new Date(student.date_of_birth).toLocaleDateString('fr-FR')
      : '',
    eleve_classe: ((student as StudentWithRelations) as any)?.classes
      ? (((student as StudentWithRelations) as any).classes as { name: string }).name
      : '',
    eleve_photo: (student as any)?.photo_url || '',
    eleve_adresse: (student as any)?.address || '',
    eleve_code_postal: (student as any)?.postal_code || '',
    eleve_ville: (student as any)?.city || '',
    eleve_telephone: (student as any)?.phone || '',
    eleve_email: (student as any)?.email || '',

    // Destinataire / client (devis, facture)
    entreprise_nom: (student as any)?.company_name || (student as any)?.entreprise_nom || '',
    tuteur_nom: (student as any)?.tutor_name || (student as any)?.representative_name || (student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() : ''),
    // Destinataire du devis : nom de l'entreprise pour les entreprises, prénom + nom pour les particuliers
    destinataire_du_devis:
      (() => {
        const ent = (student as any)?.company_name || (student as any)?.entreprise_nom
        if (ent && String(ent).trim()) return String(ent).trim()
        return student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() : ''
      })(),
    adresse_destinataire: (student as any)?.address || '',
    code_postal_destinataire: (student as any)?.postal_code || '',
    ville_destinataire: (student as any)?.city || '',

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
    etudiant_code_postal: (student as any)?.postal_code || '',
    etudiant_ville: (student as any)?.city || '',
    etudiant_telephone: (student as any)?.phone || '',
    etudiant_email: (student as any)?.email || '',
    etudiant_photo: (student as any)?.photo_url || '',

    // Classe
    classe_nom: ((student as StudentWithRelations) as any)?.classes
      ? (((student as StudentWithRelations) as any).classes as { name: string }).name
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
    formation_nom: formationName,
    formation_duree: formationDuree,
    formation_objectifs: ((session as SessionWithRelations)?.formations as any)?.objectives || (program as any)?.objectives || '',
    formation_public_concerne: ((session as SessionWithRelations)?.formations as any)?.target_audience || (program as any)?.target_audience || '',
    formation_prerequis: ((session as SessionWithRelations)?.formations as any)?.prerequisites || (program as any)?.prerequisites || '',
    formation_qualite_et_resultats: ((session as SessionWithRelations)?.formations as any)?.quality_indicators || (program as any)?.quality_indicators || '',
    formation_contenu: ((session as SessionWithRelations)?.formations as any)?.content || (program as any)?.content || '',
    formation_equipe_pedagogique: ((session as SessionWithRelations)?.formations as any)?.pedagogical_team || (program as any)?.pedagogical_team || '',
    formation_ressources: ((session as SessionWithRelations)?.formations as any)?.resources || (program as any)?.resources || '',
    formation_supports: ((session as SessionWithRelations)?.formations as any)?.materials || (program as any)?.materials || '',
    session_lieu: sessionLieu,
    session_effectif: (session as any)?.enrollment_count?.toString() || (session as any)?.student_count?.toString() || (sessionModules?.length ? String(sessionModules.length) : '') || '1',
    diplome_ou_certification: ((session as SessionWithRelations)?.formations as any)?.certification || (program as any)?.certification || '',
    ecole_region: (typeof orgRegion === 'string' ? orgRegion : '') || (organization as any)?.region || (organization as any)?.administrative_region || '',
    formation_prix: (formation as any)?.price != null ? `${Number((formation as any).price).toFixed(2)} ${(formation as any)?.currency || 'EUR'}` : (invoice?.amount != null ? `${Number(invoice.amount).toFixed(2)} ${invoice?.currency || 'EUR'}` : (montantHt ? `${montantHt} EUR` : '')),
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
    montant: montantHt,
    montant_ht: montantHt,
    modules_lignes: modulesLignes,
    // Tableau des modules pour la boucle {FOR:modules} (devis et factures : une ligne par module)
    modules: (() => {
      if (sessionModules && sessionModules.length > 0) {
        return sessionModules.map((m) => {
          const amount = Number(m.amount)
          const a = (Number.isFinite(amount) ? amount : 0).toFixed(2)
          return { nom: m.name || fallbackDesignation, prix_ht: a, total_ht: a, quantite: 1 }
        })
      }
      // Facture sans session : construire les lignes à partir des items de la facture
      const items = invoice?.items
      if (invoice && Array.isArray(items) && items.length > 0) {
        const invoiceAmount = Number(invoice.amount)
        const totalInvoice = Number.isFinite(invoiceAmount) ? invoiceAmount : 0
        return items.map((item: any) => {
          const desc = item.description ?? item.name ?? fallbackDesignation
          const qty = Math.max(1, Number(item.quantity) || 1)
          let unit = Number(item.unit_price)
          let total = Number(item.total)
          if (!Number.isFinite(unit)) unit = item.amount != null ? Number(item.amount) : 0
          if (!Number.isFinite(total)) total = Number.isFinite(unit) ? unit * qty : 0
          // Si aucun montant sur la ligne, répartir le total HT de la facture
          if (!Number.isFinite(total) || total <= 0) {
            total = items.length > 0 ? totalInvoice / items.length : totalInvoice
            unit = qty > 0 ? total / qty : total
          }
          const totalVal = Number.isFinite(total) ? total : 0
          const unitVal = Number.isFinite(unit) ? unit : 0
          return {
            nom: String(desc || fallbackDesignation),
            prix_ht: unitVal.toFixed(2),
            total_ht: totalVal.toFixed(2),
            quantite: qty,
          }
        })
      }
      return [{ nom: fallbackDesignation, prix_ht: montantHt, total_ht: montantHt, quantite: 1 }]
    })(),
    // Lignes HTML du tableau facture (Désignation, Qté, Prix unit. HT, Total HT) — une ligne par module, à injecter dans <tbody>
    modules_lignes_facture: (() => {
      const mods = (() => {
        if (sessionModules && sessionModules.length > 0) {
          return sessionModules.map((m) => {
            const amount = Number(m.amount)
            const a = (Number.isFinite(amount) ? amount : 0).toFixed(2)
            return { nom: m.name || fallbackDesignation, prix_ht: a, total_ht: a, quantite: 1 }
          })
        }
        const items = invoice?.items
        if (invoice && Array.isArray(items) && items.length > 0) {
          const invoiceAmount = Number(invoice.amount)
          const totalInvoice = Number.isFinite(invoiceAmount) ? invoiceAmount : 0
          return items.map((item: any) => {
            const desc = item.description ?? item.name ?? fallbackDesignation
            const qty = Math.max(1, Number(item.quantity) || 1)
            let unit = Number(item.unit_price)
            let total = Number(item.total)
            if (!Number.isFinite(unit)) unit = item.amount != null ? Number(item.amount) : 0
            if (!Number.isFinite(total)) total = Number.isFinite(unit) ? unit * qty : 0
            if (!Number.isFinite(total) || total <= 0) {
              total = items.length > 0 ? totalInvoice / items.length : totalInvoice
              unit = qty > 0 ? total / qty : total
            }
            const totalVal = Number.isFinite(total) ? total : 0
            const unitVal = Number.isFinite(unit) ? unit : 0
            return {
              nom: String(desc || fallbackDesignation),
              prix_ht: unitVal.toFixed(2),
              total_ht: totalVal.toFixed(2),
              quantite: qty,
            }
          })
        }
        return [{ nom: fallbackDesignation, prix_ht: montantHt, total_ht: montantHt, quantite: 1 }]
      })()
      return mods
        .map(
          (m) =>
            `<tr><td style="padding: 3px 5px; border: 1px solid #ccc;">${escapeHtml(String(m.nom ?? ''))}</td><td style="padding: 3px 5px; text-align: center; border: 1px solid #ccc;">${Number(m.quantite ?? 1)}</td><td style="padding: 3px 5px; text-align: right; border: 1px solid #ccc;">${String(m.prix_ht ?? '0.00')}</td><td style="padding: 3px 5px; text-align: right; border: 1px solid #ccc;">${String(m.total_ht ?? '0.00')}</td></tr>`
        )
        .join('')
    })(),
    montant_ttc: sessionModules?.length ? montantHt : (invoice?.total_amount ? Number(invoice.total_amount).toFixed(2) : '0.00'),
    tva: sessionModules?.length ? '0.00' : (invoice?.tax_amount ? Number(invoice.tax_amount).toFixed(2) : '0.00'),
    taux_tva: sessionModules?.length ? '0.00' : (invoice?.tax_amount && invoice?.amount ? ((Number(invoice.tax_amount) / Number(invoice.amount)) * 100).toFixed(2) : '0.00'),
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
    ecole_siret: (typeof orgSiret === 'string' ? orgSiret : '') || (organization as any)?.siret || '',
    ecole_numero_declaration: (typeof orgDeclarationNumber === 'string' ? orgDeclarationNumber : '') || (organization as any)?.declaration_number || (organization as any)?.nda_number || '',
    ecole_representant: (typeof orgRepresentative === 'string' ? orgRepresentative : '') || (organization as any)?.representative_name || '',
    iban: (organization as any)?.iban || (orgSettings as any)?.iban || '',
    bic: (organization as any)?.bic || (orgSettings as any)?.bic || '',

    // Convocation
    convocation_objet: session?.name || formationName || 'Session de formation',
    convocation_date: sessionDebut,
    convocation_heure: (session as any)?.start_time || (session?.start_date 
      ? new Date(session.start_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : '09:00'),
    convocation_lieu: sessionLieu || (organization as any)?.city || '',
    convocation_adresse: (session as any)?.address || (organization as any)?.address || '',
    convocation_duree: formationDuree,
    convocation_contenu: formationContenu || 'Programme de formation standard',

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

