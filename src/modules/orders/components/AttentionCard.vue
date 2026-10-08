<script setup lang="ts">
import { computed } from 'vue'

import StatusBadge from '@/components/base/StatusBadge.vue'
import { attentionStatusLabel, attentionStatusTone, isBillableProduct } from '@/modules/orders/order-status-labels'
import type { AttentionWithProducts } from '@/modules/orders/types'
import { formatMoney } from '@/utils/money'

const props = defineProps<{
  attention: AttentionWithProducts
  currency: string
}>()

const emit = defineEmits<{
  select: []
}>()

const billableProducts = computed(() => props.attention.products.filter((product) => isBillableProduct(product.status)))
const subtotal = computed(() => billableProducts.value.reduce((sum, p) => sum + p.subtotal, 0))
const pendingCount = computed(() => billableProducts.value.filter((p) => p.status === 'sent').length)
const readyCount = computed(() => billableProducts.value.filter((p) => p.status === 'ready').length)
</script>

<template>
  <button
    type="button"
    class="flex w-full flex-col gap-2 rounded-xl bg-surface-container-lowest p-3 text-left shadow-sm transition-shadow hover:shadow-md"
    @click="emit('select')"
  >
    <div class="flex items-center justify-between gap-2">
      <span class="font-headline text-sm font-bold text-on-surface">Mesa {{ attention.tableNumber }}</span>
      <StatusBadge :tone="attentionStatusTone[attention.status]" :label="attentionStatusLabel[attention.status]" />
    </div>
    <p class="line-clamp-2 text-xs text-on-surface-variant">
      {{ billableProducts.map((product) => `${product.quantity}× ${product.name}`).join(', ') || 'Sin productos' }}
    </p>
    <div class="flex items-center justify-between gap-2 text-xs">
      <span class="flex gap-2">
        <span v-if="pendingCount > 0" class="font-label font-semibold text-error">{{ pendingCount }} sin confirmar</span>
        <span v-if="readyCount > 0" class="font-label font-semibold text-success">{{ readyCount }} listos</span>
        <span v-if="pendingCount === 0 && readyCount === 0" class="text-on-surface-variant">{{ billableProducts.length }} productos</span>
      </span>
      <span class="font-label font-bold text-primary">{{ formatMoney(subtotal, currency) }}</span>
    </div>
  </button>
</template>
