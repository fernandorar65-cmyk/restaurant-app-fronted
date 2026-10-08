<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import BaseButton from '@/components/base/BaseButton.vue'
import SkeletonBlock from '@/components/base/SkeletonBlock.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import ChangePasswordForm from '@/modules/auth/components/ChangePasswordForm.vue'
import { validateName } from '@/modules/auth/validation'
import { changeCustomerPassword, fetchCustomerProfile, updateCustomerProfile } from '@/modules/diners/api'
import { ALLERGEN_OPTIONS, DIETARY_PREFERENCES } from '@/modules/diners/types'
import type { CustomerProfile, CustomerProfileDraft } from '@/modules/diners/types'
import { errorMessage, fetchAttentionsByCustomer } from '@/modules/orders/api'
import { useDinerStore } from '@/stores/diner'
import { useToastStore } from '@/stores/toast'
import { getInitials } from '@/utils/string'
import { formatMonthYear } from '@/utils/time'

usePageTitle('Mi perfil')

const diner = useDinerStore()
const toast = useToastStore()
const router = useRouter()

const profile = ref<CustomerProfile | null>(null)
const visits = ref<{ count: number; sites: number } | null>(null)
const isLoading = ref(true)
const loadError = ref<string | null>(null)

const form = reactive<CustomerProfileDraft>({
  name: '',
  phone: null,
  birthday: null,
  dietaryPreferences: [],
  allergens: [],
  marketingOptIn: false,
})
const formError = ref<string | null>(null)
const isSaving = ref(false)

const isDirty = computed(() => {
  const current = profile.value

  if (!current) {
    return false
  }

  return (
    form.name.trim() !== current.name ||
    (form.phone?.trim() || null) !== current.phone ||
    (form.birthday || null) !== current.birthday ||
    form.marketingOptIn !== current.marketingOptIn ||
    form.dietaryPreferences.join() !== current.dietaryPreferences.join() ||
    form.allergens.join() !== current.allergens.join()
  )
})

function fillForm(value: CustomerProfile): void {
  form.name = value.name
  form.phone = value.phone
  form.birthday = value.birthday
  form.dietaryPreferences = [...value.dietaryPreferences]
  form.allergens = [...value.allergens]
  form.marketingOptIn = value.marketingOptIn
}

/** Agrega o quita una opción manteniendo el orden de la lista de opciones. */
function toggle(list: 'dietaryPreferences' | 'allergens', value: string, options: readonly string[]): void {
  const selected = new Set(form[list])

  if (selected.has(value)) {
    selected.delete(value)
  } else {
    selected.add(value)
  }

  form[list] = options.filter((option) => selected.has(option))
}

async function load(): Promise<void> {
  const customer = diner.customer

  if (!customer) {
    return
  }

  isLoading.value = true
  loadError.value = null

  try {
    const [loaded, attentions] = await Promise.all([
      fetchCustomerProfile(customer.id),
      fetchAttentionsByCustomer(customer.id).catch(() => []),
    ])
    profile.value = loaded
    fillForm(loaded)
    visits.value = { count: attentions.length, sites: new Set(attentions.map((item) => item.restaurantId)).size }
  } catch (error) {
    loadError.value = errorMessage(error, 'No pudimos cargar tu perfil.')
  } finally {
    isLoading.value = false
  }
}

async function save(): Promise<void> {
  const customer = diner.customer
  formError.value = validateName(form.name) ?? null

  if (!customer || formError.value) {
    return
  }

  isSaving.value = true

  try {
    const saved = await updateCustomerProfile(customer.id, form)
    profile.value = saved
    fillForm(saved)
    diner.setCustomer({ id: saved.id, name: saved.name, email: saved.email })
    toast.show('Perfil actualizado', { tone: 'success' })
  } catch (error) {
    formError.value = errorMessage(error, 'No se pudo guardar tu perfil.')
  } finally {
    isSaving.value = false
  }
}

async function changePassword(current: string, next: string): Promise<void> {
  if (diner.customer) {
    await changeCustomerPassword(diner.customer.id, current, next)
  }
}

async function logout(): Promise<void> {
  diner.setCustomer(null)
  await router.push({ name: 'home' })
}

onMounted(() => {
  if (!diner.customer) {
    void router.replace({ name: 'diner-auth', query: { redirect: '/perfil' } })
    return
  }

  void load()
})

const inputClass =
  'min-h-11 w-full rounded-xl bg-surface px-3 text-sm text-on-surface outline-none ring-1 ring-outline-variant/60 focus:ring-2 focus:ring-primary'
const cardClass = 'space-y-4 rounded-2xl bg-surface-container-lowest p-4 ring-1 ring-outline-variant/40 sm:p-5'
</script>

<template>
  <div class="space-y-5 pb-8">
    <SkeletonBlock v-if="isLoading" :rows="4" />

    <p v-else-if="loadError" class="rounded-2xl bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">
      {{ loadError }}
    </p>

    <template v-else-if="profile">
      <!-- Cabecera -->
      <section class="flex items-center gap-4">
        <span
          class="font-headline flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-semibold text-on-primary"
          aria-hidden="true"
        >
          {{ getInitials(profile.name) }}
        </span>
        <div class="min-w-0">
          <p class="font-label text-xs font-semibold tracking-widest text-tertiary uppercase">Cliente</p>
          <h1 class="font-headline truncate text-2xl font-semibold text-on-surface">{{ profile.name }}</h1>
          <p class="truncate text-sm text-on-surface-variant">
            {{ profile.email }}<template v-if="profile.createdAt"> · Desde {{ formatMonthYear(profile.createdAt) }}</template>
          </p>
        </div>
      </section>

      <!-- Actividad -->
      <section v-if="visits" class="grid grid-cols-2 gap-3">
        <div class="rounded-2xl bg-surface-container-lowest p-4 ring-1 ring-outline-variant/40">
          <p class="font-headline text-2xl font-semibold text-on-surface">{{ visits.count }}</p>
          <p class="text-xs text-on-surface-variant">{{ visits.count === 1 ? 'Visita' : 'Visitas' }}</p>
        </div>
        <div class="rounded-2xl bg-surface-container-lowest p-4 ring-1 ring-outline-variant/40">
          <p class="font-headline text-2xl font-semibold text-on-surface">{{ visits.sites }}</p>
          <p class="text-xs text-on-surface-variant">{{ visits.sites === 1 ? 'Restaurante' : 'Restaurantes' }}</p>
        </div>
        <RouterLink
          :to="{ name: 'diner-visits' }"
          class="col-span-2 flex min-h-11 items-center justify-between rounded-2xl px-4 text-sm font-semibold text-primary ring-1 ring-outline-variant/40 hover:bg-surface-container-low"
        >
          Ver mis visitas
          <span aria-hidden="true">→</span>
        </RouterLink>
      </section>

      <form class="space-y-5" novalidate @submit.prevent="save">
        <!-- Datos personales -->
        <section :class="cardClass">
          <h2 class="font-headline text-lg font-semibold text-on-surface">Datos personales</h2>
          <label class="block space-y-1">
            <span class="text-xs font-semibold text-on-surface-variant">Nombre</span>
            <input v-model="form.name" :class="inputClass" type="text" autocomplete="name" />
          </label>
          <label class="block space-y-1">
            <span class="text-xs font-semibold text-on-surface-variant">Correo</span>
            <input :value="profile.email" :class="[inputClass, 'opacity-70']" type="email" disabled />
          </label>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block space-y-1">
              <span class="text-xs font-semibold text-on-surface-variant">Teléfono</span>
              <input v-model="form.phone" :class="inputClass" type="tel" autocomplete="tel" placeholder="+51 999 999 999" />
            </label>
            <label class="block space-y-1">
              <span class="text-xs font-semibold text-on-surface-variant">Cumpleaños</span>
              <input v-model="form.birthday" :class="inputClass" type="date" />
            </label>
          </div>
        </section>

        <!-- Preferencias -->
        <section :class="cardClass">
          <div>
            <h2 class="font-headline text-lg font-semibold text-on-surface">Preferencias alimentarias</h2>
            <p class="text-sm text-on-surface-variant">Te ayudarán a encontrar platos para ti.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="option in DIETARY_PREFERENCES"
              :key="option"
              type="button"
              class="font-label min-h-10 rounded-full px-4 text-sm font-semibold transition-colors"
              :class="
                form.dietaryPreferences.includes(option)
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              "
              :aria-pressed="form.dietaryPreferences.includes(option)"
              @click="toggle('dietaryPreferences', option, DIETARY_PREFERENCES)"
            >
              {{ option }}
            </button>
          </div>

          <div class="pt-1">
            <h3 class="text-sm font-semibold text-on-surface">Alergias</h3>
            <p class="text-sm text-on-surface-variant">Avisa al restaurante de lo que no puedes comer.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="option in ALLERGEN_OPTIONS"
              :key="option"
              type="button"
              class="font-label min-h-10 rounded-full px-4 text-sm font-semibold transition-colors"
              :class="
                form.allergens.includes(option)
                  ? 'bg-error-container text-on-error-container'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              "
              :aria-pressed="form.allergens.includes(option)"
              @click="toggle('allergens', option, ALLERGEN_OPTIONS)"
            >
              {{ option }}
            </button>
          </div>
        </section>

        <!-- Comunicaciones -->
        <section :class="cardClass">
          <label class="flex cursor-pointer items-center justify-between gap-4">
            <span>
              <span class="block font-semibold text-on-surface">Promociones y novedades</span>
              <span class="block text-sm text-on-surface-variant">Recibe ofertas de los restaurantes que visitas.</span>
            </span>
            <input v-model="form.marketingOptIn" type="checkbox" class="peer sr-only" />
            <span
              class="relative h-7 w-12 shrink-0 rounded-full bg-surface-container-high transition-colors peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary after:absolute after:top-1 after:left-1 after:h-5 after:w-5 after:rounded-full after:bg-surface-container-lowest after:shadow after:transition-transform peer-checked:after:translate-x-5"
              aria-hidden="true"
            />
          </label>
        </section>

        <p v-if="formError" class="rounded-xl bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">
          {{ formError }}
        </p>
        <BaseButton variant="primary" size="lg" block type="submit" :loading="isSaving" :disabled="!isDirty">
          Guardar cambios
        </BaseButton>
      </form>

      <!-- Seguridad -->
      <section :class="cardClass">
        <h2 class="font-headline text-lg font-semibold text-on-surface">Seguridad</h2>
        <ChangePasswordForm :submit="changePassword" />
      </section>

      <BaseButton variant="danger-soft" size="lg" block @click="logout">Cerrar sesión</BaseButton>
    </template>
  </div>
</template>
