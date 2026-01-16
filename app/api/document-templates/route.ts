import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { documentTemplateService } from '@/lib/services/document-template.service'
import type { CreateTemplateInput, UpdateTemplateInput } from '@/lib/types/document-templates'

// GET /api/document-templates - Récupère tous les templates d'une organisation
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer l'organisation de l'utilisateur
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || undefined
    const isActive = searchParams.get('isActive')

    const templates = await documentTemplateService.getAllTemplates(userData.organization_id, {
      type: type as 'invoice' | 'quote' | 'certificate' | 'contract' | 'report' | 'other' | undefined,
      isActive: isActive ? isActive === 'true' : undefined,
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Erreur lors de la récupération des templates:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST /api/document-templates - Crée un nouveau template
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer l'organisation de l'utilisateur
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 })
    }

    const body: CreateTemplateInput = await request.json()

    // S'assurer que l'organization_id correspond
    if (body.organization_id !== userData.organization_id) {
      return NextResponse.json({ error: 'Organisation non autorisée' }, { status: 403 })
    }

    const template = await documentTemplateService.createTemplate(body)

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création du template:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

