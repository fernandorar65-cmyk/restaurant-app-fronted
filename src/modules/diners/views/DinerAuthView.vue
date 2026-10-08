<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { usePageTitle } from '@/composables/usePageTitle'
import { validateEmail, validateName, validatePassword } from '@/modules/auth/validation'
import { loginCustomer, registerCustomer } from '@/modules/diners/api'
import { errorMessage } from '@/modules/orders/api'
import { useDinerStore } from '@/stores/diner'

usePageTitle('Mi cuenta')

const route = useRoute()
const router = useRouter()
const diner = useDinerStore()

const mode = ref<'login' | 'register'>('login')
const form = reactive({ name: '', email: '', password: '' })
const formError = ref<string | null>(null)
const isSubmitting = ref(false)

const redirectTarget = computed(() => {
  const value = route.query.redirect
  return typeof value === 'string' && value.startsWith('/') ? value : null
})

async function goBack(): Promise<void> {
  await router.push(redirectTarget.value ?? (diner.isReadyToOrder ? { name: 'menu' } : { name: 'diner-visits' }))
}

async function submit(): Promise<void> {
  formError.value =
    (mode.value === 'register' ? validateName(form.name) : undefined) ??
    validateEmail(form.email) ??
    validatePassword(form.password) ??
    null

  if (formError.value) {
    return
  }

  isSubmitting.value = true

  try {
    const customer =
      mode.value === 'login'
        ? await loginCustomer(form.email, form.password)
        : await registerCustomer(form.name, form.email, form.password)
    diner.setCustomer(customer)

    if (diner.hasTable) {
      diner.confirmTable()
    }

    await goBack()
  } catch (error) {
    formError.value = errorMessage(error, 'No se pudo completar. Inténtalo de nuevo.')
  } finally {
    isSubmitting.value = false
  }
}

function logout(): void {
  diner.setCustomer(null)
}
</script>

<template>
  <div class="mx-auto max-w-sm space-y-6 py-4">
    <template v-if="diner.customer">
      <div class="space-y-1 text-center">
        <h1 class="font-headline text-2xl font-semibold text-on-surface">Hola, {{ diner.customer.name }}</h1>
        <p class="text-sm text-on-surface-variant">{{ diner.customer.email }}</p>
      </div>
      <div class="grid gap-2">
        <RouterLink
          class="font-label rounded-xl bg-primary py-3 text-center text-sm font-semibold text-on-primary hover:bg-primary-container"
          :to="{ name: 'diner-visits' }"
        >
          Ver mis visitas
        </RouterLink>
        <button
          type="button"
          class="font-label rounded-xl bg-surface-container min-h-12 text-base flex items-center justify-center font-semibold text-on-surface hover:bg-surface-container-high"
          @click="logout"
        >
          Cerrar sesión
        </button>
      </div>
    </template>

    <template v-else>
      <div class="space-y-1 text-center">
        <h1 class="font-headline text-2xl font-semibold text-on-surface">
          {{ mode === 'login' ? 'Ingresa a tu cuenta' : 'Crea tu cuenta' }}
        </h1>
        <p class="text-sm text-on-surface-variant">
          Es opcional: con una cuenta guardas el historial de tus visitas. También puedes pedir como invitado.
        </p>
      </div>

      <div class="flex gap-1 rounded-xl bg-surface-container p-1" role="tablist">
        <button
          v-for="option in ([['login', 'Ingresar'], ['register', 'Crear cuenta']] as const)"
          :key="option[0]"
          type="button"
          class="font-label min-h-11 flex-1 rounded-lg text-sm font-semibold"
          :class="mode === option[0] ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant'"
          @click="mode = option[0]"
        >
          {{ option[1] }}
        </button>
      </div>

      <form class="space-y-3" novalidate @submit.prevent="submit">
        <input
          v-if="mode === 'register'"
          v-model="form.name"
          autocomplete="name"
          class="w-full min-h-12 rounded-xl bg-surface-container-lowest px-4 text-base text-on-surface shadow-sm outline-none ring-1 ring-transparent focus:ring-primary"
          placeholder="Tu nombre"
          type="text"
        />
        <input
          v-model="form.email"
          autocomplete="email"
          class="w-full min-h-12 rounded-xl bg-surface-container-lowest px-4 text-base text-on-surface shadow-sm outline-none ring-1 ring-transparent focus:ring-primary"
          placeholder="Correo"
          type="email"
        />
        <input
          v-model="form.password"
          :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
          class="w-full min-h-12 rounded-xl bg-surface-container-lowest px-4 text-base text-on-surface shadow-sm outline-none ring-1 ring-transparent focus:ring-primary"
          placeholder="Contraseña (mín. 8 caracteres)"
          type="password"
        />
        <p v-if="formError" class="rounded-lg bg-error-container px-3 py-2 text-xs text-on-error-container" role="alert">
          {{ formError }}
        </p>
        <button
          type="submit"
          class="font-label w-full rounded-xl bg-primary min-h-12 text-base flex items-center justify-center font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? 'Un momento…' : mode === 'login' ? 'Ingresar' : 'Crear cuenta' }}
        </button>
      </form>

      <p class="text-center text-xs text-on-surface-variant">
        Demo: cliente@demo.com / cliente1234
      </p>

      <button
        v-if="diner.hasTable"
        type="button"
        class="font-label min-h-11 w-full text-center text-sm font-semibold text-primary underline-offset-2 hover:underline"
        @click="diner.confirmTable(); goBack()"
      >
        Prefiero seguir como invitado
      </button>
    </template>
  </div>
</template>
