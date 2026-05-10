import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const STORAGE_BUCKET = 'documents'
const SIGNED_URL_TTL = 3600 // 1 heure

export async function GET(request: NextRequest) {
  try {
    const path = request.nextUrl.searchParams.get('path')
    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'path requis' }, { status: 400 })
    }

    const studentId = request.nextUrl.searchParams.get('studentId')
    if (!studentId || typeof studentId !== 'string') {
      return NextResponse.json({ error: 'studentId requis' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Vérifier que l'étudiant existe et est actif
    const { data: student, error: studentError } = await adminClient
      .from('students')
      .select('id, organization_id, status')
      .eq('id', studentId)
      .single()

    if (studentError || !student || student.status !== 'active') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que le chemin storage appartient à l'organisation de l'étudiant
    // Format attendu : {orgId}/api/{fileName}
    const pathOrgId = path.split('/')[0]
    if (pathOrgId !== student.organization_id) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    }

    const { data, error } = await adminClient.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL)

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: 'Impossible de générer le lien' }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl })
  } catch {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
