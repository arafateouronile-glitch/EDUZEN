import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const ORGANIZATION_ID = '4d27f507-280c-4e55-8a48-6b9840e13f8a'

async function diagnoseInvoiceChart() {
  console.log('🔍 Diagnostic du graphique des factures\n')
  
  // Exactement la même requête que dans le dashboard
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('status, document_type')
    .eq('organization_id', ORGANIZATION_ID)
    .or('document_type.eq.invoice,document_type.is.null')
  
  if (error) {
    console.error('❌ Erreur requête:', error)
    return
  }
  
  console.log('✅ Factures récupérées:', invoices?.length || 0)
  
  if (!invoices || invoices.length === 0) {
    console.log('\n⚠️  PROBLÈME: Aucune facture récupérée!')
    
    // Vérifier si les factures existent sans filtre
    const { data: allInvoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', ORGANIZATION_ID)
      .limit(5)
    
    console.log('\nFactures dans la base (sans filtre):')
    console.log(JSON.stringify(allInvoices, null, 2))
    return
  }
  
  // Compter par statut (exactement comme dans le dashboard)
  const statusCounts = {
    paid: 0,
    sent: 0,
    partial: 0,
    overdue: 0,
    draft: 0,
  }
  
  invoices.forEach((inv: any) => {
    const status = inv.status
    if (status in statusCounts) {
      statusCounts[status as keyof typeof statusCounts]++
    }
  })
  
  console.log('\n📊 Comptage par statut:')
  console.log(statusCounts)
  
  // Résultat final (exactement comme dans le dashboard)
  const result = [
    { name: 'Payées', value: statusCounts.paid },
    { name: 'Envoyées', value: statusCounts.sent },
    { name: 'Partielles', value: statusCounts.partial },
    { name: 'En retard', value: statusCounts.overdue },
    { name: 'Brouillons', value: statusCounts.draft },
  ].filter((item) => item.value > 0)
  
  console.log('\n📈 Données pour le graphique:')
  console.log(JSON.stringify(result, null, 2))
  
  if (result.length === 0) {
    console.log('\n❌ PROBLÈME: Le résultat est vide après filtrage!')
  } else {
    console.log('\n✅ Le graphique devrait afficher', result.length, 'sections')
  }
}

diagnoseInvoiceChart().catch(console.error)
