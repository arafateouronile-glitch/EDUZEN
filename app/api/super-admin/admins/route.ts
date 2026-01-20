import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { DEFAULT_PERMISSIONS_BY_ROLE } from '@/types/super-admin.types'
import type { InviteAdminInput, PlatformAdminRole } from '@/types/super-admin.types'

// GET - Liste des administrateurs
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Vérifier que l'utilisateur est super admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: currentAdmin } = await supabase
      .from('platform_admins')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!currentAdmin || currentAdmin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Récupérer tous les admins
    const { data: admins, error } = await supabase
      .from('platform_admins')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[GET /api/super-admin/admins] Error:', error)
      return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
    }

    // Créer un client admin pour récupérer les infos utilisateur
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Enrichir avec les informations utilisateur
    const enrichedAdmins = await Promise.all(
      (admins || []).map(async (admin) => {
        if (!admin.user_id) {
          return {
            ...admin,
            user: null,
            is_pending: true,
          }
        }

        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(admin.user_id)
        return {
          ...admin,
          user: userData?.user
            ? {
                id: userData.user.id,
                email: userData.user.email || '',
                full_name: userData.user.user_metadata?.full_name || null,
                avatar_url: userData.user.user_metadata?.avatar_url || null,
              }
            : null,
          is_pending: false,
        }
      })
    )

    return NextResponse.json({ admins: enrichedAdmins })
  } catch (error) {
    console.error('[GET /api/super-admin/admins] Unexpected error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Inviter un administrateur
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
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

    const body: InviteAdminInput = await request.json()
    const { email, role, permissions } = body

    if (!email || !role) {
      return NextResponse.json({ error: 'Email et rôle requis' }, { status: 400 })
    }

    // Créer un client admin pour les opérations auth
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Vérifier si l'utilisateur existe déjà
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())

    let userId: string

    if (existingUser) {
      userId = existingUser.id
      
      // Vérifier si l'utilisateur est déjà admin
      const { data: existingAdmin } = await supabase
        .from('platform_admins')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (existingAdmin) {
        return NextResponse.json(
          { error: 'Cet utilisateur est déjà administrateur' },
          { status: 400 }
        )
      }
    } else {
      // Créer l'utilisateur s'il n'existe pas avec invitation
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          data: {
            invited_as_admin: true,
            admin_role: role,
          },
        }
      )

      if (createUserError || !newUser.user) {
        console.error('[POST /api/super-admin/admins] Create user error:', createUserError)
        return NextResponse.json(
          { error: 'Erreur lors de la création de l\'utilisateur' },
          { status: 500 }
        )
      }

      userId = newUser.user.id
    }

    // Déterminer les permissions
    const defaultPermissions = DEFAULT_PERMISSIONS_BY_ROLE[role as PlatformAdminRole]
    const finalPermissions = permissions
      ? { ...defaultPermissions, ...permissions }
      : defaultPermissions

    // Créer l'enregistrement admin
    const { data: newAdmin, error: insertError } = await supabase
      .from('platform_admins')
      .insert({
        user_id: userId,
        role: role as PlatformAdminRole,
        permissions: finalPermissions as any,
        is_active: true,
        invited_by: currentAdmin.id,
        invited_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('[POST /api/super-admin/admins] Insert error:', insertError)
      return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
    }

    // TODO: Envoyer un email d'invitation avec les instructions
    // En production, utiliser un service d'email (Resend, SendGrid, etc.)

    return NextResponse.json(
      {
        admin: newAdmin,
        message: existingUser
          ? 'Administrateur ajouté avec succès'
          : 'Utilisateur créé et administrateur ajouté avec succès. Un email d\'invitation sera envoyé.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/super-admin/admins] Unexpected error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
