/**
 * API pour planifier l'envoi de documents par email
 * Permet de programmer l'envoi à une date/heure précise
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer l'utilisateur et son organisation
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 400 })
    }

    // Vérifier les permissions (admin uniquement)
    if (!['super_admin', 'admin', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 })
    }

    const body = await request.json()
    const {
      document_id,
      recipient_type,
      recipient_ids,
      session_id,
      scheduled_at,
      subject,
      message,
      send_via,
    } = body

    // Validation
    if (!document_id) {
      return NextResponse.json({ error: 'Document requis' }, { status: 400 })
    }

    if (!scheduled_at) {
      return NextResponse.json({ error: 'Date de planification requise' }, { status: 400 })
    }

    const scheduledDate = new Date(scheduled_at)
    if (scheduledDate < new Date()) {
      return NextResponse.json({ error: 'La date doit être dans le futur' }, { status: 400 })
    }

    // Vérifier que le document existe et appartient à l'organisation
    const { data: document } = await supabase
      .from('documents')
      .select('id, name, organization_id')
      .eq('id', document_id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!document) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    const supabaseAdmin = createAdminClient()

    // Créer la planification
    const { data: scheduled, error: insertError } = await supabaseAdmin
      .from('scheduled_document_sends')
      .insert({
        organization_id: userData.organization_id,
        document_id,
        recipient_type: recipient_type || 'all',
        recipient_ids: recipient_ids || [],
        session_id: session_id || null,
        scheduled_at: scheduledDate.toISOString(),
        subject: subject || `Document : ${document.name}`,
        message: message || '',
        send_via: send_via || ['email'],
        status: 'pending',
        metadata: {
          created_by: user.id,
          document_name: document.name,
        },
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: 'Erreur lors de la planification', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Envoi planifié avec succès',
      data: scheduled,
    })
  } catch (error) {
    console.error('Schedule document send error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}

/**
 * Récupérer les envois planifiés
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('scheduled_document_sends')
      .select(`
        *,
        documents(id, name, type)
      `)
      .eq('organization_id', userData.organization_id)
      .order('scheduled_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error('Get scheduled sends error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}

/**
 * Annuler un envoi planifié
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 })
    }

    // Mettre à jour le statut à "cancelled"
    const { error: updateError } = await supabase
      .from('scheduled_document_sends')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .eq('status', 'pending')

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Envoi annulé avec succès',
    })
  } catch (error) {
    console.error('Cancel scheduled send error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}

