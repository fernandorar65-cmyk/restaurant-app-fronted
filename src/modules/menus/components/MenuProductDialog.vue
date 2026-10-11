<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'

import { imageFileToDataUrl } from '@/modules/menus/api'
import type { MenuCategory, MenuProduct, MenuProductDraft } from '@/modules/menus/types'

const props = defineProps<{
  product: MenuProduct | null
  categories: MenuCategory[]
  defaultCategoryId: string | null
  currency: string
}>()

const emit = defineEmits<{
  close: []
  save: [draft: MenuProductDraft]
}>()

const dialogEl = ref<HTMLDialogElement | null>(null)
const name = ref(props.product?.name ?? '')
const description = ref(props.product?.description ?? '')
const price = ref(props.product?.price ?? 0)
const categoryId = ref(props.product?.categoryId ?? props.defaultCategoryId ?? props.categories[0]?.id ?? '')
const isAvailable = ref(props.product?.isAvailable ?? true)
const isActive = ref(props.product?.isActive ?? true)
const imageUrl = ref(props.product?.imageUrl ?? '')
const imageError = ref<string | null>(null)

async function onImageSelected(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0]
  imageError.value = null

  if (!file) {
    return
  }

  if (!file.type.startsWith('image/')) {
    imageError.value = 'Elige un archivo de imagen (JPG, PNG, WebP).'
    return
  }

  try {
    imageUrl.value = await imageFileToDataUrl(file)
  } catch (error) {
    imageError.value = error instanceof Error ? error.message : 'No se pudo cargar la imagen.'
  }
}
const tagsInput = ref(props.product?.tags.join(', ') ?? '')
const allergensInput = ref(props.product?.allergens.join(', ') ?? '')
const ingredientsInput = ref(props.product?.ingredients.join(', ') ?? '')
const portion = ref(props.product?.portion ?? '')
const presentation = ref(props.product?.presentation ?? '')
const longDescription = ref(props.product?.longDescription ?? '')
const prepMinutes = ref<number | ''>(props.product?.prepMinutes ?? '')

function closeDialog(): void {
  dialogEl.value?.close()
}

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function submit(): void {
  if (!name.value.trim() || !categoryId.value) {
    return
  }

  emit('save', {
    categoryId: categoryId.value,
    name: name.value.trim(),
    description: description.value.trim(),
    price: Number(price.value) || 0,
    imageUrl: imageUrl.value,
    isActive: isActive.value,
    isAvailable: isAvailable.value,
    tags: parseList(tagsInput.value),
    allergens: parseList(allergensInput.value),
    ingredients: parseList(ingredientsInput.value),
    portion: portion.value.trim(),
    presentation: presentation.value.trim(),
    longDescription: longDescription.value.trim(),
    prepMinutes: Number(prepMinutes.value) > 0 ? Math.round(Number(prepMinutes.value)) : null,
  })
}

onMounted(async () => {
  await nextTick()
  dialogEl.value?.showModal()
})
</script>

<template>
  <dialog
    ref="dialogEl"
    class="app-dialog overflow-hidden bg-surface-container-lowest p-0 text-on-surface" style="--dialog-width: 32rem"
    aria-labelledby="product-dialog-title"
    @close="emit('close')"
  >
    <form class="max-h-[85vh] space-y-4 overflow-y-auto p-6" @submit.prevent="submit">
      <h2 id="product-dialog-title" class="font-headline text-lg font-semibold text-on-surface">
        {{ product ? 'Editar producto' : 'Nuevo producto' }}
      </h2>

      <label class="block space-y-1.5">
        <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Nombre</span>
        <input
          v-model="name"
          class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          required
          type="text"
        />
      </label>

      <div class="flex items-center gap-3">
        <img
          v-if="imageUrl"
          :src="imageUrl"
          alt="Vista previa"
          class="h-16 w-16 shrink-0 rounded-xl object-cover"
        />
        <div v-else class="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-surface-container text-xs text-on-surface-variant">
          Sin foto
        </div>
        <label class="block flex-1 space-y-1">
          <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Foto</span>
          <input accept="image/*" class="block w-full text-xs text-on-surface-variant file:mr-2 file:rounded-lg file:border-0 file:bg-surface-container file:px-3 file:py-1.5 file:text-xs file:font-semibold" type="file" @change="onImageSelected" />
          <span v-if="imageError" class="block text-xs text-error">{{ imageError }}</span>
        </label>
      </div>

      <label class="block space-y-1.5">
        <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Descripción</span>
        <textarea
          v-model="description"
          class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          rows="2"
        />
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="block space-y-1.5">
          <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Precio ({{ currency }})</span>
          <input
            v-model.number="price"
            class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
            min="0"
            step="0.5"
            type="number"
          />
        </label>
        <label class="block space-y-1.5">
          <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Categoría</span>
          <select
            v-model="categoryId"
            class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          >
            <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
          </select>
        </label>
      </div>

      <label class="block space-y-1.5">
        <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">
          Etiquetas (separadas por coma)
        </span>
        <input
          v-model="tagsInput"
          class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          placeholder="Vegetariano, Recomendado chef"
          type="text"
        />
      </label>

      <label class="block space-y-1.5">
        <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">
          Alérgenos (separados por coma)
        </span>
        <input
          v-model="allergensInput"
          class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          placeholder="Gluten, Lácteos"
          type="text"
        />
      </label>

      <label class="block space-y-1.5">
        <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">
          Ingredientes (separados por coma)
        </span>
        <input
          v-model="ingredientsInput"
          class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          placeholder="Jamón ibérico, Leche entera, Harina de trigo"
          type="text"
        />
      </label>

      <label class="block space-y-1.5">
        <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">
          Descripción larga (detalle del plato)
        </span>
        <textarea
          v-model="longDescription"
          class="w-full rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          placeholder="Origen de los ingredientes, técnica, sabor y con qué combina."
          rows="4"
        />
      </label>

      <label class="block space-y-1.5">
        <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">
          Tiempo de preparación (minutos)
        </span>
        <input
          v-model="prepMinutes"
          class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          min="1"
          max="240"
          placeholder="15"
          type="number"
        />
      </label>

      <label class="block space-y-1.5">
        <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Porción</span>
        <input
          v-model="portion"
          class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          placeholder="6 unidades · Para compartir · 400 g"
          type="text"
        />
      </label>

      <label class="block space-y-1.5">
        <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Presentación</span>
        <textarea
          v-model="presentation"
          class="w-full rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          placeholder="Cómo llega a la mesa: emplatado, acompañamientos, recomendaciones."
          rows="3"
        />
      </label>

      <div class="space-y-2 rounded-xl bg-surface p-3">
        <label class="flex items-start gap-2">
          <input v-model="isActive" class="mt-0.5 h-4 w-4 rounded accent-primary" type="checkbox" />
          <span class="text-sm text-on-surface">
            Activo
            <span class="block text-xs text-on-surface-variant">Se muestra en la carta. Desmarca para ocultarlo sin borrarlo.</span>
          </span>
        </label>
        <label class="flex items-start gap-2">
          <input v-model="isAvailable" class="mt-0.5 h-4 w-4 rounded accent-primary" type="checkbox" />
          <span class="text-sm text-on-surface">
            Disponible
            <span class="block text-xs text-on-surface-variant">Se puede pedir. Si no, aparece como "Agotado".</span>
          </span>
        </label>
      </div>

      <div class="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          class="font-label rounded-xl bg-surface-container min-h-11 px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-high"
          @click="closeDialog"
        >
          Cancelar
        </button>
        <button
          type="submit"
          class="font-label rounded-xl bg-primary min-h-11 px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-container"
        >
          Guardar
        </button>
      </div>
    </form>
  </dialog>
</template>
