import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const ORGANIZATION_ID = '4d27f507-280c-4e55-8a48-6b9840e13f8a'

async function testInvoiceType() {
  // Test sans le champ type
  console.log('\nTest SANS le champ "type"')
  
  const { error } = await supabase.from('invoices').insert({
    organization_id: ORGANIZATION_ID,
    student_id: '00000000-0000-0000-0000-000000000000',
    invoice_number: `TEST-NO-TYPE`,
    issue_date: '2025-01-01',
    due_date: '2025-02-01',
    amount: 100,
    total_amount: 100,
    currency: 'EUR',
    document_type: 'invoice',
    status: 'draft',
  }).select()
  
  if (error) {
    console.log(`❌ Erreur: ${error.message}`)
  } else {
    console.log(`✅ Succès sans type!`)
    await supabase.from('invoices').delete().eq('invoice_number', `TEST-NO-TYPE`)
  }
}

testInvoiceType().catch(console.error)
