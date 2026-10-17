<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import BaseButton from '@/components/base/BaseButton.vue'
import BaseDialog from '@/components/base/BaseDialog.vue'
import { countExpensesByCategory, createExpenseCategory, deleteExpenseCategory, updateExpenseCategory } from '@/modules/expenses/api'
import { EXPENSE_ICONS, expenseKindLabel } from '@/modules/expenses/types'
import type { ExpenseCategory, ExpenseCategoryDraft, ExpenseIcon } from '@/modules/expenses/types'
import { errorMessage } from '@/modules/orders/api'
import { slugify } from '@/utils/string'

/**
 * Categorías de gasto de la organización: agregar, editar y eliminar.
 * Al eliminar una categoría con gastos, se elige a qué categoría pasan.
 */
const props = defineProps<{
  categories: ExpenseCategory[]
}>()

const emit = defineEmits<{
  close: []
  changed: []
}>()

const counts = ref<Map<string, number>>(new Map())
const busy = ref(false)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    counts.value = await countExpensesByCategory()
  } catch {
    // Sin conteo se puede seguir; al eliminar se pedirá destino igualmente.
  }
})

const usage = (id: string) => counts.value.get(id) ?? 0

// Formulario de alta / edición
const editingId = ref<string | null>(null)
const emptyForm = (): ExpenseCategoryDraft => ({ name: '', hint: '', defaultKind: 'variable', icon: 'dots' })
const form = reactive<ExpenseCategoryDraft>(emptyForm())

function startEdit(category: ExpenseCategory): void {
  editingId.value = category.id
  removing.value = null
  Object.assign(form, { name: category.name, hint: category.hint, defaultKind: category.defaultKind, icon: category.icon })
}

function resetForm(): void {
  editingId.value = null
  Object.assign(form, emptyForm())
}

function uniqueId(name: string): string {
  const base = slugify(name) || 'categoria'
  let id = base
  for (let index = 2; props.categories.some((category) => category.id === id); index++) id = `${base}-${index}`
  return id
}

async function submit(): Promise<void> {
  const name = form.name.trim()
  error.value = null

  if (!name) {
    error.value = 'La categoría necesita un nombre.'
    return
  }
  if (props.categories.some((category) => category.id !== editingId.value && category.name.toLowerCase() === name.toLowerCase())) {
    error.value = `Ya existe una categoría llamada "${name}".`
    return
  }

  busy.value = true
  try {
    if (editingId.value) await updateExpenseCategory(editingId.value, form)
    else await createExpenseCategory(uniqueId(name), form)
    resetForm()
    emit('changed')
  } catch (cause) {
    error.value = errorMessage(cause, 'No se pudo guardar la categoría.')
  } finally {
    busy.value = false
  }
}

// Eliminación
const removing = ref<{ category: ExpenseCategory; moveTo: string } | null>(null)
const otherCategories = computed(() => props.categories.filter((category) => category.id !== removing.value?.category.id))

function askRemove(category: ExpenseCategory): void {
  if (editingId.value === category.id) resetForm()
  const fallback = props.categories.find((item) => item.id !== category.id)
  removing.value = { category, moveTo: fallback?.id ?? '' }
}

async function confirmRemove(): Promise<void> {
  if (!removing.value) return
  const { category, moveTo } = removing.value
  busy.value = true
  error.value = null
  try {
    await deleteExpenseCategory(category.id, usage(category.id) > 0 ? moveTo : null)
    if (usage(category.id) > 0) {
      counts.value.set(moveTo, usage(moveTo) + usage(category.id))
      counts.value.delete(category.id)
    }
    removing.value = null
    emit('changed')
  } catch (cause) {
    error.value = errorMessage(cause, 'No se pudo eliminar la categoría.')
  } finally {
    busy.value = false
  }
}

const iconNames = Object.keys(EXPENSE_ICONS) as ExpenseIcon[]
const inputClass =
  'min-h-11 w-full rounded-xl bg-surface px-3 text-sm text-on-surface outline-none ring-1 ring-outline-variant/60 placeholder:text-outline focus:ring-2 focus:ring-primary'
const labelClass = 'text-xs font-semibold text-on-surface-variant'
</script>

<template>
  <BaseDialog title="Categorías de gasto" subtitle="Se comparten entre todas las sedes." size="md" @close="emit('close')">
    <ul class="divide-y divide-outline-variant/40 rounded-2xl ring-1 ring-outline-variant/40">
      <li v-for="category in categories" :key="category.id" class="space-y-2 px-3 py-2.5">
        <div class="flex items-center gap-3">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-container text-on-surface-variant" aria-hidden="true">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7">
              <path stroke-linecap="round" stroke-linejoin="round" :d="EXPENSE_ICONS[category.icon]" />
            </svg>
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-on-surface">{{ category.name }}</p>
            <p class="truncate text-xs text-on-surface-variant">
              {{ expenseKindLabel[category.defaultKind] }} · {{ usage(category.id) }} {{ usage(category.id) === 1 ? 'gasto' : 'gastos' }}
              <template v-if="category.hint"> · {{ category.hint }}</template>
            </p>
          </div>
          <button
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            :aria-label="`Editar ${category.name}`"
            @click="startEdit(category)"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
            </svg>
          </button>
          <button
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-error-container hover:text-on-error-container disabled:pointer-events-none disabled:opacity-30"
            :aria-label="`Eliminar ${category.name}`"
            :disabled="categories.length <= 1"
            :title="categories.length <= 1 ? 'Debe quedar al menos una categoría' : 'Eliminar categoría'"
            @click="askRemove(category)"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Confirmar eliminación -->
        <div v-if="removing?.category.id === category.id" class="space-y-2 rounded-xl bg-error-container/60 p-3 text-sm text-on-error-container">
          <p v-if="usage(category.id) > 0" class="flex flex-wrap items-center gap-2">
            Sus {{ usage(category.id) }} gastos pasan a
            <select v-model="removing.moveTo" class="min-h-9 rounded-lg bg-surface-container-lowest px-2 text-sm text-on-surface outline-none">
              <option v-for="target in otherCategories" :key="target.id" :value="target.id">{{ target.name }}</option>
            </select>
          </p>
          <p v-else>No tiene gastos registrados.</p>
          <div class="flex justify-end gap-2">
            <BaseButton variant="ghost" size="sm" @click="removing = null">Cancelar</BaseButton>
            <BaseButton variant="danger" size="sm" :loading="busy" @click="confirmRemove">Eliminar «{{ category.name }}»</BaseButton>
          </div>
        </div>
      </li>
    </ul>

    <!-- Alta / edición -->
    <form class="space-y-3 rounded-2xl bg-surface-container-low p-4" novalidate @submit.prevent="submit">
      <p class="font-label text-xs font-semibold tracking-wider text-outline uppercase">
        {{ editingId ? 'Editar categoría' : 'Nueva categoría' }}
      </p>
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="block space-y-1.5">
          <span :class="labelClass">Nombre</span>
          <input v-model="form.name" :class="inputClass" type="text" placeholder="Ej: Delivery, Seguros, Limpieza" />
        </label>
        <label class="block space-y-1.5">
          <span :class="labelClass">Tipo sugerido</span>
          <select v-model="form.defaultKind" :class="inputClass">
            <option value="fixed">Fijo</option>
            <option value="variable">Variable</option>
          </select>
        </label>
      </div>
      <label class="block space-y-1.5">
        <span :class="labelClass">Descripción (opcional)</span>
        <input v-model="form.hint" :class="inputClass" type="text" placeholder="Qué gastos entran aquí" />
      </label>
      <fieldset class="space-y-1.5">
        <legend :class="labelClass">Ícono</legend>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="icon in iconNames"
            :key="icon"
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-xl ring-1 transition"
            :class="form.icon === icon ? 'bg-primary-fixed/50 text-primary ring-2 ring-primary' : 'bg-surface text-on-surface-variant ring-outline-variant/50 hover:text-on-surface'"
            :aria-pressed="form.icon === icon"
            :aria-label="`Ícono ${icon}`"
            @click="form.icon = icon"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" :d="EXPENSE_ICONS[icon]" />
            </svg>
          </button>
        </div>
      </fieldset>
      <div class="flex justify-end gap-2">
        <BaseButton v-if="editingId" variant="ghost" @click="resetForm">Cancelar edición</BaseButton>
        <BaseButton type="submit" variant="secondary" :loading="busy && !removing">
          {{ editingId ? 'Guardar cambios' : 'Agregar categoría' }}
        </BaseButton>
      </div>
    </form>

    <p v-if="error" class="rounded-xl bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">{{ error }}</p>

    <template #footer="{ close }">
      <BaseButton variant="primary" class="ml-auto" @click="close">Listo</BaseButton>
    </template>
  </BaseDialog>
</template>
