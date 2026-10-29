<script setup lang="ts">
import { computed } from 'vue'

import type { RestaurantSite } from '@/modules/restaurants/types'
import { formatMoney } from '@/utils/money'

/** Fila de datos de servicio de la sede (envío, mínimo, recojo), al estilo de las apps de delivery. */
const props = defineProps<{
  site: RestaurantSite
}>()

interface InfoItem {
  key: string
  label: string
  icon: string
  highlight?: boolean
}

const ICON = {
  delivery:
    'M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12',
  minimum: 'M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z',
  pickup: 'M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z',
} as const

const items = computed<InfoItem[]>(() => {
  const { fulfillment, currency } = props.site
  const list: InfoItem[] = []

  if (fulfillment.delivery) {
    list.push(
      fulfillment.deliveryFee > 0
        ? { key: 'delivery', label: `Envío ${formatMoney(fulfillment.deliveryFee, currency)}`, icon: ICON.delivery }
        : { key: 'delivery', label: 'Envío gratis', icon: ICON.delivery, highlight: true },
    )

    if (fulfillment.minOrder > 0) {
      list.push({ key: 'minimum', label: `Mín. ${formatMoney(fulfillment.minOrder, currency)}`, icon: ICON.minimum })
    }
  }

  if (fulfillment.pickup) {
    list.push({ key: 'pickup', label: 'Recojo en local', icon: ICON.pickup })
  }

  return list
})
</script>

<template>
  <ul v-if="items.length > 0" class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-on-surface-variant">
    <li v-for="item in items" :key="item.key" class="inline-flex items-center gap-1" :class="{ 'font-semibold text-success': item.highlight }">
      <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
      </svg>
      {{ item.label }}
    </li>
  </ul>
</template>
