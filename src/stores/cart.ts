import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

export interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  notes: string
}

const CART_KEY = 'restaurant-cmr:cart'

interface StoredCart {
  restaurantId: string | null
  items: CartItem[]
  /** Clave de idempotencia del próximo envío. Se conserva hasta que el envío se confirma. */
  batchId: string
}

function newBatchId(): string {
  return `batch-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
}

function readStoredCart(): StoredCart {
  const raw = localStorage.getItem(CART_KEY)

  if (!raw) {
    return { restaurantId: null, items: [], batchId: newBatchId() }
  }

  try {
    const parsed: unknown = JSON.parse(raw)

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'items' in parsed &&
      Array.isArray((parsed as StoredCart).items)
    ) {
      const stored = parsed as Partial<StoredCart> & { items: CartItem[] }
      return { restaurantId: stored.restaurantId ?? null, items: stored.items, batchId: stored.batchId ?? newBatchId() }
    }
  } catch {
    localStorage.removeItem(CART_KEY)
  }

  return { restaurantId: null, items: [], batchId: newBatchId() }
}

export const useCartStore = defineStore('cart', () => {
  const stored = readStoredCart()
  const restaurantId = ref<string | null>(stored.restaurantId)
  const items = ref<CartItem[]>(stored.items)
  const batchId = ref(stored.batchId)

  const itemCount = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))
  const subtotal = computed(() => items.value.reduce((sum, item) => sum + item.price * item.quantity, 0))

  function ensureRestaurant(nextRestaurantId: string): void {
    if (restaurantId.value !== nextRestaurantId) {
      restaurantId.value = nextRestaurantId
      items.value = []
    }
  }

  function addItem(product: { productId: string; name: string; price: number }, quantity = 1): void {
    const existing = items.value.find((item) => item.productId === product.productId)

    if (existing) {
      existing.quantity += quantity
      return
    }

    items.value.push({ ...product, quantity, notes: '' })
  }

  function setQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }

    const existing = items.value.find((item) => item.productId === productId)

    if (existing) {
      existing.quantity = quantity
    }
  }

  function setNotes(productId: string, notes: string): void {
    const existing = items.value.find((item) => item.productId === productId)

    if (existing) {
      existing.notes = notes
    }
  }

  function removeItem(productId: string): void {
    items.value = items.value.filter((item) => item.productId !== productId)
  }

  function setPrice(productId: string, price: number): void {
    const existing = items.value.find((item) => item.productId === productId)

    if (existing) {
      existing.price = price
    }
  }

  /** Vacía el carrito tras un envío confirmado y prepara una clave nueva para el próximo. */
  function clear(): void {
    items.value = []
    batchId.value = newBatchId()
  }

  watch(
    [restaurantId, items, batchId],
    () => {
      try {
        localStorage.setItem(
          CART_KEY,
          JSON.stringify({ restaurantId: restaurantId.value, items: items.value, batchId: batchId.value }),
        )
      } catch {
        // Sin almacenamiento: el carrito vive solo en memoria.
      }
    },
    { deep: true },
  )

  return {
    restaurantId,
    items,
    batchId,
    itemCount,
    subtotal,
    ensureRestaurant,
    addItem,
    setQuantity,
    setNotes,
    removeItem,
    setPrice,
    clear,
  }
})
