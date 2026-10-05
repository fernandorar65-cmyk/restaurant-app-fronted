import type { RouteLocationRaw } from 'vue-router'

import type { Permission } from '@/modules/auth/permissions'
import type { AuthUser } from '@/modules/auth/types'

/** Vista principal de cada permiso dentro de una sede, en orden de prioridad. */
const SITE_LANDING: Array<{ permission: Permission; routeName: string }> = [
  { permission: 'sites.manage', routeName: 'site-dashboard' },
  { permission: 'kitchen.manage', routeName: 'site-kitchen' },
  { permission: 'orders.manage', routeName: 'site-orders' },
  { permission: 'delivery.manage', routeName: 'site-deliveries' },
  { permission: 'payments.manage', routeName: 'site-accounts' },
  { permission: 'menu.manage', routeName: 'site-menu' },
  { permission: 'reports.view', routeName: 'site-metrics' },
]

/** Primera vista de sede a la que el usuario tiene acceso. */
export function siteLandingRoute(user: AuthUser | null, restaurantId: string): RouteLocationRaw | null {
  const match = SITE_LANDING.find((item) => user?.permissions.includes(item.permission))
  return match ? { name: match.routeName, params: { restaurantId } } : null
}

/** A dónde va cada usuario al iniciar sesión, según su rol y sus sedes. */
export function landingRouteFor(user: AuthUser | null): RouteLocationRaw {
  if (!user || user.permissions.length === 0) {
    return { name: 'no-access' }
  }

  const singleSite = user.restaurantIds.length === 1 ? user.restaurantIds[0] : undefined

  if (singleSite) {
    const siteRoute = siteLandingRoute(user, singleSite)

    if (siteRoute) {
      return siteRoute
    }
  }

  if (SITE_LANDING.some((item) => user.permissions.includes(item.permission))) {
    return { name: 'dashboard' }
  }

  return { name: 'admin-home' }
}
