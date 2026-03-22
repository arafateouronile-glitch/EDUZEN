import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withQueryValidation, type ValidationSchema } from '@/lib/utils/api-validation'
import { errorHandler, ErrorCode, AppError } from '@/lib/errors'

const querySchema: ValidationSchema = {
  email: {
    type: 'email',
    required: true,
  },
}

export async function GET(request: NextRequest) {
  return withQueryValidation(request, querySchema, async (req, data) => {
    try {
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }

      const { data: currentUser } = await supabase
        .from('users')
        .select('organization_id, role')
        .eq('id', user.id)
        .single()
      const userOrgId = currentUser?.organization_id
      if (!userOrgId) {
        return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
      }

      const { email } = data
      const emailStr = String(email)
      const adminSupabase = createAdminClient()

      // Ne retourner que les utilisateurs de la même organisation (sécurité cross-tenant)
      const { data: profile, error } = await adminSupabase
        .from('users')
        .select('id, email, full_name, role')
        .eq('email', emailStr)
        .eq('organization_id', userOrgId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw errorHandler.createNotFoundError(
            `Utilisateur avec l'email ${email} introuvable`,
            { email }
          )
        }
        throw errorHandler.handleError(error, {
          operation: 'getUserByEmail',
          email,
        })
      }

      return NextResponse.json({ user: profile })
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'getUserByEmail',
      })
    }
  })
}
