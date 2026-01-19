import { NextRequest, NextResponse } from 'next/server'
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
      const { email } = data
      const emailStr = String(email)
      const supabase = createAdminClient()

      const { data: profile, error } = await supabase
        .from('users')
        .select('id, email, full_name, role')
        .eq('email', emailStr)
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
