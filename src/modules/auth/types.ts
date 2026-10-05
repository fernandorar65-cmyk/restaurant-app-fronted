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
}
