<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import BaseButton from '@/components/base/BaseButton.vue'
import BasePagination from '@/components/base/BasePagination.vue'
import SkeletonBlock from '@/components/base/SkeletonBlock.vue'
import { createExpense, deleteExpense, fetchExpenseCategories, fetchExpenses, updateExpense } from '@/modules/expenses/api'
import ExpenseCategoriesDialog from '@/modules/expenses/components/ExpenseCategoriesDialog.vue'
import ExpenseDialog from '@/modules/expenses/components/ExpenseDialog.vue'
import { EXPENSE_ICONS, expenseKindLabel, expensePaymentMethodLabel } from '@/modules/expenses/types'
import type { Expense, ExpenseCategory, ExpenseDraft, ExpenseKind } from '@/modules/expenses/types'
import { errorMessage } from '@/modules/orders/api'
import { useConfirmStore } from '@/stores/confirm'
import { useSessionStore } from '@/stores/session'
import { useToastStore } from '@/stores/toast'
import { formatMoney } from '@/utils/money'

/** Gastos de una sede por mes: insumos, sueldos, alquiler, servicios, etc. */
const props = defineProps<{
  restaurantId: string
  currency: string
}>()

const session = useSessionStore()
const toast = useToastStore()
const confirm = useConfirmStore()

const pad = (value: number) => String(value).padStart(2, '0')
const today = new Date()
const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

/** Mes visible, YYYY-MM. */
const month = ref(todayIso.slice(0, 7))
const isCurrentMonth = computed(() => month.value === todayIso.slice(0, 7))

function shiftMonth(value: string, delta: number): string {
  const [year, monthIndex] = value.split('-').map(Number) as [number, number]
  const date = new Date(year, monthIndex - 1 + delta, 1)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

function monthRange(value: string): { from: string; to: string } {
  const [year, monthIndex] = value.split('-').map(Number) as [number, number]
  const lastDay = new Date(year, monthIndex, 0).getDate()
  return { from: `${value}-01`, to: `${value}-${pad(lastDay)}` }
}

const monthLabel = computed(() => {
  const [year, monthIndex] = month.value.split('-').map(Number) as [number, number]
  const label = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(new Date(year, monthIndex - 1, 1))
  return label.charAt(0).toUpperCase() + label.slice(1)
})

const expenses = ref<Expense[]>([])
const categories = ref<ExpenseCategory[]>([])
const isLoading = ref(true)
const loadError = ref<string | null>(null)

async function load(): Promise<void> {
  const { from, to } = monthRange(month.value)
  loadError.value = null
  try {
    const [rows, list] = await Promise.all([fetchExpenses(props.restaurantId, from, to), fetchExpenseCategories()])
    expenses.value = rows
    categories.value = list
  } catch (error) {
    loadError.value = errorMessage(error, 'No se pudieron cargar los gastos.')
  } finally {
    isLoading.value = false
  }
}

watch([month, () => props.restaurantId], () => void load(), { immediate: true })

const categoryById = computed(() => new Map(categories.value.map((category) => [category.id, category])))
const categoryName = (id: string) => categoryById.value.get(id)?.name ?? 'Sin categoría'
const categoryIcon = (id: string) => EXPENSE_ICONS[categoryById.value.get(id)?.icon ?? 'dots']

// Categorías: se pueden agregar, editar y eliminar desde un diálogo.
const showCategories = ref(false)

// Resumen
const total = computed(() => expenses.value.reduce((sum, expense) => sum + expense.amount, 0))
const totalByKind = (kind: ExpenseKind) =>
  expenses.value.filter((expense) => expense.kind === kind).reduce((sum, expense) => sum + expense.amount, 0)

const breakdown = computed(() =>
  [...new Set(expenses.value.map((expense) => expense.category))].map((category) => {
    const items = expenses.value.filter((expense) => expense.category === category)
    const amount = items.reduce((sum, expense) => sum + expense.amount, 0)
    return { category, amount, count: items.length, share: total.value > 0 ? amount / total.value : 0 }
  })
    .sort((a, b) => b.amount - a.amount),
)

// Filtros
const categoryFilter = ref<string | 'all'>('all')
const kindFilter = ref<ExpenseKind | 'all'>('all')

const visible = computed(() =>
  expenses.value.filter(
    (expense) =>
      (categoryFilter.value === 'all' || expense.category === categoryFilter.value) &&
      (kindFilter.value === 'all' || expense.kind === kindFilter.value),
  ),
)
// Paginado: un mes con muchos insumos no debe volverse una lista interminable.
const page = ref(1)
const pageSize = ref(15)
watch([month, categoryFilter, kindFilter], () => (page.value = 1))
// Si al eliminar se vacía la última página, se retrocede a la anterior.
watch(
  () => visible.value.length,
  (length) => (page.value = Math.min(page.value, Math.max(1, Math.ceil(length / pageSize.value)))),
)
const shown = computed(() => visible.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))

// Al cambiar de página, si el inicio de la lista quedó fuera de vista, se vuelve a él.
const listSection = ref<HTMLElement | null>(null)
watch(page, () => {
  const top = listSection.value?.getBoundingClientRect().top ?? 0
  if (top < 0) listSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
})

const visibleTotal = computed(() => visible.value.reduce((sum, expense) => sum + expense.amount, 0))

function toggleCategory(category: string): void {
  categoryFilter.value = categoryFilter.value === category ? 'all' : category
}

function formatDay(date: string): string {
  const [year, monthIndex, day] = date.split('-').map(Number) as [number, number, number]
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(new Date(year, monthIndex - 1, day))
}

// Alta / edición
const dialog = ref<{ expense: Expense | null } | null>(null)
const saving = ref(false)

/** Para un mes pasado se sugiere el último día de ese mes; para el actual, hoy. */
const defaultDate = computed(() => (isCurrentMonth.value ? todayIso : monthRange(month.value).to))

async function save(draft: ExpenseDraft): Promise<void> {
  if (!dialog.value) return
  saving.value = true
  try {
    if (dialog.value.expense) {
      await updateExpense(dialog.value.expense.id, draft)
      toast.show('Gasto actualizado', { tone: 'success', durationMs: 3000 })
    } else {
      await createExpense(props.restaurantId, draft, session.user?.name ?? null)
      toast.show('Gasto registrado', { message: `${draft.description} · ${formatMoney(draft.amount, props.currency)}`, tone: 'success', durationMs: 3000 })
    }
    dialog.value = null
    if (draft.date.slice(0, 7) !== month.value) month.value = draft.date.slice(0, 7)
    else await load()
  } catch (error) {
    toast.show('No se pudo guardar el gasto', { message: errorMessage(error, 'Inténtalo de nuevo.'), tone: 'error' })
  } finally {
    saving.value = false
  }
}

async function remove(expense: Expense): Promise<void> {
  const ok = await confirm.ask({
    title: '¿Eliminar este gasto?',
    message: `${expense.description} · ${formatMoney(expense.amount, props.currency)}`,
    confirmLabel: 'Eliminar',
    tone: 'danger',
  })
  if (!ok) return
  try {
    await deleteExpense(expense.id)
    expenses.value = expenses.value.filter((item) => item.id !== expense.id)
    toast.show('Gasto eliminado', { tone: 'success', durationMs: 3000 })
  } catch (error) {
    toast.show('No se pudo eliminar el gasto', { message: errorMessage(error, 'Inténtalo de nuevo.'), tone: 'error' })
  }
}

// Copiar los gastos fijos del mes anterior (alquiler, sueldos…) para no cargarlos a mano.
const copying = ref(false)

async function copyFixedFromPreviousMonth(): Promise<void> {
  const previous = shiftMonth(month.value, -1)
  copying.value = true
  try {
    const range = monthRange(previous)
    const fixed = (await fetchExpenses(props.restaurantId, range.from, range.to)).filter((expense) => expense.kind === 'fixed')
    const key = (expense: Pick<Expense, 'category' | 'description'>) => `${expense.category}|${expense.description.trim().toLowerCase()}`
    const current = monthRange(month.value)
    const missing = async () => {
      const existing = new Set((await fetchExpenses(props.restaurantId, current.from, current.to)).map(key))
      return fixed.filter((expense) => !existing.has(key(expense)))
    }
    const pending = await missing()

    if (pending.length === 0) {
      toast.show(fixed.length === 0 ? 'El mes anterior no tiene gastos fijos' : 'Los gastos fijos ya están cargados', { durationMs: 3000 })
      return
    }

    // json-server puede perder una escritura que llega mientras recarga db.json: se comprueba y se reintenta.
    let left = pending
    for (let attempt = 0; attempt < 4 && left.length > 0; attempt++) {
      for (const expense of left) {
        const day = expense.date.slice(8, 10)
        const date = `${month.value}-${day}` > current.to ? current.to : `${month.value}-${day}`
        await createExpense(props.restaurantId, { ...expense, date }, session.user?.name ?? null)
      }
      await new Promise((resolve) => setTimeout(resolve, 400))
      left = await missing()
    }
    toast.show(`${pending.length} gastos fijos copiados`, { message: 'Revisa los importes por si cambiaron.', tone: 'success', durationMs: 4000 })
    await load()
  } catch (error) {
    toast.show('No se pudieron copiar los gastos', { message: errorMessage(error, 'Inténtalo de nuevo.'), tone: 'error' })
  } finally {
    copying.value = false
  }
}

const chipClass = (active: boolean) =>
  active ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
</script>

<template>
  <div class="space-y-5">
    <!-- Mes + acciones -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-1 rounded-xl bg-surface-container-lowest p-1 shadow-sm">
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container"
          aria-label="Mes anterior"
          @click="month = shiftMonth(month, -1)"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span class="font-headline min-w-36 text-center text-sm font-semibold text-on-surface" aria-live="polite">{{ monthLabel }}</span>
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container disabled:pointer-events-none disabled:opacity-30"
          aria-label="Mes siguiente"
          :disabled="isCurrentMonth"
          @click="month = shiftMonth(month, 1)"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      <div class="flex flex-wrap gap-2">
        <BaseButton variant="ghost" @click="showCategories = true">Categorías</BaseButton>
        <BaseButton variant="secondary" :loading="copying" @click="copyFixedFromPreviousMonth">Copiar fijos del mes anterior</BaseButton>
        <BaseButton variant="primary" @click="dialog = { expense: null }">+ Registrar gasto</BaseButton>
      </div>
    </div>

    <SkeletonBlock v-if="isLoading" variant="page" />
    <p v-else-if="loadError" class="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">{{ loadError }}</p>

    <template v-else>
      <!-- Resumen -->
      <dl class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div class="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
          <dt class="text-xs font-semibold text-on-surface-variant">Total del mes</dt>
          <dd class="font-headline mt-1 text-2xl font-semibold text-on-surface tabular-nums">{{ formatMoney(total, currency) }}</dd>
        </div>
        <div class="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
          <dt class="text-xs font-semibold text-on-surface-variant">Gastos fijos</dt>
          <dd class="font-headline mt-1 text-2xl font-semibold text-on-surface tabular-nums">{{ formatMoney(totalByKind('fixed'), currency) }}</dd>
        </div>
        <div class="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
          <dt class="text-xs font-semibold text-on-surface-variant">Gastos variables</dt>
          <dd class="font-headline mt-1 text-2xl font-semibold text-on-surface tabular-nums">{{ formatMoney(totalByKind('variable'), currency) }}</dd>
        </div>
        <div class="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
          <dt class="text-xs font-semibold text-on-surface-variant">Registros</dt>
          <dd class="font-headline mt-1 text-2xl font-semibold text-on-surface tabular-nums">{{ expenses.length }}</dd>
        </div>
      </dl>

      <div v-if="expenses.length === 0" class="rounded-2xl bg-surface-container-lowest p-8 text-center shadow-sm">
        <p class="font-headline text-base font-semibold text-on-surface">Sin gastos en {{ monthLabel.toLowerCase() }}</p>
        <p class="mt-1 text-sm text-on-surface-variant">Registra insumos, sueldos, alquiler y demás gastos de la sede.</p>
      </div>

      <div v-else class="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <!-- Por categoría -->
        <section class="h-fit space-y-3 rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
          <h2 class="font-label text-xs font-semibold tracking-wider text-outline uppercase">Por categoría</h2>
          <ul class="space-y-1">
            <li v-for="row in breakdown" :key="row.category">
              <button
                type="button"
                class="w-full space-y-1.5 rounded-xl px-2 py-2 text-left transition-colors"
                :class="categoryFilter === row.category ? 'bg-primary-fixed/50' : 'hover:bg-surface-container-low'"
                :aria-pressed="categoryFilter === row.category"
                @click="toggleCategory(row.category)"
              >
                <span class="flex items-center justify-between gap-2 text-sm">
                  <span class="font-semibold text-on-surface">{{ categoryName(row.category) }}</span>
                  <span class="text-on-surface tabular-nums">{{ formatMoney(row.amount, currency) }}</span>
                </span>
                <span class="flex items-center gap-2">
                  <span class="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container">
                    <span class="block h-full rounded-full bg-primary" :style="{ width: `${Math.max(2, row.share * 100)}%` }" />
                  </span>
                  <span class="w-9 text-right text-xs text-on-surface-variant tabular-nums">{{ Math.round(row.share * 100) }}%</span>
                </span>
              </button>
            </li>
          </ul>
        </section>

        <!-- Listado -->
        <section ref="listSection" class="min-w-0 scroll-mt-4 space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" class="font-label min-h-9 rounded-full px-3 text-sm font-semibold" :class="chipClass(categoryFilter === 'all')" @click="categoryFilter = 'all'">
              Todas
            </button>
            <button
              v-for="row in breakdown"
              :key="row.category"
              type="button"
              class="font-label min-h-9 rounded-full px-3 text-sm font-semibold"
              :class="chipClass(categoryFilter === row.category)"
              @click="toggleCategory(row.category)"
            >
              {{ categoryName(row.category) }}
            </button>
            <select
              v-model="kindFilter"
              class="ml-auto min-h-9 rounded-full bg-surface-container px-3 text-sm font-semibold text-on-surface-variant outline-none"
              aria-label="Tipo de gasto"
            >
              <option value="all">Fijos y variables</option>
              <option value="fixed">Solo fijos</option>
              <option value="variable">Solo variables</option>
            </select>
          </div>

          <p v-if="visible.length === 0" class="rounded-2xl bg-surface-container-lowest p-5 text-sm text-on-surface-variant shadow-sm">
            Ningún gasto coincide con los filtros.
          </p>

          <ul v-else class="divide-y divide-outline-variant/40 overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
            <li v-for="expense in shown" :key="expense.id" class="group flex items-center gap-3 px-4 py-3">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container text-on-surface-variant" aria-hidden="true">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7">
                  <path stroke-linecap="round" stroke-linejoin="round" :d="categoryIcon(expense.category)" />
                </svg>
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-on-surface">{{ expense.description }}</p>
                <p class="text-sm font-semibold text-on-surface tabular-nums sm:hidden">{{ formatMoney(expense.amount, currency) }}</p>
                <p class="truncate text-xs text-on-surface-variant">
                  {{ formatDay(expense.date) }} · {{ categoryName(expense.category) }}
                  <template v-if="expense.supplier"> · {{ expense.supplier }}</template>
                  · {{ expensePaymentMethodLabel[expense.paymentMethod] }}
                </p>
              </div>
              <span
                class="font-label hidden shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold sm:inline"
                :class="expense.kind === 'fixed' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'"
              >
                {{ expenseKindLabel[expense.kind] }}
              </span>
              <span class="hidden w-24 shrink-0 text-right text-sm font-semibold sm:inline text-on-surface tabular-nums">{{ formatMoney(expense.amount, currency) }}</span>
              <div class="flex shrink-0 gap-0.5">
                <button
                  type="button"
                  class="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  :aria-label="`Editar ${expense.description}`"
                  @click="dialog = { expense }"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-error-container hover:text-on-error-container"
                  :aria-label="`Eliminar ${expense.description}`"
                  @click="remove(expense)"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </li>
          </ul>
          <BasePagination v-if="visible.length > 0" v-model:page="page" v-model:page-size="pageSize" :total="visible.length" item-label="gastos" />
          <p v-if="categoryFilter !== 'all' || kindFilter !== 'all'" class="text-right text-sm text-on-surface-variant">
            Subtotal filtrado: <strong class="text-on-surface">{{ formatMoney(visibleTotal, currency) }}</strong>
          </p>
        </section>
      </div>
    </template>

    <ExpenseDialog
      v-if="dialog"
      :expense="dialog.expense"
      :categories="categories"
      :currency="currency"
      :default-date="defaultDate"
      :saving="saving"
      @close="dialog = null"
      @save="save"
      @manage-categories="showCategories = true"
    />

    <ExpenseCategoriesDialog v-if="showCategories" :categories="categories" @close="showCategories = false" @changed="load" />
  </div>
</template>
