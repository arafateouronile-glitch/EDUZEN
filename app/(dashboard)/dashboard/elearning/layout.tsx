import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { QuotaService } from '@/lib/services/quota.service'
import { FeatureLocked } from '@/components/quota/feature-locked'

export default async function ElearningLayout({
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

  const hasElearning = await new QuotaService(adminClient).hasFeature(orgId, 'e_learning')

  if (!hasElearning) {
    return (
      <FeatureLocked
        featureName="Portail e-learning"
        featureDescription="La création de parcours e-learning est disponible à partir du forfait Pro."
      />
    )
  }

  return <>{children}</>
}
