import { isPermission } from '@/modules/auth/permissions'
import type { Permission } from '@/modules/auth/permissions'
import { http, HttpError } from '@/services/http'
import type {
  AuthSession,
  AuthUser,
  JsonUser,
  LoginPayload,
  RegisterPayload,
} from '@/modules/auth/types'

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
