import { fromApiPermissions } from '@/modules/auth/permissions'
import { clearTokens, getRefreshToken, storeTokens } from '@/modules/auth/storage'
import type {
  AuthSession,
  AuthUser,
  LoginPayload,
  RegisterPayload,
  StaffProfile,
  StaffProfileDraft,
  StaffProfileSite,
} from '@/modules/auth/types'
import { http, httpAll } from '@/services/http'

/** UserResponseDto */
export interface ApiUser {
  id: string
  email: string
  firstName: string
  lastName?: string | null
  phone?: string | null
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
  mustChangePassword: boolean
  lastLoginAt?: string | null
  createdAt: string
  updatedAt: string
}

/** StaffAccessResponseDto */
interface ApiStaffAccess {
  membershipId: string
  organizationId: string
  organizationName: string
  role: { id: string; name: string; code: string }
  allRestaurants: boolean
  restaurantIds: string[]
  permissions: string[]
}

/** StaffEmploymentResponseDto */
interface ApiStaffEmployment {
  employeeId: string
  organizationId: string
  organizationName: string
  employeeCode: string
  status: string
  hiredAt?: string | null
  jobPosition?: { id: string; name: string } | null
  workArea?: { id: string; name: string } | null
}

/** StaffProfileResponseDto (y el resto de StaffLoginResponseDto) */
interface ApiStaffProfile {
  user: ApiUser
  isPlatformAdmin: boolean
  access: ApiStaffAccess[]
  employments: ApiStaffEmployment[]
}

interface ApiStaffLogin extends ApiStaffProfile {
  accessToken: string
  refreshToken: string
}

interface ApiOwnerRegistration {
  accessToken: string
  refreshToken: string
  user: ApiUser
  organization: { id: string; name: string }
  roleId: string
  membershipId: string
}

export function fullName(user: Pick<ApiUser, 'firstName' | 'lastName'>): string {
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
}

/** El formulario pide un solo nombre: la primera palabra va a `firstName` y el resto a `lastName`. */
export function splitName(name: string): { firstName: string; lastName?: string } {
  const parts = name.trim().split(/\s+/)
  const [firstName = '', ...rest] = parts
  return rest.length > 0 ? { firstName, lastName: rest.join(' ') } : { firstName }
}

/**
 * Organización activa: la elegida antes (si sigue disponible) o la primera.
 * El panel trabaja con una organización a la vez.
 */
function pickAccess(access: ApiStaffAccess[], preferredOrganizationId?: string | null): ApiStaffAccess | null {
  return access.find((item) => item.organizationId === preferredOrganizationId) ?? access[0] ?? null
}

function toAuthUser(profile: ApiStaffProfile, preferredOrganizationId?: string | null): AuthUser {
  const access = pickAccess(profile.access, preferredOrganizationId)
  const employment =
    profile.employments.find((item) => item.organizationId === access?.organizationId) ?? profile.employments[0] ?? null
  const apiPermissions = access?.permissions ?? []

  return {
    id: profile.user.id,
    name: fullName(profile.user) || profile.user.email,
    email: profile.user.email,
    roleId: access?.role.id ?? null,
    roleName: access?.role.name ?? null,
    roleCode: access?.role.code ?? null,
    permissions: fromApiPermissions(apiPermissions),
    apiPermissions,
    restaurantIds: access && !access.allRestaurants ? access.restaurantIds : [],
    employeeId: employment?.employeeId ?? null,
    organizationId: access?.organizationId ?? null,
    organizationName: access?.organizationName ?? null,
    membershipId: access?.membershipId ?? null,
    isPlatformAdmin: profile.isPlatformAdmin,
  }
}

async function fetchProfileDto(): Promise<ApiStaffProfile> {
  return http<ApiStaffProfile>('/api/v1/owner/me/profile')
}

/**
 * Vuelve a leer el perfil (permisos actualizados, bloqueo, desactivación).
 * Devuelve null si la cuenta ya no puede entrar (401/403).
 */
export async function refreshAuthUser(preferredOrganizationId?: string | null): Promise<AuthUser | null> {
  try {
    const profile = await fetchProfileDto()
    return profile.user.status === 'ACTIVE' ? toAuthUser(profile, preferredOrganizationId) : null
  } catch (error) {
    if (error instanceof Error && 'status' in error && (error.status === 401 || error.status === 403)) {
      return null
    }

    throw error
  }
}

export async function login(payload: LoginPayload, options: { persist?: boolean } = {}): Promise<AuthSession> {
  const data = await http<ApiStaffLogin>('/api/v1/owner/auth/login', {
    method: 'POST',
    auth: 'none',
    body: { email: payload.email.trim().toLowerCase(), password: payload.password },
  })

  storeTokens('staff', data, { persist: options.persist ?? true })
  return { accessToken: data.accessToken, refreshToken: data.refreshToken, user: toAuthUser(data) }
}

/** Alta del dueño: usuario + organización + rol OWNER, en una sola transacción. */
export async function register(payload: RegisterPayload): Promise<AuthSession> {
  const data = await http<ApiOwnerRegistration>('/api/v1/owner/auth/register', {
    method: 'POST',
    auth: 'none',
    body: {
      ...splitName(payload.name),
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      organization: { name: payload.organizationName.trim() },
    },
  })

  storeTokens('staff', data, { persist: true })
  // El registro no trae permisos ni sedes: se leen del perfil.
  const user = (await refreshAuthUser(data.organization.id)) ?? toAuthUser({
    user: data.user,
    isPlatformAdmin: false,
    access: [],
    employments: [],
  })

  return { accessToken: data.accessToken, refreshToken: data.refreshToken, user }
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken('staff')

  try {
    if (refreshToken) {
      await http<void>('/api/v1/owner/auth/logout', { method: 'POST', body: { refreshToken } })
    }
  } catch {
    // La sesión se cierra en el cliente aunque el servidor no responda.
  } finally {
    clearTokens('staff')
  }
}

export async function forgotStaffPassword(email: string): Promise<void> {
  await http<void>('/api/v1/owner/auth/forgot-password', { method: 'POST', auth: 'none', body: { email } })
}

export async function resetStaffPassword(token: string, newPassword: string): Promise<void> {
  await http<void>('/api/v1/owner/auth/reset-password', { method: 'POST', auth: 'none', body: { token, newPassword } })
}

interface ApiRestaurantSummary {
  id: string
  name: string
  slug?: string | null
  city?: string | null
  address?: string | null
  imageUrl?: string | null
}

async function fetchProfileSites(organizationId: string | null): Promise<StaffProfileSite[]> {
  if (!organizationId) {
    return []
  }

  try {
    const sites = await httpAll<ApiRestaurantSummary>('/restaurants', { query: { organizationId } })
    return sites.map((site) => ({
      id: site.id,
      slug: site.slug ?? site.id,
      name: site.name,
      city: site.city ?? site.address ?? '',
      imageUrl: site.imageUrl ?? '',
    }))
  } catch {
    return []
  }
}

/** GET /api/v1/owner/me/profile */
export async function fetchStaffProfile(preferredOrganizationId?: string | null): Promise<StaffProfile> {
  const profile = await fetchProfileDto()
  const user = toAuthUser(profile, preferredOrganizationId)
  const employment =
    profile.employments.find((item) => item.organizationId === user.organizationId) ?? profile.employments[0] ?? null
  const sites = await fetchProfileSites(user.organizationId)
  const allRestaurants = user.restaurantIds.length === 0

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: profile.user.phone || null,
    jobTitle: employment?.jobPosition?.name ?? null,
    createdAt: profile.user.createdAt ?? null,
    roleName: user.roleName,
    roleCode: user.roleCode,
    permissions: user.permissions,
    allRestaurants,
    restaurants: sites.filter((site) => allRestaurants || user.restaurantIds.includes(site.id)),
    employee: employment
      ? {
          area: employment.workArea?.name ?? '',
          status: employment.status.toLowerCase(),
          hiredAt: employment.hiredAt ?? null,
          restaurantName: employment.organizationName,
        }
      : null,
  }
}

/** PATCH /api/v1/owner/me (nombre, apellido y teléfono; el cargo sale del puesto del empleado). */
export async function updateStaffProfile(draft: StaffProfileDraft): Promise<void> {
  await http<ApiUser>('/api/v1/owner/me', {
    method: 'PATCH',
    body: { ...splitName(draft.name), phone: draft.phone?.trim() || undefined },
  })
}

/** PATCH /api/v1/owner/me/password: el servidor valida la contraseña actual. */
export async function changeStaffPassword(currentPassword: string, newPassword: string): Promise<void> {
  await http<void>('/api/v1/owner/me/password', { method: 'PATCH', body: { currentPassword, newPassword } })
}
