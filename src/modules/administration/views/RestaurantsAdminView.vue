<script setup lang="ts">
import { onMounted, ref } from 'vue'

import SkeletonBlock from '@/components/base/SkeletonBlock.vue'
import AdminPageHeader from '@/components/base/AdminPageHeader.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { createRestaurant, fetchRestaurants, updateRestaurant, type NewRestaurantDraft } from '@/modules/restaurants/api'
import RestaurantEditDialog from '@/modules/restaurants/components/RestaurantEditDialog.vue'
import type { RestaurantOperationalStatus, RestaurantSite } from '@/modules/restaurants/types'
import { HttpError } from '@/services/http'

usePageTitle('Restaurantes')

const STATUS_LABELS: Record<RestaurantOperationalStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  suspended: 'Suspendido',
}

const STATUS_CLASS: Record<RestaurantOperationalStatus, string> = {
  active: 'bg-success-container text-on-success-container',
  inactive: 'bg-surface-container-high text-on-surface-variant',
  suspended: 'bg-error-container text-on-error-container',
}

const restaurants = ref<RestaurantSite[]>([])
const loadError = ref<string | null>(null)
const isLoading = ref(true)
/** undefined = diálogo cerrado · null = alta de sede. */
const editingRestaurant = ref<RestaurantSite | null | undefined>(undefined)
const actionError = ref<string | null>(null)

async function loadRestaurants(): Promise<void> {
  isLoading.value = true
  loadError.value = null

  try {
    restaurants.value = await fetchRestaurants()
  } catch (error) {
    loadError.value = error instanceof HttpError ? error.message : 'No se pudieron cargar las sedes.'
  } finally {
    isLoading.value = false
  }
}

async function saveRestaurant(draft: NewRestaurantDraft): Promise<void> {
  const original = editingRestaurant.value
  actionError.value = null

  try {
    if (original) {
      // El código de la sede no se edita una vez creada.
      const updated = await updateRestaurant(original.id, {
        name: draft.name,
        city: draft.city,
        address: draft.address,
        cuisine: draft.cuisine,
        status: draft.status,
        statusLabel: draft.statusLabel,
        category: draft.category,
        categoryLabel: draft.categoryLabel,
        currency: draft.currency,
        timezone: draft.timezone,
        imageUrl: draft.imageUrl,
      })
      restaurants.value = restaurants.value.map((restaurant) => (restaurant.id === updated.id ? updated : restaurant))
    } else {
      restaurants.value = [...restaurants.value, await createRestaurant(draft)]
    }

    editingRestaurant.value = undefined
  } catch {
    actionError.value = 'No se pudo guardar la sede.'
  }
}

onMounted(() => {
  void loadRestaurants()
})
</script>

<template>
  <div class="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 lg:px-8">
    <AdminPageHeader
      section="Restaurantes"
      title="Restaurantes"
      description="Sedes de la organización: datos generales, moneda, zona horaria y estado operativo."
    >
      <template #actions>
        <button
          type="button"
          class="font-label rounded-xl bg-primary min-h-11 px-4 py-2.5 text-sm font-semibold text-on-primary shadow-sm hover:bg-primary-container"
          @click="editingRestaurant = null"
        >
          + Sede
        </button>
      </template>
    </AdminPageHeader>

    <p v-if="actionError" class="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">
      {{ actionError }}
    </p>

    <SkeletonBlock v-if="isLoading" variant="page" />
    <p
      v-else-if="loadError"
      class="rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-on-error-container"
      role="alert"
    >
      {{ loadError }}
    </p>

    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <article v-for="restaurant in restaurants" :key="restaurant.id" class="space-y-3 rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="font-label text-xs font-semibold tracking-wide text-tertiary uppercase">{{ restaurant.code }}</p>
            <h2 class="font-headline text-lg font-semibold text-on-surface">{{ restaurant.name }}</h2>
            <p class="text-xs text-on-surface-variant">{{ restaurant.city }} · {{ restaurant.categoryLabel }}</p>
          </div>
          <button
            type="button"
            class="font-label shrink-0 rounded-lg bg-surface-container min-h-9 px-3 py-1.5 text-sm font-semibold text-on-surface hover:bg-surface-container-high"
            @click="editingRestaurant = restaurant"
          >
            Editar
          </button>
        </div>
        <p class="text-xs text-on-surface-variant">{{ restaurant.address }}</p>
        <p class="text-xs text-on-surface-variant">{{ restaurant.cuisine }}</p>
        <p class="text-xs text-on-surface-variant">Moneda {{ restaurant.currency }} · {{ restaurant.timezone }}</p>
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="font-label rounded-full px-2.5 py-0.5 text-xs font-bold uppercase" :class="STATUS_CLASS[restaurant.status]">
            {{ STATUS_LABELS[restaurant.status] }}
          </span>
          <span class="font-label inline-flex rounded-full bg-surface-container px-2.5 py-0.5 text-xs font-semibold text-primary">
            {{ restaurant.statusLabel }}
          </span>
        </div>
      </article>
    </div>

    <RestaurantEditDialog
      v-if="editingRestaurant !== undefined"
      :restaurant="editingRestaurant"
      @close="editingRestaurant = undefined"
      @save="saveRestaurant"
    />
  </div>
</template>
