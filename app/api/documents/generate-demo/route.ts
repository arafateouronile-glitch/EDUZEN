import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { isGotenbergConfigured, htmlToPdf } from '@/lib/services/gotenberg.service'

export const runtime = 'nodejs'
export const maxDuration = 60

const mmToInch = (mm: number) => `${(mm * 0.03937).toFixed(4)}`

// GET /api/documents/generate-demo
// Génère une convention d'exemple avec les vraies infos de l'organisme
export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, full_name')
    .eq('id', user.id)
    .single()

  if (!userData?.organization_id) {
    return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })
  }

  const orgId = userData.organization_id

  // Récupérer les infos réelles de l'organisme
  const { data: org } = await supabase
    .from('organizations')
    .select('name, logo_url, address, city, phone, email, siret, nda_number, settings')
    .eq('id', orgId)
    .single()

  // Récupérer le template convention de l'org
  const { data: template } = await supabase
    .from('document_templates')
    .select('*')
    .eq('organization_id', orgId)
    .eq('type', 'convention')
    .eq('is_default', true)
    .maybeSingle()

  if (!template) {
    return NextResponse.json({ error: 'Modèle de convention introuvable' }, { status: 404 })
  }

  const today = new Date()
  const sessionStart = new Date(today)
  const sessionEnd = new Date(today)
  sessionEnd.setDate(sessionEnd.getDate() + 2)

  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const postalCode = (org?.settings as Record<string, string> | null)?.postal_code ?? ''
  const orgAddress = [org?.address, postalCode, org?.city].filter(Boolean).join(', ')

  const variables = {
    // Organisme — données réelles
    ecole_nom: org?.name ?? 'Votre Organisme',
    ecole_logo: org?.logo_url ?? '',
    ecole_adresse: orgAddress || '1 rue de la Formation, 75001 Paris',
    ecole_ville: org?.city ?? 'Paris',
    ecole_telephone: org?.phone ?? '01 23 45 67 89',
    ecole_email: org?.email ?? 'contact@monorganisme.fr',
    ecole_siret: org?.siret ?? '000 000 000 00000',
    ecole_numero_declaration: org?.nda_number ?? '00000000000',
    ecole_representant: userData.full_name ?? 'Le Directeur',
    organisation_nom: org?.name ?? 'Votre Organisme',

    // Apprenant fictif réaliste
    etudiant_nom: 'Dupont',
    etudiant_prenom: 'Marie',
    etudiant_nom_complet: 'Marie Dupont',
    etudiant_date_naissance: '15/03/1985',
    etudiant_adresse: '12 avenue des Formations',
    etudiant_code_postal: '69002',
    etudiant_ville: 'Lyon',
    etudiant_telephone: '06 12 34 56 78',
    etudiant_email: 'marie.dupont@exemple.fr',

    // Programme et formation fictifs
    programme_nom: 'Management et Leadership',
    formation_nom: 'Initiation au management d\'équipe',
    formation_duree: '21 heures',
    formation_prix: '1 200,00 €',
    formation_objectifs: 'Acquérir les fondamentaux du management opérationnel',
    formation_modalites: 'Présentiel',

    // Session réaliste
    session_nom: 'Session Démo',
    session_date_debut: fmt(sessionStart),
    session_debut: fmt(sessionStart),
    session_date_fin: fmt(sessionEnd),
    session_fin: fmt(sessionEnd),
    session_lieu: org?.city ?? 'Paris',
    session_horaires: '9h00 – 17h00',
    session_effectif: '8 participants',

    // Finances
    montant: '1 200,00 €',
    montant_ttc: '1 200,00 €',
    montant_ht: '1 000,00 €',
    tva: '20%',
    mode_paiement: 'Virement bancaire',

    // Dates
    date_aujourd_hui: fmt(today),
    date_jour: fmt(today),
    date_emission: fmt(today),
    annee_courante: String(today.getFullYear()),
    annee_actuelle: String(today.getFullYear()),
    numero_document: 'DEMO-001',
  }

  try {
    const { generateHTML } = await import('@/lib/utils/document-generation/html-generator')
    const htmlResult = await generateHTML(template as unknown as Parameters<typeof generateHTML>[0], variables, undefined, orgId)
    const { html, margins } = htmlResult

    if (isGotenbergConfigured()) {
      const pdfBuffer = await htmlToPdf(html, {
        format: 'A4',
        marginTop: mmToInch(margins.top),
        marginBottom: mmToInch(margins.bottom),
        marginLeft: mmToInch(margins.left),
        marginRight: mmToInch(margins.right),
      })

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="Convention-Demo-${(org?.name ?? 'EduZen').replace(/\s+/g, '-')}.pdf"`,
        },
      })
    }

    // Fallback Puppeteer (import dynamique pour éviter le crash module au démarrage)
    const { createPage } = await import('@/lib/utils/puppeteer-pool')
    const page = await createPage()
    try {
      await page.setContent(html, { waitUntil: 'networkidle0' })
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: `${margins.top}mm`,
          bottom: `${margins.bottom}mm`,
          left: `${margins.left}mm`,
          right: `${margins.right}mm`,
        },
      })
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="Convention-Demo-${(org?.name ?? 'EduZen').replace(/\s+/g, '-')}.pdf"`,
        },
      })
    } finally {
      await page.close()
    }
  } catch (error) {
    logger.error('[generate-demo] Error generating PDF', error)
    return NextResponse.json({ error: 'Erreur lors de la génération du document démo' }, { status: 500 })
  }
}
