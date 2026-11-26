/**
 * Génération des documents des outils gratuits (/outils), côté serveur et sans
 * organisme en base : modèles par défaut d'EduZen remplis avec les données du
 * formulaire, feuille d'émargement et rapport Qualiopi.
 */

import type { DocumentTemplate, DocumentType, DocumentVariables } from '@/lib/types/document-templates'
import { getDefaultTemplateContent, getPremiumFooter, getPremiumHeader } from '@/lib/utils/document-template-defaults'
import { renderTemplatePdf } from '@/lib/utils/document-generation/render-template-pdf.server'
import { generateAttendanceSheetHtml, generateDefaultSlots } from '@/lib/utils/attendance-sheet/generate-html'
import { isGotenbergConfigured, htmlToPdf } from '@/lib/services/gotenberg.service'
import { EDUZEN_MENTION, type OutilKey } from '@/lib/outils/tools'
import { parseLearners, type OutilRequest } from '@/lib/outils/schemas'
import { computeQualiopiScore, type QualiopiScore } from '@/lib/outils/qualiopi-score'
import { buildQualiopiReportHtml } from '@/lib/outils/qualiopi-report-html'
import type { QualiopiAnswer } from '@/lib/outils/tools'
import { logger } from '@/lib/utils/logger'

export function frDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : iso
}

const todayFr = () => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris' }).format(new Date())

const MENTION_HTML = `<p style="font-size: 6.5pt; color: #9ca3af; text-align: center; margin: 2px 0 0 0;">${EDUZEN_MENTION}</p>`

const TEMPLATE_TYPES: Partial<Record<OutilKey, DocumentType>> = {
  convention: 'convention',
  reglement: 'reglement_interieur',
  certificat: 'certificat_realisation',
}

/** Variables de l'organisme (en-tête, pied, signataire) */
function organismeVariables(o: OutilRequest['organisme']): DocumentVariables {
  const org = o as Partial<Record<string, string>>
  return {
    ecole_nom: org.nom ?? '',
    ecole_adresse: org.adresse ?? '',
    ecole_code_postal: org.code_postal ?? '',
    ecole_ville: org.ville ?? '',
    ecole_siret: org.siret ?? '',
    ecole_numero_declaration: org.nda ?? '',
    ecole_region: org.region ?? '',
    ecole_representant: org.representant ?? '',
    ecole_email: org.email ?? '',
    ecole_telephone: org.telephone ?? '',
    ecole_logo: org.logo ?? '',
    date_jour: todayFr(),
  } as DocumentVariables
}

/** Variables propres à chaque modèle de document */
export function buildToolVariables(tool: OutilKey, request: OutilRequest): DocumentVariables {
  const base = organismeVariables(request.organisme)
  const f = request.fields as Record<string, string>
  switch (tool) {
    case 'convention':
      return {
        ...base,
        // Le bénéficiaire peut être un apprenant ou une entreprise cliente
        eleve_prenom: '',
        eleve_nom: f.beneficiaire,
        formation_nom: f.formation_nom,
        formation_duree: f.formation_duree,
        formation_objectifs: f.formation_objectifs,
        formation_contenu: f.formation_contenu,
        formation_prerequis: f.formation_prerequis,
        formation_public_concerne: f.formation_public,
        session_debut: frDate(f.session_debut),
        session_fin: frDate(f.session_fin),
        session_lieu: f.session_lieu,
        session_effectif: f.session_effectif,
        montant_ht: f.montant_ht,
      } as DocumentVariables
    case 'reglement':
      return {
        ...base,
        horaires_ouverture: f.horaires_ouverture,
        horaires_cours: f.horaires_cours,
        annee_scolaire: f.annee || String(new Date().getFullYear()),
      } as DocumentVariables
    case 'certificat':
      return {
        ...base,
        eleve_nom: f.eleve_nom,
        eleve_prenom: f.eleve_prenom,
        entreprise_nom: f.entreprise_nom,
        formation_nom: f.formation_nom,
        formation_duree: f.formation_duree,
        session_debut: frDate(f.session_debut),
        session_fin: frDate(f.session_fin),
      } as DocumentVariables
    default:
      return base
  }
}

/** Modèle par défaut construit en mémoire, avec la mention EduZen en pied */
function inMemoryTemplate(type: DocumentType): DocumentTemplate {
  const defaults = getDefaultTemplateContent(type)
  return {
    id: `outil-${type}`,
    organization_id: 'outils',
    type,
    name: defaults.name,
    header: { enabled: true, height: 100, elements: [], repeatOnAllPages: true, content: getPremiumHeader() },
    content: { pageSize: 'A4', margins: { top: 20, right: 20, bottom: 20, left: 20 }, elements: [], html: defaults.bodyContent },
    footer: { enabled: true, height: 60, elements: [], repeatOnAllPages: true, content: getPremiumFooter() + MENTION_HTML },
    header_enabled: true,
    header_height: 100,
    footer_enabled: true,
    footer_height: 60,
  } as unknown as DocumentTemplate
}

/** HTML autonome (avec @page) → PDF : Gotenberg, Puppeteer en secours hors Vercel */
async function standaloneHtmlToPdf(html: string, landscape: boolean): Promise<Buffer> {
  if (isGotenbergConfigured()) {
    try {
      const buf = await htmlToPdf(html, { preferCssPageSize: true, marginTop: '0', marginBottom: '0', marginLeft: '0', marginRight: '0' })
      if (buf?.length) return Buffer.from(buf)
    } catch (error) {
      logger.warn('[outils] Gotenberg échoué, bascule vers Puppeteer', { error: error instanceof Error ? error.message : String(error) })
    }
  }
  if (process.env.VERCEL === '1') throw new Error('Génération PDF indisponible (GOTENBERG_URL)')
  const { createPage } = await import('@/lib/utils/puppeteer-pool')
  const page = await createPage()
  try {
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 })
    return Buffer.from(await page.pdf({ format: 'A4', landscape, printBackground: true, preferCSSPageSize: true }))
  } finally {
    await page.close().catch(() => undefined)
  }
}

export function buildEmargementHtml(request: OutilRequest): string {
  const f = request.fields as Record<string, string>
  const o = request.organisme as Partial<Record<string, string>>
  const html = generateAttendanceSheetHtml({
    organization: { name: o.nom ?? '', nda_number: o.nda || null, address: o.adresse || null, city: o.ville || null, logo_url: o.logo || null },
    session: { name: f.formation_nom, start_date: f.session_debut, end_date: f.session_fin, location: f.session_lieu || null },
    formation: { name: f.formation_nom },
    teacher: f.formateur ? { full_name: f.formateur } : null,
    students: parseLearners(f.apprenants),
    slots: generateDefaultSlots(f.session_debut, f.session_fin),
  })
  const initials = (o.nom ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0]!.toUpperCase())
    .join('')
    .replace(/[<>&"]/g, '')
  return html
    // Sans logo : les initiales de l'organisme plutôt que la vignette EDUZEN du logiciel
    .replace('>EDUZEN</span>', `>${initials}</span>`)
    .replaceAll('Document généré par EDUZEN', EDUZEN_MENTION)
}

export interface GeneratedOutil {
  pdf: Buffer
  qualiopi?: QualiopiScore
}

export async function generateOutilPdf(tool: OutilKey, request: OutilRequest): Promise<GeneratedOutil> {
  const templateType = TEMPLATE_TYPES[tool]
  if (templateType) {
    return { pdf: await renderTemplatePdf(inMemoryTemplate(templateType), buildToolVariables(tool, request)) }
  }

  if (tool === 'emargement') {
    return { pdf: await standaloneHtmlToPdf(buildEmargementHtml(request), true) }
  }

  const answers = Object.fromEntries(
    Object.entries((request.fields as { answers: Record<string, QualiopiAnswer> }).answers).map(([k, v]) => [Number(k), v])
  )
  const result = computeQualiopiScore(answers)
  const html = buildQualiopiReportHtml({ organizationName: request.organisme.nom, date: todayFr(), result })
  return { pdf: await standaloneHtmlToPdf(html, false), qualiopi: result }
}
