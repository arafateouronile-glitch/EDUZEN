/**
 * Script pour vérifier les données du dashboard
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const ORGANIZATION_ID = '4d27f507-280c-4e55-8a48-6b9840e13f8a'

async function checkData() {
  console.log('🔍 Vérification des données du dashboard...\n')

  // Vérifier les paiements du mois en cours
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('organization_id', ORGANIZATION_ID)
    .gte('paid_at', firstDayOfMonth.toISOString())
    .not('paid_at', 'is', null)

  console.log('💰 Paiements du mois en cours:')
  console.log(`   - Nombre: ${payments?.length || 0}`)
  const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
  console.log(`   - Total: ${totalRevenue.toFixed(2)} ${payments?.[0]?.currency || 'EUR'}`)
  console.log()

  // Vérifier les étudiants et leurs classes
  const { data: students } = await supabase
    .from('students')
    .select('class_id')
    .eq('organization_id', ORGANIZATION_ID)

  const classDistribution = students?.reduce((acc: any, s) => {
    const classId = s.class_id || 'no_class'
    acc[classId] = (acc[classId] || 0) + 1
    return acc
  }, {}) || {}

  console.log('👨‍🎓 Répartition des étudiants par classe:')
  Object.entries(classDistribution).forEach(([classId, count]) => {
    console.log(`   - ${classId === 'no_class' ? 'Sans classe' : classId}: ${count} étudiants`)
  })
  console.log()

  // Vérifier le taux de présence
  const { data: attendance } = await supabase
    .from('attendance')
    .select('status')

  const totalAttendance = attendance?.length || 0
  const presentCount = attendance?.filter(a => a.status === 'present').length || 0
  const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0

  console.log('✅ Taux de présence:')
  console.log(`   - Total enregistrements: ${totalAttendance}`)
  console.log(`   - Présents: ${presentCount}`)
  console.log(`   - Taux: ${attendanceRate.toFixed(2)}%`)
  console.log()

  // Vérifier les factures
  const { data: invoices } = await supabase
    .from('invoices')
    .select('status, amount, currency')
    .eq('organization_id', ORGANIZATION_ID)

  const invoiceStats = invoices?.reduce((acc: any, inv) => {
    acc[inv.status || 'unknown'] = (acc[inv.status || 'unknown'] || 0) + 1
    return acc
  }, {}) || {}

  console.log('📄 Statut des factures:')
  Object.entries(invoiceStats).forEach(([status, count]) => {
    console.log(`   - ${status}: ${count}`)
  })
  console.log(`   - Total: ${invoices?.length || 0} factures`)
  console.log()

  // Vérifier les classes
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name, code')
    .eq('organization_id', ORGANIZATION_ID)

  console.log('🏫 Classes créées:')
  classes?.forEach(c => {
    const studentsInClass = students?.filter(s => s.class_id === c.id).length || 0
    console.log(`   - ${c.code} - ${c.name}: ${studentsInClass} étudiants`)
  })
}

checkData().catch(console.error)
