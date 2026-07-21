/**
 * POST /api/bpf/export-pdf
 *
 * Remplit le vrai formulaire CERFA 10443 (BPF) avec les données de l'organisation
 * et retourne un PDF prêt à télécharger / déposer sur monactiviteformation.emploi.gouv.fr
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib'
import fs from 'fs/promises'
import path from 'path'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { BPFService } from '@/lib/services/bpf.service'
import { QuotaService } from '@/lib/services/quota.service'
import { logger } from '@/lib/utils/logger'
import { heavyRateLimiter, createRateLimitResponse } from '@/lib/utils/rate-limiter'
import type { BPFCerfaData } from '@/lib/services/bpf.service'

export const runtime = 'nodejs'
export const maxDuration = 30

// ── Helpers ────────────────────────────────────────────────────────────────────

const BLUE = rgb(0.08, 0.18, 0.62)
interface DrawOpts {
  font: PDFFont
  size: number
}

/** Formate un entier selon la locale française.
 *  Remplace l'espace fine insécable   par un espace normal —
 *  Helvetica (WinAnsi) ne peut pas encoder  . */
function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
    .format(Math.round(n || 0))
    .replace(/\u202F/g, ' ')
}

/** Formate un SIRET en "XXX XXX XXX XXXXX" */
function fmtSiret(siret: string): string {
  const s = siret.replace(/\s/g, '')
  if (s.length !== 14) return siret
  return `${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6, 9)} ${s.slice(9)}`
}

/**
 * Écrit du texte aligné à droite à l'intérieur d'une case dont on connaît le bord droit (x1).
 * Compatible avec le système de coordonnées pdf-lib (y = depuis le bas de la page).
 */
function drawRight(page: PDFPage, text: string, x1: number, y: number, opts: DrawOpts, padding = 3) {
  if (!text || text === '0') return
  const w = opts.font.widthOfTextAtSize(text, opts.size)
  page.drawText(text, { x: x1 - w - padding, y, font: opts.font, size: opts.size, color: BLUE })
}

/** Écrit du texte aligné à gauche (champs texte libres : nom, adresse…) */
function drawText(page: PDFPage, text: string, x: number, y: number, opts: DrawOpts) {
  if (!text) return
  page.drawText(text, { x, y, font: opts.font, size: opts.size, color: BLUE })
}

// ── Remplissage du CERFA ───────────────────────────────────────────────────────

/**
 * Charge le template CERFA.
 * Essaie d'abord le filesystem (dev), puis l'URL statique dérivée de la requête
 * entrante (prod Vercel — les fichiers public/ ne sont pas toujours bundlés avec
 * la fonction serverless mais sont toujours servis en CDN).
 */
async function loadCerfaTemplate(requestOrigin: string): Promise<Buffer> {
  const cerfaPath = path.join(process.cwd(), 'public', 'cerfa', 'cerfa_10443.pdf')
  try {
    return await fs.readFile(cerfaPath)
  } catch {
    const res = await fetch(`${requestOrigin}/cerfa/cerfa_10443.pdf`)
    if (!res.ok) throw new Error(`Impossible de charger le template CERFA (${res.status})`)
    return Buffer.from(await res.arrayBuffer())
  }
}

async function fillCerfa(data: BPFCerfaData, requestOrigin: string): Promise<Uint8Array> {
  const existingPdfBytes = await loadCerfaTemplate(requestOrigin)

  const pdfDoc = await PDFDocument.load(existingPdfBytes)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const page1 = pdfDoc.getPage(0) // Cadre A, B, C, D
  const page2 = pdfDoc.getPage(1) // Cadre E, F, G, H

  const s8: DrawOpts = { font, size: 8 }
  const s8b: DrawOpts = { font: fontBold, size: 8 }
  const s9: DrawOpts = { font, size: 9 }

  // ── PAGE 1 ──────────────────────────────────────────────────────────────────

  // A. Identification de l'organisme
  const { organization: org, year } = data

  // Numéro de déclaration d'activité (NDA) — cases |___|___| ... à x≈120, y≈674
  drawText(page1, org.nda_number || '', 120, 674, s8)

  // SIRET — cases |___|___| ... à x≈300, y≈660
  drawText(page1, fmtSiret(org.siret || ''), 300, 660, s8)

  // Nom/dénomination — à droite du libellé (x≈220, y≈643)
  drawText(page1, org.name || '', 220, 643, s9)

  // Adresse
  if (org.address) drawText(page1, org.address, 70, 611, s8)
  const cityLine = [org.postal_code, org.city].filter(Boolean).join(' ')
  if (cityLine) drawText(page1, cityLine, 70, 597, s8)

  // B. Exercice comptable — année
  drawText(page1, `01  01  ${year}`, 281, 508, s8)
  drawText(page1, `31  12  ${year}`, 388, 508, s8)

  // ── CADRE C — Bilan financier : Origine des produits ──────────────────────
  //
  // Coordonnées mesurées sur le CERFA 10443*17 (page 1)
  // x1 = bord droit de la case (pdfplumber), y = baseline pypdf (depuis bas page)
  //
  // L1  — Entreprises (plan de développement / contrat direct)
  drawRight(page1, fmt(data.cadreF.companies), 557.7, 442, s8b)

  // L2  — Organismes gestionnaires des fonds (OPCO, etc.)
  //   L2e — CPF (compte personnel de formation)
  drawRight(page1, fmt(data.cadreF.cpf), 530.9, 358, s8)
  //   Total L2 — tous fonds OPCO/FAF/CPF/Pro-A…
  drawRight(page1, fmt(data.cadreF.opco), 557.7, 302, s8b)

  // L5  — État (financement public direct)
  drawRight(page1, fmt(data.cadreF.state), 557.7, 260, s8)

  // L6  — Conseils régionaux
  drawRight(page1, fmt(data.cadreF.regions), 557.7, 246, s8)

  // L7  — France Travail (ex Pôle emploi)
  drawRight(page1, fmt(data.cadreF.pole_emploi), 557.7, 232, s8)

  // L9  — Contrats avec des personnes à titre individuel (particuliers)
  drawRight(page1, fmt(data.cadreF.individuals), 557.7, 204, s8)

  // L11 — Autres produits au titre de la FP
  drawRight(page1, fmt(data.cadreF.other), 557.7, 176, s8)

  // TOTAL général (case large)
  drawRight(page1, fmt(data.cadreF.total), 561.1, 159, s8b)

  // ── PAGE 2 ──────────────────────────────────────────────────────────────────
  //
  // F-1. Type de stagiaires — TOTAL (a+b+c+d+e)
  //   Nb stagiaires  x1=442.6, y≈561
  drawRight(page2, fmt(data.cadreG.total), 442.6, 561, s8b)
  //   Nb heures      x1=572.2, y≈561
  drawRight(page2, fmt(data.cadreH.total_hours), 572.2, 561, s8b)

  // F-3. Objectif général — TOTAL (a+b+c+d+e+f)
  //   On inscrit le total global (les sous-lignes restent à compléter manuellement)
  drawRight(page2, fmt(data.cadreG.total), 442.6, 322, s8b)
  drawRight(page2, fmt(data.cadreH.total_hours), 572.2, 322, s8b)

  // F-4. Spécialités — TOTAL
  drawRight(page2, fmt(data.cadreG.total), 442.6, 183, s8b)
  drawRight(page2, fmt(data.cadreH.total_hours), 572.2, 183, s8b)

  return pdfDoc.save()
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rl = await heavyRateLimiter.check(request)
  if (!rl.allowed) {
    return createRateLimitResponse(rl.remaining, rl.resetTime) as unknown as NextResponse
  }

  try {
    const supabaseAuth = await createClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { year } = body as { year?: number }
    if (!year || typeof year !== 'number') {
      return NextResponse.json({ error: 'Paramètre "year" requis' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const orgId = await getUserOrgId(supabase, user.id)
    if (!orgId) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
    }

    const hasBpfExport = await new QuotaService(supabase).hasFeature(orgId, 'bpf_export')
    if (!hasBpfExport) {
      return NextResponse.json(
        { error: 'L\'export BPF n\'est pas disponible dans votre forfait', code: 'FEATURE_NOT_AVAILABLE' },
        { status: 403 }
      )
    }

    const bpfService = new BPFService(supabase)
    const cerfaData = await bpfService.prepareCerfaData(orgId, year)

    const origin = new URL(request.url).origin
    const pdfBytes = await fillCerfa(cerfaData, origin)
    const filename = `BPF_CERFA10443_${year}_${cerfaData.organization.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`

    logger.info('[BPF CERFA] Formulaire rempli', { year, org: cerfaData.organization.name })

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-PDF-Engine': 'pdf-lib-cerfa',
      },
    })
  } catch (error) {
    logger.error('[BPF CERFA] Erreur', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 },
    )
  }
}
