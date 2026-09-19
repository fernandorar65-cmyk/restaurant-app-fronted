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

  if (!('id' in value) || !('name' in value) || !('email' in value) || !('password' in value)) {
    return false
  }

  return (
    (typeof value.id === 'string' || typeof value.id === 'number') &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    typeof value.password === 'string'
  )
}

function toAuthUser(user: JsonUser): AuthUser {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
  }
}

function toSession(user: JsonUser): AuthSession {
  return {
    accessToken: `json-${user.id}`,
    user: toAuthUser(user),
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
    },
  })

  if (!isJsonUser(created)) {
    throw new HttpError('No se pudo crear la cuenta', 500)
  }

  return toSession(created)
}
