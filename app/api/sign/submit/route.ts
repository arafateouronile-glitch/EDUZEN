/**
 * POST /api/sign/submit
 * Soumet une signature (document ou émargement) avec chaîne de preuve.
 * Document : scellement PDF (signature + nom, date, IP), upload, envoi signé au client + admin.
 * Métadonnées : IP, User-Agent, fingerprint, timestamp UTC, géolocation optionnelle.
 * Scellement SHA-256 → digital_evidence (INSERT uniquement, admin client).
 */

import type { NextRequest} from 'next/server';
import type { Json } from '@/types/database.types'
import type { TableUpdate, TableInsert } from '@/lib/types/supabase-helpers'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  computeIntegrityHash,
  getSignatureEvidenceSecret,
  type SignatureMetadata,
} from '@/lib/utils/signature-evidence'
import { sealPdf } from '@/lib/utils/seal-pdf'
import { sanitizeForPDF } from '@/lib/utils/pdf-sanitizer'
import {
  extractStoragePathFromPublicUrl,
  downloadDocumentPdf,
} from '@/lib/utils/sign-document-helpers'
import { sendSignedPdfEmails, sendSignatureNotificationEmails } from '@/lib/utils/send-signed-pdf-email'
import { logger } from '@/lib/utils/logger'
import { autoAdvanceProspectCommercialStatus } from '@/lib/actions/learner-crm-actions'
import { NotificationService } from '@/lib/services/notification.service'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

/** Client admin avec .from(table: string) pour tables éventuellement absentes du schéma typé */
type AdminClient = ReturnType<typeof createAdminClient>
type AdminDbAnyTable = Omit<AdminClient, 'from'> & {
  from(table: string): any
}

/** Zone de signature (metadata ou template sign_zones) */
interface SignZoneRaw {
  id?: string
  page?: number
  x?: number
  y?: number
  w?: number
  h?: number
  label?: string
}

/** Types pour les lignes retournées par les selects (éviter SelectQueryError) */
type SignatoryRow = { id: string; process_id: string; email?: string | null; name?: string | null; order_index: number; signed_at: string | null }
type ProcessRow = {
  id: string
  organization_id: string
  document_id: string
  status: string
  current_index: number | null
  intermediate_pdf_path: string | null
  intermediate_pdf_url?: string | null
  document?: { id?: string; title?: string; file_url?: string; type?: string; metadata?: unknown; template_id?: string } | null
}

/** Résolu par token (signature ou attendance) — pas process */
type ResolvedByToken =
  | { type: 'signature'; sig: Record<string, unknown>; att: null }
  | { type: 'attendance'; sig: null; att: Record<string, unknown> }

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(s: string): boolean {
  return UUID_REGEX.test(s)
}

function getIp(req: NextRequest): string | undefined {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    undefined
  )
}

/** Type du document (table documents) → type du template (document_templates). Les documents utilisent "contract", les templates "contrat". */
function documentTypeToTemplateType(docType: string): string {
  if (docType === 'contract') return 'contrat'
  return docType
}

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      token,
      signatureData,
      attestation,
      fingerprint,
      geolocation,
    }: {
      token?: string
      signatureData?: string
      attestation?: boolean
      fingerprint?: string
      geolocation?: { lat: number; lng: number; accuracy?: number }
    } = body

    if (!token?.trim() || !signatureData?.trim()) {
      return NextResponse.json(
        { error: 'Token et signature requis' },
        { status: 400 }
      )
    }

    if (attestation !== true) {
      return NextResponse.json(
        { error: 'Vous devez certifier sur l\'honneur être présent et accepter les conditions.' },
        { status: 400 }
      )
    }

    let secret: string
    try {
      secret = getSignatureEvidenceSecret()
    } catch (e) {
      logger.error('SIGNATURE_EVIDENCE_SECRET manquant ou invalide:', e)
      return NextResponse.json(
        { error: 'Configuration serveur de signature manquante. Contactez l\'administrateur.' },
        { status: 503 }
      )
    }

    const metadata: SignatureMetadata = {
      ip: getIp(request),
      user_agent: request.headers.get('user-agent') ?? undefined,
      fingerprint: typeof fingerprint === 'string' ? fingerprint : undefined,
      timestamp_utc: new Date().toISOString(),
      geolocation:
        geolocation &&
        typeof geolocation.lat === 'number' &&
        typeof geolocation.lng === 'number'
          ? {
              lat: geolocation.lat,
              lng: geolocation.lng,
              accuracy: typeof geolocation.accuracy === 'number' ? geolocation.accuracy : undefined,
            }
          : undefined,
    }

    const supabase = createAdminClient()
    const db = supabase as AdminDbAnyTable
    const t = token.trim()

    const resolveByUuid = async () => {
      if (!isUuid(t)) return { type: null, sig: null, att: null }
      const [sig, att] = await Promise.all([
        supabase
          .from('signature_requests')
          .select(
            'id, organization_id, document_id, requester_id, recipient_email, recipient_name, recipient_id, status, signature_token'
          )
          .eq('access_token', t)
          .maybeSingle(),
        supabase
          .from('electronic_attendance_requests')
          .select(
            'id, organization_id, attendance_session_id, student_id, student_email, student_name, status, signature_token, attendance_session:electronic_attendance_sessions(session_id, date, require_geolocation, latitude, longitude, allowed_radius_meters)'
          )
          .eq('access_token', t)
          .maybeSingle(),
      ])
      const type = sig.data ? 'signature' : att.data ? 'attendance' : null
      return {
        type: type as 'signature' | 'attendance' | null,
        sig: sig.data as Record<string, unknown> | null,
        att: att.data as Record<string, unknown> | null,
      }
    }

    const resolveByLegacy = async () => {
      const [sig, att] = await Promise.all([
        supabase
          .from('signature_requests')
          .select(
            'id, organization_id, document_id, requester_id, recipient_email, recipient_name, recipient_id, status, signature_token'
          )
          .eq('signature_token', t)
          .maybeSingle(),
        supabase
          .from('electronic_attendance_requests')
          .select(
            'id, organization_id, attendance_session_id, student_id, student_email, student_name, status, signature_token, attendance_session:electronic_attendance_sessions(session_id, date, require_geolocation, latitude, longitude, allowed_radius_meters)'
          )
          .eq('signature_token', t)
          .maybeSingle(),
      ])
      const type = sig.data ? 'signature' : att.data ? 'attendance' : null
      return {
        type: type as 'signature' | 'attendance' | null,
        sig: sig.data as Record<string, unknown> | null,
        att: att.data as Record<string, unknown> | null,
      }
    }

    let resolved:
      | { type: 'signature'; sig: Record<string, unknown>; att: null }
      | { type: 'attendance'; sig: null; att: Record<string, unknown> }
      | { type: 'process'; process: Record<string, unknown>; signatory: Record<string, unknown> }
      | { type: null; sig: null; att: null }

    const byUuid = await resolveByUuid()
    const byLegacy = await resolveByLegacy()
    if (byUuid.type) resolved = byUuid as ResolvedByToken
    else if (byLegacy.type) resolved = byLegacy as ResolvedByToken
    else {
      if (isUuid(t)) {
        const { data: sigRaw } = await db
          .from('signatories')
          .select('id, process_id, email, name, order_index, signed_at')
          .eq('token', t)
          .maybeSingle()
        const sig = sigRaw as SignatoryRow | null
        if (sig && !sig.signed_at) {
          const { data: procRaw } = await db
            .from('signing_processes')
            .select(
              'id, organization_id, document_id, status, current_index, intermediate_pdf_path, document:documents(id, title, file_url, type, metadata, template_id)'
            )
            .eq('id', sig.process_id)
            .single()
          const proc = procRaw as ProcessRow | null
          if (
            proc &&
            proc.status !== 'completed' &&
            (proc.current_index ?? 0) === sig.order_index
          ) {
            resolved = { type: 'process', process: proc, signatory: sig }
          } else resolved = { type: null, sig: null, att: null }
        } else resolved = { type: null, sig: null, att: null }
      } else resolved = { type: null, sig: null, att: null }
    }

    if (!resolved.type) {
      return NextResponse.json(
        { error: 'Lien invalide ou expiré' },
        { status: 404 }
      )
    }

    const orgId =
      resolved.type === 'process'
        ? (resolved.process.organization_id as string)
        : ((resolved.sig ?? resolved.att)!.organization_id as string)
    const signerEmail =
      resolved.type === 'process'
        ? (resolved.signatory.email as string).trim()
        : ((resolved.sig?.recipient_email ?? resolved.att?.student_email) as string).trim()

    const integrityHash = computeIntegrityHash(
      signerEmail,
      signatureData.trim(),
      metadata,
      secret
    )

    if (resolved.type === 'process') {
      const proc = resolved.process
      const sig = resolved.signatory
      const procId = proc.id as string
      const docId = proc.document_id as string
      const doc = (proc.document as Record<string, unknown>) ?? {}
      const signerName = (sig.name as string) ?? 'Signataire'
      const orderIndex = sig.order_index as number
      const signatoryId = sig.id as string
      const allSignatories = await db
        .from('signatories')
        .select('id, order_index')
        .eq('process_id', procId)
        .order('order_index', { ascending: true })
      const list = (allSignatories.data ?? []) as unknown as Array<{ order_index: number }>
      const isLast = orderIndex === list.length - 1

      const bucket = 'documents'
      const orgIdP = proc.organization_id as string
      let currentPdfPath: string
      let currentPdfBytes: Uint8Array

      if (orderIndex === 0) {
        const fileUrl = doc.file_url as string
        if (!fileUrl) {
          return NextResponse.json(
            { error: 'Document sans fichier PDF' },
            { status: 404 }
          )
        }
        const path = extractStoragePathFromPublicUrl(fileUrl, SUPABASE_URL)
        if (!path) {
          return NextResponse.json(
            { error: 'URL du document non supportée' },
            { status: 400 }
          )
        }
        currentPdfBytes = await downloadDocumentPdf(supabase, path)
        currentPdfPath = path
      } else {
        const interm = proc.intermediate_pdf_path as string
        if (!interm) {
          return NextResponse.json(
            { error: 'PDF intermédiaire indisponible' },
            { status: 404 }
          )
        }
        const { data: blob } = await supabase.storage.from(bucket).download(interm)
        if (!blob) {
          return NextResponse.json(
            { error: 'Impossible de charger le PDF intermédiaire' },
            { status: 500 }
          )
        }
        currentPdfBytes = new Uint8Array(await blob.arrayBuffer())
        currentPdfPath = interm
      }

      const docType = (doc.type as string) ?? 'convention'
      const docMeta = (doc.metadata as Record<string, unknown>) ?? {}
      const metaZones = Array.isArray(docMeta.sign_zones) ? docMeta.sign_zones : null
      let zones: Array<{ id: string; page: number; x: number; y: number; w: number; h: number; label?: string }> | undefined
      if (metaZones?.length) {
        zones = (metaZones as SignZoneRaw[])
          .filter((z): z is SignZoneRaw & { id: string } => !!z && typeof z === 'object' && typeof z.id === 'string')
          .map((z) => ({
            id: String(z.id),
            page: Number(z.page) || 1,
            x: Number(z.x) ?? 0,
            y: Number(z.y) ?? 0,
            w: Number(z.w) ?? 0.15,
            h: Number(z.h) ?? 0.05,
            label: z.label,
          }))
      } else {
        const templateType = documentTypeToTemplateType(docType)
        const { data: tpl } = await db
          .from('document_templates')
          .select('sign_zones')
          .eq('organization_id', orgIdP)
          .eq('type', templateType)
          .order('is_default', { ascending: false })
          .limit(1)
          .maybeSingle()
        const raw = ((tpl as { sign_zones?: unknown } | null)?.sign_zones ?? []) as SignZoneRaw[]
        if (Array.isArray(raw) && raw.length > 0) {
          zones = raw
            .filter((z): z is SignZoneRaw & { id: string } => !!z && typeof z === 'object' && typeof z.id === 'string')
            .map((z) => ({
              id: String(z.id),
              page: Number(z.page) || 1,
              x: Number(z.x) ?? 0,
              y: Number(z.y) ?? 0,
              w: Number(z.w) ?? 0.15,
              h: Number(z.h) ?? 0.05,
              label: z.label,
            }))
        }
      }

      const signedAt = new Date().toISOString()
      const safeSignerName = sanitizeForPDF(signerName)
      const safeSignerEmail = sanitizeForPDF(signerEmail, 100)

      let orgSignatureDataUrlP: string | undefined
      const { data: orgRowP } = await db
        .from('organizations')
        .select('signature_url, stamp_url')
        .eq('id', orgIdP)
        .maybeSingle()
      const orgRowPCast = orgRowP as { signature_url?: string; stamp_url?: string } | null
      const orgImageUrlP = (orgRowPCast?.signature_url as string) || (orgRowPCast?.stamp_url as string)
      if (orgImageUrlP?.trim()) {
        try {
          const imgRes = await fetch(orgImageUrlP.trim())
          if (imgRes.ok) {
            const blob = await imgRes.blob()
            const buf = await blob.arrayBuffer()
            const base64 = Buffer.from(buf).toString('base64')
            const mime = blob.type || 'image/png'
            orgSignatureDataUrlP = `data:${mime};base64,${base64}`
          }
        } catch {
          // Ignorer si l'image OF est inaccessible
        }
      }

      const { sealedPdf: sealed, integrityHash: pdfHash } = await sealPdf(
        currentPdfBytes,
        signatureData.trim(),
        {
          signerName: safeSignerName,
          signerEmail: safeSignerEmail,
          signedAt,
          ip: metadata.ip,
          zones,
          signZoneId: 'sig_stagiaire',
          orgSignatureImageDataUrl: orgSignatureDataUrlP,
        }
      )

      if (isLast) {
        const finalPath = `signed/${orgIdP}/convention_signee_${docId}.pdf`
        const { error: upErr } = await supabase.storage
          .from(bucket)
          .upload(finalPath, sealed, { contentType: 'application/pdf', cacheControl: '3600', upsert: false })
        if (upErr) {
          logger.error('Upload PDF final process:', upErr)
          return NextResponse.json(
            { error: 'Erreur lors de l\'enregistrement du document signé.' },
            { status: 500 }
          )
        }
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(finalPath)
        await db
          .from('documents')
          .update({
            signed_file_path: finalPath,
            signed_file_url: urlData.publicUrl,
            status: 'signed',
            signed_at: signedAt,
            updated_at: signedAt,
          } satisfies TableUpdate<'documents'>)
          .eq('id', docId)
          .eq('organization_id', orgIdP)

        await db
          .from('signatories')
          .update({ signed_at: signedAt, signature_data: signatureData.trim() } satisfies TableUpdate<'signatories'>)
          .eq('id', signatoryId)

        await db
          .from('signing_processes')
          .update({
            status: 'completed',
            current_index: (proc.current_index as number) ?? 0,
            intermediate_pdf_path: null,
            intermediate_pdf_url: null,
            updated_at: signedAt,
          } satisfies TableUpdate<'signing_processes'>)
          .eq('id', procId)

        const { error: evErr } = await db
          .from('digital_evidence')
          .insert({
            organization_id: orgIdP,
            request_type: 'process',
            request_id: procId,
            signer_email: signerEmail,
            signature_data: signatureData.trim(),
            metadata: { ...metadata, signatory_id: signatoryId, pdf_integrity_hash: pdfHash } as Json,
            integrity_hash: pdfHash,
          } satisfies TableInsert<'digital_evidence'>)
        if (evErr) {
          logger.error('digital_evidence process:', evErr)
          return NextResponse.json(
            { error: 'Erreur lors de l\'enregistrement de la preuve.' },
            { status: 500 }
          )
        }

        const { SigningProcessService } = await import('@/lib/services/signing-process.service')
        const svc = new SigningProcessService(supabase)
        const docTitle = (doc.title as string) ?? 'Document'
        const { data: adminUser } = await db
          .from('users')
          .select('email')
          .eq('organization_id', orgIdP)
          .in('role', ['admin', 'secretary'])
          .limit(1)
          .maybeSingle()
        const adminEmail = ((adminUser as { email?: string } | null)?.email as string) ?? ''
        await svc.sendFinalToAll(procId, sealed, docTitle, adminEmail)

        return NextResponse.json({
          success: true,
          type: 'process',
          integrityHash: pdfHash,
          message: 'Signature enregistrée. La convention a été signée par toutes les parties. Une copie vous a été envoyée par email.',
        })
      }

      const nextIndex = orderIndex + 1
      const intermPath = `${orgIdP}/documents/processes/${procId}/intermediate.pdf`
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(intermPath, sealed, { contentType: 'application/pdf', cacheControl: '3600', upsert: true })
      if (upErr) {
        logger.error('Upload PDF intermédiaire process:', upErr)
        return NextResponse.json(
          { error: 'Erreur lors de l\'enregistrement du document.' },
          { status: 500 }
        )
      }
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(intermPath)

      await db
        .from('signatories')
        .update({ signed_at: signedAt, signature_data: signatureData.trim() } satisfies TableUpdate<'signatories'>)
        .eq('id', signatoryId)

      await db
        .from('signing_processes')
        .update({
          status: 'partially_signed',
          current_index: nextIndex,
          intermediate_pdf_path: intermPath,
          intermediate_pdf_url: urlData.publicUrl,
          updated_at: signedAt,
        } satisfies TableUpdate<'signing_processes'>)
        .eq('id', procId)

      const { error: evErr } = await db.from('digital_evidence').insert({
        organization_id: orgIdP,
        request_type: 'process',
        request_id: procId,
        signer_email: signerEmail,
        signature_data: signatureData.trim(),
        metadata: { ...metadata, signatory_id: signatoryId, pdf_integrity_hash: pdfHash } as Json,
        integrity_hash: pdfHash,
      } satisfies TableInsert<'digital_evidence'>)
      if (evErr) {
        logger.error('digital_evidence process:', evErr)
        return NextResponse.json(
          { error: 'Erreur lors de l\'enregistrement de la preuve.' },
          { status: 500 }
        )
      }

      const { SigningProcessService } = await import('@/lib/services/signing-process.service')
      const svc = new SigningProcessService(supabase)
      await svc.sendNextEmail(procId)

      return NextResponse.json({
        success: true,
        type: 'process',
        integrityHash: pdfHash,
        message: 'Signature enregistrée. Le prochain signataire va recevoir le lien par email.',
      })
    }

    if (resolved.type === 'signature' && resolved.sig) {
      if (resolved.sig.status !== 'pending') {
        return NextResponse.json({
          success: true,
          alreadySigned: true,
          message: 'Cette demande a déjà été signée.',
        })
      }

      const docId = resolved.sig.document_id as string
      const signerName = (resolved.sig.recipient_name as string) ?? 'Signataire'
      let signerId = resolved.sig.requester_id as string | null
      if (!signerId) {
        const { data: fallbackUser } = await db
          .from('users')
          .select('id')
          .eq('organization_id', orgId)
          .in('role', ['admin', 'secretary'])
          .limit(1)
          .maybeSingle()
        signerId = (fallbackUser as { id?: string } | null)?.id ?? null
      }
      if (!signerId) {
        logger.error('Aucun utilisateur requester ou admin trouvé pour document_signatures', { orgId })
        return NextResponse.json(
          { error: 'Configuration de la demande invalide. Contactez l\'administrateur.' },
          { status: 500 }
        )
      }

      const { data: docRow, error: docErr } = await db
        .from('documents')
        .select('id, title, file_url, organization_id, type, metadata, template_id')
        .eq('id', docId)
        .single()

      if (docErr || !docRow) {
        logger.error('Document introuvable pour signature:', { docId, error: docErr })
        return NextResponse.json(
          { error: 'Document introuvable.' },
          { status: 404 }
        )
      }

      const docRowCast = docRow as unknown as { id: string; file_url?: string; title?: string; type?: string; metadata?: unknown; template_id?: string }
      const fileUrl = docRowCast.file_url as string | null
      const docTitle = (docRowCast?.title as string) ?? 'Document'
      const docType = (docRowCast?.type as string) ?? 'convention'
      const docMeta = (docRowCast?.metadata as Record<string, unknown>) ?? {}
      const metaZones = Array.isArray(docMeta.sign_zones) ? docMeta.sign_zones : null

      let zones: Array<{ id: string; page: number; x: number; y: number; w: number; h: number; label?: string }> | undefined
      if (metaZones && metaZones.length > 0) {
        zones = (metaZones as SignZoneRaw[])
          .filter((z): z is SignZoneRaw & { id: string } => !!z && typeof z === 'object' && typeof z.id === 'string')
          .map((z) => ({
            id: String(z.id),
            page: Number(z.page) || 1,
            x: Number(z.x) ?? 0,
            y: Number(z.y) ?? 0,
            w: Number(z.w) ?? 0.15,
            h: Number(z.h) ?? 0.05,
            label: z.label,
          }))
      } else {
        const templateType = documentTypeToTemplateType(docType)
        const { data: tpl } = await db
          .from('document_templates')
          .select('sign_zones')
          .eq('organization_id', orgId)
          .eq('type', templateType)
          .order('is_default', { ascending: false })
          .limit(1)
          .maybeSingle()
        const raw = ((tpl as { sign_zones?: unknown } | null)?.sign_zones ?? []) as SignZoneRaw[]
        if (Array.isArray(raw) && raw.length > 0) {
          zones = raw
            .filter((z): z is SignZoneRaw & { id: string } => !!z && typeof z === 'object' && typeof z.id === 'string')
            .map((z) => ({
              id: String(z.id),
              page: Number(z.page) || 1,
              x: Number(z.x) ?? 0,
              y: Number(z.y) ?? 0,
              w: Number(z.w) ?? 0.15,
              h: Number(z.h) ?? 0.05,
              label: z.label,
            }))
        }
      }

      // Enregistrer la signature immédiatement (avant le scellement PDF coûteux)
      // pour éviter de perdre le statut si la fonction Vercel timeout.
      const signedAt = new Date().toISOString()

      const { data: docSig, error: sigErr } = await db.from('document_signatures').insert({
        organization_id: orgId,
        document_id: docId,
        signer_id: signerId,
        signature_data: signatureData.trim(),
        signature_type: 'handwritten',
        signer_name: signerName,
        signer_email: signerEmail,
        status: 'signed',
        is_valid: true,
        ip_address: metadata.ip ?? null,
        user_agent: metadata.user_agent ?? null,
      }).select('id').single()

      if (sigErr) {
        logger.error('Erreur création document_signatures:', sigErr)
        return NextResponse.json(
          { error: 'Erreur lors de l\'enregistrement de la signature.' },
          { status: 500 }
        )
      }

      const docSigId = (docSig as unknown as { id: string }).id
      const { error: updErr } = await db.from('signature_requests').update({
        status: 'signed',
        signature_id: docSigId,
        signed_at: signedAt,
      }).eq('id', resolved.sig.id as string)

      if (updErr) {
        logger.error('Erreur mise à jour signature_requests:', updErr)
        return NextResponse.json(
          { error: 'Erreur lors de la mise à jour de la demande.' },
          { status: 500 }
        )
      }

      // Suivi commercial CRM : un devis/une convention signé fait progresser
      // automatiquement le statut du prospect. Ne doit jamais faire échouer la
      // signature côté signataire externe (pas de session ici, client admin uniquement).
      const crmRecipientId = (resolved.sig as { recipient_id?: string | null }).recipient_id
      if (crmRecipientId) {
        try {
          await autoAdvanceProspectCommercialStatus(
            orgId,
            crmRecipientId,
            docType === 'quote' ? 'devis_signe' : 'convention_signee'
          )
        } catch (crmError) {
          logger.error('Erreur mise à jour statut commercial CRM (signature):', crmError as Error)
        }
      }

      // Alerte coordos : un devis signé peut nécessiter la planification d'une
      // session. Ne doit jamais faire échouer la signature côté signataire externe.
      if (docType === 'quote') {
        try {
          const signedInvoiceId = docMeta?.invoice_id as string | undefined
          if (signedInvoiceId) {
            const { data: coordUsers } = await db
              .from('users')
              .select('id')
              .eq('organization_id', orgId)
              // Doit rester aligné avec FORMATION_MANAGEMENT_ROLES (components/auth/role-guard.tsx)
              .in('role', ['super_admin', 'admin', 'secretary'])

            const coordUserIds = (coordUsers ?? []).map((u: { id: string }) => u.id)
            if (coordUserIds.length > 0) {
              const notificationService = new NotificationService(supabase)
              await notificationService.createForUsers(
                coordUserIds,
                orgId,
                'document',
                'Devis signé',
                `${docTitle} a été signé par ${signerName} — une session est peut-être à planifier.`,
                { invoice_id: signedInvoiceId },
                `/dashboard/payments/${signedInvoiceId}`
              )
            }
          }
        } catch (notifError) {
          logger.error('Erreur notification devis signé:', notifError as Error)
        }
      }

      const { error: evErr } = await db.from('digital_evidence').insert({
        organization_id: orgId,
        request_type: 'signature',
        request_id: resolved.sig.id,
        signer_email: signerEmail,
        signature_data: signatureData.trim(),
        metadata: metadata as unknown as Json,
        integrity_hash: integrityHash,
      })
      if (evErr) {
        logger.error('Erreur insertion digital_evidence (signature):', evErr)
        // Non-fatal : le statut est déjà enregistré
      }

      // Scellement PDF (best-effort — si ça timeout, le statut est déjà signé)
      let sealedPdf: Uint8Array | null = null
      let pdfIntegrityHash: string | null = null

      if (fileUrl) {
        const path = extractStoragePathFromPublicUrl(fileUrl, SUPABASE_URL)
        if (path) {
          try {
            const pdfBytes = await downloadDocumentPdf(supabase, path)
            const safeSignerName = sanitizeForPDF(signerName)
            const safeSignerEmail = sanitizeForPDF(signerEmail, 100)

            let orgSignatureDataUrl: string | undefined
            const { data: orgRow } = await db
              .from('organizations')
              .select('signature_url, stamp_url')
              .eq('id', orgId)
              .maybeSingle()
            const orgRowCast = orgRow as { signature_url?: string; stamp_url?: string } | null
            const orgImageUrl = (orgRowCast?.signature_url as string) || (orgRowCast?.stamp_url as string)
            if (orgImageUrl?.trim()) {
              try {
                const imgRes = await fetch(orgImageUrl.trim())
                if (imgRes.ok) {
                  const blob = await imgRes.blob()
                  const buf = await blob.arrayBuffer()
                  const base64 = Buffer.from(buf).toString('base64')
                  const mime = blob.type || 'image/png'
                  orgSignatureDataUrl = `data:${mime};base64,${base64}`
                }
              } catch {
                // Ignorer si l'image OF est inaccessible
              }
            }

            const { sealedPdf: sp, integrityHash: ph } = await sealPdf(
              pdfBytes,
              signatureData.trim(),
              {
                signerName: safeSignerName,
                signerEmail: safeSignerEmail,
                signedAt,
                ip: metadata.ip,
                zones,
                signZoneId: 'sig_stagiaire',
                orgSignatureImageDataUrl: orgSignatureDataUrl,
              }
            )
            sealedPdf = sp
            pdfIntegrityHash = ph

            const signedPath = `signed/${orgId}/convention_signee_${docId}.pdf`
            const { error: upErr } = await supabase.storage
              .from('documents')
              .upload(signedPath, sealedPdf, {
                contentType: 'application/pdf',
                cacheControl: '3600',
                upsert: true,
              })
            if (upErr) {
              logger.error('Erreur upload PDF signé (non-fatal):', upErr)
            } else {
              const { data: urlData } = supabase.storage
                .from('documents')
                .getPublicUrl(signedPath)

              const { error: docUpdErr } = await db.from('documents').update({
                  signed_file_path: signedPath,
                  signed_file_url: urlData.publicUrl,
                  status: 'signed',
                  signed_at: signedAt,
                  updated_at: signedAt,
                })
                .eq('id', docId)
                .eq('organization_id', orgId)
              if (docUpdErr) {
                logger.error('Erreur mise à jour statut document signé (non-fatal):', docUpdErr)
              }
            }
          } catch (e) {
            logger.error('Erreur scellement PDF (non-fatal):', e)
          }
        }
      }

      // Récupérer les emails pour la notification (toujours envoyée, avec ou sans PDF scellé)
      let learnerEmail = (resolved.sig.recipient_email as string)?.trim() ?? ''
      if (!learnerEmail && resolved.sig.recipient_id) {
        const { data: studentRow } = await db
          .from('students')
          .select('email')
          .eq('id', resolved.sig.recipient_id)
          .maybeSingle()
        learnerEmail = ((studentRow as { email?: string } | null)?.email as string)?.trim() ?? ''
      }
      const { data: reqUser } = await db
        .from('users')
        .select('email')
        .eq('id', signerId)
        .maybeSingle()
      let adminEmail = ((reqUser as { email?: string } | null)?.email as string)?.trim() ?? ''
      if (!adminEmail) {
        const { data: adminRow } = await db
          .from('users')
          .select('email')
          .eq('organization_id', orgId)
          .in('role', ['admin', 'secretary'])
          .limit(1)
          .maybeSingle()
        adminEmail = ((adminRow as { email?: string } | null)?.email as string)?.trim() ?? ''
      }
      // Envoi à l'apprenant ET à l'OF — non-fatal, avec pièce jointe PDF si disponible
      if (sealedPdf) {
        sendSignedPdfEmails({
          recipientEmail: learnerEmail,
          recipientName: signerName,
          adminEmail: adminEmail || undefined,
          documentTitle: docTitle,
          signedPdfBuffer: sealedPdf,
          signedFilename: `convention_signee_${docId}.pdf`,
        }).catch((e) => logger.error('Erreur envoi email PDF signé (non-fatal):', e))
      } else {
        // PDF non disponible : envoyer notification simple sans pièce jointe
        sendSignatureNotificationEmails({
          recipientEmail: learnerEmail,
          recipientName: signerName,
          adminEmail: adminEmail || undefined,
          documentTitle: docTitle,
        }).catch((e) => logger.error('Erreur envoi email notification signature (non-fatal):', e))
      }

      return NextResponse.json({
        success: true,
        type: 'signature',
        integrityHash: pdfIntegrityHash ?? integrityHash,
        message: 'Signature enregistrée avec succès.',
      })
    }

    if (resolved.type === 'attendance' && resolved.att) {
      if (resolved.att.status !== 'pending') {
        return NextResponse.json({
          success: true,
          alreadySigned: true,
          message: 'Vous avez déjà émargé pour cette session.',
        })
      }

      const { error: evErr } = await db.from('digital_evidence').insert({
        organization_id: orgId,
        request_type: 'attendance',
        request_id: resolved.att.id,
        signer_email: signerEmail,
        signature_data: signatureData.trim(),
        metadata: metadata as unknown as Json,
        integrity_hash: integrityHash,
      })
      if (evErr) {
        logger.error('Erreur insertion digital_evidence (attendance):', evErr)
        return NextResponse.json(
          { error: 'Erreur lors de l\'enregistrement de la preuve.' },
          { status: 500 }
        )
      }

      const session = resolved.att.attendance_session as Record<string, unknown> | null
      const sessionId = session?.session_id as string | undefined
      const date = session?.date as string | undefined
      const requireGeo = session?.require_geolocation === true

      if (requireGeo && !geolocation) {
        return NextResponse.json(
          { error: 'La géolocalisation est requise pour émarger.' },
          { status: 400 }
        )
      }

      // Insert sans colonnes géoloc : la table attendance peut ne pas les avoir (migration 20241202000026).
      // La géoloc est enregistrée dans electronic_attendance_requests.
      const { data: attRow, error: attInsErr } = await db.from('attendance').insert({
        organization_id: orgId,
        student_id: resolved.att.student_id,
        session_id: sessionId ?? null,
        date: date ?? new Date().toISOString().slice(0, 10),
        status: 'present',
      }).select('id').single()

      if (attInsErr) {
        logger.error('Erreur création attendance:', attInsErr)
        return NextResponse.json(
          { error: 'Erreur lors de l\'enregistrement de l\'émargement.' },
          { status: 500 }
        )
      }

      const attRowId = (attRow as unknown as { id: string }).id
      const { error: attUpdErr } = await db.from('electronic_attendance_requests').update({
        status: 'signed',
        signature_data: signatureData.trim(),
        signed_at: new Date().toISOString(),
        attendance_id: attRowId,
        latitude: geolocation?.lat ?? null,
        longitude: geolocation?.lng ?? null,
        location_accuracy: geolocation?.accuracy ?? null,
        location_verified: !!geolocation,
        ip_address: metadata.ip ?? null,
        user_agent: metadata.user_agent ?? null,
      }).eq('id', resolved.att.id as string)

      if (attUpdErr) {
        logger.error('Erreur mise à jour electronic_attendance_requests:', attUpdErr)
        return NextResponse.json(
          { error: 'Erreur lors de la mise à jour de l\'émargement.' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        type: 'attendance',
        integrityHash,
        message: 'Votre présence est enregistrée.',
      })
    }

    return NextResponse.json(
      { error: 'Demande introuvable' },
      { status: 404 }
    )
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    logger.error('Erreur POST /api/sign/submit:', err)
    const message =
      process.env.NODE_ENV === 'development'
        ? `${err.message}${err.cause ? ` (${String(err.cause)})` : ''}`
        : 'Erreur serveur lors de l\'enregistrement de la signature.'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
