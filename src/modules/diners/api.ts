import { fullName, splitName } from '@/modules/auth/api'
import { clearTokens, getRefreshToken, storeTokens } from '@/modules/auth/storage'
import type { CustomerProfile, CustomerProfileDraft } from '@/modules/diners/types'
import type { DinerCustomer } from '@/stores/diner'
import { http } from '@/services/http'

/** UserResponseDto (lo que trae el login/registro del comensal). */
interface ApiCustomerUser {
  id: string
  email: string
  firstName: string
  lastName?: string | null
}

interface ApiCustomerAuth {
  accessToken: string
  refreshToken: string
  user: ApiCustomerUser
}

/** CustomerMeResponseDto */
interface ApiCustomerMe extends ApiCustomerUser {
  phone?: string | null
  createdAt: string
  dietaryPreferences?: string | null
  allergies?: string | null
  birthDate?: string | null
  marketingOptIn: boolean
}

function toCustomer(user: ApiCustomerUser): DinerCustomer {
  return { id: user.id, name: fullName(user) || user.email, email: user.email }
}

/** El API guarda preferencias y alergias como texto libre: "Vegano, Sin gluten". */
function splitList(value: string | null | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function joinList(values: string[]): string | null {
  const text = values.map((item) => item.trim()).filter(Boolean).join(', ')
  return text || null
}

function toProfile(value: ApiCustomerMe): CustomerProfile {
  return {
    id: value.id,
    name: fullName(value) || value.email,
    email: value.email,
    phone: value.phone || null,
    birthday: value.birthDate || null,
    dietaryPreferences: splitList(value.dietaryPreferences),
    allergens: splitList(value.allergies),
    marketingOptIn: value.marketingOptIn === true,
    createdAt: value.createdAt ?? null,
  }
}

/** Cuenta opcional del comensal. Su sesión es independiente de la del personal. */
export async function loginCustomer(email: string, password: string): Promise<DinerCustomer> {
  const data = await http<ApiCustomerAuth>('/api/v1/customer/auth/login', {
    method: 'POST',
    auth: 'none',
    body: { email: email.trim().toLowerCase(), password },
  })

  storeTokens('customer', data, { persist: true })
  return toCustomer(data.user)
}

export async function registerCustomer(name: string, email: string, password: string): Promise<DinerCustomer> {
  const data = await http<ApiCustomerAuth>('/api/v1/customer/auth/register', {
    method: 'POST',
    auth: 'none',
    body: { ...splitName(name), email: email.trim().toLowerCase(), password },
  })

  storeTokens('customer', data, { persist: true })
  return toCustomer(data.user)
}

/** Invalida el refresh token en el servidor y borra la sesión del comensal. */
export async function logoutCustomer(): Promise<void> {
  const refreshToken = getRefreshToken('customer')

  try {
    if (refreshToken) {
      await http<void>('/api/v1/customer/auth/logout', { method: 'POST', body: { refreshToken } })
    }
  } catch {
    // Se cierra en el cliente aunque el servidor no responda.
  } finally {
    clearTokens('customer')
  }
}

export async function forgotCustomerPassword(email: string): Promise<void> {
  await http<void>('/api/v1/customer/auth/forgot-password', { method: 'POST', auth: 'none', body: { email } })
}

export async function resetCustomerPassword(token: string, newPassword: string): Promise<void> {
  await http<void>('/api/v1/customer/auth/reset-password', { method: 'POST', auth: 'none', body: { token, newPassword } })
}

/** GET /api/v1/customer/me. El id se ignora: el API usa el de la sesión. */
export async function fetchCustomerProfile(_id?: string): Promise<CustomerProfile> {
  return toProfile(await http<ApiCustomerMe>('/api/v1/customer/me'))
}

/** PATCH /api/v1/customer/me */
export async function updateCustomerProfile(_id: string, draft: CustomerProfileDraft): Promise<CustomerProfile> {
  const payload = await http<ApiCustomerMe>('/api/v1/customer/me', {
    method: 'PATCH',
    body: {
      ...splitName(draft.name),
      phone: draft.phone?.trim() || undefined,
      birthDate: draft.birthday || null,
      dietaryPreferences: joinList(draft.dietaryPreferences) ?? '',
      allergies: joinList(draft.allergens),
      marketingOptIn: draft.marketingOptIn,
    },
  })

  return toProfile(payload)
}

/** PATCH /api/v1/customer/me/password: el servidor valida la contraseña actual. */
export async function changeCustomerPassword(_id: string, currentPassword: string, newPassword: string): Promise<void> {
  await http<void>('/api/v1/customer/me/password', { method: 'PATCH', body: { currentPassword, newPassword } })
}
