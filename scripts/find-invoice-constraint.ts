import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function findConstraint() {
  // Essayer de lire une facture existante si elle existe
  const { data: existingInvoices } = await supabase
    .from('invoices')
    .select('*')
    .limit(5)
  
  console.log('Factures existantes dans la base:')
  console.log(JSON.stringify(existingInvoices, null, 2))
  
  // Tester avec des valeurs simples
  const testValues = [
    'standard',
    'custom',
    'regular',
    'normal',
    'default',
    'simple',
    'basic',
  ]
  
  for (const testValue of testValues) {
    console.log('\nTest avec type: "' + testValue + '"')
    
    const testNum = Math.random().toString(36).substring(7)
    const { error } = await supabase.from('invoices').insert({
      organization_id: '4d27f507-280c-4e55-8a48-6b9840e13f8a',
      student_id: '111259f6-e45b-4ff1-aea1-d3ac0433d9f7',
      invoice_number: 'TEST-' + testNum,
      issue_date: '2025-01-01',
      due_date: '2025-02-01',
      amount: 100,
      total_amount: 100,
      currency: 'EUR',
      document_type: 'invoice',
      type: testValue,
      status: 'draft',
    }).select()
    
    if (!error) {
      console.log('✅ SUCCÈS avec "' + testValue + '"!')
      await supabase.from('invoices').delete().eq('invoice_number', 'TEST-' + testNum)
      break
    }
  }
}

findConstraint().catch(console.error)
