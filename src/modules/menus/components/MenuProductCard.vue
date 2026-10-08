<script setup lang="ts">
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
  increase: []
  decrease: []
  detail: []
}>()
</script>

<template>
  <article
    class="group flex gap-4 rounded-2xl bg-surface-container-lowest p-3 ring-1 ring-outline-variant/40 transition hover:ring-outline-variant"
    :class="{ 'opacity-60': !product.isAvailable }"
  >
    <div class="flex min-w-0 flex-1 flex-col gap-1.5 py-1 pl-1">
      <button type="button" class="text-left" @click="emit('detail')">
        <h3 class="font-headline text-[1.0625rem] leading-snug font-semibold text-on-surface">{{ product.name }}</h3>
        <p class="mt-1 line-clamp-2 text-sm leading-relaxed text-on-surface-variant">{{ product.description }}</p>
      </button>
      <div v-if="product.tags.length > 0" class="flex flex-wrap gap-1">
        <span
          v-for="tag in product.tags"
          :key="tag"
          class="font-label inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold"
          :class="
            tag === 'Recomendado chef'
              ? 'bg-tertiary-fixed/60 text-on-tertiary-container'
              : 'bg-surface-container text-on-surface-variant'
          "
        >
          <svg v-if="tag === 'Recomendado chef'" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
          </svg>
          {{ tag }}
        </span>
      </div>
      <div class="mt-auto flex items-center justify-between gap-2 pt-1">
        <span class="font-label text-base font-bold text-on-surface">{{ formatMoney(product.price, currency) }}</span>
        <QuantityStepper
          v-if="orderable && product.isAvailable"
          :quantity="quantity"
          :label="product.name"
          @increase="emit('increase')"
          @decrease="emit('decrease')"
        />
      </div>
    </div>
    <button
      type="button"
      class="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-surface-container sm:h-32 sm:w-32"
      :aria-label="`Ver detalle de ${product.name}`"
      @click="emit('detail')"
    >
      <img
        :alt="product.name"
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        :src="product.imageUrl"
        loading="lazy"
      />
      <span
        v-if="!product.isAvailable"
        class="font-label absolute inset-x-0 bottom-0 bg-on-surface/80 py-1 text-center text-xs font-semibold text-surface"
      >
        Agotado
      </span>
    </button>
  </article>
</template>
