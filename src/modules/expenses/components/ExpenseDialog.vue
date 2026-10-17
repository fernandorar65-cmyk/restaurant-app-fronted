<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

import BaseButton from '@/components/base/BaseButton.vue'
import BaseDialog from '@/components/base/BaseDialog.vue'
import { EXPENSE_ICONS, expenseKindLabel, expensePaymentMethodLabel } from '@/modules/expenses/types'
import type { Expense, ExpenseCategory, ExpenseDraft, ExpenseKind, ExpensePaymentMethod } from '@/modules/expenses/types'

/** Alta o edición de un gasto de la sede. */
const props = defineProps<{
  /** null = gasto nuevo. */
  expense: Expense | null
  categories: ExpenseCategory[]
  currency: string
  /** Fecha sugerida para un gasto nuevo (YYYY-MM-DD). */
  defaultDate: string
  saving: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [draft: ExpenseDraft]
  manageCategories: []
}>()

const firstCategory = props.categories[0]

const form = reactive<ExpenseDraft>({
  category: props.expense?.category ?? firstCategory?.id ?? '',
  kind: props.expense?.kind ?? firstCategory?.defaultKind ?? 'variable',
  description: props.expense?.description ?? '',
  amount: props.expense?.amount ?? 0,
  date: props.expense?.date ?? props.defaultDate,
  supplier: props.expense?.supplier ?? '',
  paymentMethod: props.expense?.paymentMethod ?? 'transfer',
  notes: props.expense?.notes ?? '',
})
const touched = ref(false)
/** Si la persona eligió el tipo a mano, cambiar de categoría ya no lo pisa. */
let kindChosenByUser = Boolean(props.expense)

const selectedCategory = computed(() => props.categories.find((category) => category.id === form.category) ?? null)

function chooseCategory(category: ExpenseCategory): void {
  form.category = category.id
  if (!kindChosenByUser) form.kind = category.defaultKind
}

function chooseKind(kind: ExpenseKind): void {
  form.kind = kind
  kindChosenByUser = true
}

const errors = computed(() => ({
  category: selectedCategory.value ? null : 'Elige una categoría.',
  description: form.description.trim() ? null : 'Describe el gasto.',
  amount: Number(form.amount) > 0 ? null : 'El importe debe ser mayor que cero.',
  date: form.date ? null : 'Indica la fecha.',
}))

function submit(): void {
  touched.value = true
  if (Object.values(errors.value).some(Boolean)) return
  emit('save', { ...form, amount: Number(form.amount), supplier: form.supplier?.trim() || null })
}

const inputClass =
  'min-h-11 w-full rounded-xl bg-surface px-3 text-sm text-on-surface outline-none ring-1 ring-outline-variant/60 placeholder:text-outline focus:ring-2 focus:ring-primary'
const labelClass = 'text-xs font-semibold text-on-surface-variant'
</script>

<template>
  <BaseDialog :title="expense ? 'Editar gasto' : 'Registrar gasto'" size="md" @close="emit('close')">
    <form id="expense-form" class="space-y-4" novalidate @submit.prevent="submit">
      <!-- Categoría -->
      <fieldset class="space-y-2">
        <legend class="flex w-full items-center justify-between gap-2">
          <span :class="labelClass">Categoría</span>
          <button type="button" class="text-xs font-semibold text-primary hover:underline" @click="emit('manageCategories')">
            Gestionar categorías
          </button>
        </legend>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            v-for="category in categories"
            :key="category.id"
            type="button"
            class="flex flex-col items-start gap-1.5 rounded-xl p-2.5 text-left ring-1 transition"
            :class="form.category === category.id ? 'bg-primary-fixed/50 ring-2 ring-primary' : 'ring-outline-variant/50 hover:bg-surface-container-low'"
            :aria-pressed="form.category === category.id"
            @click="chooseCategory(category)"
          >
            <svg class="h-5 w-5" :class="form.category === category.id ? 'text-primary' : 'text-on-surface-variant'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" :d="EXPENSE_ICONS[category.icon]" />
            </svg>
            <span class="text-sm font-semibold text-on-surface">{{ category.name }}</span>
          </button>
        </div>
        <p v-if="selectedCategory?.hint" class="text-xs text-on-surface-variant">{{ selectedCategory.hint }}</p>
        <span v-if="touched && errors.category" class="block text-xs text-error">{{ errors.category }}</span>
      </fieldset>

      <!-- Tipo -->
      <div class="space-y-1.5">
        <span :class="labelClass">Tipo de gasto</span>
        <div class="grid grid-cols-2 gap-1 rounded-xl bg-surface-container p-1" role="radiogroup" aria-label="Tipo de gasto">
          <button
            v-for="kind in (['fixed', 'variable'] as const)"
            :key="kind"
            type="button"
            role="radio"
            :aria-checked="form.kind === kind"
            class="font-label min-h-10 rounded-lg text-sm font-semibold transition-colors"
            :class="form.kind === kind ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'"
            @click="chooseKind(kind)"
          >
            {{ expenseKindLabel[kind] }}
            <span class="block text-[0.6875rem] font-normal text-on-surface-variant">
              {{ kind === 'fixed' ? 'Se repite cada mes' : 'Depende del movimiento' }}
            </span>
          </button>
        </div>
      </div>

      <label class="block space-y-1.5">
        <span :class="labelClass">Descripción</span>
        <input v-model="form.description" :class="inputClass" type="text" :placeholder="selectedCategory ? `Ej: ${selectedCategory.hint || selectedCategory.name}` : 'Describe el gasto'" />
        <span v-if="touched && errors.description" class="block text-xs text-error">{{ errors.description }}</span>
      </label>

      <div class="grid gap-3 sm:grid-cols-2">
        <label class="block space-y-1.5">
          <span :class="labelClass">Importe ({{ currency }})</span>
          <input v-model.number="form.amount" :class="inputClass" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0,00" />
          <span v-if="touched && errors.amount" class="block text-xs text-error">{{ errors.amount }}</span>
        </label>
        <label class="block space-y-1.5">
          <span :class="labelClass">Fecha</span>
          <input v-model="form.date" :class="inputClass" type="date" />
          <span v-if="touched && errors.date" class="block text-xs text-error">{{ errors.date }}</span>
        </label>
        <label class="block space-y-1.5">
          <span :class="labelClass">Proveedor o beneficiario (opcional)</span>
          <input v-model="form.supplier" :class="inputClass" type="text" placeholder="Ej: Mercado Central, Iberdrola" />
        </label>
        <label class="block space-y-1.5">
          <span :class="labelClass">Pagado con</span>
          <select v-model="form.paymentMethod" :class="inputClass">
            <option v-for="(label, method) in expensePaymentMethodLabel" :key="method" :value="method as ExpensePaymentMethod">{{ label }}</option>
          </select>
        </label>
      </div>

      <label class="block space-y-1.5">
        <span :class="labelClass">Notas (opcional)</span>
        <textarea v-model="form.notes" :class="[inputClass, 'py-2']" rows="2" placeholder="Nº de factura, detalle, etc." />
      </label>
    </form>

    <template #footer="{ close }">
      <BaseButton variant="ghost" @click="close">Cancelar</BaseButton>
      <BaseButton variant="primary" class="ml-auto" type="submit" form="expense-form" :loading="saving">
        {{ expense ? 'Guardar cambios' : 'Registrar gasto' }}
      </BaseButton>
    </template>
  </BaseDialog>
</template>
