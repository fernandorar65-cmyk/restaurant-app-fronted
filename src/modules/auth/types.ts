import type { Permission } from '@/modules/auth/permissions'

export interface AuthUser {
  id: string
  name: string
  email: string
  roleId: string | null
  roleName: string | null
  permissions: Permission[]
  /** Sedes a las que tiene acceso. Vacío = todas las sedes de la organización. */
  restaurantIds: string[]
  employeeId: string | null
}

export interface AuthSession {
  accessToken: string
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
}

export interface JsonUser {
  id: number | string
  name: string
  email: string
  password: string
  isActive: boolean
  isBlocked?: boolean
  roleId?: string | null
  restaurantIds?: string[]
  employeeId?: string | null
  phone?: string | null
  jobTitle?: string | null
  createdAt?: string | null
}

/** Sede a cargo de un usuario del restaurante, resumida para su perfil. */
export interface StaffProfileSite {
  id: string
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
  /** Cargo que el usuario muestra (ej: "Fundador y propietario"); el rol define los permisos. */
  jobTitle: string | null
  createdAt: string | null
  roleName: string | null
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
