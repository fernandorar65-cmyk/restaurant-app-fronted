import type {
  Employee,
  EmployeeArea,
  EmployeeDraft,
  EmployeeStatus,
  InventoryItem,
  InventoryItemDraft,
  InventoryStatus,
  Role,
  RoleDraft,
  SystemUser,
  SystemUserDraft,
} from '@/modules/administration/types'
import { isPermission } from '@/modules/auth/permissions'
import { http } from '@/services/http'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

const AREAS: readonly EmployeeArea[] = ['kitchen', 'floor', 'support', 'management']
const EMPLOYEE_STATUSES: readonly EmployeeStatus[] = ['active', 'on-leave', 'inactive']
const INVENTORY_STATUSES: readonly InventoryStatus[] = ['ok', 'low', 'critical']

function isEmployeeArea(value: unknown): value is EmployeeArea {
  return typeof value === 'string' && (AREAS as readonly string[]).includes(value)
}

function isEmployeeStatus(value: unknown): value is EmployeeStatus {
  return typeof value === 'string' && (EMPLOYEE_STATUSES as readonly string[]).includes(value)
}

function isInventoryStatus(value: unknown): value is InventoryStatus {
  return typeof value === 'string' && (INVENTORY_STATUSES as readonly string[]).includes(value)
}

function isEmployee(value: unknown): value is Employee {
  if (!isRecord(value)) {
    return false
  }

  const userId = value.userId

  return (
    (typeof value.id === 'string' || typeof value.id === 'number') &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    typeof value.phone === 'string' &&
    (typeof value.roleId === 'string' || typeof value.roleId === 'number') &&
    typeof value.roleName === 'string' &&
    (typeof value.restaurantId === 'string' || typeof value.restaurantId === 'number') &&
    typeof value.restaurantName === 'string' &&
    isEmployeeArea(value.area) &&
    isEmployeeStatus(value.status) &&
    typeof value.hiredAt === 'string' &&
    (userId === null ||
      userId === undefined ||
      typeof userId === 'string' ||
      typeof userId === 'number')
  )
}

function isSystemUser(value: unknown): value is SystemUser {
  if (!isRecord(value)) {
    return false
  }

  return (
    (typeof value.id === 'string' || typeof value.id === 'number') &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    typeof value.isActive === 'boolean'
  )
}

function toSystemUser(value: SystemUser): SystemUser {
  return {
    id: String(value.id),
    name: value.name,
    email: value.email,
    isActive: value.isActive,
    isBlocked: value.isBlocked === true,
    roleId: typeof value.roleId === 'string' ? value.roleId : null,
    restaurantIds: Array.isArray(value.restaurantIds) ? value.restaurantIds.map(String) : [],
    employeeId: typeof value.employeeId === 'string' ? value.employeeId : null,
  }
}

function isRole(value: unknown): value is Role {
  if (!isRecord(value)) {
    return false
  }

  return (
    (typeof value.id === 'string' || typeof value.id === 'number') &&
    typeof value.name === 'string' &&
    typeof value.description === 'string' &&
    Array.isArray(value.permissions) &&
    value.permissions.every((permission) => typeof permission === 'string')
  )
}

function isInventoryItem(value: unknown): value is InventoryItem {
  if (!isRecord(value)) {
    return false
  }

  return (
    (typeof value.id === 'string' || typeof value.id === 'number') &&
    (typeof value.restaurantId === 'string' || typeof value.restaurantId === 'number') &&
    typeof value.name === 'string' &&
    typeof value.unit === 'string' &&
    typeof value.stock === 'number' &&
    typeof value.minStock === 'number' &&
    isInventoryStatus(value.status) &&
    typeof value.supplier === 'string' &&
    typeof value.updatedAt === 'string'
  )
}

function toEmployee(value: Employee): Employee {
  return {
    ...value,
    id: String(value.id),
    roleId: String(value.roleId),
    restaurantId: String(value.restaurantId),
    userId: value.userId === null || value.userId === undefined ? null : String(value.userId),
  }
}

function toRole(value: Role): Role {
  return {
    id: String(value.id),
    name: value.name,
    description: value.description,
    permissions: value.permissions.filter(isPermission),
  }
}

function toInventoryItem(value: InventoryItem): InventoryItem {
  return {
    ...value,
    id: String(value.id),
    restaurantId: String(value.restaurantId),
    isActive: typeof value.isActive === 'boolean' ? value.isActive : true,
  }
}

/** Crítico por debajo de la mitad del mínimo, bajo por debajo del mínimo. */
export function inventoryStatusFor(stock: number, minStock: number): InventoryStatus {
  if (stock < minStock / 2) {
    return 'critical'
  }

  return stock < minStock ? 'low' : 'ok'
}

export async function fetchEmployees(): Promise<Employee[]> {
  const payload = await http<unknown>('/employees')

  if (!Array.isArray(payload)) {
    return []
  }

  return payload.filter(isEmployee).map(toEmployee)
}

export async function fetchRoles(): Promise<Role[]> {
  const payload = await http<unknown>('/roles')

  if (!Array.isArray(payload)) {
    return []
  }

  return payload.filter(isRole).map(toRole)
}

export async function fetchInventoryItems(): Promise<InventoryItem[]> {
  const payload = await http<unknown>('/inventoryItems')

  if (!Array.isArray(payload)) {
    return []
  }

  return payload.filter(isInventoryItem).map(toInventoryItem)
}

export async function updateEmployee(
  id: string,
  draft: EmployeeDraft & { roleName: string; restaurantName: string },
): Promise<Employee> {
  const payload = await http<unknown>(`/employees/${id}`, {
    method: 'PATCH',
    body: draft,
  })

  if (!isEmployee(payload)) {
    throw new Error('No se pudo actualizar el empleado.')
  }

  return toEmployee(payload)
}

export async function createEmployee(draft: EmployeeDraft & { roleName: string; restaurantName: string }): Promise<Employee> {
  const payload = await http<unknown>('/employees', {
    method: 'POST',
    body: { ...draft, hiredAt: new Date().toISOString().slice(0, 10) },
  })

  if (!isEmployee(payload)) {
    throw new Error('No se pudo crear el empleado.')
  }

  return toEmployee(payload)
}

/** Mantiene el vínculo usuario ↔ empleado en ambos sentidos al cambiarlo desde el empleado. */
export async function syncEmployeeUserLink(
  employeeId: string,
  previousUserId: string | null,
  nextUserId: string | null,
): Promise<void> {
  if (previousUserId === nextUserId) {
    return
  }

  if (previousUserId) {
    await http<unknown>(`/users/${previousUserId}`, { method: 'PATCH', body: { employeeId: null } })
  }

  if (nextUserId) {
    await http<unknown>(`/users/${nextUserId}`, { method: 'PATCH', body: { employeeId } })
  }
}

export async function deleteEmployee(employee: Employee): Promise<void> {
  if (employee.userId) {
    await http<unknown>(`/users/${employee.userId}`, { method: 'PATCH', body: { employeeId: null } })
  }

  await http<unknown>(`/employees/${employee.id}`, { method: 'DELETE' })
}

async function patchInventoryItem(id: string, body: Record<string, unknown>): Promise<InventoryItem> {
  const payload = await http<unknown>(`/inventoryItems/${id}`, {
    method: 'PATCH',
    body: { ...body, updatedAt: new Date().toISOString() },
  })

  if (!isInventoryItem(payload)) {
    throw new Error('No se pudo actualizar el inventario.')
  }

  return toInventoryItem(payload)
}

export async function updateInventoryStock(item: InventoryItem, stock: number): Promise<InventoryItem> {
  if (stock < 0) {
    throw new Error('La cantidad no puede ser negativa.')
  }

  return patchInventoryItem(item.id, { stock, status: inventoryStatusFor(stock, item.minStock) })
}

export async function createInventoryItem(draft: InventoryItemDraft): Promise<InventoryItem> {
  const payload = await http<unknown>('/inventoryItems', {
    method: 'POST',
    body: {
      ...draft,
      status: inventoryStatusFor(draft.stock, draft.minStock),
      updatedAt: new Date().toISOString(),
    },
  })

  if (!isInventoryItem(payload)) {
    throw new Error('No se pudo crear el insumo.')
  }

  return toInventoryItem(payload)
}

export async function updateInventoryItem(id: string, draft: InventoryItemDraft): Promise<InventoryItem> {
  return patchInventoryItem(id, { ...draft, status: inventoryStatusFor(draft.stock, draft.minStock) })
}

export async function createRole(draft: RoleDraft): Promise<Role> {
  const payload = await http<unknown>('/roles', { method: 'POST', body: draft })

  if (!isRole(payload)) {
    throw new Error('No se pudo crear el rol.')
  }

  return toRole(payload)
}

export async function updateRole(id: string, draft: RoleDraft): Promise<Role> {
  const payload = await http<unknown>(`/roles/${id}`, { method: 'PATCH', body: draft })

  if (!isRole(payload)) {
    throw new Error('No se pudo actualizar el rol.')
  }

  return toRole(payload)
}

export async function deleteRole(id: string): Promise<void> {
  await http<unknown>(`/roles/${id}`, { method: 'DELETE' })
}

export async function fetchUsers(): Promise<SystemUser[]> {
  const payload = await http<unknown>('/users')

  if (!Array.isArray(payload)) {
    return []
  }

  return payload.filter(isSystemUser).map(toSystemUser)
}

async function patchUser(id: string, body: Record<string, unknown>): Promise<SystemUser> {
  const payload = await http<unknown>(`/users/${id}`, { method: 'PATCH', body })

  if (!isSystemUser(payload)) {
    throw new Error('No se pudo actualizar la cuenta.')
  }

  return toSystemUser(payload)
}

export async function updateUserActive(id: string, isActive: boolean): Promise<SystemUser> {
  return patchUser(id, { isActive })
}

export async function updateUserBlocked(id: string, isBlocked: boolean): Promise<SystemUser> {
  return patchUser(id, { isBlocked })
}

/**
 * Asigna rol, sedes y empleado a una cuenta. Mantiene el vínculo en ambos
 * sentidos (empleado.userId ↔ usuario.employeeId).
 */
export async function updateUserAccess(user: SystemUser, draft: SystemUserDraft): Promise<SystemUser> {
  if (user.employeeId && user.employeeId !== draft.employeeId) {
    await http<unknown>(`/employees/${user.employeeId}`, { method: 'PATCH', body: { userId: null } })
  }

  if (draft.employeeId && draft.employeeId !== user.employeeId) {
    const employees = await fetchEmployees()
    const previousOwner = employees.find((employee) => employee.id === draft.employeeId)?.userId

    if (previousOwner && previousOwner !== user.id) {
      await http<unknown>(`/users/${previousOwner}`, { method: 'PATCH', body: { employeeId: null } })
    }

    await http<unknown>(`/employees/${draft.employeeId}`, { method: 'PATCH', body: { userId: user.id } })
  }

  return patchUser(user.id, { ...draft })
}
