'use client'

import { PlatformAdminGuard } from '@/components/super-admin/platform-admin-guard'
import { EmailLogsDashboard } from '@/components/super-admin/email-logs/email-logs-dashboard'
import { Mail } from 'lucide-react'

export default function EmailLogsPage() {
  return (
    <PlatformAdminGuard requiredPermission="view_dashboard">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 p-2">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Monitor d&apos;Emails</h1>
            <p className="text-sm text-muted-foreground">
              Tracking temps réel de tous les emails transactionnels — délivrabilité, ouvertures, rejets.
            </p>
          </div>
        </div>

        <EmailLogsDashboard />
      </div>
    </PlatformAdminGuard>
  )
}
