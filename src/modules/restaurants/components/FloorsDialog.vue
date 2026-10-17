<script setup lang="ts">
import { computed, ref } from 'vue'

import BaseButton from '@/components/base/BaseButton.vue'
import BaseDialog from '@/components/base/BaseDialog.vue'
import type { LiveTable, SiteFloor } from '@/modules/restaurants/types'
import { slugify } from '@/utils/string'

/**
 * Pisos de una sede: crear, renombrar y eliminar. Al eliminar un piso con mesas,
 * se elige a qué piso pasan; siempre queda al menos uno.
 */
const props = defineProps<{
  floors: SiteFloor[]
  tables: LiveTable[]
  saving: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [payload: { floors: SiteFloor[]; tables: LiveTable[] }]
}>()

const draft = ref<SiteFloor[]>(props.floors.map((floor) => ({ ...floor })))
/** Piso eliminado → piso que recibe sus mesas. */
const moves = ref<Record<string, string>>({})
const newName = ref('')
const error = ref<string | null>(null)

const tableCount = (floorId: string) => props.tables.filter((table) => table.floorId === floorId).length

function uniqueId(name: string): string {
  const base = slugify(name) || 'piso'
  let id = base
  for (let index = 2; draft.value.some((floor) => floor.id === id) || props.floors.some((floor) => floor.id === id); index++) id = `${base}-${index}`
  return id
}

function addFloor(): void {
  const name = newName.value.trim()
  error.value = null

  if (!name) return
  if (draft.value.some((floor) => floor.name.toLowerCase() === name.toLowerCase())) {
    error.value = `Ya existe un piso llamado "${name}".`
    return
  }

  draft.value.push({ id: uniqueId(name), name })
  newName.value = ''
}

function removeFloor(floor: SiteFloor): void {
  if (draft.value.length <= 1) return
  draft.value = draft.value.filter((item) => item.id !== floor.id)
  if (tableCount(floor.id) > 0) moves.value[floor.id] = draft.value[0]!.id
  // Si otro piso eliminado mandaba sus mesas a este, se redirigen.
  for (const [from, to] of Object.entries(moves.value)) if (to === floor.id) moves.value[from] = draft.value[0]!.id
}

const removedWithTables = computed(() =>
  props.floors.filter((floor) => !draft.value.some((item) => item.id === floor.id) && tableCount(floor.id) > 0),
)

function save(): void {
  error.value = null

  if (draft.value.some((floor) => !floor.name.trim())) {
    error.value = 'Todos los pisos necesitan un nombre.'
    return
  }

  const names = draft.value.map((floor) => floor.name.trim().toLowerCase())
  if (new Set(names).size !== names.length) {
    error.value = 'Hay dos pisos con el mismo nombre.'
    return
  }

  emit('save', {
    floors: draft.value.map((floor) => ({ ...floor, name: floor.name.trim() })),
    tables: props.tables.map((table) => (moves.value[table.floorId] ? { ...table, floorId: moves.value[table.floorId]! } : table)),
  })
}

const inputClass =
  'min-h-11 w-full rounded-xl bg-surface px-3 text-sm text-on-surface outline-none ring-1 ring-outline-variant/60 focus:ring-2 focus:ring-primary'
</script>

<template>
  <BaseDialog title="Pisos de la sede" subtitle="Organiza las mesas por planta, terraza o salón." size="sm" @close="emit('close')">
    <ul class="space-y-2">
      <li v-for="floor in draft" :key="floor.id" class="flex items-center gap-2">
        <input v-model="floor.name" :class="inputClass" type="text" :aria-label="`Nombre del piso ${floor.name}`" />
        <span class="w-16 shrink-0 text-right text-xs text-on-surface-variant">
          {{ tableCount(floor.id) }} {{ tableCount(floor.id) === 1 ? 'mesa' : 'mesas' }}
        </span>
        <button
          type="button"
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-on-surface-variant hover:bg-error-container hover:text-on-error-container disabled:pointer-events-none disabled:opacity-30"
          :disabled="draft.length <= 1"
          :aria-label="`Eliminar ${floor.name}`"
          :title="draft.length <= 1 ? 'La sede necesita al menos un piso' : 'Eliminar piso'"
          @click="removeFloor(floor)"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
            />
          </svg>
        </button>
      </li>
    </ul>

    <form class="flex gap-2" @submit.prevent="addFloor">
      <input v-model="newName" :class="inputClass" type="text" placeholder="Ej: Primer piso, Terraza" aria-label="Nombre del nuevo piso" />
      <BaseButton type="submit" variant="secondary" class="shrink-0">Agregar</BaseButton>
    </form>

    <!-- Pisos eliminados que tenían mesas: elegir a dónde pasan -->
    <div v-if="removedWithTables.length > 0" class="space-y-2 rounded-xl bg-warning-container p-3 text-sm text-on-warning-container">
      <p v-for="floor in removedWithTables" :key="floor.id" class="flex flex-wrap items-center gap-2">
        Las {{ tableCount(floor.id) }} mesas de <strong>{{ floor.name }}</strong> pasan a
        <select v-model="moves[floor.id]" class="min-h-9 rounded-lg bg-surface-container-lowest px-2 text-sm text-on-surface outline-none">
          <option v-for="target in draft" :key="target.id" :value="target.id">{{ target.name }}</option>
        </select>
      </p>
    </div>

    <p v-if="error" class="rounded-xl bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">{{ error }}</p>

    <template #footer="{ close }">
      <BaseButton variant="ghost" @click="close">Cancelar</BaseButton>
      <BaseButton variant="primary" class="ml-auto" :loading="saving" @click="save">Guardar pisos</BaseButton>
    </template>
  </BaseDialog>
</template>
