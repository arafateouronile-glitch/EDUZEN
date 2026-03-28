import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SuperAdminShell } from './super-admin-shell'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  const { data: platformAdmin } = await supabase
    .from('platform_admins')
    .select('id, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!platformAdmin) {
    redirect('/dashboard')
  }

  return (
    <SuperAdminShell>
      {children}
    </SuperAdminShell>
  )
}
