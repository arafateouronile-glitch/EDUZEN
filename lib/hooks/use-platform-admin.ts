'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './use-auth'
import type {
  PlatformAdmin,
  PlatformAdminRole,
  AdminPermissions,
  DEFAULT_PERMISSIONS_BY_ROLE,
} from '@/types/super-admin.types'

interface UsePlatformAdminReturn {
  // State
  platformAdmin: PlatformAdmin | null
  isLoading: boolean
  error: Error | null

  // Role checks
  isPlatformAdmin: boolean
  isSuperAdmin: boolean
  isContentAdmin: boolean
  isSupportAdmin: boolean
  isFinanceAdmin: boolean

  // Permission checks
  hasPermission: (permission: keyof AdminPermissions) => boolean
  canViewDashboard: boolean
  canViewRevenue: boolean
  canManageSubscriptions: boolean
  canManageInvoices: boolean
  canManagePromoCodes: boolean
  canManageReferrals: boolean
  canManageBlog: boolean
  canPublishPosts: boolean
  canModerateComments: boolean
  canManageTeam: boolean

  // Role info
  role: PlatformAdminRole | null
  roleLabel: string | null
  permissions: AdminPermissions
}

const ROLE_LABELS: Record<PlatformAdminRole, string> = {
  super_admin: 'Super Administrateur',
  content_admin: 'Administrateur Contenu',
  support_admin: 'Administrateur Support',
  finance_admin: 'Administrateur Finance',
}

export function usePlatformAdmin(): UsePlatformAdminReturn {
  const { user, isLoading: isAuthLoading } = useAuth()
  const supabase = createClient()

  // Fetch platform admin record
  const {
    data: platformAdmin,
    isLoading: isAdminLoading,
    error,
  } = useQuery({
    queryKey: ['platform-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return null

      // First, get the platform admin record
      const { data: adminData, error: adminError } = await supabase
        .from('platform_admins')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (adminError) {
        // Log error for debugging
        console.error('[usePlatformAdmin] Error fetching platform admin:', adminError)
        // If table doesn't exist yet, return null silently
        if (adminError.code === '42P01') return null
        // If RLS policy blocks access, log it
        if (adminError.code === '42501' || adminError.message?.includes('permission denied')) {
          console.error('[usePlatformAdmin] RLS policy blocked access. Check policies.')
        }
        throw adminError
      }

      if (!adminData) {
        console.log('[usePlatformAdmin] No platform admin found for user:', user.id)
        return null
      }

      console.log('[usePlatformAdmin] Platform admin found:', adminData)

      // Try to get user info from auth.users (via RPC or direct query if possible)
      // For now, we'll just return the admin data without the user relation
      // The user info can be obtained from useAuth() hook
      return {
        ...adminData,
        user: {
          id: user.id,
          email: user.email || '',
          full_name: user.full_name || null,
          avatar_url: user.avatar_url || null,
        },
      } as PlatformAdmin | null
    },
    enabled: !!user?.id && !isAuthLoading,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: false,
  })

  const isLoading = isAuthLoading || isAdminLoading

  // Extract role and permissions
  const role = platformAdmin?.role ?? null
  const permissions = platformAdmin?.permissions ?? {}

  // Helper to check permissions (with role-based defaults)
  const hasPermission = (permission: keyof AdminPermissions): boolean => {
    // Super admin has all permissions
    if (role === 'super_admin') return true

    // Check explicit permission first
    if (permissions[permission] !== undefined) {
      return permissions[permission] as boolean
    }

    // Fall back to default permissions for role
    if (role) {
      const defaults = getDefaultPermissions(role)
      return defaults[permission] ?? false
    }

    return false
  }

  // Role checks
  const isPlatformAdmin = !!platformAdmin && platformAdmin.is_active
  const isSuperAdmin = role === 'super_admin'
  const isContentAdmin = role === 'content_admin'
  const isSupportAdmin = role === 'support_admin'
  const isFinanceAdmin = role === 'finance_admin'

  // Permission checks
  const canViewDashboard = hasPermission('view_dashboard')
  const canViewRevenue = hasPermission('view_revenue')
  const canManageSubscriptions = hasPermission('manage_subscriptions')
  const canManageInvoices = hasPermission('manage_invoices')
  const canManagePromoCodes = hasPermission('manage_promo_codes')
  const canManageReferrals = hasPermission('manage_referrals')
  const canManageBlog = hasPermission('manage_blog')
  const canPublishPosts = hasPermission('publish_posts')
  const canModerateComments = hasPermission('moderate_comments')
  const canManageTeam = hasPermission('manage_team')

  return {
    // State
    platformAdmin,
    isLoading,
    error: error as Error | null,

    // Role checks
    isPlatformAdmin,
    isSuperAdmin,
    isContentAdmin,
    isSupportAdmin,
    isFinanceAdmin,

    // Permission checks
    hasPermission,
    canViewDashboard,
    canViewRevenue,
    canManageSubscriptions,
    canManageInvoices,
    canManagePromoCodes,
    canManageReferrals,
    canManageBlog,
    canPublishPosts,
    canModerateComments,
    canManageTeam,

    // Role info
    role,
    roleLabel: role ? ROLE_LABELS[role] : null,
    permissions,
  }
}

// Helper to get default permissions for a role
function getDefaultPermissions(role: PlatformAdminRole): AdminPermissions {
  const defaults: Record<PlatformAdminRole, AdminPermissions> = {
    super_admin: {
      view_dashboard: true,
      view_revenue: true,
      manage_subscriptions: true,
      manage_invoices: true,
      manage_promo_codes: true,
      manage_referrals: true,
      manage_blog: true,
      publish_posts: true,
      moderate_comments: true,
      manage_team: true,
    },
    content_admin: {
      view_dashboard: true,
      view_revenue: false,
      manage_subscriptions: false,
      manage_invoices: false,
      manage_promo_codes: false,
      manage_referrals: false,
      manage_blog: true,
      publish_posts: true,
      moderate_comments: true,
      manage_team: false,
    },
    support_admin: {
      view_dashboard: true,
      view_revenue: false,
      manage_subscriptions: false,
      manage_invoices: false,
      manage_promo_codes: false,
      manage_referrals: false,
      manage_blog: false,
      publish_posts: false,
      moderate_comments: true,
      manage_team: false,
    },
    finance_admin: {
      view_dashboard: true,
      view_revenue: true,
      manage_subscriptions: true,
      manage_invoices: true,
      manage_promo_codes: true,
      manage_referrals: true,
      manage_blog: false,
      publish_posts: false,
      moderate_comments: false,
      manage_team: false,
    },
  }

  return defaults[role] ?? {}
}

// Component guard for platform admin routes
export function usePlatformAdminGuard(requiredPermission?: keyof AdminPermissions): {
  isAllowed: boolean
  isLoading: boolean
  redirect: string | null
} {
  const {
    isPlatformAdmin,
    isLoading,
    hasPermission,
  } = usePlatformAdmin()

  if (isLoading) {
    return { isAllowed: false, isLoading: true, redirect: null }
  }

  if (!isPlatformAdmin) {
    return { isAllowed: false, isLoading: false, redirect: '/dashboard' }
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return { isAllowed: false, isLoading: false, redirect: '/super-admin' }
  }

  return { isAllowed: true, isLoading: false, redirect: null }
}
