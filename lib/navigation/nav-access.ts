export type NavigationItem = {
  name: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  allowedRoles?: string[]
  trialLocked?: boolean
  children?: Array<{
    name: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    allowedRoles?: string[]
    trialLocked?: boolean
  }>
}

export type NavigationSection = {
  title: string
  items: NavigationItem[]
  allowedRoles?: string[]
}

const DASHBOARD_HOME = '/dashboard'

/**
 * Lit la liste des sections autorisées depuis `users.permissions` (jsonb).
 * `null` = pas d'override défini pour cet utilisateur, comportement basé sur le rôle inchangé.
 */
export function getNavAccessOverride(permissions: unknown): string[] | null {
  if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) return null
  const navAccess = (permissions as Record<string, unknown>).nav_access
  if (!Array.isArray(navAccess) || navAccess.length === 0) return null
  const hrefs = navAccess.filter((href): href is string => typeof href === 'string')
  return hrefs.length > 0 ? hrefs : null
}

/** Le tableau de bord est toujours accessible, même sous restriction. */
export function isDashboardHome(pathname: string): boolean {
  return pathname === DASHBOARD_HOME
}

/** Égalité exacte ou sous-route (`/dashboard/sessions/123` matche `/dashboard/sessions`). */
export function isPathAllowed(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/')
}

export function hasNavAccess(pathname: string, override: string[]): boolean {
  if (isDashboardHome(pathname)) return true
  return override.some(href => isPathAllowed(pathname, href))
}

/** Filtrage historique par rôle (comportement inchangé si aucun override n'est défini). */
export function filterNavigationByRole(navigation: NavigationSection[], userRole: string | undefined): NavigationSection[] {
  if (!userRole) return navigation

  return navigation
    .filter(section => !section.allowedRoles || section.allowedRoles.includes(userRole))
    .map(section => ({
      ...section,
      items: section.items
        .filter(item => !item.allowedRoles || item.allowedRoles.includes(userRole))
        .map(item => ({
          ...item,
          children: item.children?.filter(child => !child.allowedRoles || child.allowedRoles.includes(userRole)),
        })),
    }))
    .filter(section => section.items.length > 0)
}

/**
 * Filtrage par override utilisateur (`nav_access`), au niveau des pages (items avec `href`,
 * qu'ils soient de premier niveau ou imbriqués dans un groupe). Si `override` est `null`,
 * délègue entièrement au filtrage par rôle existant.
 */
export function filterNavigationByAccess(
  navigation: NavigationSection[],
  override: string[] | null,
  userRole: string | undefined
): NavigationSection[] {
  if (!override) return filterNavigationByRole(navigation, userRole)

  const isAllowed = (href: string) => isDashboardHome(href) || override.includes(href)

  return navigation
    .map(section => ({
      ...section,
      items: section.items
        .map(item => {
          if (item.children) {
            const children = item.children.filter(child => isAllowed(child.href))
            return children.length > 0 ? { ...item, children } : null
          }
          return item.href && isAllowed(item.href) ? item : null
        })
        .filter((item): item is NavigationItem => item !== null),
    }))
    .filter(section => section.items.length > 0)
}
