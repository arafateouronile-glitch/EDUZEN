import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_PERMISSIONS_BY_ROLE } from '@/types/super-admin.types'
import type { PlatformAdminRole } from '@/types/super-admin.types'
import { logger, sanitizeError } from '@/lib/utils/logger'

// PATCH - Modifier un administrateur
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    
    // Vérifier que l'utilisateur est super admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: currentAdmin } = await supabase
      .from('platform_admins')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!currentAdmin || currentAdmin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const { role, permissions, is_active } = body

    // Vérifier que l'admin existe
    const { data: existingAdmin } = await supabase
      .from('platform_admins')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!existingAdmin) {
      return NextResponse.json({ error: 'Administrateur non trouvé' }, { status: 404 })
    }

    // Préparer les mises à jour
    const updates: Record<string, unknown> = {}

    if (role !== undefined) {
      updates.role = role
      // Mettre à jour les permissions si le rôle change
      if (role !== existingAdmin.role) {
        const defaultPermissions = DEFAULT_PERMISSIONS_BY_ROLE[role as PlatformAdminRole]
        updates.permissions = permissions ? { ...defaultPermissions, ...permissions } : defaultPermissions
      }
    }

    if (permissions !== undefined && role === existingAdmin.role) {
      updates.permissions = permissions
    }

    if (is_active !== undefined) {
      updates.is_active = is_active
      if (!is_active) {
        updates.revoked_at = new Date().toISOString()
        updates.revoked_by = currentAdmin.id
      } else {
        updates.revoked_at = null
        updates.revoked_by = null
        updates.revoke_reason = null
      }
    }

    updates.updated_at = new Date().toISOString()

    const { data: updatedAdmin, error } = await supabase
      .from('platform_admins')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('[PATCH /api/super-admin/admins/[id]] Error:', error)
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
    }

    return NextResponse.json({ admin: updatedAdmin })
  } catch (error) {
    logger.error('[PATCH /api/super-admin/admins/[id]] Unexpected error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE - Révoquer un administrateur
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    
    // Vérifier que l'utilisateur est super admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: currentAdmin } = await supabase
      .from('platform_admins')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!currentAdmin || currentAdmin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Vérifier que l'admin existe
    const { data: existingAdmin } = await supabase
      .from('platform_admins')
      .select('role')
      .eq('id', id)
      .maybeSingle()

    if (!existingAdmin) {
      return NextResponse.json({ error: 'Administrateur non trouvé' }, { status: 404 })
    }

    // Ne pas permettre de supprimer un super_admin
    if (existingAdmin.role === 'super_admin') {
      return NextResponse.json(
        { error: 'Impossible de supprimer un super administrateur' },
        { status: 400 }
      )
    }

    // Récupérer la raison de révocation depuis le body
    const body = await request.json().catch(() => ({}))
    const { reason } = body

    // Révoquer l'admin (soft delete)
    const { error } = await supabase
      .from('platform_admins')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_by: currentAdmin.id,
        revoke_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      logger.error('[DELETE /api/super-admin/admins/[id]] Error:', error)
      return NextResponse.json({ error: 'Erreur lors de la révocation' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Accès révoqué avec succès' })
  } catch (error) {
    logger.error('[DELETE /api/super-admin/admins/[id]] Unexpected error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
