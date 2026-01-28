import { NextRequest, NextResponse } from 'next/server'
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'
import { ScheduledGenerationService } from '@/lib/services/scheduled-generation.service'
import { generatePDF } from '@/lib/utils/document-generation/pdf-generator'
import { generateDOCX } from '@/lib/utils/document-generation/docx-generator'
import { generateHTML } from '@/lib/utils/document-generation/html-generator'
import { mapDataToVariables } from '@/lib/utils/document-generation/variable-mapper'
import { emailService } from '@/lib/services/email.service'
import type { DocumentTemplate } from '@/lib/types/document-templates'
import { logger, sanitizeError } from '@/lib/utils/logger'

// GET /api/documents/scheduled - Récupère les générations programmées
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: user } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', session.user.id)
      .single()

    if (!user?.organization_id) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 })
    }

    const scheduledGenerationService = new ScheduledGenerationService(supabase)
    const generations = await scheduledGenerationService.getAll(user.organization_id)
    return NextResponse.json(generations)
  } catch (error) {
    logger.error('Erreur lors de la récupération des générations programmées:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST /api/documents/scheduled - Crée une nouvelle génération programmée
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: user } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', session.user.id)
      .single()

    if (!user?.organization_id) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 })
    }

    const body = await request.json()
    const scheduledGenerationService = new ScheduledGenerationService(supabase)
    const generation = await scheduledGenerationService.create({
      organization_id: user.organization_id,
      template_id: body.template_id,
      schedule_type: body.schedule_type,
      schedule_config: body.schedule_config,
      filter_criteria: body.filter_config || {},
      format: body.format || 'PDF',
      send_email: body.send_email || false,
      email_recipients: body.email_recipients || [],
      enabled: body.is_active !== false,
    })

    return NextResponse.json(generation)
  } catch (error) {
    logger.error('Erreur lors de la création de la génération programmée:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// PUT /api/documents/scheduled/[id] - Met à jour une génération programmée
export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }

    const body = await request.json()
    const scheduledGenerationService = new ScheduledGenerationService(supabase)
    const generation = await scheduledGenerationService.update(id, body)

    return NextResponse.json(generation)
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la génération programmée:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// DELETE /api/documents/scheduled/[id] - Supprime une génération programmée
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }

    const scheduledGenerationService = new ScheduledGenerationService(supabase)
    await scheduledGenerationService.delete(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Erreur lors de la suppression de la génération programmée:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

