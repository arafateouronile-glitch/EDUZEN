import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { QuotaService } from '@/lib/services/quota.service'
import { FeatureLocked } from '@/components/quota/feature-locked'

export default async function QualiopiLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()
  const orgId = await getUserOrgId(adminClient, user.id)
  if (!orgId) redirect('/login')

  const hasQualiopiDashboard = await new QuotaService(adminClient).hasFeature(
    orgId,
    'qualiopi_dashboard'
  )

  if (!hasQualiopiDashboard) {
    return (
      <FeatureLocked
        featureName="Dashboard Qualiopi"
        featureDescription="Le suivi de conformité Qualiopi (indicateurs, preuves, questionnaires) est disponible à partir du forfait Pro."
      />
    )
  }

  return <>{children}</>
}
