import type { Permission } from '@/modules/auth/permissions'

export type EmployeeArea = 'kitchen' | 'floor' | 'support' | 'management'

export type EmployeeStatus = 'active' | 'on-leave' | 'inactive'

export interface Employee {
  id: string
  name: string
  email: string
  phone: string
  roleId: string
  roleName: string
  restaurantId: string
  restaurantName: string
  area: EmployeeArea
  status: EmployeeStatus
  hiredAt: string
  userId: string | null
}

export interface EmployeeDraft {
  name: string
  email: string
  phone: string
  roleId: string
  restaurantId: string
  area: EmployeeArea
  status: EmployeeStatus
  userId: string | null
}

export interface SystemUser {
  id: string
  name: string
  email: string
  isActive: boolean
  isBlocked: boolean
  roleId: string | null
  /** Sedes a las que accede. Vacío = todas. */
  restaurantIds: string[]
  employeeId: string | null
}

export interface SystemUserDraft {
  roleId: string | null
  restaurantIds: string[]
  employeeId: string | null
}

export interface Role {
  id: string
  name: string
  description: string
  permissions: Permission[]
}

export interface RoleDraft {
  name: string
  description: string
  permissions: Permission[]
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
