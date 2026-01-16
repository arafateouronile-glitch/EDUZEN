import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const ORGANIZATION_ID = '4d27f507-280c-4e55-8a48-6b9840e13f8a'

async function testInvoiceQuery() {
  console.log('Test de la requête du dashboard...\n')
  
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('status, document_type, type')
    .eq('organization_id', ORGANIZATION_ID)
    .or('document_type.eq.invoice,document_type.is.null')
  
  if (error) {
    console.error('Erreur:', error)
    return
  }
  
  console.log('Nombre de factures récupérées:', invoices?.length || 0)
  console.log('\nPremières 5 factures:')
  console.log(JSON.stringify(invoices?.slice(0, 5), null, 2))
  
  // Compter par statut
  const counts: any = {}
  invoices?.forEach((inv: any) => {
    counts[inv.status] = (counts[inv.status] || 0) + 1
  })
  
  console.log('\nRépartition par statut:')
  console.log(counts)
}

testInvoiceQuery().catch(console.error)
