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
    <div class="relative">
      <img :alt="product.name" class="aspect-[4/3] w-full rounded-2xl object-cover" :src="product.imageUrl" />
      <div v-if="product.portion || product.prepMinutes" class="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
        <span
          v-if="product.prepMinutes"
          class="font-label inline-flex items-center gap-1.5 rounded-full bg-surface-container-lowest/95 px-3 py-1 text-xs font-semibold text-on-surface shadow-sm backdrop-blur"
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span><span class="sr-only">Tiempo de preparación: </span>{{ product.prepMinutes }} min</span>
        </span>
        <span
          v-if="product.portion"
          class="font-label inline-flex items-center gap-1.5 rounded-full bg-surface-container-lowest/95 px-3 py-1 text-xs font-semibold text-on-surface shadow-sm backdrop-blur"
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
            />
          </svg>
          {{ product.portion }}
        </span>
      </div>
    </div>

    <div v-if="product.tags.length > 0" class="flex flex-wrap gap-1.5">
      <span
        v-for="tag in product.tags"
        :key="tag"
        class="font-label rounded-full px-2.5 py-0.5 text-xs font-semibold"
        :class="tag === 'Recomendado chef' ? 'bg-tertiary-fixed/60 text-on-tertiary-container' : 'bg-surface-container text-on-surface-variant'"
      >
        {{ tag }}
      </span>
    </div>

    <p class="text-base leading-relaxed text-on-surface">{{ product.longDescription || product.description }}</p>

    <section v-if="product.ingredients.length > 0" class="space-y-2">
      <h3 class="font-label text-xs font-semibold tracking-wider text-outline uppercase">Ingredientes</h3>
      <ul class="flex flex-wrap gap-1.5">
        <li
          v-for="ingredient in product.ingredients"
          :key="ingredient"
          class="rounded-lg bg-surface-container-low px-2.5 py-1 text-sm text-on-surface ring-1 ring-outline-variant/40"
        >
          {{ ingredient }}
        </li>
      </ul>
    </section>

    <section v-if="product.presentation" class="space-y-2">
      <h3 class="font-label text-xs font-semibold tracking-wider text-outline uppercase">Presentación</h3>
      <p class="flex gap-3 rounded-xl bg-surface-container-low p-3 text-sm leading-relaxed text-on-surface-variant">
        <svg class="mt-0.5 h-5 w-5 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12"
          />
        </svg>
        {{ product.presentation }}
      </p>
    </section>

    <section v-if="product.allergens.length > 0" class="space-y-2">
      <h3 class="font-label text-xs font-semibold tracking-wider text-outline uppercase">Alérgenos</h3>
      <p class="flex items-start gap-2 text-sm text-on-surface-variant">
        <svg class="mt-0.5 h-4 w-4 shrink-0 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
        <span>Contiene <strong class="font-semibold text-on-surface">{{ product.allergens.join(', ') }}</strong>.</span>
      </p>
    </section>

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
