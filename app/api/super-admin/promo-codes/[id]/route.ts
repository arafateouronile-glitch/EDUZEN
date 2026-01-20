import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreatePromoCodeInput } from '@/types/super-admin.types'

// PATCH - Modifier un code promo
export async function PATCH(
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

    if (!admin || !admin.permissions?.manage_promo_codes) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body: Partial<CreatePromoCodeInput> = await request.json()

    const updates: any = {}

    if (body.code) updates.code = body.code
    if (body.description !== undefined) updates.description = body.description
    if (body.discount_type) updates.discount_type = body.discount_type
    if (body.discount_value !== undefined) updates.discount_value = body.discount_value
    if (body.currency !== undefined) updates.currency = body.currency
    if (body.valid_from) updates.valid_from = new Date(body.valid_from).toISOString()
    if (body.valid_until !== undefined) {
      updates.valid_until = body.valid_until ? new Date(body.valid_until).toISOString() : null
    }
    if (body.max_uses !== undefined) updates.max_uses = body.max_uses
    if (body.max_uses_per_user !== undefined) updates.max_uses_per_user = body.max_uses_per_user
    if (body.min_subscription_amount !== undefined) updates.min_subscription_amount = body.min_subscription_amount
    if (body.applicable_plans !== undefined) updates.applicable_plans = body.applicable_plans
    if (body.first_subscription_only !== undefined) updates.first_subscription_only = body.first_subscription_only
    if (body.is_active !== undefined) updates.is_active = body.is_active
    if (body.metadata) updates.metadata = body.metadata

    const { data, error } = await supabase
      .from('promo_codes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ code: data, message: 'Code promo modifié avec succès' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la modification du code promo' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un code promo
export async function DELETE(
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

    if (!admin || !admin.permissions?.manage_promo_codes) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { error } = await supabase
      .from('promo_codes')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Code promo supprimé avec succès' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du code promo' },
      { status: 500 }
    )
  }
}
