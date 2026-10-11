import { computed, onMounted, ref } from 'vue'

import { fetchMenuProducts } from '@/modules/menus/api'
import type { MenuProduct } from '@/modules/menus/types'
import type { FulfillmentMode } from '@/modules/payments/checkout'
import { fetchRestaurantById } from '@/modules/restaurants/api'
import type { RestaurantSite } from '@/modules/restaurants/types'
import { useCartStore } from '@/stores/cart'
import { useCheckoutStore } from '@/stores/checkout'
import { useDinerStore } from '@/stores/diner'

/** Margen sobre el plato más lento, para emplatar y despachar. */
const READY_BUFFER_MIN = 10
/** Si no hay tiempos cargados en los platos. */
const DEFAULT_PREP_MIN = 20

const PHONE_PATTERN = /^[+\d][\d\s-]{6,}$/

/** Distancia en km entre dos puntos (haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function toTimeValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/**
 * Estado compartido por las pantallas del checkout: sede, totales, hora estimada
 * y validación de los datos de entrega según la modalidad elegida.
 */
export function useCheckout() {
  const cart = useCartStore()
  const diner = useDinerStore()
  const checkout = useCheckoutStore()

  const site = ref<RestaurantSite | null>(null)
  const products = ref<MenuProduct[]>([])
  const isLoading = ref(true)
  const loadError = ref(false)

  /** Modalidades que ofrece la sede. */
  const availableModes = computed<FulfillmentMode[]>(() => {
    const options = site.value?.fulfillment

    if (!options) {
      return []
    }

    return [
      ...(options.dineIn ? (['dine-in'] as const) : []),
      ...(options.pickup ? (['pickup'] as const) : []),
      ...(options.delivery ? (['delivery'] as const) : []),
    ]
  })

  const subtotal = computed(() => cart.subtotal)
  const deliveryFee = computed(() => (checkout.mode === 'delivery' ? (site.value?.fulfillment.deliveryFee ?? 0) : 0))
  const total = computed(() => subtotal.value + deliveryFee.value)

  /** Minutos hasta que el pedido esté listo: el plato más lento del carrito más un margen. */
  const prepMinutes = computed(() => {
    const times = cart.items
      .map((item) => products.value.find((product) => product.id === item.productId)?.prepMinutes ?? null)
      .filter((value): value is number => value !== null)

    return (times.length > 0 ? Math.max(...times) : DEFAULT_PREP_MIN) + READY_BUFFER_MIN
  })

  /** Horarios de llegada de hoy, cada 15 minutos desde que el pedido puede estar listo y durante 3 horas. */
  const arrivalSlots = computed(() => {
    const earliest = new Date(Date.now() + prepMinutes.value * 60000)
    earliest.setSeconds(0, 0)
    earliest.setMinutes(Math.ceil(earliest.getMinutes() / 15) * 15)

    return Array.from({ length: 12 }, (_, index) => {
      const slot = new Date(earliest.getTime() + index * 15 * 60000)
      return slot.getDate() === new Date().getDate() ? toTimeValue(slot) : null
    }).filter((value): value is string => value !== null)
  })

  /** Distancia del punto de entrega a la sede, si el comensal compartió su ubicación. */
  const deliveryDistanceKm = computed(() => {
    const { lat, lng } = checkout.delivery

    if (lat === null || lng === null || typeof site.value?.lat !== 'number' || typeof site.value?.lng !== 'number') {
      return null
    }

    return distanceKm({ lat, lng }, { lat: site.value.lat, lng: site.value.lng })
  })

  /** Primer problema que impide continuar al pago, o null si todo está completo. */
  const fulfillmentError = computed<string | null>(() => {
    const mode = checkout.mode
    const options = site.value?.fulfillment

    if (!mode || !options) {
      return 'Elige cómo quieres recibir tu pedido.'
    }

    if (!availableModes.value.includes(mode)) {
      return 'Esta sede no ofrece esa modalidad.'
    }

    if (mode === 'dine-in') {
      return diner.tableCode ? null : 'Ingresa el código de tu mesa.'
    }

    if (!checkout.contact.name.trim()) {
      return 'Ingresa tu nombre.'
    }

    if (!PHONE_PATTERN.test(checkout.contact.phone.trim())) {
      return 'Ingresa un teléfono válido para avisarte.'
    }

    if (mode === 'pickup') {
      return arrivalSlots.value.includes(checkout.pickup.arrivalTime) ? null : 'Elige a qué hora llegarás.'
    }

    if (!checkout.delivery.address.trim()) {
      return 'Ingresa la dirección de entrega.'
    }

    if (options.minOrder > 0 && subtotal.value < options.minOrder) {
      return 'El pedido no llega al mínimo para delivery.'
    }

    if (deliveryDistanceKm.value !== null && deliveryDistanceKm.value > options.deliveryRadiusKm) {
      return `Tu ubicación está fuera del radio de entrega (${options.deliveryRadiusKm} km).`
    }

    return null
  })

  async function load(): Promise<void> {
    const restaurantId = diner.restaurantId
    isLoading.value = true
    loadError.value = false

    if (!restaurantId) {
      isLoading.value = false
      return
    }

    checkout.ensureRestaurant(restaurantId)

    if (!checkout.contact.name && diner.customer) {
      checkout.contact.name = diner.customer.name
    }

    try {
      const [loadedSite, loadedProducts] = await Promise.all([fetchRestaurantById(restaurantId), fetchMenuProducts(restaurantId)])
      site.value = loadedSite
      products.value = loadedProducts
    } catch {
      loadError.value = true
    } finally {
      isLoading.value = false
    }
  }

  onMounted(() => {
    void load()
  })

  return {
    site,
    isLoading,
    loadError,
    availableModes,
    subtotal,
    deliveryFee,
    total,
    prepMinutes,
    arrivalSlots,
    deliveryDistanceKm,
    fulfillmentError,
    reload: load,
  }
}
