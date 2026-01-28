/**
 * POST /api/sign/submit
 * Soumet une signature (document ou émargement) avec chaîne de preuve.
 * Document : scellement PDF (signature + nom, date, IP), upload, envoi signé au client + admin.
 * Métadonnées : IP, User-Agent, fingerprint, timestamp UTC, géolocation optionnelle.
 * Scellement SHA-256 → digital_evidence (INSERT uniquement, admin client).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  computeIntegrityHash,
  getSignatureEvidenceSecret,
  type SignatureMetadata,
} from '@/lib/utils/signature-evidence'
import { sealPdf } from '@/lib/utils/seal-pdf'
import {
  extractStoragePathFromPublicUrl,
  downloadDocumentPdf,
} from '@/lib/utils/sign-document-helpers'
import { sendSignedPdfEmails } from '@/lib/utils/send-signed-pdf-email'
import { logger } from '@/lib/utils/logger'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

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
    if (byUuid.type) resolved = byUuid as any
    else if (byLegacy.type) resolved = byLegacy as any
    else {
      if (isUuid(t)) {
        const { data: sig } = await (supabase as any)
          .from('signatories')
          .select('id, process_id, email, name, order_index, signed_at')
          .eq('token', t)
          .maybeSingle()
        if (sig && !sig.signed_at) {
          const { data: proc } = await (supabase as any)
            .from('signing_processes')
            .select(
              'id, organization_id, document_id, status, current_index, intermediate_pdf_path, document:documents(id, title, file_url, type, metadata, template_id)'
            )
            .eq('id', sig.process_id)
            .single()
          if (
            proc &&
            proc.status !== 'completed' &&
            (proc.current_index as number) === sig.order_index
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

    const secret = getSignatureEvidenceSecret()
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
      const allSignatories = await (supabase as any)
        .from('signatories')
        .select('id, order_index')
        .eq('process_id', procId)
        .order('order_index', { ascending: true })
      const list = (allSignatories.data ?? []) as Array<{ order_index: number }>
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
        zones = metaZones
          .filter((z: any) => z && typeof z === 'object' && typeof z.id === 'string')
          .map((z: any) => ({
            id: String(z.id),
            page: Number(z.page) || 1,
            x: Number(z.x) ?? 0,
            y: Number(z.y) ?? 0,
            w: Number(z.w) ?? 0.15,
            h: Number(z.h) ?? 0.05,
            label: z.label,
          }))
      } else {
        const { data: tpl } = await (supabase as any)
          .from('document_templates')
          .select('sign_zones')
          .eq('organization_id', orgIdP)
          .eq('type', docType)
          .order('is_default', { ascending: false })
          .limit(1)
          .maybeSingle()
        const raw = (tpl?.sign_zones ?? []) as Array<Record<string, unknown>>
        if (Array.isArray(raw) && raw.length > 0) {
          zones = raw
            .filter((z): z is Record<string, unknown> => !!z && typeof z === 'object' && typeof (z as any).id === 'string')
            .map((z) => ({
              id: String((z as any).id),
              page: Number((z as any).page) || 1,
              x: Number((z as any).x) ?? 0,
              y: Number((z as any).y) ?? 0,
              w: Number((z as any).w) ?? 0.15,
              h: Number((z as any).h) ?? 0.05,
              label: (z as any).label,
            }))
        }
      }

      const signedAt = new Date().toISOString()
      const { sealedPdf: sealed, integrityHash: pdfHash } = await sealPdf(
        currentPdfBytes,
        signatureData.trim(),
        {
          signerName,
          signerEmail,
          signedAt,
          ip: metadata.ip,
          zones,
          signZoneId: 'sig_stagiaire',
        }
      )

      if (isLast) {
        const finalPath = `${orgIdP}/documents/${docId}/convention_signee_${docId}.pdf`
        const { error: upErr } = await supabase.storage
          .from(bucket)
          .upload(finalPath, sealed, { contentType: 'application/pdf', cacheControl: '3600', upsert: true })
        if (upErr) {
          logger.error('Upload PDF final process:', upErr)
          return NextResponse.json(
            { error: 'Erreur lors de l\'enregistrement du document signé.' },
            { status: 500 }
          )
        }
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(finalPath)
        await (supabase as any)
          .from('documents')
          .update({
            signed_file_path: finalPath,
            signed_file_url: urlData.publicUrl,
            status: 'signed',
            signed_at: signedAt,
            updated_at: signedAt,
          })
          .eq('id', docId)
          .eq('organization_id', orgIdP)

        await (supabase as any)
          .from('signatories')
          .update({ signed_at: signedAt, signature_data: signatureData.trim() })
          .eq('id', signatoryId)

        await (supabase as any)
          .from('signing_processes')
          .update({
            status: 'completed',
            current_index: proc.current_index as number,
            intermediate_pdf_path: null,
            intermediate_pdf_url: null,
            updated_at: signedAt,
          })
          .eq('id', procId)

        const { error: evErr } = await (supabase as any)
          .from('digital_evidence')
          .insert({
            organization_id: orgIdP,
            request_type: 'process',
            request_id: procId,
            signer_email: signerEmail,
            signature_data: signatureData.trim(),
            metadata: { ...metadata, signatory_id: signatoryId, pdf_integrity_hash: pdfHash },
            integrity_hash: pdfHash,
          })
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
        const { data: adminUser } = await (supabase as any)
          .from('users')
          .select('email')
          .eq('organization_id', orgIdP)
          .in('role', ['admin', 'secretary'])
          .limit(1)
          .maybeSingle()
        const adminEmail = (adminUser?.email as string) ?? ''
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

      await (supabase as any)
        .from('signatories')
        .update({ signed_at: signedAt, signature_data: signatureData.trim() })
        .eq('id', signatoryId)

      await (supabase as any)
        .from('signing_processes')
        .update({
          status: 'partially_signed',
          current_index: nextIndex,
          intermediate_pdf_path: intermPath,
          intermediate_pdf_url: urlData.publicUrl,
          updated_at: signedAt,
        })
        .eq('id', procId)

      const { error: evErr } = await (supabase as any)
        .from('digital_evidence')
        .insert({
          organization_id: orgIdP,
          request_type: 'process',
          request_id: procId,
          signer_email: signerEmail,
          signature_data: signatureData.trim(),
          metadata: { ...metadata, signatory_id: signatoryId, pdf_integrity_hash: pdfHash },
          integrity_hash: pdfHash,
        })
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
        return NextResponse.json(
          { error: 'Cette demande a déjà été signée.' },
          { status: 409 }
        )
      }

      const docId = resolved.sig.document_id as string
      const signerName = (resolved.sig.recipient_name as string) ?? 'Signataire'
      const signerId = resolved.sig.requester_id as string

      const { data: docRow } = await (supabase as any)
        .from('documents')
        .select('id, title, file_url, organization_id, type, metadata, template_id')
        .eq('id', docId)
        .single()

      const fileUrl = docRow?.file_url as string | null
      const docTitle = (docRow?.title as string) ?? 'Document'
      const docType = (docRow?.type as string) ?? 'convention'
      const docMeta = (docRow?.metadata as Record<string, unknown>) ?? {}
      const metaZones = Array.isArray(docMeta.sign_zones) ? docMeta.sign_zones : null

      let zones: Array<{ id: string; page: number; x: number; y: number; w: number; h: number; label?: string }> | undefined
      if (metaZones && metaZones.length > 0) {
        zones = metaZones
          .filter((z): z is Record<string, unknown> => z && typeof z === 'object' && typeof (z as any).id === 'string')
          .map((z) => ({
            id: String((z as any).id),
            page: Number((z as any).page) || 1,
            x: Number((z as any).x) ?? 0,
            y: Number((z as any).y) ?? 0,
            w: Number((z as any).w) ?? 0.15,
            h: Number((z as any).h) ?? 0.05,
            label: (z as any).label as string | undefined,
          }))
      } else {
        const { data: tpl } = await (supabase as any)
          .from('document_templates')
          .select('sign_zones')
          .eq('organization_id', orgId)
          .eq('type', docType)
          .order('is_default', { ascending: false })
          .limit(1)
          .maybeSingle()
        const raw = (tpl?.sign_zones ?? []) as Array<Record<string, unknown>>
        if (Array.isArray(raw) && raw.length > 0) {
          zones = raw
            .filter((z): z is Record<string, unknown> => z && typeof z === 'object' && typeof (z as any).id === 'string')
            .map((z) => ({
              id: String((z as any).id),
              page: Number((z as any).page) || 1,
              x: Number((z as any).x) ?? 0,
              y: Number((z as any).y) ?? 0,
              w: Number((z as any).w) ?? 0.15,
              h: Number((z as any).h) ?? 0.05,
              label: (z as any).label as string | undefined,
            }))
        }
      }

      let sealedPdf: Uint8Array | null = null
      let pdfIntegrityHash: string | null = null

      if (fileUrl) {
        const path = extractStoragePathFromPublicUrl(fileUrl, SUPABASE_URL)
        if (path) {
          try {
            const pdfBytes = await downloadDocumentPdf(supabase, path)
            const signedAt = new Date().toISOString()
            const { sealedPdf: sp, integrityHash: ph } = await sealPdf(
              pdfBytes,
              signatureData.trim(),
              {
                signerName,
                signerEmail,
                signedAt,
                ip: metadata.ip,
                zones,
                signZoneId: 'sig_stagiaire',
              }
            )
            sealedPdf = sp
            pdfIntegrityHash = ph

            const signedPath = `${orgId}/documents/${docId}/convention_signee_${docId}.pdf`
            const { error: upErr } = await supabase.storage
              .from('documents')
              .upload(signedPath, sealedPdf, {
                contentType: 'application/pdf',
                cacheControl: '3600',
                upsert: true,
              })
            if (upErr) {
              logger.error('Erreur upload PDF signé:', upErr)
              return NextResponse.json(
                { error: 'Erreur lors de l\'enregistrement du document signé.' },
                { status: 500 }
              )
            }

            const { data: urlData } = supabase.storage
              .from('documents')
              .getPublicUrl(signedPath)

            await (supabase as any)
              .from('documents')
              .update({
                signed_file_path: signedPath,
                signed_file_url: urlData.publicUrl,
                status: 'signed',
                signed_at: signedAt,
                updated_at: signedAt,
              })
              .eq('id', docId)
              .eq('organization_id', orgId)
          } catch (e) {
            logger.error('Erreur scellement PDF:', e)
            return NextResponse.json(
              { error: 'Erreur lors du scellement du document.' },
              { status: 500 }
            )
          }
        }
      }

      const { data: docSig, error: sigErr } = await (supabase as any)
        .from('document_signatures')
        .insert({
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
        })
        .select('id')
        .single()

      if (sigErr) {
        logger.error('Erreur création document_signatures:', sigErr)
        return NextResponse.json(
          { error: 'Erreur lors de l\'enregistrement de la signature.' },
          { status: 500 }
        )
      }

      const { error: updErr } = await (supabase as any)
        .from('signature_requests')
        .update({
          status: 'signed',
          signature_id: docSig.id,
          signed_at: new Date().toISOString(),
        })
        .eq('id', resolved.sig.id)

      if (updErr) {
        logger.error('Erreur mise à jour signature_requests:', updErr)
        return NextResponse.json(
          { error: 'Erreur lors de la mise à jour de la demande.' },
          { status: 500 }
        )
      }

      const evidenceMeta = {
        ...metadata,
        ...(pdfIntegrityHash ? { pdf_integrity_hash: pdfIntegrityHash } : {}),
      }
      const { error: evErr } = await (supabase as any)
        .from('digital_evidence')
        .insert({
          organization_id: orgId,
          request_type: 'signature',
          request_id: resolved.sig.id,
          signer_email: signerEmail,
          signature_data: signatureData.trim(),
          metadata: evidenceMeta,
          integrity_hash: integrityHash,
        })
      if (evErr) {
        logger.error('Erreur insertion digital_evidence (signature):', evErr)
        return NextResponse.json(
          { error: 'Erreur lors de l\'enregistrement de la preuve.' },
          { status: 500 }
        )
      }

      if (sealedPdf) {
        const { data: reqUser } = await (supabase as any)
          .from('users')
          .select('email')
          .eq('id', signerId)
          .maybeSingle()
        const adminEmail = (reqUser?.email as string) ?? ''

        await sendSignedPdfEmails({
          recipientEmail: signerEmail,
          recipientName: signerName,
          adminEmail,
          documentTitle: docTitle,
          signedPdfBuffer: sealedPdf,
          signedFilename: `convention_signee_${docId}.pdf`,
        })
      }

      return NextResponse.json({
        success: true,
        type: 'signature',
        integrityHash: pdfIntegrityHash ?? integrityHash,
        message: 'Signature enregistrée avec succès. Une copie vous a été envoyée par email.',
      })
    }

    if (resolved.type === 'attendance' && resolved.att) {
      if (resolved.att.status !== 'pending') {
        return NextResponse.json(
          { error: 'Vous avez déjà émargé pour cette session.' },
          { status: 409 }
        )
      }

      const { error: evErr } = await (supabase as any)
        .from('digital_evidence')
        .insert({
          organization_id: orgId,
          request_type: 'attendance',
          request_id: resolved.att.id,
          signer_email: signerEmail,
          signature_data: signatureData.trim(),
          metadata,
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

      const { data: attRow, error: attInsErr } = await (supabase as any)
        .from('attendance')
        .insert({
          organization_id: orgId,
          student_id: resolved.att.student_id,
          session_id: sessionId ?? null,
          date: date ?? new Date().toISOString().slice(0, 10),
          status: 'present',
          latitude: geolocation?.lat ?? null,
          longitude: geolocation?.lng ?? null,
          location_accuracy: geolocation?.accuracy ?? null,
        })
        .select('id')
        .single()

      if (attInsErr) {
        logger.error('Erreur création attendance:', attInsErr)
        return NextResponse.json(
          { error: 'Erreur lors de l\'enregistrement de l\'émargement.' },
          { status: 500 }
        )
      }

      const { error: attUpdErr } = await (supabase as any)
        .from('electronic_attendance_requests')
        .update({
          status: 'signed',
          signature_data: signatureData.trim(),
          signed_at: new Date().toISOString(),
          attendance_id: attRow.id,
          latitude: geolocation?.lat ?? null,
          longitude: geolocation?.lng ?? null,
          location_accuracy: geolocation?.accuracy ?? null,
          location_verified: !!geolocation,
          ip_address: metadata.ip ?? null,
          user_agent: metadata.user_agent ?? null,
        })
        .eq('id', resolved.att.id)

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
    logger.error('Erreur POST /api/sign/submit:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
