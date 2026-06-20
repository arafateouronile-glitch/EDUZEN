import { NextResponse } from 'next/server'
import { getLearnerProfile } from '@/lib/actions/learner-crm-actions'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const profile = await getLearnerProfile(id)
    return NextResponse.json(profile)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur interne'
    const status = msg === 'Apprenant introuvable' ? 404 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
