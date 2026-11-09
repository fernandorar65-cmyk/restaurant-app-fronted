import type { Permission } from '@/modules/auth/permissions'

export interface AuthUser {
  id: string
  name: string
  email: string
  roleId: string | null
  roleName: string | null
  /** Código del rol en el API (p. ej. `OWNER`, `CASHIER`). */
  roleCode: string | null
  /** Permisos del front, derivados de los del API (ver `permissions.ts`). */
  permissions: Permission[]
  /** Permisos tal como los devuelve el API (`catalog.manage`, `finance.read`…). */
  apiPermissions: string[]
  /** Sedes a las que tiene acceso. Vacío = todas las sedes de la organización. */
  restaurantIds: string[]
  employeeId: string | null
  /** Organización activa: la que se envía como `organizationId` en el panel. */
  organizationId: string | null
  organizationName: string | null
  membershipId: string | null
  isPlatformAdmin: boolean
}

export interface AuthSession {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  /** Nombre comercial de la organización (obligatorio en el alta del dueño). */
  organizationName: string
}

/** Sede a cargo de un usuario del restaurante, resumida para su perfil. */
export interface StaffProfileSite {
  id: string
  slug: string
  name: string
  city: string
  imageUrl: string
}

/**
 * Perfil del dueño o del personal del restaurante. Distinto al del cliente:
 * gira en torno a su rol, sus permisos y las sedes que gestiona.
 */
export interface StaffProfile {
  id: string
  name: string
  email: string
  phone: string | null
  /** Puesto del empleado vinculado (el API no guarda un cargo libre). */
  jobTitle: string | null
  createdAt: string | null
  roleName: string | null
  roleCode: string | null
  permissions: Permission[]
  /** true = sin restricción de sede (ve toda la organización). */
  allRestaurants: boolean
  restaurants: StaffProfileSite[]
  /** Ficha de empleado vinculada, si la tiene. */
  employee: {
    area: string
    status: string
    hiredAt: string | null
    restaurantName: string | null
  } | null
}

export type StaffProfileDraft = Pick<StaffProfile, 'name' | 'phone' | 'jobTitle'>
