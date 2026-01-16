import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const ORGANIZATION_ID = '4d27f507-280c-4e55-8a48-6b9840e13f8a'
const CURRENT_USER_ID = 'ff6fe5a3-6f1b-41df-bd2c-17f851afb518'

async function checkUserRole() {
  console.log('Vérification du rôle utilisateur...\n')
  
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, role, organization_id')
    .eq('id', CURRENT_USER_ID)
    .single()
  
  if (error) {
    console.error('Erreur:', error)
    return
  }
  
  console.log('Utilisateur:')
  console.log(JSON.stringify(user, null, 2))
  
  console.log('\nLa condition `user?.role !== "teacher"` est:', user?.role !== 'teacher')
}

checkUserRole().catch(console.error)
