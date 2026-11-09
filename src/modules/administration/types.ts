/**
 * Áreas históricas del front. Las áreas ahora son un catálogo por organización
 * (`WorkArea`); se conserva el tipo solo para traducir nombres conocidos.
 */
export type EmployeeArea = 'kitchen' | 'floor' | 'support' | 'management'

export type EmployeeStatus = 'active' | 'inactive' | 'terminated'

/** Área de trabajo de la organización (`/work-areas`). */
export interface WorkArea {
  id: string
  name: string
  description: string | null
  isActive: boolean
}

/** Puesto dentro de un área (`/job-positions`). */
export interface JobPosition {
  id: string
  workAreaId: string
  name: string
  description: string | null
  isActive: boolean
}

/**
 * Ficha laboral. El API no guarda nombre ni contacto en el empleado: salen de la
 * cuenta vinculada (`userId` → membresía). El área se deriva del puesto.
 */
export interface Employee {
  id: string
  employeeCode: string
  documentNumber: string | null
  jobPositionId: string | null
  status: EmployeeStatus
  hiredAt: string | null
  terminatedAt: string | null
  userId: string | null
}

export interface EmployeeDraft {
  employeeCode: string
  documentNumber: string
  jobPositionId: string | null
  /** YYYY-MM-DD o vacío. */
  hiredAt: string
  status: EmployeeStatus
  userId: string | null
}

/** Estado del acceso a la organización (membresía). */
export type MembershipStatus = 'active' | 'inactive' | 'invited' | 'suspended'

/** Estado global de la cuenta (solo lo cambia la plataforma). */
export type AccountStatus = 'active' | 'inactive' | 'blocked'

/** Usuario de la organización: una membresía con su cuenta, rol, sedes y empleado. */
export interface SystemUser {
  /** Id de la membresía. */
  id: string
  /** Id de la cuenta (usuario). */
  userId: string
  name: string
  email: string
  status: MembershipStatus
  accountStatus: AccountStatus
  roleId: string
  roleName: string
  roleCode: string
  /** true = todas las sedes (actuales y futuras). */
  allRestaurants: boolean
  /** Sedes permitidas cuando `allRestaurants` es false. */
  restaurantIds: string[]
  employeeId: string | null
}

export interface SystemUserDraft {
  roleId: string
  allRestaurants: boolean
  restaurantIds: string[]
  employeeId: string | null
}

/** Alta de una cuenta nueva con acceso a la organización. */
export interface NewSystemUserDraft extends SystemUserDraft {
  email: string
  firstName: string
  lastName: string
  /** Contraseña temporal: se pide cambiarla en el primer ingreso. */
  password: string
}

/** Permiso del API (`GET /permissions`): código + nombre legible. */
export interface ApiPermission {
  id: string
  code: string
  name: string
  description: string | null
}

export interface Role {
  id: string
  code: string
  name: string
  description: string
  isSystem: boolean
  /** Códigos de permisos del API efectivos (OWNER siempre los tiene todos). */
  permissions: string[]
  /** Usuarios con este rol (membresías activas). */
  memberCount: number
}

export interface RoleDraft {
  name: string
  description: string
  /** Códigos de permisos del API. */
  permissions: string[]
}

export type InventoryStatus = 'ok' | 'low' | 'critical'

export interface InventoryItem {
  id: string
  restaurantId: string
  name: string
  unit: string
  stock: number
  minStock: number
  status: InventoryStatus
  supplier: string
  updatedAt: string
  isActive: boolean
}

export interface InventoryItemDraft {
  restaurantId: string
  name: string
  unit: string
  stock: number
  minStock: number
  supplier: string
  isActive: boolean
}
