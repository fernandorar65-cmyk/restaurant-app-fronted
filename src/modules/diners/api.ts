import type { DinerCustomer } from '@/stores/diner'
import { http, HttpError } from '@/services/http'

interface JsonCustomer {
  id: string | number
  name: string
  email: string
  password: string
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
    body: { name: name.trim(), email: normalized, password },
  })

  if (!isJsonCustomer(created)) {
    throw new HttpError('No se pudo crear la cuenta', 500)
  }

  return toCustomer(created)
}
