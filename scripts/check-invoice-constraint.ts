import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkInvoiceConstraints() {
  // Requête pour obtenir les contraintes CHECK sur la table invoices
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(c.oid) as definition
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE t.relname = 'invoices' 
      AND n.nspname = 'public'
      AND c.contype = 'c'
    `
  })

  if (error) {
    console.log('Essai avec une requête simple...')
    
    // Essayer d'insérer avec différentes valeurs pour voir les contraintes
    const testTypes = ['standard', 'proforma', 'regular', 'custom', null]
    
    for (const testType of testTypes) {
      console.log(`\n📝 Test avec type: ${testType}`)
      const { error: insertError } = await supabase
        .from('invoices')
        .insert({
          organization_id: '4d27f507-280c-4e55-8a48-6b9840e13f8a',
          student_id: '00000000-0000-0000-0000-000000000000',
          invoice_number: `TEST-${testType || 'null'}`,
          issue_date: '2025-01-01',
          due_date: '2025-02-01',
          amount: 100,
          total_amount: 100,
          currency: 'EUR',
          document_type: 'invoice',
          type: testType,
          status: 'draft',
        })
        .select()
      
      if (insertError) {
        console.log(`❌ ${insertError.message}`)
      } else {
        console.log(`✅ Succès!`)
        await supabase.from('invoices').delete().eq('invoice_number', `TEST-${testType || 'null'}`)
      }
    }
  } else {
    console.log('Contraintes trouvées:')
    console.log(data)
  }
}

checkInvoiceConstraints().catch(console.error)
