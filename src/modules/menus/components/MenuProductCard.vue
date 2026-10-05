<script setup lang="ts">
import { computed } from 'vue'

import type { MenuProduct } from '@/modules/menus/types'
import { formatMoney } from '@/utils/money'

const props = defineProps<{
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

const priceLabel = computed(() => formatMoney(props.product.price, props.currency))
</script>

<template>
  <article
    class="flex gap-4 rounded-2xl bg-surface-container-lowest p-4 shadow-sm"
    :class="{ 'opacity-60': !product.isAvailable }"
  >
    <button type="button" class="shrink-0" aria-label="Ver detalle del producto" @click="emit('detail')">
      <img
        :alt="product.name"
        class="h-20 w-20 rounded-xl object-cover"
        :src="product.imageUrl"
        loading="lazy"
      />
    </button>
    <div class="flex min-w-0 flex-1 flex-col justify-between gap-2">
      <div>
        <div class="flex items-start justify-between gap-2">
          <button type="button" class="text-left" @click="emit('detail')">
            <h3 class="font-headline text-sm leading-snug font-semibold text-on-surface underline-offset-2 hover:underline">
              {{ product.name }}
            </h3>
          </button>
          <span class="font-label shrink-0 text-sm font-bold text-primary">{{ priceLabel }}</span>
        </div>
        <p class="mt-0.5 line-clamp-2 text-xs text-on-surface-variant">{{ product.description }}</p>
        <div v-if="product.tags.length > 0 || product.allergens.length > 0" class="mt-1.5 flex flex-wrap gap-1">
          <span
            v-for="tag in product.tags"
            :key="tag"
            class="font-label rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
          >
            {{ tag }}
          </span>
          <span
            v-for="allergen in product.allergens"
            :key="allergen"
            class="font-label rounded bg-surface-container px-1.5 py-0.5 text-[10px] font-medium text-on-surface-variant"
          >
            {{ allergen }}
          </span>
        </div>
      </div>

      <div class="flex items-center justify-end">
        <p v-if="!product.isAvailable" class="font-label text-[11px] font-semibold text-on-surface-variant uppercase">
          Agotado
        </p>
        <div v-else-if="orderable" class="flex items-center gap-3 rounded-full bg-surface-container px-1 py-1">
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-40"
            :disabled="quantity === 0"
            aria-label="Quitar unidad"
            @click="emit('decrease')"
          >
            −
          </button>
          <span class="font-label w-4 text-center text-sm font-bold text-on-surface">{{ quantity }}</span>
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:bg-primary-container"
            aria-label="Añadir unidad"
            @click="emit('increase')"
          >
            +
          </button>
        </div>
      </div>
    </div>
  </article>
</template>
