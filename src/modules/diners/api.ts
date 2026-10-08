import type { CustomerProfile, CustomerProfileDraft } from '@/modules/diners/types'
import type { DinerCustomer } from '@/stores/diner'
import { http, HttpError } from '@/services/http'

interface JsonCustomer {
  id: string | number
  name: string
  email: string
  password: string
  phone?: string | null
  birthday?: string | null
  dietaryPreferences?: string[]
  allergens?: string[]
  marketingOptIn?: boolean
  createdAt?: string | null
}

function isJsonCustomer(value: unknown): value is JsonCustomer {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>

  return (
    (typeof record.id === 'string' || typeof record.id === 'number') &&
    typeof record.name === 'string' &&
    typeof record.email === 'string' &&
    typeof record.password === 'string'
  )
}

function toCustomer(value: JsonCustomer): DinerCustomer {
  return { id: String(value.id), name: value.name, email: value.email }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

async function findCustomers(email: string): Promise<JsonCustomer[]> {
  const payload = await http<unknown>(`/customers?email=${encodeURIComponent(email)}`)
  return Array.isArray(payload) ? payload.filter(isJsonCustomer) : []
}

/** Cuenta opcional del comensal. Es independiente de las cuentas del personal. */
export async function loginCustomer(email: string, password: string): Promise<DinerCustomer> {
  const normalized = normalizeEmail(email)
  const match = (await findCustomers(normalized)).find(
    (customer) => normalizeEmail(customer.email) === normalized && customer.password === password,
  )

  if (!match) {
    throw new HttpError('Correo o contraseña incorrectos', 401)
  }

  return toCustomer(match)
}

export async function registerCustomer(name: string, email: string, password: string): Promise<DinerCustomer> {
  const normalized = normalizeEmail(email)

  if ((await findCustomers(normalized)).length > 0) {
    throw new HttpError('Ya existe una cuenta con este correo', 409)
  }

  const created = await http<unknown>('/customers', {
    method: 'POST',
    body: {
      name: name.trim(),
      email: normalized,
      password,
      phone: null,
      birthday: null,
      dietaryPreferences: [],
      allergens: [],
      marketingOptIn: false,
      createdAt: new Date().toISOString(),
    },
  })

  if (!isJsonCustomer(created)) {
    throw new HttpError('No se pudo crear la cuenta', 500)
  }

  return toCustomer(created)
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function toProfile(value: JsonCustomer): CustomerProfile {
  return {
    id: String(value.id),
    name: value.name,
    email: value.email,
    phone: typeof value.phone === 'string' && value.phone ? value.phone : null,
    birthday: typeof value.birthday === 'string' && value.birthday ? value.birthday : null,
    dietaryPreferences: stringList(value.dietaryPreferences),
    allergens: stringList(value.allergens),
    marketingOptIn: value.marketingOptIn === true,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : null,
  }
}

async function fetchJsonCustomer(id: string): Promise<JsonCustomer> {
  const payload = await http<unknown>(`/customers/${id}`)

  if (!isJsonCustomer(payload)) {
    throw new HttpError('No encontramos tu cuenta', 404)
  }

  return payload
}

/** Contrato pensado para el backend: GET /customers/me */
export async function fetchCustomerProfile(id: string): Promise<CustomerProfile> {
  return toProfile(await fetchJsonCustomer(id))
}

/** Contrato pensado para el backend: PATCH /customers/me */
export async function updateCustomerProfile(id: string, draft: CustomerProfileDraft): Promise<CustomerProfile> {
  const payload = await http<unknown>(`/customers/${id}`, {
    method: 'PATCH',
    body: {
      name: draft.name.trim(),
      phone: draft.phone?.trim() || null,
      birthday: draft.birthday || null,
      dietaryPreferences: draft.dietaryPreferences,
      allergens: draft.allergens,
      marketingOptIn: draft.marketingOptIn,
    },
  })

  if (!isJsonCustomer(payload)) {
    throw new HttpError('No se pudo guardar tu perfil', 500)
  }

  return toProfile(payload)
}

/**
 * Contrato pensado para el backend: POST /customers/me/password. Con json-server la
 * contraseña actual se compara en el cliente; el backend real lo hará del lado servidor.
 */
export async function changeCustomerPassword(id: string, currentPassword: string, nextPassword: string): Promise<void> {
  const customer = await fetchJsonCustomer(id)

  if (customer.password !== currentPassword) {
    throw new HttpError('La contraseña actual no es correcta', 401)
  }

  await http<unknown>(`/customers/${id}`, { method: 'PATCH', body: { password: nextPassword } })
}
