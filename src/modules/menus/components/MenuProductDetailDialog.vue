<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'

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
  close: []
  increase: []
  decrease: []
}>()

const dialogEl = ref<HTMLDialogElement | null>(null)

function closeDialog(): void {
  dialogEl.value?.close()
}

onMounted(async () => {
  await nextTick()
  dialogEl.value?.showModal()
})
</script>

<template>
  <dialog
    ref="dialogEl"
    class="m-auto w-[min(100%-1.5rem,28rem)] overflow-hidden rounded-2xl bg-surface-container-lowest p-0 text-on-surface shadow-[0_24px_64px_rgba(27,28,29,0.18)] backdrop:bg-on-surface/45"
    aria-labelledby="product-detail-title"
    @close="emit('close')"
  >
    <div class="flex max-h-[min(90vh,700px)] flex-col">
      <div class="relative h-48 w-full shrink-0 bg-on-surface/80">
        <img :alt="product.name" class="h-full w-full object-cover" :src="product.imageUrl" />
        <button
          type="button"
          class="absolute top-3 right-3 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
          aria-label="Cerrar"
          @click="closeDialog"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="space-y-4 overflow-y-auto p-5">
        <div class="flex items-start justify-between gap-3">
          <h2 id="product-detail-title" class="font-headline text-xl font-semibold text-on-surface">{{ product.name }}</h2>
          <span class="font-label shrink-0 text-lg font-bold text-primary">{{ formatMoney(product.price, currency) }}</span>
        </div>

        <p class="text-sm leading-relaxed text-on-surface-variant">{{ product.description }}</p>

        <div v-if="product.tags.length > 0" class="space-y-1.5">
          <p class="font-label text-[10px] font-semibold tracking-wider text-on-surface-variant uppercase">Etiquetas</p>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="tag in product.tags"
              :key="tag"
              class="font-label rounded bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary"
            >
              {{ tag }}
            </span>
          </div>
        </div>

        <div v-if="product.allergens.length > 0" class="space-y-1.5">
          <p class="font-label text-[10px] font-semibold tracking-wider text-on-surface-variant uppercase">Alérgenos</p>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="allergen in product.allergens"
              :key="allergen"
              class="font-label rounded bg-surface-container px-2 py-1 text-[11px] font-medium text-on-surface-variant"
            >
              {{ allergen }}
            </span>
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-outline-variant/50 pt-4">
          <p v-if="!product.isAvailable" class="font-label text-xs font-semibold text-on-surface-variant uppercase">
            Agotado
          </p>
          <div v-else-if="orderable" class="flex items-center gap-3 rounded-full bg-surface-container px-1.5 py-1.5">
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-40"
              :disabled="quantity === 0"
              aria-label="Quitar unidad"
              @click="emit('decrease')"
            >
              −
            </button>
            <span class="font-label w-5 text-center text-sm font-bold text-on-surface">{{ quantity }}</span>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:bg-primary-container"
              aria-label="Añadir unidad"
              @click="emit('increase')"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  </dialog>
</template>
