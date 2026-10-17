<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

import BaseButton from '@/components/base/BaseButton.vue'
import BaseDialog from '@/components/base/BaseDialog.vue'
import { SUPPLY_CATEGORIES, SUPPLY_UNITS, supplyCategoryLabel } from '@/modules/inventory/types'
import type { Supply, SupplyDraft } from '@/modules/inventory/types'

/** Alta o edición de un insumo. El stock inicial se pide solo al crear; después cambia con movimientos. */
const props = defineProps<{
  item: Supply | null
  currency: string
  saving: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [draft: SupplyDraft]
}>()

const form = reactive<SupplyDraft>({
  name: props.item?.name ?? '',
  category: props.item?.category ?? 'produce',
  unit: props.item?.unit ?? 'kg',
  stock: props.item?.stock ?? 0,
  minStock: props.item?.minStock ?? 0,
  unitCost: props.item?.unitCost ?? 0,
  supplier: props.item?.supplier ?? '',
  isActive: props.item?.isActive ?? true,
})
const touched = ref(false)

const units = computed(() => (SUPPLY_UNITS.includes(form.unit as (typeof SUPPLY_UNITS)[number]) ? [...SUPPLY_UNITS] : [form.unit, ...SUPPLY_UNITS]))

const errors = computed(() => ({
  name: form.name.trim() ? null : 'Escribe el nombre del insumo.',
  stock: Number(form.stock) >= 0 ? null : 'El stock no puede ser negativo.',
  minStock: Number(form.minStock) >= 0 ? null : 'El mínimo no puede ser negativo.',
  unitCost: Number(form.unitCost) >= 0 ? null : 'El costo no puede ser negativo.',
}))

function submit(): void {
  touched.value = true
  if (Object.values(errors.value).some(Boolean)) return
  emit('save', { ...form, stock: Number(form.stock), minStock: Number(form.minStock), unitCost: Number(form.unitCost) })
}

const inputClass =
  'min-h-11 w-full rounded-xl bg-surface px-3 text-sm text-on-surface outline-none ring-1 ring-outline-variant/60 placeholder:text-outline focus:ring-2 focus:ring-primary'
const labelClass = 'text-xs font-semibold text-on-surface-variant'
</script>

<template>
  <BaseDialog :title="item ? 'Editar insumo' : 'Nuevo insumo'" size="md" @close="emit('close')">
    <form id="supply-form" class="space-y-4" novalidate @submit.prevent="submit">
      <label class="block space-y-1.5">
        <span :class="labelClass">Nombre</span>
        <input v-model="form.name" :class="inputClass" type="text" placeholder="Ej: Tomate pera, Aceite de oliva" />
        <span v-if="touched && errors.name" class="block text-xs text-error">{{ errors.name }}</span>
      </label>

      <div class="grid gap-3 sm:grid-cols-2">
        <label class="block space-y-1.5">
          <span :class="labelClass">Categoría</span>
          <select v-model="form.category" :class="inputClass">
            <option v-for="category in SUPPLY_CATEGORIES" :key="category" :value="category">{{ supplyCategoryLabel[category] }}</option>
          </select>
        </label>
        <label class="block space-y-1.5">
          <span :class="labelClass">Unidad de medida</span>
          <select v-model="form.unit" :class="inputClass">
            <option v-for="unit in units" :key="unit" :value="unit">{{ unit }}</option>
          </select>
        </label>
        <label v-if="!item" class="block space-y-1.5">
          <span :class="labelClass">Stock actual ({{ form.unit }})</span>
          <input v-model.number="form.stock" :class="inputClass" type="number" inputmode="decimal" min="0" step="any" />
          <span v-if="touched && errors.stock" class="block text-xs text-error">{{ errors.stock }}</span>
        </label>
        <label class="block space-y-1.5">
          <span :class="labelClass">Stock mínimo ({{ form.unit }})</span>
          <input v-model.number="form.minStock" :class="inputClass" type="number" inputmode="decimal" min="0" step="any" />
          <span v-if="touched && errors.minStock" class="block text-xs text-error">{{ errors.minStock }}</span>
          <span v-else class="block text-xs text-on-surface-variant">Por debajo de esto, avisa para reponer.</span>
        </label>
        <label class="block space-y-1.5">
          <span :class="labelClass">Costo por {{ form.unit }} ({{ currency }})</span>
          <input v-model.number="form.unitCost" :class="inputClass" type="number" inputmode="decimal" min="0" step="0.01" />
          <span v-if="touched && errors.unitCost" class="block text-xs text-error">{{ errors.unitCost }}</span>
        </label>
        <label class="block space-y-1.5">
          <span :class="labelClass">Proveedor habitual (opcional)</span>
          <input v-model="form.supplier" :class="inputClass" type="text" placeholder="Ej: Mercado Central" />
        </label>
      </div>

      <p v-if="item" class="rounded-xl bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
        El stock ({{ item.stock }} {{ item.unit }}) se modifica registrando entradas, salidas, mermas o conteos.
      </p>

      <label v-if="item" class="flex items-center gap-3 text-sm text-on-surface">
        <input v-model="form.isActive" type="checkbox" class="h-5 w-5 cursor-pointer rounded accent-primary" />
        Insumo activo
        <span class="text-xs text-on-surface-variant">(los inactivos no aparecen en el stock ni en las alertas)</span>
      </label>
    </form>

    <template #footer="{ close }">
      <BaseButton variant="ghost" @click="close">Cancelar</BaseButton>
      <BaseButton variant="primary" class="ml-auto" type="submit" form="supply-form" :loading="saving">
        {{ item ? 'Guardar cambios' : 'Crear insumo' }}
      </BaseButton>
    </template>
  </BaseDialog>
</template>
