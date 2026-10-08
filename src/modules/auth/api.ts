import { isPermission } from '@/modules/auth/permissions'
import type { Permission } from '@/modules/auth/permissions'
import { http, HttpError } from '@/services/http'
import type {
  AuthSession,
  AuthUser,
  JsonUser,
  LoginPayload,
  RegisterPayload,
  StaffProfile,
  StaffProfileDraft,
} from '@/modules/auth/types'
import { fetchRestaurants } from '@/modules/restaurants/api'

function isJsonUser(value: unknown): value is JsonUser {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  if (
    !('id' in value) ||
    !('name' in value) ||
    !('email' in value) ||
    !('password' in value) ||
    !('isActive' in value)
  ) {
    return false
  }

  return (
    (typeof value.id === 'string' || typeof value.id === 'number') &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    typeof value.password === 'string' &&
    typeof value.isActive === 'boolean'
  )
}

interface RoleAccess {
  name: string
  permissions: Permission[]
}

async function fetchRoleAccess(roleId: string | null | undefined): Promise<RoleAccess | null> {
  if (!roleId) {
    return null
  }

  try {
    const role = await http<unknown>(`/roles/${roleId}`)

    if (typeof role !== 'object' || role === null || !('name' in role) || !('permissions' in role)) {
      return null
    }

    const permissions = Array.isArray(role.permissions) ? role.permissions.filter(isPermission) : []
    return { name: typeof role.name === 'string' ? role.name : '', permissions }
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      return null
    }

    throw error
  }
}

async function toAuthUser(user: JsonUser): Promise<AuthUser> {
  const role = await fetchRoleAccess(user.roleId)

  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    roleId: user.roleId ?? null,
    roleName: role?.name ?? null,
    permissions: role?.permissions ?? [],
    restaurantIds: Array.isArray(user.restaurantIds) ? user.restaurantIds.map(String) : [],
    employeeId: user.employeeId ?? null,
  }
}

async function toSession(user: JsonUser): Promise<AuthSession> {
  return {
    accessToken: `json-${user.id}`,
    user: await toAuthUser(user),
  }
}

function assertCanSignIn(user: JsonUser): void {
  if (user.isBlocked) {
    throw new HttpError('Esta cuenta está bloqueada. Contactá a un administrador.', 403)
  }

  if (!user.isActive) {
    throw new HttpError('Esta cuenta está desactivada. Contactá a un administrador.', 403)
  }
}

/** Vuelve a leer el usuario y su rol (permisos actualizados, bloqueo, desactivación). */
export async function refreshAuthUser(userId: string): Promise<AuthUser | null> {
  try {
    const payload = await http<unknown>(`/users/${userId}`)

    if (!isJsonUser(payload) || payload.isBlocked || !payload.isActive) {
      return null
    }

    return await toAuthUser(payload)
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      return null
    }

    throw error
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

async function findUsersByEmail(email: string): Promise<JsonUser[]> {
  const users = await http<unknown>(`/users?email=${encodeURIComponent(email)}`)

  if (!Array.isArray(users)) {
    return []
  }

  return users.filter(isJsonUser)
}

export async function login(payload: LoginPayload): Promise<AuthSession> {
  const email = normalizeEmail(payload.email)
  const users = await findUsersByEmail(email)
  const user = users.find(
    (candidate) => normalizeEmail(candidate.email) === email && candidate.password === payload.password,
  )

  if (!user) {
    throw new HttpError('Correo o contraseña incorrectos', 401)
  }

  assertCanSignIn(user)

  return toSession(user)
}

export async function register(payload: RegisterPayload): Promise<AuthSession> {
  const email = normalizeEmail(payload.email)
  const existingUsers = await findUsersByEmail(email)

  if (existingUsers.length > 0) {
    throw new HttpError('Ya existe una cuenta con este correo', 409)
  }

  const created = await http<unknown>('/users', {
    method: 'POST',
    body: {
      name: payload.name.trim(),
      email,
      password: payload.password,
      isActive: true,
      isBlocked: false,
      roleId: null,
      restaurantIds: [],
      employeeId: null,
    },
  })

  if (!isJsonUser(created)) {
    throw new HttpError('No se pudo crear la cuenta', 500)
  }

  return toSession(created)
}

async function fetchJsonUser(id: string): Promise<JsonUser> {
  const payload = await http<unknown>(`/users/${id}`)

  if (!isJsonUser(payload)) {
    throw new HttpError('No encontramos tu usuario', 404)
  }

  return payload
}

async function fetchEmployeeSummary(employeeId: string | null | undefined): Promise<StaffProfile['employee']> {
  if (!employeeId) {
    return null
  }

  try {
    const value = await http<unknown>(`/employees/${employeeId}`)

    if (typeof value !== 'object' || value === null) {
      return null
    }

    const record = value as Record<string, unknown>
    return {
      area: typeof record.area === 'string' ? record.area : '',
      status: typeof record.status === 'string' ? record.status : '',
      hiredAt: typeof record.hiredAt === 'string' ? record.hiredAt : null,
      restaurantName: typeof record.restaurantName === 'string' ? record.restaurantName : null,
    }
  } catch {
    return null
  }
}

/** Contrato pensado para el backend: GET /users/me/profile */
export async function fetchStaffProfile(userId: string): Promise<StaffProfile> {
  const user = await fetchJsonUser(userId)
  const [authUser, restaurants, employee] = await Promise.all([
    toAuthUser(user),
    fetchRestaurants(),
    fetchEmployeeSummary(user.employeeId),
  ])
  const allRestaurants = authUser.restaurantIds.length === 0

  return {
    id: authUser.id,
    name: user.name,
    email: user.email,
    phone: typeof user.phone === 'string' && user.phone ? user.phone : null,
    jobTitle: typeof user.jobTitle === 'string' && user.jobTitle ? user.jobTitle : null,
    createdAt: typeof user.createdAt === 'string' ? user.createdAt : null,
    roleName: authUser.roleName,
    permissions: authUser.permissions,
    allRestaurants,
    restaurants: restaurants
      .filter((site) => allRestaurants || authUser.restaurantIds.includes(site.id))
      .map((site) => ({ id: site.id, name: site.name, city: site.city, imageUrl: site.imageUrl })),
    employee,
  }
}

/** Contrato pensado para el backend: PATCH /users/me/profile */
export async function updateStaffProfile(userId: string, draft: StaffProfileDraft): Promise<void> {
  await http<unknown>(`/users/${userId}`, {
    method: 'PATCH',
    body: {
      name: draft.name.trim(),
      phone: draft.phone?.trim() || null,
      jobTitle: draft.jobTitle?.trim() || null,
    },
  })
}

/**
 * Contrato pensado para el backend: POST /users/me/password. Con json-server la
 * contraseña actual se compara en el cliente; el backend real lo hará del lado servidor.
 */
export async function changeStaffPassword(userId: string, currentPassword: string, nextPassword: string): Promise<void> {
  const user = await fetchJsonUser(userId)

  if (user.password !== currentPassword) {
    throw new HttpError('La contraseña actual no es correcta', 401)
  }

  await http<unknown>(`/users/${userId}`, { method: 'PATCH', body: { password: nextPassword } })
}
