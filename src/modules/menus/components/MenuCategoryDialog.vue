<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'

import type { MenuCategory, MenuCategoryDraft } from '@/modules/menus/types'

const props = defineProps<{
  category: MenuCategory | null
}>()

const emit = defineEmits<{
  close: []
  save: [draft: MenuCategoryDraft]
}>()

const dialogEl = ref<HTMLDialogElement | null>(null)
const name = ref(props.category?.name ?? '')
const description = ref(props.category?.description ?? '')

function closeDialog(): void {
  dialogEl.value?.close()
}

function submit(): void {
  if (!name.value.trim()) {
    return
  }

  emit('save', { name: name.value.trim(), description: description.value.trim() })
}

onMounted(async () => {
  await nextTick()
  dialogEl.value?.showModal()
})
</script>

<template>
  <dialog
    ref="dialogEl"
    class="app-dialog overflow-hidden bg-surface-container-lowest p-0 text-on-surface" style="--dialog-width: 26rem"
    aria-labelledby="category-dialog-title"
    @close="emit('close')"
  >
    <form class="space-y-4 p-6" @submit.prevent="submit">
      <h2 id="category-dialog-title" class="font-headline text-lg font-semibold text-on-surface">
        {{ category ? 'Editar categoría' : 'Nueva categoría' }}
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

      <label class="block space-y-1.5">
        <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Descripción</span>
        <textarea
          v-model="description"
          class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          rows="2"
        />
      </label>

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
