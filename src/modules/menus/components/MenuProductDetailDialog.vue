<script setup lang="ts">
import BaseDialog from '@/components/base/BaseDialog.vue'
import QuantityStepper from '@/modules/menus/components/QuantityStepper.vue'
import type { MenuProduct } from '@/modules/menus/types'
import { formatMoney } from '@/utils/money'

defineProps<{
  product: MenuProduct
  quantity: number
  currency: string
  /** false = carta de otra sede (el comensal tiene mesa en una distinta): no se puede agregar a la orden. */
  orderable: boolean
}>()

const emit = defineEmits<{
  close: []
  increase: []
  decrease: []
}>()
</script>

<template>
  <BaseDialog :title="product.name" size="sm" @close="emit('close')">
    <img :alt="product.name" class="aspect-[4/3] w-full rounded-2xl object-cover" :src="product.imageUrl" />

    <p class="text-base leading-relaxed text-on-surface-variant">{{ product.description }}</p>

    <div v-if="product.tags.length > 0 || product.allergens.length > 0" class="flex flex-wrap gap-1.5">
      <span
        v-for="tag in product.tags"
        :key="tag"
        class="font-label rounded-full bg-primary-fixed/70 px-2.5 py-0.5 text-xs font-medium text-on-primary-fixed"
      >
        {{ tag }}
      </span>
      <span
        v-for="allergen in product.allergens"
        :key="allergen"
        class="font-label rounded-full bg-surface-container px-2.5 py-0.5 text-xs font-medium text-on-surface-variant"
      >
        Contiene: {{ allergen }}
      </span>
    </div>

    <template #footer>
      <div v-if="!product.isAvailable" class="flex w-full items-center justify-between gap-3">
        <span class="font-headline text-xl font-semibold text-on-surface">{{ formatMoney(product.price, currency) }}</span>
        <span class="font-label rounded-full bg-surface-container px-3 py-1 text-sm font-semibold text-on-surface-variant">Agotado</span>
      </div>

      <button
        v-else-if="orderable && quantity === 0"
        type="button"
        class="font-label flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-primary px-5 text-base font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
        @click="emit('increase')"
      >
        <span class="flex items-center gap-2">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Agregar a la orden
        </span>
        <span>{{ formatMoney(product.price, currency) }}</span>
      </button>

      <div v-else-if="orderable" class="flex w-full items-center justify-between gap-3">
        <QuantityStepper :quantity="quantity" :label="product.name" @increase="emit('increase')" @decrease="emit('decrease')" />
        <span class="text-right">
          <span class="block text-xs text-on-surface-variant">En tu orden</span>
          <span class="font-headline text-xl font-semibold text-on-surface">{{ formatMoney(product.price * quantity, currency) }}</span>
        </span>
      </div>

      <span v-else class="font-headline text-xl font-semibold text-on-surface">{{ formatMoney(product.price, currency) }}</span>
    </template>
  </BaseDialog>
</template>
