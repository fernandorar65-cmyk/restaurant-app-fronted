<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'

import MenuProductCard from '@/modules/menus/components/MenuProductCard.vue'
import type { MenuCategory, MenuProduct } from '@/modules/menus/types'

const props = defineProps<{
  menuName: string
  categories: MenuCategory[]
  products: MenuProduct[]
  currency: string
}>()

const emit = defineEmits<{
  close: []
}>()

const dialogEl = ref<HTMLDialogElement | null>(null)

/** Lo mismo que vería el comensal: solo productos activos y categorías con productos. */
const groups = computed(() =>
  props.categories
    .map((category) => ({
      category,
      items: props.products.filter((product) => product.categoryId === category.id && product.isActive),
    }))
    .filter((group) => group.items.length > 0),
)

onMounted(async () => {
  await nextTick()
  dialogEl.value?.showModal()
})
</script>

<template>
  <dialog
    ref="dialogEl"
    class="m-auto w-[min(100%-1.5rem,26rem)] overflow-hidden rounded-[2rem] border-8 border-on-surface bg-background p-0 text-on-surface shadow-2xl backdrop:bg-on-surface/45"
    aria-label="Vista previa de la carta"
    @close="emit('close')"
  >
    <div class="flex max-h-[85vh] flex-col">
      <header class="flex items-center justify-between gap-2 border-b border-outline-variant/50 px-4 py-3">
        <div>
          <p class="font-label text-[10px] font-bold tracking-widest text-primary uppercase">Vista del comensal</p>
          <p class="font-headline text-sm font-semibold">{{ menuName }}</p>
        </div>
        <button type="button" class="rounded-lg px-2 py-1 text-xs font-semibold hover:bg-surface-container" @click="dialogEl?.close()">
          Cerrar
        </button>
      </header>
      <div class="space-y-5 overflow-y-auto p-4">
        <p v-if="groups.length === 0" class="text-sm text-on-surface-variant">Este menú no tiene productos activos.</p>
        <section v-for="group in groups" :key="group.category.id" class="space-y-3">
          <h2 class="font-headline text-lg font-semibold">{{ group.category.name }}</h2>
          <MenuProductCard
            v-for="product in group.items"
            :key="product.id"
            :product="product"
            :quantity="0"
            :currency="currency"
            :orderable="false"
          />
        </section>
      </div>
    </div>
  </dialog>
</template>
