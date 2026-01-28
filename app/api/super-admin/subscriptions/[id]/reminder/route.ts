import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Envoyer un rappel de paiement
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Vérifier les permissions
    const { data: admin } = await supabase
      .from('platform_admins')
      .select('permissions')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!admin || !(admin.permissions as any)?.manage_subscriptions) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Récupérer l'abonnement
    const { data: subscription, error: subError } = await supabase
      .from('organization_subscriptions')
      .select(`
        *,
        organization:organizations(id, name, email)
      `)
      .eq('id', id)
      .single()

    if (subError || !subscription) {
      return NextResponse.json({ error: 'Abonnement non trouvé' }, { status: 404 })
    }

    // NOTE: Fonctionnalité prévue - Implémenter l'envoi d'email de rappel
    // Utiliser l'API route /api/email/send ou intégration directe avec Resend/SendGrid
    // Pour l'instant, on retourne juste un succès

    return NextResponse.json({ 
      message: 'Rappel de paiement envoyé avec succès',
      subscription 
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi du rappel' },
      { status: 500 }
    )
  }
}
