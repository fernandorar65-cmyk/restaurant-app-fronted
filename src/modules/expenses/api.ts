import { isExpenseIcon } from '@/modules/expenses/types'
import type { Expense, ExpenseCategory, ExpenseCategoryDraft, ExpenseDraft } from '@/modules/expenses/types'
import { http } from '@/services/http'

function isExpense(value: unknown): value is Expense {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    (typeof record.id === 'string' || typeof record.id === 'number') &&
    (typeof record.restaurantId === 'string' || typeof record.restaurantId === 'number') &&
    typeof record.category === 'string' &&
    typeof record.amount === 'number' &&
    typeof record.date === 'string'
  )
}

function toExpense(value: Expense): Expense {
  return {
    ...value,
    id: String(value.id),
    restaurantId: String(value.restaurantId),
    kind: value.kind === 'fixed' ? 'fixed' : 'variable',
    description: value.description ?? '',
    supplier: value.supplier || null,
    paymentMethod: value.paymentMethod ?? 'transfer',
    notes: value.notes ?? '',
    createdBy: value.createdBy ?? null,
    createdAt: value.createdAt ?? value.date,
  }
}

function clean(draft: ExpenseDraft) {
  return {
    category: draft.category,
    kind: draft.kind,
    description: draft.description.trim(),
    amount: Math.round(draft.amount * 100) / 100,
    date: draft.date,
    supplier: draft.supplier?.trim() || null,
    paymentMethod: draft.paymentMethod,
    notes: draft.notes.trim(),
  }
}

/**
 * Gastos de una sede entre dos fechas (inclusive), del más reciente al más antiguo.
 * Contrato pensado para el backend: GET /restaurants/:id/expenses?from=…&to=…
 */
export async function fetchExpenses(restaurantId: string, from: string, to: string): Promise<Expense[]> {
  // json-server convierte "1" en número al filtrar, así que la sede se filtra aquí.
  const params = new URLSearchParams({ 'date:gte': from, 'date:lte': to })
  const payload = await http<unknown>(`/expenses?${params.toString()}`)
  const rows = Array.isArray(payload) ? payload.filter(isExpense).map(toExpense) : []
  return rows.filter((expense) => expense.restaurantId === restaurantId).sort((a, b) =>
    a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1,
  )
}

/** POST /restaurants/:id/expenses */
export async function createExpense(restaurantId: string, draft: ExpenseDraft, createdBy: string | null): Promise<Expense> {
  const payload = await http<unknown>('/expenses', {
    method: 'POST',
    body: { restaurantId, ...clean(draft), createdBy, createdAt: new Date().toISOString() },
  })
  if (!isExpense(payload)) throw new Error('No se pudo registrar el gasto.')
  return toExpense(payload)
}

/** PATCH /expenses/:id */
export async function updateExpense(id: string, draft: ExpenseDraft): Promise<Expense> {
  const payload = await http<unknown>(`/expenses/${id}`, { method: 'PATCH', body: clean(draft) })
  if (!isExpense(payload)) throw new Error('No se pudo guardar el gasto.')
  return toExpense(payload)
}

/** DELETE /expenses/:id */
export async function deleteExpense(id: string): Promise<void> {
  await http<unknown>(`/expenses/${id}`, { method: 'DELETE' })
}

// Categorías

function isExpenseCategory(value: unknown): value is ExpenseCategory {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (typeof record.id === 'string' || typeof record.id === 'number') && typeof record.name === 'string'
}

function toExpenseCategory(value: ExpenseCategory): ExpenseCategory {
  return {
    id: String(value.id),
    name: value.name,
    hint: value.hint ?? '',
    defaultKind: value.defaultKind === 'fixed' ? 'fixed' : 'variable',
    icon: isExpenseIcon(value.icon) ? value.icon : 'dots',
  }
}

function cleanCategory(draft: ExpenseCategoryDraft): ExpenseCategoryDraft {
  return { name: draft.name.trim(), hint: draft.hint.trim(), defaultKind: draft.defaultKind, icon: draft.icon }
}

/** GET /expense-categories — categorías de la organización, compartidas por sus sedes. */
export async function fetchExpenseCategories(): Promise<ExpenseCategory[]> {
  const payload = await http<unknown>('/expenseCategories')
  return Array.isArray(payload) ? payload.filter(isExpenseCategory).map(toExpenseCategory) : []
}

/** POST /expense-categories */
export async function createExpenseCategory(id: string, draft: ExpenseCategoryDraft): Promise<ExpenseCategory> {
  const payload = await http<unknown>('/expenseCategories', { method: 'POST', body: { id, ...cleanCategory(draft) } })
  if (!isExpenseCategory(payload)) throw new Error('No se pudo crear la categoría.')
  return toExpenseCategory(payload)
}

/** PATCH /expense-categories/:id */
export async function updateExpenseCategory(id: string, draft: ExpenseCategoryDraft): Promise<ExpenseCategory> {
  const payload = await http<unknown>(`/expenseCategories/${id}`, { method: 'PATCH', body: cleanCategory(draft) })
  if (!isExpenseCategory(payload)) throw new Error('No se pudo guardar la categoría.')
  return toExpenseCategory(payload)
}

/** Cuántos gastos (de todas las sedes) usan cada categoría. */
export async function countExpensesByCategory(): Promise<Map<string, number>> {
  const payload = await http<unknown>('/expenses')
  const counts = new Map<string, number>()
  for (const expense of Array.isArray(payload) ? payload.filter(isExpense) : []) {
    counts.set(expense.category, (counts.get(expense.category) ?? 0) + 1)
  }
  return counts
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * DELETE /expense-categories/:id?moveTo=… — los gastos de la categoría pasan a `moveTo`.
 *
 * En el backend será una sola transacción. json-server recarga db.json tras cada escritura
 * y puede perder un cambio que llega justo en ese momento (responde 200 igual), así que
 * aquí se comprueba el resultado y se reintenta lo que no quedó aplicado.
 */
export async function deleteExpenseCategory(id: string, moveTo: string | null): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) await pause(400)

    const [expenses, categories] = await Promise.all([http<unknown>('/expenses'), fetchExpenseCategories()])
    const pending = moveTo && Array.isArray(expenses) ? expenses.filter(isExpense).filter((item) => String(item.category) === id) : []
    const exists = categories.some((category) => category.id === id)

    if (pending.length === 0 && !exists) return

    for (const expense of pending) {
      await http<unknown>(`/expenses/${expense.id}`, { method: 'PATCH', body: { category: moveTo } })
    }
    if (exists) {
      if (pending.length > 0) await pause(400)
      await http<unknown>(`/expenseCategories/${id}`, { method: 'DELETE' })
    }
  }

  throw new Error('No se pudo eliminar la categoría. Inténtalo de nuevo.')
}
