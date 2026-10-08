import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

const DINER_KEY = 'restaurant-cmr:diner'
const RECENT_KEY = 'restaurant-cmr:recent-restaurants'
const RECENT_LIMIT = 6
/**
 * Código de la mesa donde está el comensal. Hoy se ingresa a mano al ir a pagar;
 * más adelante lo guardará el flujo del QR al abrir su URL.
 */
const TABLE_CODE_KEY = 'restaurant-cmr:table-code'

export interface DinerCustomer {
  id: string
  name: string
  email: string
}

/** Sede que el comensal abrió hace poco (por QR o desde el mapa). */
export interface RecentRestaurant {
  id: string
  visitedAt: string
}

/** Identificador de mesa (texto libre) asociado a la sede donde se guardó. */
export interface StoredTableCode {
  restaurantId: string
  code: string
  savedAt: string
}

/** Cómo entró el comensal: escaneando el QR de una mesa o eligiendo la sede a mano. */
export type DinerEntry = 'qr' | 'manual'

interface StoredDiner {
  restaurantId: string | null
  restaurantSlug: string | null
  restaurantName: string | null
  currency: string
  tableNumber: string | null
  entry: DinerEntry | null
  /** El comensal confirmó que está en esa mesa y eligió invitado o cuenta. */
  confirmed: boolean
  attentionId: string | null
  customer: DinerCustomer | null
}

const EMPTY: StoredDiner = {
  restaurantId: null,
  restaurantSlug: null,
  restaurantName: null,
  currency: 'EUR',
  tableNumber: null,
  entry: null,
  confirmed: false,
  attentionId: null,
  customer: null,
}

function readStoredDiner(): StoredDiner {
  try {
    const raw = localStorage.getItem(DINER_KEY)

    if (!raw) {
      return { ...EMPTY }
    }

    const parsed: unknown = JSON.parse(raw)

    if (typeof parsed === 'object' && parsed !== null) {
      return { ...EMPTY, ...(parsed as Partial<StoredDiner>) }
    }
  } catch {
    // Almacenamiento no disponible o dañado: se empieza de cero.
  }

  return { ...EMPTY }
}

function readRecentRestaurants(): RecentRestaurant[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')

    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is RecentRestaurant =>
          typeof item === 'object' && item !== null && typeof item.id === 'string' && typeof item.visitedAt === 'string',
      )
    }
  } catch {
    // Almacenamiento no disponible o dañado: sin recientes.
  }

  return []
}

function readTableCode(): StoredTableCode | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(TABLE_CODE_KEY) ?? 'null')

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'restaurantId' in parsed &&
      'code' in parsed &&
      typeof parsed.restaurantId === 'string' &&
      typeof parsed.code === 'string' &&
      parsed.code.trim()
    ) {
      const stored = parsed as Partial<StoredTableCode>
      return {
        restaurantId: parsed.restaurantId,
        code: parsed.code,
        savedAt: typeof stored.savedAt === 'string' ? stored.savedAt : '',
      }
    }
  } catch {
    // Almacenamiento no disponible o dañado: sin código de mesa.
  }

  return null
}

/**
 * Contexto del comensal (sede, mesa, atención en curso y cuenta opcional).
 * Se guarda en localStorage para sobrevivir a un refresh o a cerrar la pestaña.
 */
export const useDinerStore = defineStore('diner', () => {
  const stored = readStoredDiner()

  const restaurantId = ref<string | null>(stored.restaurantId)
  const restaurantSlug = ref<string | null>(stored.restaurantSlug)
  const restaurantName = ref<string | null>(stored.restaurantName)
  const currency = ref(stored.currency)
  const tableNumber = ref<string | null>(stored.tableNumber)
  const entry = ref<DinerEntry | null>(stored.entry)
  const confirmed = ref(stored.confirmed)
  const attentionId = ref<string | null>(stored.attentionId)
  const customer = ref<DinerCustomer | null>(stored.customer)
  const recentRestaurants = ref<RecentRestaurant[]>(readRecentRestaurants())
  const storedTableCode = ref<StoredTableCode | null>(readTableCode())

  /** Código de mesa válido solo para la sede actual: uno de otra sede no sirve para pagar aquí. */
  const tableCode = computed(() =>
    storedTableCode.value && storedTableCode.value.restaurantId === restaurantId.value ? storedTableCode.value.code : null,
  )

  const hasRestaurant = computed(() => restaurantId.value !== null)
  const hasTable = computed(() => tableNumber.value !== null)
  const isReadyToOrder = computed(() => hasRestaurant.value && hasTable.value && confirmed.value)

  /** Carta de la sede actual; sin sede (o sin slug guardado), el inicio para elegir una. */
  const menuRoute = computed<RouteLocationRaw>(() =>
    restaurantSlug.value ? { name: 'menu', params: { restaurantSlug: restaurantSlug.value } } : { name: 'home' },
  )

  /** La sede pasa al inicio de los recientes, sin duplicados. */
  function rememberRestaurant(id: string): void {
    recentRestaurants.value = [
      { id, visitedAt: new Date().toISOString() },
      ...recentRestaurants.value.filter((item) => item.id !== id),
    ].slice(0, RECENT_LIMIT)
  }

  function setTableCode(forRestaurantId: string, code: string): void {
    storedTableCode.value = { restaurantId: forRestaurantId, code: code.trim(), savedAt: new Date().toISOString() }
  }

  function clearTableCode(): void {
    storedTableCode.value = null
  }

  /** Fija sede y mesa. Si cambia la mesa o la sede, se olvida la atención anterior. */
  function setTable(next: {
    restaurantId: string
    restaurantSlug: string
    restaurantName: string
    currency: string
    tableNumber: string
    entry: DinerEntry
  }): void {
    const changed = restaurantId.value !== next.restaurantId || tableNumber.value !== next.tableNumber

    restaurantId.value = next.restaurantId
    restaurantSlug.value = next.restaurantSlug
    restaurantName.value = next.restaurantName
    currency.value = next.currency
    tableNumber.value = next.tableNumber
    entry.value = next.entry
    rememberRestaurant(next.restaurantId)
    // La mesa que llega por QR también queda como código de mesa para el pago.
    setTableCode(next.restaurantId, next.tableNumber)

    if (changed) {
      confirmed.value = false
      attentionId.value = null
    }
  }

  /** Consultar la carta de una sede sin mesa (no permite pedir). */
  function browse(next: { restaurantId: string; restaurantSlug: string; restaurantName: string; currency: string }): void {
    restaurantId.value = next.restaurantId
    restaurantSlug.value = next.restaurantSlug
    restaurantName.value = next.restaurantName
    currency.value = next.currency
    tableNumber.value = null
    entry.value = 'manual'
    confirmed.value = false
    attentionId.value = null
    rememberRestaurant(next.restaurantId)
  }

  function confirmTable(): void {
    confirmed.value = true
  }

  function setAttention(id: string | null): void {
    attentionId.value = id
  }

  function setCustomer(next: DinerCustomer | null): void {
    customer.value = next
  }

  function leaveTable(): void {
    restaurantId.value = null
    restaurantSlug.value = null
    restaurantName.value = null
    tableNumber.value = null
    entry.value = null
    confirmed.value = false
    attentionId.value = null
  }

  watch(
    [restaurantId, restaurantSlug, restaurantName, currency, tableNumber, entry, confirmed, attentionId, customer],
    () => {
      const snapshot: StoredDiner = {
        restaurantId: restaurantId.value,
        restaurantSlug: restaurantSlug.value,
        restaurantName: restaurantName.value,
        currency: currency.value,
        tableNumber: tableNumber.value,
        entry: entry.value,
        confirmed: confirmed.value,
        attentionId: attentionId.value,
        customer: customer.value,
      }

      try {
        localStorage.setItem(DINER_KEY, JSON.stringify(snapshot))
      } catch {
        // Sin almacenamiento: el contexto vive solo en memoria.
      }
    },
    { deep: true },
  )

  watch(recentRestaurants, (items) => {
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(items))
    } catch {
      // Sin almacenamiento: los recientes viven solo en memoria.
    }
  })

  watch(storedTableCode, (value) => {
    try {
      if (value) {
        localStorage.setItem(TABLE_CODE_KEY, JSON.stringify(value))
      } else {
        localStorage.removeItem(TABLE_CODE_KEY)
      }
    } catch {
      // Sin almacenamiento: el código vive solo en memoria.
    }
  })

  return {
    restaurantId,
    restaurantSlug,
    restaurantName,
    currency,
    tableNumber,
    entry,
    confirmed,
    attentionId,
    customer,
    recentRestaurants,
    tableCode,
    hasRestaurant,
    hasTable,
    isReadyToOrder,
    menuRoute,
    setTableCode,
    clearTableCode,
    setTable,
    browse,
    confirmTable,
    setAttention,
    setCustomer,
    leaveTable,
  }
})
