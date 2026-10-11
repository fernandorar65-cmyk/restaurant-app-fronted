import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

import { isCheckoutMethod } from '@/modules/payments/checkout'
import type { CheckoutMethod, FulfillmentMode } from '@/modules/payments/checkout'

const CHECKOUT_KEY = 'restaurant-cmr:checkout'

export interface CheckoutContact {
  name: string
  phone: string
}

export interface PickupDetails {
  /** Hora de llegada "HH:MM" del día de hoy. */
  arrivalTime: string
  /** true = come en el local al llegar; false = para llevar. */
  eatIn: boolean
}

export interface DeliveryDetails {
  address: string
  reference: string
  /** Ubicación compartida para validar el radio de entrega (opcional). */
  lat: number | null
  lng: number | null
}

/** Comprobante del último pago (simulado) para la pantalla de resultado. Solo en memoria. */
export interface CheckoutReceipt {
  code: string
  restaurantName: string
  mode: FulfillmentMode
  fulfillmentDetail: string
  methodLabel: string
  paymentDetail: string
  items: Array<{ name: string; quantity: number; price: number }>
  deliveryFee: number
  total: number
  currency: string
  /** Hora estimada (HH:MM) en que estará listo o llegará. */
  readyAt: string
  createdAt: string
}

interface StoredCheckout {
  restaurantId: string | null
  mode: FulfillmentMode | null
  contact: CheckoutContact
  pickup: PickupDetails
  delivery: DeliveryDetails
  method: CheckoutMethod | null
}

function empty(): StoredCheckout {
  return {
    restaurantId: null,
    mode: null,
    contact: { name: '', phone: '' },
    pickup: { arrivalTime: '', eatIn: true },
    delivery: { address: '', reference: '', lat: null, lng: null },
    method: null,
  }
}

function read(): StoredCheckout {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CHECKOUT_KEY) ?? 'null')

    if (typeof parsed === 'object' && parsed !== null) {
      const base = empty()
      const value = parsed as Partial<StoredCheckout>
      return {
        ...base,
        ...value,
        contact: { ...base.contact, ...value.contact },
        pickup: { ...base.pickup, ...value.pickup },
        delivery: { ...base.delivery, ...value.delivery },
      }
    }
  } catch {
    // Almacenamiento no disponible o dañado: checkout vacío.
  }

  return empty()
}

/**
 * Borrador del checkout del comensal: cómo recibe el pedido, sus datos y el método
 * de pago elegido. Se guarda para no perderlo al recargar o volver atrás.
 */
export const useCheckoutStore = defineStore('checkout', () => {
  const stored = read()

  const restaurantId = ref(stored.restaurantId)
  const mode = ref(stored.mode)
  const contact = ref(stored.contact)
  const pickup = ref(stored.pickup)
  const delivery = ref(stored.delivery)
  const method = ref(isCheckoutMethod(stored.method) ? stored.method : null)
  const lastReceipt = ref<CheckoutReceipt | null>(null)

  /** Un borrador de otra sede no sirve: modo, horario y dirección dependen de la sede. */
  function ensureRestaurant(nextRestaurantId: string): void {
    if (restaurantId.value !== nextRestaurantId) {
      const base = empty()
      restaurantId.value = nextRestaurantId
      mode.value = null
      pickup.value = base.pickup
      delivery.value = base.delivery
      method.value = null
    }
  }

  function reset(): void {
    const base = empty()
    restaurantId.value = null
    mode.value = null
    pickup.value = base.pickup
    delivery.value = base.delivery
    method.value = null
  }

  watch(
    [restaurantId, mode, contact, pickup, delivery, method],
    () => {
      const snapshot: StoredCheckout = {
        restaurantId: restaurantId.value,
        mode: mode.value,
        contact: contact.value,
        pickup: pickup.value,
        delivery: delivery.value,
        method: method.value,
      }

      try {
        localStorage.setItem(CHECKOUT_KEY, JSON.stringify(snapshot))
      } catch {
        // Sin almacenamiento: el borrador vive solo en memoria.
      }
    },
    { deep: true },
  )

  return { restaurantId, mode, contact, pickup, delivery, method, lastReceipt, ensureRestaurant, reset }
})
