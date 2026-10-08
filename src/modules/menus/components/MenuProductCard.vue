<script setup lang="ts">
import QuantityStepper from '@/modules/menus/components/QuantityStepper.vue'
import type { MenuProduct } from '@/modules/menus/types'
import { formatMoney } from '@/utils/money'

defineProps<{
  product: MenuProduct
  quantity: number
  currency: string
  /** false = carta en modo consulta (sin mesa confirmada): no se puede agregar al carrito. */
  orderable: boolean
}>()

const emit = defineEmits<{
  increase: []
  decrease: []
  detail: []
}>()
</script>

<template>
  <article
    class="flex gap-4 rounded-2xl bg-surface-container-lowest p-3 shadow-sm ring-1 ring-outline-variant/30 transition-shadow hover:shadow-md sm:p-4"
    :class="{ 'opacity-70': !product.isAvailable }"
  >
    <button type="button" class="relative shrink-0 overflow-hidden rounded-xl" :aria-label="`Ver detalle de ${product.name}`" @click="emit('detail')">
      <img :alt="product.name" class="h-24 w-24 object-cover sm:h-28 sm:w-28" :src="product.imageUrl" loading="lazy" />
      <span
        v-if="!product.isAvailable"
        class="font-label absolute inset-x-0 bottom-0 bg-on-surface/80 py-1 text-center text-xs font-semibold text-surface"
      >
        Agotado
      </span>
    </button>
    <div class="flex min-w-0 flex-1 flex-col gap-2">
      <button type="button" class="text-left" @click="emit('detail')">
        <h3 class="font-headline text-base leading-snug font-semibold text-on-surface">{{ product.name }}</h3>
        <p class="mt-0.5 line-clamp-2 text-sm text-on-surface-variant">{{ product.description }}</p>
      </button>
      <div v-if="product.tags.length > 0" class="flex flex-wrap gap-1">
        <span
          v-for="tag in product.tags"
          :key="tag"
          class="font-label rounded-full bg-primary-fixed/70 px-2 py-0.5 text-xs font-medium text-on-primary-fixed"
        >
          {{ tag }}
        </span>
      </div>
      <div class="mt-auto flex items-center justify-between gap-2">
        <span class="font-headline text-lg font-semibold text-on-surface">{{ formatMoney(product.price, currency) }}</span>
        <QuantityStepper
          v-if="orderable && product.isAvailable"
          :quantity="quantity"
          :label="product.name"
          @increase="emit('increase')"
          @decrease="emit('decrease')"
        />
      </div>
    </div>
  </article>
</template>
