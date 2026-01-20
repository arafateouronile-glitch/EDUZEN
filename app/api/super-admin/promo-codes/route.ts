import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreatePromoCodeInput } from '@/types/super-admin.types'

// GET - Liste des codes promo
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
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

    if (!admin || !(admin.permissions as any)?.manage_promo_codes) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('is_active')
    const search = searchParams.get('search')

    let query = supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false })

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    if (search) {
      query = query.or(`code.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ codes: data || [] })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des codes promo' },
      { status: 500 }
    )
  }
}

// POST - Créer un code promo
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
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

    if (!admin || !(admin.permissions as any)?.manage_promo_codes) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body: CreatePromoCodeInput = await request.json()

    const { data, error } = await supabase
      .from('promo_codes')
      .insert({
        code: body.code,
        description: body.description || null,
        discount_type: body.discount_type,
        discount_value: body.discount_value,
        currency: body.currency || null,
        valid_from: new Date(body.valid_from).toISOString(),
        valid_until: body.valid_until ? new Date(body.valid_until).toISOString() : null,
        max_uses: body.max_uses || null,
        max_uses_per_user: body.max_uses_per_user || 1,
        min_subscription_amount: body.min_subscription_amount || null,
        applicable_plans: body.applicable_plans || null,
        first_subscription_only: body.first_subscription_only ?? false,
        is_active: body.is_active ?? true,
        created_by: user.id,
        metadata: (body.metadata || {}) as any,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ code: data, message: 'Code promo créé avec succès' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la création du code promo' },
      { status: 500 }
    )
  }
}
