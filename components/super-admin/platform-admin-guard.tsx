'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePlatformAdmin, usePlatformAdminGuard } from '@/lib/hooks/use-platform-admin'
import { Shield, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { AdminPermissions } from '@/types/super-admin.types'

interface PlatformAdminGuardProps {
  children: React.ReactNode
  requiredPermission?: keyof AdminPermissions
  fallback?: React.ReactNode
}

export function PlatformAdminGuard({
  children,
  requiredPermission,
  fallback,
}: PlatformAdminGuardProps) {
  const router = useRouter()
  const { isAllowed, isLoading, redirect } = usePlatformAdminGuard(requiredPermission)

  useEffect(() => {
    if (!isLoading && redirect && !fallback) {
      router.push(redirect)
    }
  }, [isLoading, redirect, router, fallback])

  // Loading state with premium design
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-brand-blue/20" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan mx-auto">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Vérification des accès...</p>
            <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
          </div>
        </div>
      </div>
    )
  }

  // Access denied
  if (!isAllowed) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Accès restreint
            </h2>
            <p className="text-muted-foreground mb-6 text-sm">
              {requiredPermission
                ? "Vous n'avez pas les permissions nécessaires pour accéder à cette section."
                : "Cette zone est réservée aux administrateurs de la plateforme."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
              >
                Retour au dashboard
              </Button>
              {!requiredPermission && (
                <Button
                  onClick={() => router.push('/auth/login')}
                >
                  Se connecter
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Access granted
  return <>{children}</>
}

// HOC version for page components
export function withPlatformAdminGuard<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission?: keyof AdminPermissions
) {
  return function WrappedComponent(props: P) {
    return (
      <PlatformAdminGuard requiredPermission={requiredPermission}>
        <Component {...props} />
      </PlatformAdminGuard>
    )
  }
}
