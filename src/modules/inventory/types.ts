import type { InventoryStatus } from '@/modules/administration/types'

export type { InventoryStatus }

/** Categorías de insumo para ordenar la despensa. */
export type SupplyCategory = 'meat' | 'seafood' | 'produce' | 'dairy' | 'pantry' | 'drinks' | 'cleaning' | 'other'

export const SUPPLY_CATEGORIES: SupplyCategory[] = ['meat', 'seafood', 'produce', 'dairy', 'pantry', 'drinks', 'cleaning', 'other']

export const supplyCategoryLabel: Record<SupplyCategory, string> = {
  meat: 'Carnes',
  seafood: 'Pescados y mariscos',
  produce: 'Verduras y frutas',
  dairy: 'Lácteos y huevos',
  pantry: 'Despensa',
  drinks: 'Bebidas',
  cleaning: 'Limpieza y descartables',
  other: 'Otros',
}

export function isSupplyCategory(value: unknown): value is SupplyCategory {
  return typeof value === 'string' && (SUPPLY_CATEGORIES as string[]).includes(value)
}

export const SUPPLY_UNITS = ['kg', 'g', 'l', 'ml', 'ud', 'caja', 'botella'] as const

/** Insumo de una sede (colección `inventoryItems`, compartida con el inventario de Administración). */
export interface Supply {
  id: string
  restaurantId: string
  name: string
  category: SupplyCategory
  unit: string
  stock: number
  minStock: number
  /** Costo de la última compra por unidad. */
  unitCost: number
  status: InventoryStatus
  supplier: string
  updatedAt: string
  isActive: boolean
}

export type SupplyDraft = Pick<Supply, 'name' | 'category' | 'unit' | 'minStock' | 'unitCost' | 'supplier' | 'isActive'> & {
  /** Solo al crear: stock con el que arranca. */
  stock: number
}

/**
 * Movimiento de stock.
 * - purchase: entrada por compra · usage: salida por consumo · waste: merma · count: conteo físico (fija el stock).
 */
export type MovementType = 'purchase' | 'usage' | 'waste' | 'count'

export const MOVEMENT_TYPES: MovementType[] = ['purchase', 'usage', 'waste', 'count']

export const movementTypeLabel: Record<MovementType, string> = {
  purchase: 'Entrada',
  usage: 'Salida',
  waste: 'Merma',
  count: 'Conteo',
}

export const movementTypeHint: Record<MovementType, string> = {
  purchase: 'Compra o recepción de mercadería',
  usage: 'Consumo en cocina o barra',
  waste: 'Vencido, dañado o descartado',
  count: 'Inventario físico: fija el stock real',
}

export const WASTE_REASONS = ['Vencido', 'Dañado', 'Error de preparación', 'Devolución', 'Otro'] as const

export interface StockMovement {
  id: string
  restaurantId: string
  itemId: string
  /** Nombre y unidad al momento del movimiento (por si el insumo cambia o se elimina). */
  itemName: string
  unit: string
  type: MovementType
  /** Variación del stock: positiva entra, negativa sale. */
  delta: number
  stockAfter: number
  unitCost: number | null
  reason: string
  /** Gasto creado en Cuentas → Gastos para esta compra. */
  expenseId: string | null
  createdBy: string | null
  createdAt: string
}

export interface MovementDraft {
  type: MovementType
  /** Cantidad para entrada/salida/merma; stock contado para conteo. */
  quantity: number
  unitCost: number | null
  reason: string
  supplier: string
  /** Solo entradas: registrar la compra como gasto de la sede. */
  registerExpense: boolean
}
