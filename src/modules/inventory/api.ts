import { inventoryStatusFor } from '@/modules/administration/api'
import { createExpense, fetchExpenseCategories } from '@/modules/expenses/api'
import { isSupplyCategory, MOVEMENT_TYPES, movementTypeLabel } from '@/modules/inventory/types'
import type { MovementDraft, MovementType, StockMovement, Supply, SupplyDraft } from '@/modules/inventory/types'
import { http, waitForJsonServer } from '@/services/http'

const round = (value: number) => Math.round(value * 1000) / 1000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSupply(value: unknown): value is Supply {
  return (
    isRecord(value) &&
    (typeof value.id === 'string' || typeof value.id === 'number') &&
    (typeof value.restaurantId === 'string' || typeof value.restaurantId === 'number') &&
    typeof value.name === 'string' &&
    typeof value.stock === 'number' &&
    typeof value.minStock === 'number'
  )
}

function toSupply(value: Supply): Supply {
  return {
    ...value,
    id: String(value.id),
    restaurantId: String(value.restaurantId),
    category: isSupplyCategory(value.category) ? value.category : 'other',
    unit: value.unit ?? 'ud',
    unitCost: typeof value.unitCost === 'number' ? value.unitCost : 0,
    status: inventoryStatusFor(value.stock, value.minStock),
    supplier: value.supplier ?? '',
    updatedAt: value.updatedAt ?? '',
    isActive: typeof value.isActive === 'boolean' ? value.isActive : true,
  }
}

function isMovement(value: unknown): value is StockMovement {
  return (
    isRecord(value) &&
    (typeof value.id === 'string' || typeof value.id === 'number') &&
    (typeof value.itemId === 'string' || typeof value.itemId === 'number') &&
    (MOVEMENT_TYPES as unknown[]).includes(value.type) &&
    typeof value.delta === 'number'
  )
}

function toMovement(value: StockMovement): StockMovement {
  return {
    ...value,
    id: String(value.id),
    restaurantId: String(value.restaurantId),
    itemId: String(value.itemId),
    unitCost: typeof value.unitCost === 'number' ? value.unitCost : null,
    reason: value.reason ?? '',
    expenseId: value.expenseId ?? null,
    createdBy: value.createdBy ?? null,
  }
}

/**
 * Insumos de una sede. Backend: GET /restaurants/:id/supplies
 * (json-server convierte "1" en número al filtrar, así que la sede se filtra aquí).
 */
export async function fetchSupplies(restaurantId: string): Promise<Supply[]> {
  const payload = await http<unknown>('/inventoryItems')
  return (Array.isArray(payload) ? payload.filter(isSupply).map(toSupply) : [])
    .filter((item) => item.restaurantId === restaurantId)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

function cleanSupply(draft: SupplyDraft) {
  return {
    name: draft.name.trim(),
    category: draft.category,
    unit: draft.unit,
    minStock: round(draft.minStock),
    unitCost: Math.round(draft.unitCost * 100) / 100,
    supplier: draft.supplier.trim(),
    isActive: draft.isActive,
  }
}

/** POST /restaurants/:id/supplies */
export async function createSupply(restaurantId: string, draft: SupplyDraft): Promise<Supply> {
  const stock = round(draft.stock)
  const payload = await http<unknown>('/inventoryItems', {
    method: 'POST',
    body: {
      restaurantId,
      ...cleanSupply(draft),
      stock,
      status: inventoryStatusFor(stock, draft.minStock),
      updatedAt: new Date().toISOString(),
    },
  })
  if (!isSupply(payload)) throw new Error('No se pudo crear el insumo.')
  return toSupply(payload)
}

/** PATCH /supplies/:id — el stock solo cambia con movimientos. */
export async function updateSupply(item: Supply, draft: SupplyDraft): Promise<Supply> {
  const payload = await http<unknown>(`/inventoryItems/${item.id}`, {
    method: 'PATCH',
    body: { ...cleanSupply(draft), status: inventoryStatusFor(item.stock, draft.minStock), updatedAt: new Date().toISOString() },
  })
  if (!isSupply(payload)) throw new Error('No se pudo guardar el insumo.')
  return toSupply(payload)
}

/** Movimientos de una sede, del más reciente al más antiguo. Backend: GET /restaurants/:id/stock-movements */
export async function fetchMovements(restaurantId: string): Promise<StockMovement[]> {
  const payload = await http<unknown>('/inventoryMovements')
  return (Array.isArray(payload) ? payload.filter(isMovement).map(toMovement) : [])
    .filter((movement) => movement.restaurantId === restaurantId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

/** Stock resultante de aplicar un movimiento. */
export function stockAfter(stock: number, type: MovementType, quantity: number): number {
  if (type === 'count') return round(quantity)
  return round(type === 'purchase' ? stock + quantity : stock - quantity)
}

const pad = (value: number) => String(value).padStart(2, '0')
const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Registra un movimiento: actualiza el stock del insumo, guarda el movimiento y, si es una
 * compra marcada como gasto, crea el gasto en Cuentas → Gastos.
 * Backend: POST /supplies/:id/movements (una sola transacción).
 */
export async function registerMovement(
  item: Supply,
  draft: MovementDraft,
  createdBy: string | null,
): Promise<{ item: Supply; movement: StockMovement }> {
  const nextStock = stockAfter(item.stock, draft.type, draft.quantity)
  if (nextStock < 0) throw new Error(`No hay stock suficiente: quedan ${item.stock} ${item.unit}.`)

  const isPurchase = draft.type === 'purchase'
  const unitCost = isPurchase && draft.unitCost !== null ? Math.round(draft.unitCost * 100) / 100 : null
  const now = new Date().toISOString()

  // 1. Gasto (solo compras)
  let expenseId: string | null = null
  if (isPurchase && draft.registerExpense && unitCost !== null && unitCost * draft.quantity > 0) {
    const categories = await fetchExpenseCategories()
    const category = categories.find((entry) => entry.id === 'supplies') ?? categories[0]
    if (category) {
      const expense = await createExpense(
        item.restaurantId,
        {
          category: category.id,
          kind: 'variable',
          description: `${item.name} (${draft.quantity} ${item.unit})`,
          amount: unitCost * draft.quantity,
          date: today(),
          supplier: draft.supplier.trim() || item.supplier || null,
          paymentMethod: 'transfer',
          notes: 'Registrado desde Insumos',
        },
        createdBy,
      )
      expenseId = expense.id
      await waitForJsonServer()
    }
  }

  // 2. Insumo
  const patch: Record<string, unknown> = { stock: nextStock, status: inventoryStatusFor(nextStock, item.minStock), updatedAt: now }
  if (unitCost !== null) patch.unitCost = unitCost
  if (isPurchase && draft.supplier.trim()) patch.supplier = draft.supplier.trim()
  const updated = await http<unknown>(`/inventoryItems/${item.id}`, { method: 'PATCH', body: patch })
  if (!isSupply(updated)) throw new Error('No se pudo actualizar el stock.')
  await waitForJsonServer()

  // 3. Movimiento
  const payload = await http<unknown>('/inventoryMovements', {
    method: 'POST',
    body: {
      restaurantId: item.restaurantId,
      itemId: item.id,
      itemName: item.name,
      unit: item.unit,
      type: draft.type,
      delta: round(nextStock - item.stock),
      stockAfter: nextStock,
      unitCost,
      reason: draft.reason.trim(),
      expenseId,
      createdBy,
      createdAt: now,
    },
  })
  if (!isMovement(payload)) throw new Error(`No se pudo registrar la ${movementTypeLabel[draft.type].toLowerCase()}.`)

  return { item: toSupply(updated), movement: toMovement(payload) }
}
