<script setup lang="ts">
import BaseDialog from '@/components/base/BaseDialog.vue'
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
      <span class="font-headline text-xl font-semibold text-on-surface">{{ formatMoney(product.price, currency) }}</span>
      <span class="ml-auto">
        <span v-if="!product.isAvailable" class="font-label text-sm font-semibold text-on-surface-variant">Agotado</span>
        <QuantityStepper
          v-else-if="orderable"
          :quantity="quantity"
          :label="product.name"
          @increase="emit('increase')"
          @decrease="emit('decrease')"
        />
        <span v-else class="text-sm text-on-surface-variant">Escanea el QR de tu mesa para pedir</span>
      </span>
    </template>
  </BaseDialog>
</template>
