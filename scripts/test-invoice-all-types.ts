import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const ORGANIZATION_ID = '4d27f507-280c-4e55-8a48-6b9840e13f8a'

async function testAllTypes() {
  const types = ['invoice', 'quote', 'receipt', 'credit_note', 'proforma']
  
  for (const type of types) {
    console.log('\n📝 Test avec type: "' + type + '"')
    
    const testNum = Math.random().toString(36).substring(7)
    const { error } = await supabase.from('invoices').insert({
      organization_id: ORGANIZATION_ID,
      student_id: '111259f6-e45b-4ff1-aea1-d3ac0433d9f7',
      invoice_number: 'TEST-' + testNum,
      issue_date: '2025-01-01',
      due_date: '2025-02-01',
      amount: 100,
      total_amount: 100,
      currency: 'EUR',
      document_type: 'invoice',
      type: type,
      status: 'draft',
    }).select()
    
    if (error) {
      console.log('❌ Erreur: ' + error.message)
    } else {
      console.log('✅ Succès!')
      await supabase.from('invoices').delete().eq('invoice_number', 'TEST-' + testNum)
    }
  }
}

testAllTypes().catch(console.error)
