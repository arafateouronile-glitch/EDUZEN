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
type Company = TableRow<'companies'>

/** Organisation avec champs optionnels (settings, city, website, iban, bic, etc.) */
type OrgExtended = Organization & {
  settings?: Record<string, unknown>
  city?: string | null
  postal_code?: string | null
  siret?: string | null
  declaration_number?: string | null
  nda_number?: string | null
  representative_name?: string | null
  region?: string | null
  administrative_region?: string | null
  website?: string | null
  iban?: string | null
  bic?: string | null
}
/** Session avec location, venue, effectifs, horaire, adresse */
type SessionExtended = Session & {
  location?: string | null
  venue?: string | null
  enrollment_count?: number | null
  student_count?: number | null
  start_time?: string | null
  address?: string | null
}
/** Formation (ou dérivé) avec champs pédagogiques */
type FormationExtended = {
  name?: string | null
  duration_hours?: number | null
  price?: number | string | null
  currency?: string | null
  content?: string | null
  objectives?: string | null
  target_audience?: string | null
  prerequisites?: string | null
  quality_indicators?: string | null
  pedagogical_team?: string | null
  resources?: string | null
  materials?: string | null
  certification?: string | null
}
/** Programme avec champs étendus */
type ProgramExtended = Program & {
  duration_hours?: number | null
  // Anciens alias conservés pour rétrocompatibilité (peuvent être undefined)
  content?: string | null
  objectives?: string | null
  target_audience?: string | null
  prerequisites?: string | null
  quality_indicators?: string | null
  pedagogical_team?: string | null
  resources?: string | null
  materials?: string | null
  certification?: string | null
  code?: string | null
  description?: string | null
  // Champs réels de la table programs (accès direct via Program)
  lieu?: string | null
  access_delay_days?: number | null
  accessibility_info?: string | null
  rs_title_name?: string | null
  rs_code?: string | null
  modalities?: string | null
}
/** Étudiant avec champs optionnels (photo, adresse, entreprise, tuteur) */
type StudentExtended = Student & {
  photo_url?: string | null
  address?: string | null
  postal_code?: string | null
  city?: string | null
  phone?: string | null
  email?: string | null
  company_name?: string | null
  entreprise_nom?: string | null
  tutor_name?: string | null
  representative_name?: string | null
}
/** Ligne de facture pour modules */
type InvoiceItemRow = {
  description?: string | null
  name?: string | null
  quantity?: number | null
  unit_price?: number | null
  total?: number | null
  amount?: number | null
}
/** Facture avec champs optionnels (paiement) */
type InvoiceExtended = Invoice & {
  payment_method?: string | null
  paid_at?: string | null
}

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
  company?: Company | null
  /** Effectif facturé (ex: nombre de groupes/clients/apprenants d'une entité) — multiplie la quantité des lignes de modules, sinon 1 */
  effectif?: number
  /** Montant rempli/négocié lors de l'inscription (enrollment.total_amount ou équivalent entité) — prioritaire sur le prix catalogue de la formation pour les conventions/contrats */
  enrollmentAmount?: number
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
    company,
    effectif,
    enrollmentAmount,
  } = options

  const moduleQuantity = effectif && effectif > 0 ? effectif : 1

  const org = organization as OrgExtended | undefined
  const sess = session as SessionExtended | undefined
  const form = (session as SessionWithRelations)?.formations as FormationExtended | undefined
  const prog = program as ProgramExtended | undefined
  const stud = student as StudentExtended | undefined
  const inv = invoice as InvoiceExtended | undefined

  // Convertit un tableau de tabs {id, title, content} en HTML (plain text → <br>)
  const tabsToHtml = (tabs: unknown): string => {
    if (!Array.isArray(tabs) || tabs.length === 0) return ''
    return tabs.map((t: { title?: string; content?: string }) => {
      const body = (t.content || '').replace(/\n/g, '<br>')
      return tabs.length > 1
        ? `<p><strong>${escapeHtml(t.title || '')}</strong></p><p>${body}</p>`
        : `<p>${body}</p>`
    }).join('')
  }

  const formation = (session as SessionWithRelations)?.formations
  const formationName = formation?.name || prog?.name || session?.name || ''
  const fallbackDesignation = formationName || 'Formation'
  const sessionDebut = session?.start_date ? new Date(session.start_date).toLocaleDateString('fr-FR') : ''
  const sessionFin = session?.end_date ? new Date(session.end_date).toLocaleDateString('fr-FR') : ''
  const formationDuree = form?.duration_hours
    ? `${form.duration_hours} heures`
    : prog?.duration_hours
      ? `${prog.duration_hours} heures`
      : ''
  const orgSettings = org?.settings as Record<string, unknown> | undefined
  const orgCity = org?.city ?? (orgSettings as Record<string, unknown> | undefined)?.city
  const orgPostalCode = org?.postal_code ?? (orgSettings as Record<string, unknown> | undefined)?.postal_code
  const orgSiret = org?.siret ?? (orgSettings as Record<string, unknown> | undefined)?.siret
  const orgDeclarationNumber = org?.declaration_number ?? org?.nda_number ?? (orgSettings as Record<string, unknown> | undefined)?.declaration_number ?? (orgSettings as Record<string, unknown> | undefined)?.nda_number
  const orgRepresentative = org?.representative_name ?? (orgSettings as Record<string, unknown> | undefined)?.representative_name
  const orgRegion = org?.region ?? org?.administrative_region ?? (orgSettings as Record<string, unknown> | undefined)?.region
  const sessionLieu = sess?.location || sess?.venue || (organization?.address ? `${organization.address}` : '')
  const formationContenu = form?.content || prog?.content || ''

  let montantHt: string
  let modulesLignes: string

  if (sessionModules && sessionModules.length > 0) {
    const total = sessionModules.reduce((s, m) => s + Number(m.amount), 0) * moduleQuantity
    montantHt = total.toFixed(2)
    const currency = sessionModules[0]?.currency || 'EUR'
    // Générer une ligne par module avec 3 colonnes (Désignation, Durée, Prix HT)
    modulesLignes = sessionModules.map((m) => {
      const a = (Number(m.amount) * moduleQuantity).toFixed(2)
      return `<tr><td style="padding: 12px; border-bottom: 1px solid #e9ecef;"><p style="margin: 0; font-weight: 500;">${escapeHtml(m.name)}</p><p style="margin: 4px 0 0 0; font-size: 9pt; color: #666;">Du ${sessionDebut} au ${sessionFin}</p></td><td style="padding: 12px; text-align: center; border-bottom: 1px solid #e9ecef;">${formationDuree}</td><td style="padding: 12px; text-align: right; border-bottom: 1px solid #e9ecef; font-weight: 500;">${a} ${currency}</td></tr>`
    }).join('')
  } else {
    // Priorité : montant rempli à l'inscription (enrollment/entité) > facture > prix catalogue de la formation
    const fallbackAmount = enrollmentAmount != null && enrollmentAmount > 0
      ? enrollmentAmount
      : (invoice?.amount != null ? Number(invoice.amount) : form?.price != null ? Number(form.price) : 0)
    montantHt = fallbackAmount.toFixed(2)
    const cur = form?.currency || invoice?.currency || 'EUR'
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

  const variables: DocumentVariables = {
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
    ecole_site_web: org?.website || '',
    ecole_code_postal: (typeof orgPostalCode === 'string' ? orgPostalCode : '') || (organization?.address || '').match(/\d{5}/)?.[0] || '',
    
    // Format alternatif (organisation_*) pour compatibilité avec anciens templates
    organisation_nom: organization?.name || '',
    organisation_adresse: organization?.address || '',
    organisation_telephone: organization?.phone || '',
    organisation_email: organization?.email || '',
    organisation_logo: organization?.logo_url || '',
    organisation_site_web: org?.website || '',

    // Étudiant/Élève (utiliser les deux formats pour compatibilité)
    // Format standard (eleve_*)
    eleve_nom: student?.last_name || '',
    eleve_prenom: student?.first_name || '',
    eleve_numero: student?.student_number || '',
    eleve_date_naissance: student?.date_of_birth
      ? new Date(student.date_of_birth).toLocaleDateString('fr-FR')
      : '',
    eleve_classe: (student as StudentWithRelations & { classes?: { name: string } })?.classes
      ? (student as StudentWithRelations & { classes?: { name: string } }).classes!.name
      : '',
    eleve_photo: stud?.photo_url || '',
    eleve_adresse: stud?.address || '',
    eleve_code_postal: stud?.postal_code || '',
    eleve_ville: stud?.city || '',
    eleve_telephone: stud?.phone || '',
    eleve_email: stud?.email || '',

    // Entreprise / Client (table companies ou external_entities via fallback)
    // Les deux tables ont des noms de champs légèrement différents — on lit les deux
    entreprise_nom: company?.name || stud?.company_name || stud?.entreprise_nom || '',
    entreprise_adresse: company?.address || '',
    entreprise_code_postal: company?.postal_code || '',
    entreprise_ville: company?.city || '',
    entreprise_telephone: company?.phone || (company as unknown as Record<string, string>)?.contact_phone || '',
    entreprise_email: company?.email || company?.billing_email || (company as unknown as Record<string, string>)?.contact_email || '',
    entreprise_siret: company?.siret || '',
    entreprise_tva: (company as unknown as Record<string, string>)?.vat_number || (company?.metadata as Record<string, unknown> | null)?.tva_number as string || '',
    entreprise_contact: (() => {
      const c = company as unknown as Record<string, string> | null
      if (!c) return ''
      const first = c.contact_first_name || ''
      const last = c.contact_last_name || ''
      return `${first} ${last}`.trim()
    })(),
    entreprise_representant: (company as unknown as Record<string, string>)?.contact_job_title || '',

    tuteur_nom: stud?.tutor_name || stud?.representative_name || (student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() : ''),
    // Destinataire du devis : entreprise si disponible, sinon prénom + nom de l'étudiant
    destinataire_du_devis:
      (() => {
        const companyName = company?.name
        if (companyName && String(companyName).trim()) return String(companyName).trim()
        const ent = stud?.company_name || stud?.entreprise_nom
        if (ent && String(ent).trim()) return String(ent).trim()
        return student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() : ''
      })(),
    adresse_destinataire: company?.address || stud?.address || '',
    code_postal_destinataire: company?.postal_code || stud?.postal_code || '',
    ville_destinataire: company?.city || stud?.city || '',

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
    etudiant_adresse: stud?.address || '',
    etudiant_code_postal: stud?.postal_code || '',
    etudiant_ville: stud?.city || '',
    etudiant_telephone: stud?.phone || '',
    etudiant_email: stud?.email || '',
    etudiant_photo: stud?.photo_url || '',

    // Classe
    classe_nom: (student as StudentWithRelations & { classes?: { name: string } })?.classes
      ? (student as StudentWithRelations & { classes?: { name: string } }).classes!.name
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
    formation_objectifs: form?.objectives || prog?.objectives || '',
    formation_public_concerne: form?.target_audience || prog?.target_audience || '',
    formation_prerequis: form?.prerequisites || prog?.prerequisites || '',
    formation_qualite_et_resultats: form?.quality_indicators || prog?.quality_indicators || '',
    formation_contenu: form?.content || prog?.content || '',
    formation_equipe_pedagogique: form?.pedagogical_team || prog?.pedagogical_team || '',
    formation_ressources: form?.resources || prog?.resources || '',
    formation_supports: form?.materials || prog?.materials || '',
    session_lieu: sessionLieu,
    session_effectif: sess?.enrollment_count?.toString() || sess?.student_count?.toString() || (effectif ? String(effectif) : '') || '1',
    diplome_ou_certification: form?.certification || prog?.certification || '',
    ecole_region: (typeof orgRegion === 'string' ? orgRegion : '') || org?.region || org?.administrative_region || '',
    formation_prix: form?.price != null ? `${Number(form.price).toFixed(2)} ${form?.currency || 'EUR'}` : (invoice?.amount != null ? `${Number(invoice.amount).toFixed(2)} ${invoice?.currency || 'EUR'}` : (montantHt ? `${montantHt} EUR` : '')),
    // Programme
    programme_nom: program?.name || (session as SessionWithRelations)?.formations?.programs?.name || '',
    programme_code: prog?.code || '',
    programme_description: prog?.description || '',
    programme_sous_titre: prog?.subtitle || '',
    programme_categorie: prog?.category || '',
    programme_version: prog?.program_version || '',
    programme_date_version: prog?.version_date ? new Date(prog.version_date).toLocaleDateString('fr-FR') : '',
    programme_duree_heures: prog?.duration_hours != null ? `${prog.duration_hours} h` : '',
    programme_duree_jours: prog?.duration_days != null ? `${prog.duration_days} j` : '',
    programme_duree_totale: prog?.duration_hours
      ? `${prog.duration_hours} heures`
      : program?.formations
        ? `${program.formations.reduce((total, f) => total + (f.duration_hours || 0), 0)} heures`
        : '',
    programme_objectifs: prog?.pedagogical_objectives || tabsToHtml((prog as any)?.pedagogical_objectives_tabs) || prog?.objectives || '',
    programme_profil_apprenants: prog?.learner_profile || tabsToHtml((prog as any)?.learner_profile_tabs) || prog?.target_audience || '',
    programme_public_concerne: prog?.learner_profile || tabsToHtml((prog as any)?.learner_profile_tabs) || prog?.target_audience || '',
    programme_contenu: prog?.training_content || tabsToHtml((prog as any)?.training_content_tabs) || prog?.content || '',
    programme_suivi_execution: prog?.execution_follow_up || tabsToHtml((prog as any)?.execution_follow_up_tabs) || '',
    programme_modalites: prog?.modalities || '',
    programme_modalites_certification: prog?.certification_modalities || prog?.certification || '',
    programme_certification: prog?.certification_modalities || prog?.certification || '',
    programme_type_action: prog?.training_action_type || '',
    programme_qualite: prog?.quality || '',
    programme_eligible_cpf: prog?.eligible_cpf ? 'Oui' : (prog?.eligible_cpf === false ? 'Non' : ''),
    programme_code_cpf: prog?.cpf_code || '',
    programme_prix_entreprise: prog?.price_enterprise != null ? `${Number(prog.price_enterprise).toFixed(2)} €` : '',
    programme_prix_particulier: prog?.price_individual != null ? `${Number(prog.price_individual).toFixed(2)} €` : '',
    programme_prix_independant: prog?.price_freelance != null ? `${Number(prog.price_freelance).toFixed(2)} €` : '',
    programme_domaines_competences: prog?.competence_domains || '',
    programme_prerequis: prog?.prerequisites || '',
    programme_methodes_pedagogiques: prog?.pedagogical_methods || '',
    programme_delai_acces: prog?.access_delay_days != null ? `${prog.access_delay_days} jours ouvrés` : '',
    programme_accessibilite: prog?.accessibility_info || '',
    programme_nombre_formations: program?.formations ? `${program.formations.length}` : '',
    programme_nombre_sessions: '',

    // Facture
    numero_facture: invoice?.invoice_number || '',
    facture_numero: invoice?.invoice_number || '',
    reference_devis: (() => {
      const n = invoice?.notes
      if (!n) return ''
      const m = String(n).match(/Devis de référence\s*:\s*(.+)/)
      return m ? m[1].trim() : ''
    })(),
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
          const unit = Number.isFinite(amount) ? amount : 0
          return {
            nom: m.name || fallbackDesignation,
            prix_ht: unit.toFixed(2),
            total_ht: (unit * moduleQuantity).toFixed(2),
            quantite: moduleQuantity,
          }
        })
      }
      // Facture sans session : construire les lignes à partir des items de la facture
      const items = invoice?.items
      if (invoice && Array.isArray(items) && items.length > 0) {
        const invoiceAmount = Number(invoice.amount)
        const totalInvoice = Number.isFinite(invoiceAmount) ? invoiceAmount : 0
        return (items as InvoiceItemRow[]).map((item: InvoiceItemRow) => {
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
    })(),
    // Lignes HTML du tableau facture (Désignation, Qté, Prix unit. HT, Total HT) — une ligne par module, à injecter dans <tbody>
    modules_lignes_facture: (() => {
      const mods = (() => {
        if (sessionModules && sessionModules.length > 0) {
          return sessionModules.map((m) => {
            const amount = Number(m.amount)
            const unit = Number.isFinite(amount) ? amount : 0
            return {
              nom: m.name || fallbackDesignation,
              prix_ht: unit.toFixed(2),
              total_ht: (unit * moduleQuantity).toFixed(2),
              quantite: moduleQuantity,
            }
          })
        }
        const items = invoice?.items
        if (invoice && Array.isArray(items) && items.length > 0) {
          const invoiceAmount = Number(invoice.amount)
          const totalInvoice = Number.isFinite(invoiceAmount) ? invoiceAmount : 0
          return (items as InvoiceItemRow[]).map((item: InvoiceItemRow) => {
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
    montant_ttc: (sessionModules?.length || (enrollmentAmount != null && enrollmentAmount > 0))
      ? montantHt
      : (invoice?.total_amount ? Number(invoice.total_amount).toFixed(2) : '0.00'),
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
    mode_paiement: inv?.payment_method || '',
    date_paiement: inv?.paid_at
      ? new Date(inv.paid_at).toLocaleDateString('fr-FR')
      : '',
    ecole_siret: (typeof orgSiret === 'string' ? orgSiret : '') || org?.siret || '',
    ecole_numero_declaration: (typeof orgDeclarationNumber === 'string' ? orgDeclarationNumber : '') || org?.declaration_number || org?.nda_number || '',
    ecole_representant: (typeof orgRepresentative === 'string' ? orgRepresentative : '') || org?.representative_name || '',
    iban: org?.iban || (orgSettings && typeof orgSettings.iban === 'string' ? orgSettings.iban : '') || '',
    bic: org?.bic || (orgSettings && typeof orgSettings.bic === 'string' ? orgSettings.bic : '') || '',

    // Convocation
    convocation_objet: session?.name || formationName || 'Session de formation',
    convocation_date: sessionDebut,
    convocation_heure: sess?.start_time || (session?.start_date 
      ? new Date(session.start_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : '09:00'),
    convocation_lieu: sessionLieu || org?.city || '',
    convocation_adresse: sess?.address || organization?.address || '',
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

