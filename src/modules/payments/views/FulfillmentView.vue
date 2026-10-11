<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import BaseButton from '@/components/base/BaseButton.vue'
import SkeletonBlock from '@/components/base/SkeletonBlock.vue'
import DinerNotice from '@/components/feedback/DinerNotice.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { fulfillmentLabel } from '@/modules/payments/checkout'
import type { FulfillmentMode } from '@/modules/payments/checkout'
import { useCheckout } from '@/modules/payments/composables/useCheckout'
import { useCartStore } from '@/stores/cart'
import { useCheckoutStore } from '@/stores/checkout'
import { useDinerStore } from '@/stores/diner'
import { formatMoney } from '@/utils/money'

usePageTitle('Entrega')

const cart = useCartStore()
const diner = useDinerStore()
const checkout = useCheckoutStore()
const router = useRouter()
const {
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
  reload,
} = useCheckout()

const tableCode = ref(diner.tableCode ?? '')
const showErrors = ref(false)
const locating = ref(false)
const locationError = ref<string | null>(null)

const MODES: Array<{ mode: FulfillmentMode; description: string; icon: string }> = [
  {
    mode: 'dine-in',
    description: 'Ya estás en el restaurante',
    icon: 'M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12',
  },
  {
    mode: 'pickup',
    description: 'Lo dejamos listo para cuando llegues',
    icon: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  },
  {
    mode: 'delivery',
    description: 'Te lo llevamos a tu dirección',
    icon: 'M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12',
  },
]

const options = computed(() => site.value?.fulfillment ?? null)

/* Preselección: con código de mesa guardado, "En mesa"; si la sede ofrece una sola modalidad, esa. */
watch(
  availableModes,
  (modes) => {
    if (checkout.mode && modes.includes(checkout.mode)) {
      return
    }

    if (diner.tableCode && modes.includes('dine-in')) {
      checkout.mode = 'dine-in'
    } else {
      checkout.mode = modes.length === 1 ? modes[0]! : null
    }
  },
  { immediate: true },
)

/* El código de mesa se guarda en su espacio de localStorage mientras se escribe. */
watch(tableCode, (value) => {
  if (!diner.restaurantId) {
    return
  }

  if (value.trim()) {
    diner.setTableCode(diner.restaurantId, value)
  } else {
    diner.clearTableCode()
  }
})

function shareLocation(): void {
  if (!('geolocation' in navigator)) {
    locationError.value = 'Tu navegador no permite compartir la ubicación.'
    return
  }

  locating.value = true
  locationError.value = null
  navigator.geolocation.getCurrentPosition(
    (position) => {
      checkout.delivery.lat = position.coords.latitude
      checkout.delivery.lng = position.coords.longitude
      locating.value = false
    },
    () => {
      locationError.value = 'No pudimos obtener tu ubicación.'
      locating.value = false
    },
    { timeout: 10000, maximumAge: 300000 },
  )
}

async function continueToPayment(): Promise<void> {
  showErrors.value = true

  if (!fulfillmentError.value) {
    await router.push({ name: 'checkout' })
  }
}

const inputClass =
  'min-h-12 w-full rounded-xl bg-surface px-4 text-base text-on-surface outline-none ring-1 ring-outline-variant/60 placeholder:text-outline focus:ring-2 focus:ring-primary'
const labelClass = 'text-xs font-semibold text-on-surface-variant'
</script>

<template>
  <div class="space-y-6 pb-8">
    <div>
      <h1 class="font-headline text-3xl font-semibold text-on-surface">¿Cómo quieres recibir tu pedido?</h1>
      <p class="text-sm text-on-surface-variant">{{ diner.restaurantName }}</p>
    </div>

    <DinerNotice v-if="cart.items.length === 0" kind="info" title="Tu orden está vacía" message="Agrega platos desde la carta para continuar.">
      <BaseButton variant="primary" :to="diner.menuRoute">Ver la carta</BaseButton>
    </DinerNotice>

    <SkeletonBlock v-else-if="isLoading" :rows="3" />
    <DinerNotice v-else-if="loadError || !options" kind="connection" @retry="reload" />

    <template v-else>
      <!-- Modalidad -->
      <fieldset class="grid gap-2 sm:grid-cols-3">
        <legend class="sr-only">Modalidad de entrega</legend>
        <label
          v-for="option in MODES"
          :key="option.mode"
          class="relative flex items-center gap-3 rounded-2xl bg-surface-container-lowest p-4 ring-1 transition sm:flex-col sm:items-start"
          :class="[
            !availableModes.includes(option.mode)
              ? 'cursor-not-allowed opacity-50 ring-outline-variant/40'
              : checkout.mode === option.mode
                ? 'cursor-pointer ring-2 ring-primary'
                : 'cursor-pointer ring-outline-variant/40 hover:ring-outline-variant',
          ]"
        >
          <input
            v-model="checkout.mode"
            type="radio"
            name="fulfillment"
            :value="option.mode"
            class="sr-only"
            :disabled="!availableModes.includes(option.mode)"
          />
          <span
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            :class="checkout.mode === option.mode ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'"
            aria-hidden="true"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" :d="option.icon" />
            </svg>
          </span>
          <span class="min-w-0">
            <span class="block font-semibold text-on-surface">{{ fulfillmentLabel[option.mode] }}</span>
            <span class="block text-xs text-on-surface-variant">
              {{ availableModes.includes(option.mode) ? option.description : 'No disponible en esta sede' }}
            </span>
          </span>
        </label>
      </fieldset>

      <!-- En mesa -->
      <section v-if="checkout.mode === 'dine-in'" class="space-y-3 rounded-2xl bg-surface-container-lowest p-4 ring-1 ring-outline-variant/40">
        <label class="block space-y-1">
          <span :class="labelClass">Código de mesa</span>
          <input v-model="tableCode" :class="inputClass" type="text" autocomplete="off" maxlength="30" placeholder="Ej: 12 o T-04" />
        </label>
        <p class="text-sm text-on-surface-variant">Lo encuentras en la placa o tarjeta de tu mesa.</p>
      </section>

      <!-- Contacto (llego al local y delivery) -->
      <section
        v-if="checkout.mode === 'pickup' || checkout.mode === 'delivery'"
        class="space-y-3 rounded-2xl bg-surface-container-lowest p-4 ring-1 ring-outline-variant/40"
      >
        <h2 class="font-headline text-lg font-semibold text-on-surface">Tus datos</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block space-y-1">
            <span :class="labelClass">Nombre</span>
            <input v-model="checkout.contact.name" :class="inputClass" type="text" autocomplete="name" />
          </label>
          <label class="block space-y-1">
            <span :class="labelClass">Teléfono</span>
            <input v-model="checkout.contact.phone" :class="inputClass" type="tel" autocomplete="tel" placeholder="+51 999 999 999" />
          </label>
        </div>
      </section>

      <!-- Llego al local -->
      <section v-if="checkout.mode === 'pickup'" class="space-y-4 rounded-2xl bg-surface-container-lowest p-4 ring-1 ring-outline-variant/40">
        <div>
          <h2 class="font-headline text-lg font-semibold text-on-surface">¿A qué hora llegas?</h2>
          <p class="text-sm text-on-surface-variant">Tu pedido tarda unos {{ prepMinutes }} min en estar listo.</p>
        </div>

        <div class="grid grid-cols-2 gap-1 rounded-xl bg-surface-container p-1" role="radiogroup" aria-label="Dónde comerás">
          <button
            v-for="choice in [
              { value: true, label: 'Como en el local' },
              { value: false, label: 'Para llevar' },
            ]"
            :key="choice.label"
            type="button"
            role="radio"
            :aria-checked="checkout.pickup.eatIn === choice.value"
            class="font-label min-h-10 rounded-lg text-sm font-semibold transition-colors"
            :class="checkout.pickup.eatIn === choice.value ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant'"
            @click="checkout.pickup.eatIn = choice.value"
          >
            {{ choice.label }}
          </button>
        </div>

        <p v-if="arrivalSlots.length === 0" class="text-sm text-on-surface-variant">Ya no quedan horarios disponibles para hoy.</p>
        <div v-else class="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Hora de llegada">
          <button
            v-for="slot in arrivalSlots"
            :key="slot"
            type="button"
            role="radio"
            :aria-checked="checkout.pickup.arrivalTime === slot"
            class="font-label min-h-11 rounded-xl text-sm font-semibold tabular-nums transition-colors"
            :class="
              checkout.pickup.arrivalTime === slot
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            "
            @click="checkout.pickup.arrivalTime = slot"
          >
            {{ slot }}
          </button>
        </div>
        <p v-if="checkout.pickup.eatIn" class="text-xs text-on-surface-variant">
          Al llegar, escanea el QR de tu mesa o dale tu nombre al personal y te sirven.
        </p>
      </section>

      <!-- Delivery -->
      <section v-if="checkout.mode === 'delivery'" class="space-y-3 rounded-2xl bg-surface-container-lowest p-4 ring-1 ring-outline-variant/40">
        <h2 class="font-headline text-lg font-semibold text-on-surface">¿Dónde lo entregamos?</h2>
        <label class="block space-y-1">
          <span :class="labelClass">Dirección</span>
          <input v-model="checkout.delivery.address" :class="inputClass" type="text" autocomplete="street-address" placeholder="Calle, número, piso" />
        </label>
        <label class="block space-y-1">
          <span :class="labelClass">Referencia (opcional)</span>
          <input v-model="checkout.delivery.reference" :class="inputClass" type="text" placeholder="Ej: portón negro, timbre 3B" />
        </label>

        <div class="flex flex-wrap items-center gap-3">
          <BaseButton variant="secondary" :loading="locating" @click="shareLocation">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            Comprobar con mi ubicación
          </BaseButton>
          <span v-if="deliveryDistanceKm !== null" class="text-sm" :class="deliveryDistanceKm <= options.deliveryRadiusKm ? 'text-success' : 'text-error'">
            A {{ deliveryDistanceKm.toFixed(1) }} km ·
            {{ deliveryDistanceKm <= options.deliveryRadiusKm ? 'dentro de la zona de entrega' : 'fuera de la zona de entrega' }}
          </span>
          <span v-else-if="locationError" class="text-sm text-error">{{ locationError }}</span>
        </div>

        <ul class="space-y-1 rounded-xl bg-surface-container-low p-3 text-sm text-on-surface-variant">
          <li>Entregamos hasta {{ options.deliveryRadiusKm }} km de la sede.</li>
          <li>Envío: {{ formatMoney(options.deliveryFee, diner.currency) }}</li>
          <li v-if="options.minOrder > 0">Pedido mínimo: {{ formatMoney(options.minOrder, diner.currency) }}</li>
          <li>Llega en unos {{ prepMinutes + 20 }} min.</li>
        </ul>
      </section>

      <!-- Resumen -->
      <div class="sticky bottom-20 z-10 space-y-3 rounded-2xl bg-surface-container-lowest p-4 shadow-[0_-4px_24px_rgba(27,28,29,0.08)] ring-1 ring-outline-variant/30">
        <dl class="space-y-1 text-sm">
          <div class="flex justify-between text-on-surface-variant">
            <dt>Productos ({{ cart.itemCount }})</dt>
            <dd>{{ formatMoney(subtotal, diner.currency) }}</dd>
          </div>
          <div v-if="checkout.mode === 'delivery'" class="flex justify-between text-on-surface-variant">
            <dt>Envío</dt>
            <dd>{{ formatMoney(deliveryFee, diner.currency) }}</dd>
          </div>
          <div class="flex items-baseline justify-between pt-1">
            <dt class="font-semibold text-on-surface">Total</dt>
            <dd class="font-headline text-2xl font-semibold text-on-surface">{{ formatMoney(total, diner.currency) }}</dd>
          </div>
        </dl>
        <p v-if="showErrors && fulfillmentError" class="rounded-xl bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">
          {{ fulfillmentError }}
        </p>
        <BaseButton variant="primary" size="lg" block @click="continueToPayment">Continuar al pago</BaseButton>
      </div>
    </template>
  </div>
</template>
