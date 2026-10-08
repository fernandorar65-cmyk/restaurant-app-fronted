<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'

import BaseButton from '@/components/base/BaseButton.vue'
import SkeletonBlock from '@/components/base/SkeletonBlock.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { employeeAreaLabel, employeeStatusLabel } from '@/modules/administration/admin-labels'
import type { EmployeeArea, EmployeeStatus } from '@/modules/administration/types'
import { changeStaffPassword, fetchStaffProfile, updateStaffProfile } from '@/modules/auth/api'
import ChangePasswordForm from '@/modules/auth/components/ChangePasswordForm.vue'
import { PERMISSIONS, permissionLabel } from '@/modules/auth/permissions'
import type { StaffProfile, StaffProfileDraft } from '@/modules/auth/types'
import { validateName } from '@/modules/auth/validation'
import { errorMessage } from '@/modules/orders/api'
import { useSessionStore } from '@/stores/session'
import { useToastStore } from '@/stores/toast'
import { getInitials } from '@/utils/string'
import { formatMonthYear } from '@/utils/time'

usePageTitle('Mi perfil')

const session = useSessionStore()
const toast = useToastStore()

const profile = ref<StaffProfile | null>(null)
const isLoading = ref(true)
const loadError = ref<string | null>(null)

const form = reactive<StaffProfileDraft>({ name: '', phone: null, jobTitle: null })
const formError = ref<string | null>(null)
const isSaving = ref(false)

const isOwner = computed(() => profile.value?.roleName === 'Propietario')

const isDirty = computed(() => {
  const current = profile.value
  return (
    current !== null &&
    (form.name.trim() !== current.name ||
      (form.phone?.trim() || null) !== current.phone ||
      (form.jobTitle?.trim() || null) !== current.jobTitle)
  )
})

/** Permisos en el orden del catálogo, para que se lean siempre igual. */
const grantedPermissions = computed(() => PERMISSIONS.filter((permission) => profile.value?.permissions.includes(permission)))

function fillForm(value: StaffProfile): void {
  form.name = value.name
  form.phone = value.phone
  form.jobTitle = value.jobTitle
}

function areaLabel(area: string): string {
  return employeeAreaLabel[area as EmployeeArea] ?? area
}

function statusLabel(status: string): string {
  return employeeStatusLabel[status as EmployeeStatus] ?? status
}

async function load(): Promise<void> {
  if (!session.user) {
    return
  }

  isLoading.value = true
  loadError.value = null

  try {
    profile.value = await fetchStaffProfile(session.user.id)
    fillForm(profile.value)
  } catch (error) {
    loadError.value = errorMessage(error, 'No pudimos cargar tu perfil.')
  } finally {
    isLoading.value = false
  }
}

async function save(): Promise<void> {
  formError.value = validateName(form.name) ?? null

  if (!session.user || formError.value) {
    return
  }

  isSaving.value = true

  try {
    await updateStaffProfile(session.user.id, form)
    // El nombre también aparece en el encabezado y la barra lateral.
    await session.refreshUser()
    await load()
    toast.show('Perfil actualizado', { tone: 'success' })
  } catch (error) {
    formError.value = errorMessage(error, 'No se pudo guardar tu perfil.')
  } finally {
    isSaving.value = false
  }
}

async function changePassword(current: string, next: string): Promise<void> {
  if (session.user) {
    await changeStaffPassword(session.user.id, current, next)
  }
}

onMounted(() => {
  void load()
})

const inputClass =
  'min-h-11 w-full rounded-xl bg-surface px-3 text-sm text-on-surface outline-none ring-1 ring-outline-variant/60 focus:ring-2 focus:ring-primary'
const cardClass = 'space-y-4 rounded-2xl bg-surface-container-lowest p-5 ring-1 ring-outline-variant/40'
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
    <SkeletonBlock v-if="isLoading" :rows="5" />

    <p v-else-if="loadError" class="rounded-2xl bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">
      {{ loadError }}
    </p>

    <template v-else-if="profile">
      <!-- Cabecera -->
      <section class="flex flex-wrap items-center gap-5 rounded-2xl bg-surface-container-lowest p-5 ring-1 ring-outline-variant/40">
        <span
          class="font-headline flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-semibold text-on-primary"
          aria-hidden="true"
        >
          {{ getInitials(profile.name) }}
        </span>
        <div class="min-w-0 flex-1">
          <p class="font-label text-xs font-semibold tracking-widest text-tertiary uppercase">
            {{ isOwner ? 'Dueño de restaurante' : 'Personal del restaurante' }}
          </p>
          <h1 class="font-headline truncate text-3xl font-semibold text-on-surface">{{ profile.name }}</h1>
          <p class="truncate text-sm text-on-surface-variant">
            {{ profile.jobTitle ?? profile.roleName ?? 'Sin cargo' }} · {{ profile.email }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <span v-if="profile.roleName" class="font-label rounded-full bg-primary-fixed px-3 py-1 text-xs font-semibold text-on-primary-fixed">
            Rol: {{ profile.roleName }}
          </span>
          <span v-if="profile.createdAt" class="font-label rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-on-surface-variant">
            Desde {{ formatMonthYear(profile.createdAt) }}
          </span>
        </div>
      </section>

      <div class="grid gap-6 lg:grid-cols-5">
        <div class="space-y-6 lg:col-span-3">
          <!-- Datos -->
          <form :class="cardClass" novalidate @submit.prevent="save">
            <h2 class="font-headline text-lg font-semibold text-on-surface">Datos de contacto</h2>
            <label class="block space-y-1">
              <span class="text-xs font-semibold text-on-surface-variant">Nombre</span>
              <input v-model="form.name" :class="inputClass" type="text" autocomplete="name" />
            </label>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="block space-y-1">
                <span class="text-xs font-semibold text-on-surface-variant">Cargo</span>
                <input v-model="form.jobTitle" :class="inputClass" type="text" placeholder="Ej: Fundador y propietario" />
              </label>
              <label class="block space-y-1">
                <span class="text-xs font-semibold text-on-surface-variant">Teléfono</span>
                <input v-model="form.phone" :class="inputClass" type="tel" autocomplete="tel" />
              </label>
            </div>
            <label class="block space-y-1">
              <span class="text-xs font-semibold text-on-surface-variant">Correo de acceso</span>
              <input :value="profile.email" :class="[inputClass, 'opacity-70']" type="email" disabled />
            </label>
            <p v-if="formError" class="rounded-xl bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">
              {{ formError }}
            </p>
            <BaseButton variant="primary" type="submit" :loading="isSaving" :disabled="!isDirty">Guardar cambios</BaseButton>
          </form>

          <!-- Seguridad -->
          <section :class="cardClass">
            <h2 class="font-headline text-lg font-semibold text-on-surface">Seguridad</h2>
            <ChangePasswordForm :submit="changePassword" />
          </section>
        </div>

        <div class="space-y-6 lg:col-span-2">
          <!-- Sedes -->
          <section :class="cardClass">
            <div class="flex items-baseline justify-between gap-2">
              <h2 class="font-headline text-lg font-semibold text-on-surface">{{ isOwner ? 'Mis restaurantes' : 'Mis sedes' }}</h2>
              <span v-if="profile.allRestaurants" class="font-label text-xs text-on-surface-variant">Toda la organización</span>
            </div>
            <p v-if="profile.restaurants.length === 0" class="text-sm text-on-surface-variant">Sin sedes asignadas.</p>
            <ul v-else class="space-y-2">
              <li v-for="site in profile.restaurants" :key="site.id">
                <RouterLink
                  :to="{ name: 'site-dashboard', params: { restaurantId: site.id } }"
                  class="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-container-low"
                >
                  <img :src="site.imageUrl" alt="" class="h-11 w-11 shrink-0 rounded-lg object-cover" />
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-semibold text-on-surface">{{ site.name }}</span>
                    <span class="block text-xs text-on-surface-variant">{{ site.city }}</span>
                  </span>
                  <span class="text-outline" aria-hidden="true">→</span>
                </RouterLink>
              </li>
            </ul>
          </section>

          <!-- Ficha de empleado -->
          <section v-if="profile.employee" :class="cardClass">
            <h2 class="font-headline text-lg font-semibold text-on-surface">Ficha de empleado</h2>
            <dl class="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt class="text-xs text-on-surface-variant">Área</dt>
                <dd class="font-semibold text-on-surface">{{ areaLabel(profile.employee.area) }}</dd>
              </div>
              <div>
                <dt class="text-xs text-on-surface-variant">Estado</dt>
                <dd class="font-semibold text-on-surface">{{ statusLabel(profile.employee.status) }}</dd>
              </div>
              <div v-if="profile.employee.restaurantName">
                <dt class="text-xs text-on-surface-variant">Sede</dt>
                <dd class="font-semibold text-on-surface">{{ profile.employee.restaurantName }}</dd>
              </div>
              <div v-if="profile.employee.hiredAt">
                <dt class="text-xs text-on-surface-variant">Ingreso</dt>
                <dd class="font-semibold text-on-surface">{{ formatMonthYear(profile.employee.hiredAt) }}</dd>
              </div>
            </dl>
          </section>

          <!-- Permisos -->
          <section :class="cardClass">
            <div>
              <h2 class="font-headline text-lg font-semibold text-on-surface">Qué puedes hacer</h2>
              <p class="text-sm text-on-surface-variant">Lo define tu rol; lo cambia un administrador.</p>
            </div>
            <p v-if="grantedPermissions.length === 0" class="text-sm text-on-surface-variant">Tu rol aún no tiene permisos.</p>
            <ul v-else class="space-y-2">
              <li v-for="permission in grantedPermissions" :key="permission" class="flex items-center gap-2 text-sm text-on-surface">
                <svg class="h-4 w-4 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                {{ permissionLabel[permission] }}
              </li>
            </ul>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>
