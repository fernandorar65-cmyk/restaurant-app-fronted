<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import SkeletonBlock from '@/components/base/SkeletonBlock.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { fetchOrganizations, updateOrganization } from '@/modules/restaurants/api'
import type { Organization } from '@/modules/restaurants/types'
import { HttpError } from '@/services/http'

usePageTitle('Configuración')

const organization = ref<Organization | null>(null)
const name = ref('')
const code = ref('')
const loadError = ref<string | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)
const saveSuccess = ref(false)

async function loadOrganization(): Promise<void> {
  isLoading.value = true
  loadError.value = null

  try {
    const organizations = await fetchOrganizations()
    organization.value = organizations[0] ?? null
    name.value = organization.value?.name ?? ''
    code.value = organization.value?.code ?? ''
  } catch (error) {
    loadError.value = error instanceof HttpError ? error.message : 'No se pudo cargar la organización.'
  } finally {
    isLoading.value = false
  }
}

async function save(): Promise<void> {
  if (!organization.value) {
    return
  }

  isSaving.value = true
  saveSuccess.value = false

  try {
    organization.value = await updateOrganization(organization.value.id, { name: name.value.trim(), code: code.value.trim() })
    saveSuccess.value = true
  } catch (error) {
    loadError.value = error instanceof HttpError ? error.message : 'No se pudo guardar la configuración.'
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  void loadOrganization()
})
</script>

<template>
  <div class="mx-auto w-full max-w-2xl space-y-6 px-6 py-8 lg:px-12">
    <nav class="font-label flex flex-wrap items-center gap-2 text-xs font-semibold tracking-widest text-on-surface-variant uppercase" aria-label="Migas">
      <RouterLink class="transition-colors hover:text-primary" :to="{ name: 'admin-home' }">Administración</RouterLink>
      <span class="text-outline-variant">/</span>
      <span class="font-bold text-primary">Configuración</span>
    </nav>

    <div>
      <h1 class="font-headline text-2xl font-semibold tracking-tight text-on-surface sm:text-3xl">Configuración de organización</h1>
      <p class="mt-1 text-sm text-on-surface-variant">Datos generales de la cadena.</p>
    </div>

    <SkeletonBlock v-if="isLoading" variant="page" />
    <p
      v-else-if="loadError"
      class="rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-on-error-container"
      role="alert"
    >
      {{ loadError }}
    </p>

    <form v-else class="space-y-4 rounded-2xl bg-surface-container-lowest p-6 shadow-sm" @submit.prevent="save">
      <label class="block space-y-1.5">
        <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Nombre de la organización</span>
        <input
          v-model="name"
          class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          required
          type="text"
        />
      </label>

      <label class="block space-y-1.5">
        <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Código</span>
        <input
          v-model="code"
          class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          required
          type="text"
        />
      </label>

      <p v-if="saveSuccess" class="rounded-lg bg-success-container px-3 py-2 text-sm font-semibold text-on-success-container">
        Configuración guardada.
      </p>

      <button
        type="submit"
        class="font-label rounded-xl bg-primary min-h-11 px-4 py-2.5 text-sm font-semibold text-on-primary shadow-sm hover:bg-primary-container disabled:opacity-60"
        :disabled="isSaving"
      >
        {{ isSaving ? 'Guardando…' : 'Guardar cambios' }}
      </button>
    </form>
  </div>
</template>
