'use client'

import { useAuth } from '@/lib/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AlertCircle, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: string[]
  fallback?: React.ReactNode
  redirectTo?: string
}

// Rôles avec accès administratif
export const ADMIN_ROLES = ['super_admin', 'admin', 'secretary', 'accountant']
// Rôles avec accès aux finances (incluant secrétaire)
export const FINANCE_ROLES = ['super_admin', 'admin', 'secretary', 'accountant']
// Rôles avec accès à la gestion des formations
export const FORMATION_MANAGEMENT_ROLES = ['super_admin', 'admin', 'secretary']

export function RoleGuard({ 
  children, 
  allowedRoles, 
  fallback,
  redirectTo = '/dashboard'
}: RoleGuardProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isLoading && user) {
      const userRole = user.role || ''
      const access = allowedRoles.includes(userRole)
      setHasAccess(access)
      
      // Si l'utilisateur n'a pas accès et qu'une redirection est définie
      if (!access && redirectTo && !fallback) {
        router.push(redirectTo)
      }
    }
  }, [user, isLoading, allowedRoles, redirectTo, router, fallback])

  // Pendant le chargement
  if (isLoading || hasAccess === null) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
      </div>
    )
  }

  // Si l'utilisateur n'a pas accès
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>
    }
    
    return (
      <div className="container mx-auto py-16 px-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Accès non autorisé
            </h2>
            <p className="text-gray-600 mb-6">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
            <Link href="/dashboard">
              <Button>
                Retour au tableau de bord
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // L'utilisateur a accès
  return <>{children}</>
}

// Hook pour vérifier l'accès basé sur le rôle
export function useRoleAccess(allowedRoles: string[]): boolean {
  const { user, isLoading } = useAuth()
  
  if (isLoading || !user) {
    return false
  }
  
  return allowedRoles.includes(user.role || '')
}

// Vérifier si l'utilisateur est un administrateur
export function useIsAdmin(): boolean {
  return useRoleAccess(ADMIN_ROLES)
}

// Vérifier si l'utilisateur peut accéder aux finances
export function useCanAccessFinances(): boolean {
  return useRoleAccess(FINANCE_ROLES)
}

// Vérifier si l'utilisateur est un enseignant
export function useIsTeacher(): boolean {
  const { user } = useAuth()
  return user?.role === 'teacher'
}

