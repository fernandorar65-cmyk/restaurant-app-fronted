<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import BaseButton from '@/components/base/BaseButton.vue'
import BaseDialog from '@/components/base/BaseDialog.vue'
import { stockAfter } from '@/modules/inventory/api'
import { MOVEMENT_TYPES, movementTypeHint, movementTypeLabel, WASTE_REASONS } from '@/modules/inventory/types'
import type { MovementDraft, MovementType, Supply } from '@/modules/inventory/types'
import { formatMoney } from '@/utils/money'

/** Entrada, salida, merma o conteo físico de un insumo, con vista previa del stock resultante. */
const props = defineProps<{
  item: Supply
  initialType: MovementType
  currency: string
  saving: boolean
  /** Si quien registra puede crear gastos (permiso de cuentas). */
  canRegisterExpense: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [draft: MovementDraft]
}>()

const form = reactive<MovementDraft>({
  type: props.initialType,
  quantity: props.initialType === 'count' ? props.item.stock : 0,
  unitCost: props.item.unitCost || null,
  reason: '',
  supplier: props.item.supplier,
  registerExpense: props.canRegisterExpense,
})
const touched = ref(false)

// El conteo parte del stock actual; el resto, de cero.
watch(
  () => form.type,
  (type) => {
    form.quantity = type === 'count' ? props.item.stock : 0
    form.reason = type === 'waste' ? WASTE_REASONS[0] : ''
    touched.value = false
  },
  { immediate: true },
)

const quantity = computed(() => Number(form.quantity) || 0)
const nextStock = computed(() => stockAfter(props.item.stock, form.type, quantity.value))
const total = computed(() => (form.type === 'purchase' && form.unitCost ? Number(form.unitCost) * quantity.value : 0))
const format = (value: number) => new Intl.NumberFormat('es', { maximumFractionDigits: 3 }).format(value)

const errors = computed(() => ({
  quantity:
    form.type === 'count'
      ? quantity.value >= 0 && form.quantity !== null && String(form.quantity) !== ''
        ? null
        : 'Indica el stock contado.'
      : quantity.value > 0
        ? nextStock.value >= 0
          ? null
          : `Solo hay ${format(props.item.stock)} ${props.item.unit} en stock.`
        : 'La cantidad debe ser mayor que cero.',
  unitCost: form.type === 'purchase' && form.unitCost !== null && Number(form.unitCost) < 0 ? 'El costo no puede ser negativo.' : null,
}))

function submit(): void {
  touched.value = true
  if (Object.values(errors.value).some(Boolean)) return
  emit('save', {
    ...form,
    quantity: quantity.value,
    unitCost: form.type === 'purchase' && form.unitCost !== null && String(form.unitCost) !== '' ? Number(form.unitCost) : null,
    registerExpense: form.type === 'purchase' && form.registerExpense && total.value > 0,
  })
}

const inputClass =
  'min-h-11 w-full rounded-xl bg-surface px-3 text-sm text-on-surface outline-none ring-1 ring-outline-variant/60 placeholder:text-outline focus:ring-2 focus:ring-primary'
const labelClass = 'text-xs font-semibold text-on-surface-variant'
</script>

<template>
  <BaseDialog :title="item.name" :subtitle="`Stock actual: ${format(item.stock)} ${item.unit} · mínimo ${format(item.minStock)} ${item.unit}`" size="md" @close="emit('close')">
    <form id="movement-form" class="space-y-4" novalidate @submit.prevent="submit">
      <!-- Tipo -->
      <div class="grid grid-cols-2 gap-1 rounded-xl bg-surface-container p-1 sm:grid-cols-4" role="radiogroup" aria-label="Tipo de movimiento">
        <button
          v-for="type in MOVEMENT_TYPES"
          :key="type"
          type="button"
          role="radio"
          :aria-checked="form.type === type"
          class="font-label min-h-10 rounded-lg text-sm font-semibold transition-colors"
          :class="form.type === type ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'"
          @click="form.type = type"
        >
          {{ movementTypeLabel[type] }}
        </button>
      </div>
      <p class="-mt-2 text-xs text-on-surface-variant">{{ movementTypeHint[form.type] }}</p>

      <div class="grid gap-3 sm:grid-cols-2">
        <label class="block space-y-1.5">
          <span :class="labelClass">{{ form.type === 'count' ? 'Stock contado' : 'Cantidad' }} ({{ item.unit }})</span>
          <input v-model.number="form.quantity" :class="inputClass" type="number" inputmode="decimal" min="0" step="any" />
          <span v-if="touched && errors.quantity" class="block text-xs text-error">{{ errors.quantity }}</span>
        </label>

        <label v-if="form.type === 'purchase'" class="block space-y-1.5">
          <span :class="labelClass">Costo por {{ item.unit }} ({{ currency }})</span>
          <input v-model.number="form.unitCost" :class="inputClass" type="number" inputmode="decimal" min="0" step="0.01" />
          <span v-if="touched && errors.unitCost" class="block text-xs text-error">{{ errors.unitCost }}</span>
        </label>

        <label v-if="form.type === 'waste'" class="block space-y-1.5">
          <span :class="labelClass">Motivo</span>
          <select v-model="form.reason" :class="inputClass">
            <option v-for="reason in WASTE_REASONS" :key="reason" :value="reason">{{ reason }}</option>
          </select>
        </label>
      </div>

      <label v-if="form.type === 'purchase'" class="block space-y-1.5">
        <span :class="labelClass">Proveedor</span>
        <input v-model="form.supplier" :class="inputClass" type="text" placeholder="Ej: Mercado Central" />
      </label>

      <label class="block space-y-1.5">
        <span :class="labelClass">Nota (opcional)</span>
        <input
          v-if="form.type !== 'waste'"
          v-model="form.reason"
          :class="inputClass"
          type="text"
          :placeholder="form.type === 'purchase' ? 'Nº de factura o remito' : form.type === 'count' ? 'Ej: Inventario de cierre de mes' : 'Ej: Servicio de la noche'"
        />
        <span v-else class="block text-xs text-on-surface-variant">El motivo elegido queda registrado en el historial.</span>
      </label>

      <!-- Vista previa -->
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-container-low px-4 py-3">
        <p class="text-sm text-on-surface-variant">
          Stock
          <span class="font-semibold text-on-surface tabular-nums">{{ format(item.stock) }}</span>
          →
          <span class="font-semibold tabular-nums" :class="nextStock < 0 ? 'text-error' : nextStock < item.minStock ? 'text-warning' : 'text-on-surface'">
            {{ format(nextStock) }} {{ item.unit }}
          </span>
          <template v-if="form.type === 'count' && quantity !== item.stock">
            <span class="text-xs">({{ nextStock > item.stock ? '+' : '' }}{{ format(nextStock - item.stock) }} de diferencia)</span>
          </template>
        </p>
        <p v-if="form.type === 'purchase' && total > 0" class="text-sm text-on-surface-variant">
          Total <strong class="text-on-surface tabular-nums">{{ formatMoney(total, currency) }}</strong>
        </p>
      </div>

      <label v-if="form.type === 'purchase' && canRegisterExpense" class="flex items-start gap-3 text-sm text-on-surface">
        <input v-model="form.registerExpense" type="checkbox" class="mt-0.5 h-5 w-5 cursor-pointer rounded accent-primary" />
        <span>
          Registrar también como gasto
          <span class="block text-xs text-on-surface-variant">Se agrega en Cuentas → Gastos, categoría Insumos, con el total de la compra.</span>
        </span>
      </label>
    </form>

    <template #footer="{ close }">
      <BaseButton variant="ghost" @click="close">Cancelar</BaseButton>
      <BaseButton variant="primary" class="ml-auto" type="submit" form="movement-form" :loading="saving">
        Registrar {{ movementTypeLabel[form.type].toLowerCase() }}
      </BaseButton>
    </template>
  </BaseDialog>
</template>
