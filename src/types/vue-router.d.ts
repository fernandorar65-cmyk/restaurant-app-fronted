import type { Permission } from '@/modules/auth/permissions'

export {}

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
    /** Permiso requerido para entrar a la ruta. */
    permission?: Permission
    /** Basta con tener cualquiera de estos permisos. */
    anyPermission?: readonly Permission[]
  }
}
