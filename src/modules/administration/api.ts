import type {
  AccountStatus,
  ApiPermission,
  Employee,
  EmployeeDraft,
  EmployeeStatus,
  JobPosition,
  MembershipStatus,
  NewSystemUserDraft,
  WorkArea,
  InventoryItem,
  InventoryItemDraft,
  InventoryStatus,
  Role,
  RoleDraft,
  SystemUser,
  SystemUserDraft,
} from '@/modules/administration/types'
import { fullName, type ApiUser } from '@/modules/auth/api'
import { http, httpAll, requireOrganizationId } from '@/services/http'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

const INVENTORY_STATUSES: readonly InventoryStatus[] = ['ok', 'low', 'critical']

function isInventoryStatus(value: unknown): value is InventoryStatus {
  return typeof value === 'string' && (INVENTORY_STATUSES as readonly string[]).includes(value)
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

export async function fetchInventoryItems(): Promise<InventoryItem[]> {
  const payload = await http<unknown>('/inventoryItems')

  if (!Array.isArray(payload)) {
    return []
  }

  return payload.filter(isInventoryItem).map(toInventoryItem)
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

// ---------------------------------------------------------------------------
// Personal y accesos: empleados, áreas, puestos, usuarios (membresías), roles y permisos
// ---------------------------------------------------------------------------

/** EmployeeResponseDto */
interface ApiEmployee {
  id: string
  organizationId: string
  userId?: string | null
  employeeCode: string
  documentNumber?: string | null
  jobPositionId?: string | null
  status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'
  hiredAt?: string | null
  terminatedAt?: string | null
}

/** WorkAreaResponseDto */
interface ApiWorkArea {
  id: string
  name: string
  description?: string | null
  isActive: boolean
}

/** JobPositionResponseDto */
interface ApiJobPosition {
  id: string
  workAreaId: string
  name: string
  description?: string | null
  isActive: boolean
}

type ApiMembershipStatus = 'ACTIVE' | 'INACTIVE' | 'INVITED' | 'SUSPENDED'

/** MembershipResponseDto */
interface ApiMembership {
  id: string
  organizationId: string
  userId: string
  roleId: string
  allRestaurants: boolean
  restaurantIds: string[]
  status: ApiMembershipStatus
}

/** MembershipWithPeopleResponseDto */
interface ApiMembershipWithPeople extends ApiMembership {
  user: {
    id: string
    email: string
    firstName: string
    lastName?: string | null
    status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
  }
  role: { id: string; code: string; name: string }
  employeeId?: string | null
}

/** RoleWithAccessResponseDto */
interface ApiRole {
  id: string
  code: string
  name: string
  description?: string | null
  isSystem: boolean
  isActive: boolean
  permissions: string[]
  memberCount: number
}

/** PermissionResponseDto */
interface ApiPermissionDto {
  id: string
  code: string
  name: string
  description?: string | null
  isActive: boolean
}

/** Rol del dueño: siempre tiene todos los permisos y el API no deja editarlo. */
export const OWNER_ROLE_CODE = 'OWNER'

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

function toEmployee(dto: ApiEmployee): Employee {
  return {
    id: dto.id,
    employeeCode: dto.employeeCode,
    documentNumber: dto.documentNumber ?? null,
    jobPositionId: dto.jobPositionId ?? null,
    status: dto.status.toLowerCase() as EmployeeStatus,
    hiredAt: dto.hiredAt ?? null,
    terminatedAt: dto.terminatedAt ?? null,
    userId: dto.userId ?? null,
  }
}

function toWorkArea(dto: ApiWorkArea): WorkArea {
  return { id: dto.id, name: dto.name, description: dto.description ?? null, isActive: dto.isActive }
}

function toJobPosition(dto: ApiJobPosition): JobPosition {
  return {
    id: dto.id,
    workAreaId: dto.workAreaId,
    name: dto.name,
    description: dto.description ?? null,
    isActive: dto.isActive,
  }
}

function toSystemUser(dto: ApiMembershipWithPeople): SystemUser {
  return {
    id: dto.id,
    userId: dto.userId,
    name: fullName(dto.user) || dto.user.email,
    email: dto.user.email,
    status: dto.status.toLowerCase() as MembershipStatus,
    accountStatus: dto.user.status.toLowerCase() as AccountStatus,
    roleId: dto.roleId,
    roleName: dto.role.name,
    roleCode: dto.role.code,
    allRestaurants: dto.allRestaurants,
    restaurantIds: dto.allRestaurants ? [] : dto.restaurantIds,
    employeeId: dto.employeeId ?? null,
  }
}

function toRole(dto: ApiRole): Role {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    description: dto.description ?? '',
    isSystem: dto.isSystem,
    permissions: dto.permissions,
    memberCount: dto.memberCount,
  }
}

/** "Jefe de sala" → "JEFE_DE_SALA": código único del rol dentro de la organización. */
function roleCodeFrom(name: string): string {
  const code = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)

  return code || 'ROL'
}

export async function fetchEmployees(): Promise<Employee[]> {
  const items = await httpAll<ApiEmployee>('/employees', { query: { organizationId: requireOrganizationId() } })
  return items.map(toEmployee)
}

/** Catálogo de áreas de la organización (activas e inactivas, para mostrar nombres históricos). */
export async function fetchWorkAreas(): Promise<WorkArea[]> {
  const items = await httpAll<ApiWorkArea>('/work-areas', { query: { organizationId: requireOrganizationId() } })
  return items.map(toWorkArea)
}

/** Catálogo de puestos de la organización (activos e inactivos). */
export async function fetchJobPositions(): Promise<JobPosition[]> {
  const items = await httpAll<ApiJobPosition>('/job-positions', {
    query: { organizationId: requireOrganizationId() },
  })
  return items.map(toJobPosition)
}

export async function createWorkArea(name: string): Promise<WorkArea> {
  const dto = await http<ApiWorkArea>('/work-areas', {
    method: 'POST',
    body: { organizationId: requireOrganizationId(), name: name.trim() },
  })
  return toWorkArea(dto)
}

export async function createJobPosition(workAreaId: string, name: string): Promise<JobPosition> {
  const dto = await http<ApiJobPosition>('/job-positions', {
    method: 'POST',
    body: { workAreaId, name: name.trim() },
  })
  return toJobPosition(dto)
}

export async function createEmployee(draft: EmployeeDraft): Promise<Employee> {
  const dto = await http<ApiEmployee>('/employees', {
    method: 'POST',
    body: {
      organizationId: requireOrganizationId(),
      employeeCode: draft.employeeCode.trim(),
      documentNumber: emptyToUndefined(draft.documentNumber),
      jobPositionId: draft.jobPositionId ?? undefined,
      hiredAt: emptyToUndefined(draft.hiredAt),
      userId: draft.userId ?? undefined,
    },
  })
  return toEmployee(dto)
}

/**
 * Actualiza la ficha. El vínculo con la cuenta no se toca aquí: se cambia desde
 * la membresía (ver `syncEmployeeUserLink`). El API no permite vaciar documento
 * ni puesto: si vienen vacíos se dejan como estaban.
 */
export async function updateEmployee(id: string, draft: EmployeeDraft): Promise<Employee> {
  const dto = await http<ApiEmployee>(`/employees/${id}`, {
    method: 'PATCH',
    body: {
      employeeCode: draft.employeeCode.trim(),
      documentNumber: emptyToUndefined(draft.documentNumber),
      jobPositionId: draft.jobPositionId ?? undefined,
      hiredAt: emptyToUndefined(draft.hiredAt),
      status: draft.status.toUpperCase(),
    },
  })
  return toEmployee(dto)
}

/**
 * Cambia la cuenta vinculada a un empleado. El vínculo vive en la membresía del
 * usuario (`employeeId`): se desvincula la anterior y se vincula la nueva.
 */
export async function syncEmployeeUserLink(
  employeeId: string,
  previousMembershipId: string | null,
  nextMembershipId: string | null,
): Promise<void> {
  if (previousMembershipId === nextMembershipId) {
    return
  }

  if (previousMembershipId) {
    await http<unknown>(`/memberships/${previousMembershipId}`, { method: 'PATCH', body: { employeeId: null } })
  }

  if (nextMembershipId) {
    await http<unknown>(`/memberships/${nextMembershipId}`, { method: 'PATCH', body: { employeeId } })
  }
}

/** Baja lógica: el empleado queda inactivo para conservar el historial. */
export async function deleteEmployee(employee: Employee): Promise<void> {
  await http<unknown>(`/employees/${employee.id}`, { method: 'DELETE' })
}

/** Roles activos de la organización, con sus permisos efectivos y usuarios asignados. */
export async function fetchRoles(): Promise<Role[]> {
  const items = await httpAll<ApiRole>('/roles', { query: { organizationId: requireOrganizationId() } })
  return items.filter((role) => role.isActive).map(toRole)
}

/** Catálogo de permisos del API (código + nombre legible). */
export async function fetchPermissions(): Promise<ApiPermission[]> {
  const items = await httpAll<ApiPermissionDto>('/permissions')
  return items
    .filter((permission) => permission.isActive)
    .map((permission) => ({
      id: permission.id,
      code: permission.code,
      name: permission.name,
      description: permission.description ?? null,
    }))
}

export async function createRole(draft: RoleDraft): Promise<Role> {
  const dto = await http<ApiRole>('/roles', {
    method: 'POST',
    body: {
      organizationId: requireOrganizationId(),
      code: roleCodeFrom(draft.name),
      name: draft.name,
      description: emptyToUndefined(draft.description),
      permissions: draft.permissions,
    },
  })
  return toRole(dto)
}

/** `permissions` reemplaza los permisos del rol en la misma petición. */
export async function updateRole(id: string, draft: RoleDraft): Promise<Role> {
  const dto = await http<ApiRole>(`/roles/${id}`, {
    method: 'PATCH',
    body: { name: draft.name, description: draft.description, permissions: draft.permissions },
  })
  return toRole(dto)
}

/** Baja lógica. Con usuarios asignados el API responde 422 ROLE_IN_USE. */
export async function deleteRole(id: string): Promise<void> {
  await http<unknown>(`/roles/${id}`, { method: 'DELETE' })
}

/** Usuarios de la organización: membresías con su cuenta, rol, sedes y empleado. */
export async function fetchUsers(): Promise<SystemUser[]> {
  const items = await httpAll<ApiMembershipWithPeople>('/memberships', {
    query: { organizationId: requireOrganizationId() },
  })
  return items.map(toSystemUser)
}

async function patchMembership(id: string, body: Record<string, unknown>): Promise<SystemUser> {
  const dto = await http<ApiMembershipWithPeople>(`/memberships/${id}`, { method: 'PATCH', body })
  return toSystemUser(dto)
}

/** Activa o desactiva el acceso a la organización (la cuenta sigue existiendo). */
export async function updateUserActive(id: string, isActive: boolean): Promise<SystemUser> {
  return patchMembership(id, { status: isActive ? 'ACTIVE' : 'INACTIVE' })
}

/**
 * Suspende o reactiva el acceso a la organización. Bloquear la cuenta global
 * (`PATCH /users`) es solo de la plataforma.
 */
export async function updateUserBlocked(id: string, isBlocked: boolean): Promise<SystemUser> {
  return patchMembership(id, { status: isBlocked ? 'SUSPENDED' : 'ACTIVE' })
}

/** Rol, sedes y empleado vinculado en una sola transacción. */
export async function updateUserAccess(user: SystemUser, draft: SystemUserDraft): Promise<SystemUser> {
  return patchMembership(user.id, {
    roleId: draft.roleId,
    allRestaurants: draft.allRestaurants,
    restaurantIds: draft.allRestaurants ? [] : draft.restaurantIds,
    employeeId: draft.employeeId,
  })
}

/**
 * Da de alta una cuenta nueva y la vincula a la organización. El API no tiene
 * invitaciones: se crea la cuenta con contraseña temporal (debe cambiarla al
 * entrar) y luego su membresía. Si el correo ya existe responde 409 DUPLICATE_EMAIL.
 */
export async function createSystemUser(draft: NewSystemUserDraft): Promise<SystemUser> {
  const account = await http<ApiUser>('/users', {
    method: 'POST',
    body: {
      email: draft.email.trim(),
      password: draft.password,
      firstName: draft.firstName.trim(),
      lastName: emptyToUndefined(draft.lastName),
      mustChangePassword: true,
    },
  })

  const membership = await http<ApiMembership>('/memberships', {
    method: 'POST',
    body: {
      organizationId: requireOrganizationId(),
      userId: account.id,
      roleId: draft.roleId,
      allRestaurants: draft.allRestaurants,
      restaurantIds: draft.allRestaurants ? [] : draft.restaurantIds,
    },
  })

  if (draft.employeeId) {
    return patchMembership(membership.id, { employeeId: draft.employeeId })
  }

  return toSystemUser(await http<ApiMembershipWithPeople>(`/memberships/${membership.id}`))
}
