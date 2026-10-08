<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'

import { searchMenuSuggestions } from '@/modules/menus/api'
import type { MenuCategory, MenuProduct } from '@/modules/menus/types'
import { formatMoney } from '@/utils/money'
import { normalizeSearch } from '@/utils/string'

const props = defineProps<{
  restaurantId: string
  categories: MenuCategory[]
  /** Productos ya cargados de la carta: se usan para los recomendados con el campo vacío. */
  products: MenuProduct[]
  currency: string
}>()

const emit = defineEmits<{
  selectProduct: [product: MenuProduct]
  selectCategory: [categoryId: string]
}>()

const query = defineModel<string>({ required: true })

const DEBOUNCE_MS = 200
const listboxId = useId()

const isOpen = ref(false)
const isSearching = ref(false)
const hasError = ref(false)
const suggestions = ref<MenuProduct[]>([])
const activeIndex = ref(-1)
const root = ref<HTMLElement | null>(null)

let debounceTimer: number | undefined
let requestSeq = 0

const term = computed(() => query.value.trim())

/** Con el campo vacío: platos recomendados por el chef. */
const highlights = computed(() =>
  props.products.filter((product) => product.isAvailable && product.tags.includes('Recomendado chef')).slice(0, 4),
)

const categoryName = computed(() => new Map(props.categories.map((category) => [category.id, category.name])))

/** Solo se sugieren productos de categorías visibles en la carta. */
const visibleSuggestions = computed(() => suggestions.value.filter((product) => categoryName.value.has(product.categoryId)))

/** Opciones navegables con el teclado, en el orden en que se muestran. */
const options = computed<Array<{ kind: 'product'; product: MenuProduct } | { kind: 'category'; category: MenuCategory }>>(() =>
  term.value
    ? visibleSuggestions.value.map((product) => ({ kind: 'product', product }))
    : [
        ...highlights.value.map((product) => ({ kind: 'product' as const, product })),
        ...props.categories.map((category) => ({ kind: 'category' as const, category })),
      ],
)

function optionId(index: number): string {
  return `${listboxId}-option-${index}`
}

/** Parte el nombre en tramos para resaltar la coincidencia, ignorando tildes y mayúsculas. */
function highlight(text: string): Array<{ text: string; match: boolean }> {
  const needle = normalizeSearch(term.value)
  // Cada carácter se normaliza por separado, así los índices coinciden con el texto original.
  const haystack = Array.from(text, (char) => normalizeSearch(char) || char).join('')
  const start = needle ? haystack.indexOf(needle) : -1

  if (start === -1 || haystack.length !== text.length) {
    return [{ text, match: false }]
  }

  return [
    { text: text.slice(0, start), match: false },
    { text: text.slice(start, start + needle.length), match: true },
    { text: text.slice(start + needle.length), match: false },
  ].filter((part) => part.text)
}

async function runSearch(value: string): Promise<void> {
  const seq = ++requestSeq
  isSearching.value = true
  hasError.value = false

  try {
    const result = await searchMenuSuggestions(props.restaurantId, value)

    // Una respuesta vieja no pisa a una más reciente.
    if (seq === requestSeq) {
      suggestions.value = result
    }
  } catch {
    if (seq === requestSeq) {
      hasError.value = true
      suggestions.value = []
    }
  } finally {
    if (seq === requestSeq) {
      isSearching.value = false
    }
  }
}

watch(term, (value) => {
  window.clearTimeout(debounceTimer)
  activeIndex.value = -1

  if (!value) {
    requestSeq++
    suggestions.value = []
    isSearching.value = false
    return
  }

  isOpen.value = true
  isSearching.value = true
  debounceTimer = window.setTimeout(() => void runSearch(value), DEBOUNCE_MS)
})

function open(): void {
  isOpen.value = true
}

function close(): void {
  isOpen.value = false
  activeIndex.value = -1
}

function choose(index: number): void {
  const option = options.value[index]

  if (!option) {
    close()
    return
  }

  if (option.kind === 'product') {
    emit('selectProduct', option.product)
  } else {
    emit('selectCategory', option.category.id)
  }

  query.value = ''
  close()
}

function move(step: number): void {
  if (!isOpen.value) {
    open()
    return
  }

  const total = options.value.length

  if (total === 0) {
    return
  }

  activeIndex.value = (activeIndex.value + step + total) % total
  document.getElementById(optionId(activeIndex.value))?.scrollIntoView({ block: 'nearest' })
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    move(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    move(-1)
  } else if (event.key === 'Enter') {
    if (isOpen.value && activeIndex.value >= 0) {
      event.preventDefault()
      choose(activeIndex.value)
    } else {
      // Sin opción marcada: se queda con la lista filtrada.
      close()
    }
  } else if (event.key === 'Escape') {
    close()
  }
}

/* Cierra al hacer clic fuera del buscador. */
function onPointerDown(event: PointerEvent): void {
  if (root.value && !root.value.contains(event.target as Node)) {
    close()
  }
}

watch(isOpen, (value) => {
  if (value) {
    document.addEventListener('pointerdown', onPointerDown)
  } else {
    document.removeEventListener('pointerdown', onPointerDown)
  }
})

onBeforeUnmount(() => {
  window.clearTimeout(debounceTimer)
  document.removeEventListener('pointerdown', onPointerDown)
})
</script>

<template>
  <div ref="root" class="relative z-30">
    <label
      class="flex min-h-12 items-center gap-2.5 rounded-full bg-surface-container-lowest px-4 ring-1 ring-outline-variant/50 focus-within:ring-2 focus-within:ring-primary"
    >
      <svg class="h-5 w-5 shrink-0 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
      <span class="sr-only">Buscar producto</span>
      <input
        v-model="query"
        class="min-w-0 flex-1 bg-transparent text-base text-on-surface outline-none placeholder:text-outline [&::-webkit-search-cancel-button]:hidden"
        placeholder="Buscar un plato o bebida"
        type="search"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        :aria-expanded="isOpen"
        :aria-controls="listboxId"
        :aria-activedescendant="activeIndex >= 0 ? optionId(activeIndex) : undefined"
        @focus="open"
        @click="open"
        @keydown="onKeydown"
      />
      <svg
        v-if="isSearching"
        class="h-4 w-4 shrink-0 animate-spin text-outline"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" opacity="0.25" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
      </svg>
      <button
        v-else-if="query"
        type="button"
        class="-mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-outline hover:bg-surface-container hover:text-on-surface"
        aria-label="Borrar búsqueda"
        @click="query = ''"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </label>

    <div
      v-if="isOpen"
      :id="listboxId"
      role="listbox"
      aria-label="Sugerencias"
      class="absolute inset-x-0 top-full mt-2 max-h-[60vh] overflow-y-auto rounded-2xl bg-surface-container-lowest py-2 shadow-xl ring-1 ring-outline-variant/50"
    >
      <!-- Con texto: sugerencias de la API -->
      <template v-if="term">
        <p class="font-label px-4 pt-1 pb-2 text-xs font-semibold tracking-wider text-outline uppercase">Sugerencias</p>

        <p v-if="hasError" class="px-4 py-3 text-sm text-on-surface-variant">No pudimos buscar ahora. Inténtalo de nuevo.</p>
        <p v-else-if="!isSearching && visibleSuggestions.length === 0" class="px-4 py-3 text-sm text-on-surface-variant">
          Sin resultados para “{{ term }}”.
        </p>

        <button
          v-for="(product, index) in visibleSuggestions"
          :id="optionId(index)"
          :key="product.id"
          type="button"
          role="option"
          :aria-selected="activeIndex === index"
          class="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors"
          :class="activeIndex === index ? 'bg-surface-container-low' : 'hover:bg-surface-container-low'"
          @mouseenter="activeIndex = index"
          @click="choose(index)"
        >
          <img :src="product.imageUrl" alt="" class="h-11 w-11 shrink-0 rounded-lg object-cover" loading="lazy" />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm text-on-surface">
              <template v-for="(part, i) in highlight(product.name)" :key="i">
                <strong v-if="part.match" class="font-semibold text-primary">{{ part.text }}</strong>
                <template v-else>{{ part.text }}</template>
              </template>
            </span>
            <span class="block truncate text-xs text-on-surface-variant">
              {{ categoryName.get(product.categoryId) }}<template v-if="!product.isAvailable"> · Agotado</template>
            </span>
          </span>
          <span class="font-label shrink-0 text-sm font-semibold text-on-surface">{{ formatMoney(product.price, currency) }}</span>
        </button>
      </template>

      <!-- Sin texto: recomendados y categorías -->
      <template v-else>
        <template v-if="highlights.length > 0">
          <p class="font-label px-4 pt-1 pb-2 text-xs font-semibold tracking-wider text-outline uppercase">Recomendados</p>
          <button
            v-for="(product, index) in highlights"
            :id="optionId(index)"
            :key="product.id"
            type="button"
            role="option"
            :aria-selected="activeIndex === index"
            class="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors"
            :class="activeIndex === index ? 'bg-surface-container-low' : 'hover:bg-surface-container-low'"
            @mouseenter="activeIndex = index"
            @click="choose(index)"
          >
            <img :src="product.imageUrl" alt="" class="h-11 w-11 shrink-0 rounded-lg object-cover" loading="lazy" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium text-on-surface">{{ product.name }}</span>
              <span class="block truncate text-xs text-on-surface-variant">{{ categoryName.get(product.categoryId) }}</span>
            </span>
            <span class="font-label shrink-0 text-sm font-semibold text-on-surface">{{ formatMoney(product.price, currency) }}</span>
          </button>
        </template>

        <p class="font-label px-4 pt-3 pb-2 text-xs font-semibold tracking-wider text-outline uppercase">Categorías</p>
        <div class="flex flex-wrap gap-2 px-4 pb-2">
          <button
            v-for="(category, index) in categories"
            :id="optionId(highlights.length + index)"
            :key="category.id"
            type="button"
            role="option"
            :aria-selected="activeIndex === highlights.length + index"
            class="font-label min-h-9 rounded-full px-3.5 text-sm font-semibold transition-colors"
            :class="
              activeIndex === highlights.length + index
                ? 'bg-on-surface text-surface'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            "
            @mouseenter="activeIndex = highlights.length + index"
            @click="choose(highlights.length + index)"
          >
            {{ category.name }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
