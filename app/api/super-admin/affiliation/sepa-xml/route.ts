/**
 * POST /api/super-admin/affiliation/sepa-xml
 * Génère un fichier SEPA pain.001.001.03 (Customer Credit Transfer)
 * pour virement groupé vers les affiliés. À importer dans l'interface bancaire.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const XML_NS = 'urn:iso:std:iso:20022:tech:xsd:pain.001.001.03'

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildPain001(payments: Array<{ name: string; iban: string; amount: number }>): string {
  const debtorName = process.env.SEPA_DEBTOR_NAME || 'EDUZEN'
  const debtorIban = (process.env.SEPA_DEBTOR_IBAN || '').replace(/\s/g, '')
  const debtorBic = (process.env.SEPA_DEBTOR_BIC || '').replace(/\s/g, '')

  if (!debtorIban) {
    throw new Error('SEPA_DEBTOR_IBAN non configuré. Définissez-le pour générer le fichier SEPA.')
  }

  const requestedDate = new Date()
  requestedDate.setDate(requestedDate.getDate() + 1)
  const reqDate = requestedDate.toISOString().slice(0, 10).replace(/-/g, '')
  const msgId = `EDUZEN-AFF-${Date.now()}`
  const totalAmount = payments.reduce((s, p) => s + p.amount, 0).toFixed(2)
  const nbTxs = payments.length

  let cdtTrfTxInf = ''
  for (let i = 0; i < payments.length; i++) {
    const p = payments[i]
    const iban = p.iban.replace(/\s/g, '')
    const amount = p.amount.toFixed(2)
    const name = escapeXml((p.name || 'Bénéficiaire').slice(0, 70))
    const endToEndId = `AFF-${msgId}-${i + 1}`
    cdtTrfTxInf += `
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${escapeXml(endToEndId)}</InstrId>
        <EndToEndId>${escapeXml(endToEndId)}</EndToEndId>
      </PmtId>
      <Amt Ccy="EUR">${amount}</Amt>
      <CdtrAgt>
        <FinInstnId/>
      </CdtrAgt>
      <Cdtr>
        <Nm>${name}</Nm>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${escapeXml(iban)}</IBAN>
        </Id>
      </CdtrAcct>
      <RmtInf>
        <Ustrd>Commission affiliation EDUZEN</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>`
  }

  const debtorAgtBlock = debtorBic
    ? `<DbtrAgt><FinInstnId><BIC>${escapeXml(debtorBic)}</BIC></FinInstnId></DbtrAgt>`
    : '<DbtrAgt><FinInstnId/></DbtrAgt>'

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="${XML_NS}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${escapeXml(msgId)}</MsgId>
      <CreDtTm>${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</CreDtTm>
      <NbOfTxs>${nbTxs}</NbOfTxs>
      <CtrlSum>${totalAmount}</CtrlSum>
      <InitgPty>
        <Nm>${escapeXml(debtorName)}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${escapeXml(msgId)}-1</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <ReqdExctnDt>${reqDate}</ReqdExctnDt>
      <Dbtr>
        <Nm>${escapeXml(debtorName)}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>${escapeXml(debtorIban)}</IBAN>
        </Id>
      </DbtrAcct>
      ${debtorAgtBlock}
      ${cdtTrfTxInf}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`

  return xml
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: admin } = await supabase
      .from('platform_admins')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!admin || (admin as { role?: string }).role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès réservé' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const payments = (body.payments || []) as Array<{
      affiliate_id?: string
      name: string
      iban: string
      amount: number
    }>

    const valid = payments.filter(
      (p) => p && typeof p.name === 'string' && p.iban && p.amount > 0
    )
    if (valid.length === 0) {
      return NextResponse.json(
        { error: 'Aucun paiement valide (nom, IBAN, montant > 0)' },
        { status: 400 }
      )
    }

    const xml = buildPain001(
      valid.map((p) => ({
        name: p.name,
        iban: String(p.iban).replace(/\s/g, ''),
        amount: Number(p.amount),
      }))
    )

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="sepa-affiliation-${new Date().toISOString().slice(0, 10)}.xml"`,
      },
    })
  } catch (e) {
    logger.error('[sepa-xml]', e)
    const message = e instanceof Error ? e.message : 'Erreur génération SEPA'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
