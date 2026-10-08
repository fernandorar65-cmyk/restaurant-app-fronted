import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

const DINER_KEY = 'restaurant-cmr:diner'
const RECENT_KEY = 'restaurant-cmr:recent-restaurants'
const RECENT_LIMIT = 6

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

/** Cómo entró el comensal: escaneando el QR de una mesa o eligiendo la sede a mano. */
export type DinerEntry = 'qr' | 'manual'

interface StoredDiner {
  restaurantId: string | null
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

/**
 * Contexto del comensal (sede, mesa, atención en curso y cuenta opcional).
 * Se guarda en localStorage para sobrevivir a un refresh o a cerrar la pestaña.
 */
export const useDinerStore = defineStore('diner', () => {
  const stored = readStoredDiner()

  const restaurantId = ref<string | null>(stored.restaurantId)
  const restaurantName = ref<string | null>(stored.restaurantName)
  const currency = ref(stored.currency)
  const tableNumber = ref<string | null>(stored.tableNumber)
  const entry = ref<DinerEntry | null>(stored.entry)
  const confirmed = ref(stored.confirmed)
  const attentionId = ref<string | null>(stored.attentionId)
  const customer = ref<DinerCustomer | null>(stored.customer)
  const recentRestaurants = ref<RecentRestaurant[]>(readRecentRestaurants())

  const hasRestaurant = computed(() => restaurantId.value !== null)
  const hasTable = computed(() => tableNumber.value !== null)
  const isReadyToOrder = computed(() => hasRestaurant.value && hasTable.value && confirmed.value)

  /** La sede pasa al inicio de los recientes, sin duplicados. */
  function rememberRestaurant(id: string): void {
    recentRestaurants.value = [
      { id, visitedAt: new Date().toISOString() },
      ...recentRestaurants.value.filter((item) => item.id !== id),
    ].slice(0, RECENT_LIMIT)
  }

  /** Fija sede y mesa. Si cambia la mesa o la sede, se olvida la atención anterior. */
  function setTable(next: {
    restaurantId: string
    restaurantName: string
    currency: string
    tableNumber: string
    entry: DinerEntry
  }): void {
    const changed = restaurantId.value !== next.restaurantId || tableNumber.value !== next.tableNumber

    restaurantId.value = next.restaurantId
    restaurantName.value = next.restaurantName
    currency.value = next.currency
    tableNumber.value = next.tableNumber
    entry.value = next.entry
    rememberRestaurant(next.restaurantId)

    if (changed) {
      confirmed.value = false
      attentionId.value = null
    }
  }

  /** Consultar la carta de una sede sin mesa (no permite pedir). */
  function browse(next: { restaurantId: string; restaurantName: string; currency: string }): void {
    restaurantId.value = next.restaurantId
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
    restaurantName.value = null
    tableNumber.value = null
    entry.value = null
    confirmed.value = false
    attentionId.value = null
  }

  watch(
    [restaurantId, restaurantName, currency, tableNumber, entry, confirmed, attentionId, customer],
    () => {
      const snapshot: StoredDiner = {
        restaurantId: restaurantId.value,
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

  return {
    restaurantId,
    restaurantName,
    currency,
    tableNumber,
    entry,
    confirmed,
    attentionId,
    customer,
    recentRestaurants,
    hasRestaurant,
    hasTable,
    isReadyToOrder,
    setTable,
    browse,
    confirmTable,
    setAttention,
    setCustomer,
    leaveTable,
  }
})
