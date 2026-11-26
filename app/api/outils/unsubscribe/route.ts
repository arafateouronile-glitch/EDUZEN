/**
 * Désabonnement de la séquence marketing des outils gratuits.
 * POST : désabonnement en un clic depuis le client mail (List-Unsubscribe-Post, RFC 8058).
 * La page /desabonnement appelle unsubscribeLead directement.
 */

import { NextResponse } from 'next/server'
import { unsubscribeLead } from '@/lib/outils/unsubscribe'

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get('t')
  if (!token) return NextResponse.json({ error: 'Lien invalide' }, { status: 400 })
  const ok = await unsubscribeLead(token)
  return ok ? NextResponse.json({ success: true }) : NextResponse.json({ error: 'Lien invalide' }, { status: 404 })
}
