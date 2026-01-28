/**
 * Workflow en cascade (Sequential Signing) : convention = stagiaire puis directeur.
 * Relais automatique : après chaque signature, mail au suivant.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { sendProcessSignEmail } from '@/lib/utils/send-process-sign-email'
import { sendSignedPdfToRecipients } from '@/lib/utils/send-signed-pdf-email'
import { logger } from '@/lib/utils/logger'

const SIGN_BASE =
  typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
    : 'https://eduzen.app'

export interface SignatoryInput {
  email: string
  name: string
  order_index: number
}

export interface CreateProcessInput {
  organization_id: string
  document_id: string
  signatories: SignatoryInput[]
  title?: string
}

export interface ProcessWithSignatories {
  id: string
  organization_id: string
  document_id: string
  status: string
  current_index: number
  intermediate_pdf_path: string | null
  intermediate_pdf_url: string | null
  title: string | null
  created_at: string
  updated_at: string
  document?: { id: string; title: string; file_url: string | null }
  signatories: Array<{
    id: string
    email: string
    name: string
    order_index: number
    token: string
    signed_at: string | null
    mail_sent_at: string | null
  }>
}

export class SigningProcessService {
  constructor(private supabase: SupabaseClient) {}

  async createProcess(input: CreateProcessInput): Promise<ProcessWithSignatories> {
    const { data: process, error: processErr } = await this.supabase
      .from('signing_processes')
      .insert({
        organization_id: input.organization_id,
        document_id: input.document_id,
        status: 'pending',
        current_index: 0,
        title: input.title ?? null,
      })
      .select('id, organization_id, document_id, status, current_index, title, created_at, updated_at')
      .single()

    if (processErr || !process) {
      logger.error('SigningProcess create:', processErr)
      throw new Error(processErr?.message ?? 'Erreur création processus')
    }

    const signatories = input.signatories
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
    const inserts = signatories.map((s) => ({
      process_id: process.id,
      email: s.email,
      name: s.name,
      order_index: s.order_index,
      token: crypto.randomUUID(),
    }))

    const { data: created, error: sigErr } = await this.supabase
      .from('signatories')
      .insert(inserts)
      .select('id, email, name, order_index, token, signed_at, mail_sent_at')

    if (sigErr || !created?.length) {
      logger.error('Signatories create:', sigErr)
      await this.supabase.from('signing_processes').delete().eq('id', process.id)
      throw new Error(sigErr?.message ?? 'Erreur création signataires')
    }

    const withDoc = await this.getProcessWithDetail(process.id)
    return withDoc as ProcessWithSignatories
  }

  async getProcessWithDetail(processId: string): Promise<ProcessWithSignatories | null> {
    const { data: process, error } = await this.supabase
      .from('signing_processes')
      .select(
        `id, organization_id, document_id, status, current_index,
         intermediate_pdf_path, intermediate_pdf_url, title, created_at, updated_at,
         document:documents(id, title, file_url)`
      )
      .eq('id', processId)
      .single()

    if (error || !process) return null

    const { data: signatories } = await this.supabase
      .from('signatories')
      .select('id, email, name, order_index, token, signed_at, mail_sent_at')
      .eq('process_id', processId)
      .order('order_index', { ascending: true })

    // Extraire le document du tableau retourné par Supabase
    const documentArray = (process as any).document as Array<{ id: string; title: string; file_url: string | null }> | undefined
    const document = documentArray && documentArray.length > 0 ? documentArray[0] : undefined

    return {
      ...process,
      document,
      signatories: signatories ?? [],
    } as ProcessWithSignatories
  }

  getSignUrl(token: string): string {
    return `${SIGN_BASE}/sign/${token}`
  }

  async sendFirstEmail(processId: string): Promise<boolean> {
    const proc = await this.getProcessWithDetail(processId)
    if (!proc) return false
    const first = proc.signatories.find((s) => s.order_index === 0)
    if (!first) return false
    const docTitle = (proc.document as { title?: string })?.title ?? proc.title ?? 'Document'
    const ok = await sendProcessSignEmail({
      to: first.email,
      recipientName: first.name,
      documentTitle: docTitle,
      signUrl: this.getSignUrl(first.token),
      positionLabel: 'Premier signataire',
    })
    if (ok) {
      await this.supabase
        .from('signatories')
        .update({ mail_sent_at: new Date().toISOString() })
        .eq('id', first.id)
    }
    return ok
  }

  async sendNextEmail(processId: string): Promise<boolean> {
    const proc = await this.getProcessWithDetail(processId)
    if (!proc || proc.status === 'completed') return false
    const next = proc.signatories.find((s) => s.order_index === proc.current_index)
    if (!next) return false
    const docTitle = (proc.document as { title?: string })?.title ?? proc.title ?? 'Document'
    const ok = await sendProcessSignEmail({
      to: next.email,
      recipientName: next.name,
      documentTitle: docTitle,
      signUrl: this.getSignUrl(next.token),
      positionLabel: `Signataire ${proc.current_index + 1}/${proc.signatories.length}`,
    })
    if (ok) {
      await this.supabase
        .from('signatories')
        .update({ mail_sent_at: new Date().toISOString() })
        .eq('id', next.id)
    }
    return ok
  }

  async sendFinalToAll(
    processId: string,
    finalPdfBuffer: Uint8Array,
    documentTitle: string,
    adminEmail: string
  ): Promise<void> {
    const proc = await this.getProcessWithDetail(processId)
    if (!proc) return
    const filename = `convention_signee_${proc.document_id}.pdf`
    await sendSignedPdfToRecipients({
      recipients: proc.signatories.map((s) => ({ email: s.email, name: s.name })),
      adminEmail,
      documentTitle,
      signedPdfBuffer: finalPdfBuffer,
      signedFilename: filename,
    })
  }

  async listByOrganization(organizationId: string): Promise<ProcessWithSignatories[]> {
    const { data, error } = await this.supabase
      .from('signing_processes')
      .select('id')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error || !data?.length) return []
    const list: ProcessWithSignatories[] = []
    for (const row of data) {
      const p = await this.getProcessWithDetail(row.id)
      if (p) list.push(p)
    }
    return list
  }
}
