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
  <!-- Fila de la lista de la carta: texto a la izquierda y foto con el botón "+" flotante a la derecha. -->
  <article class="group flex gap-3 py-4" :class="{ 'opacity-60': !product.isAvailable }">
    <button type="button" class="flex min-w-0 flex-1 flex-col gap-1 text-left" @click="emit('detail')">
      <span v-if="product.tags.includes('Recomendado chef')" class="font-label inline-flex items-center gap-1 text-xs font-bold text-tertiary">
        <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
        </svg>
        Recomendado
      </span>
      <h3 class="text-base leading-snug font-semibold text-on-surface">{{ product.name }}</h3>
      <p class="line-clamp-2 text-sm leading-snug text-on-surface-variant">{{ product.description }}</p>
      <span class="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1.5">
        <span class="font-label text-base font-bold text-on-surface tabular-nums">{{ formatMoney(product.price, currency) }}</span>
        <span
          v-for="tag in product.tags.filter((item) => item !== 'Recomendado chef')"
          :key="tag"
          class="font-label rounded-md bg-surface-container px-1.5 py-0.5 text-xs font-semibold text-on-surface-variant"
        >
          {{ tag }}
        </span>
      </span>
    </button>

    <div class="relative h-28 w-28 shrink-0 self-start sm:h-32 sm:w-32">
      <button
        type="button"
        class="relative h-full w-full overflow-hidden rounded-2xl bg-surface-container"
        :aria-label="`Ver detalle de ${product.name}`"
        @click="emit('detail')"
      >
        <img
          v-if="product.imageUrl"
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
      <div v-if="orderable && product.isAvailable" class="absolute -right-1.5 -bottom-3">
        <QuantityStepper
          variant="floating"
          :quantity="quantity"
          :label="product.name"
          @increase="emit('increase')"
          @decrease="emit('decrease')"
        />
      </div>
    </div>
  </article>
</template>
