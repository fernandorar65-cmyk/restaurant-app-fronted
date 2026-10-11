<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { landingRouteFor } from '@/app/router/landing'
import { ensureSiteDirectory } from '@/app/router/site-directory'

import { usePageTitle } from '@/composables/usePageTitle'
import { login } from '@/modules/auth/api'
import AuthMinimalLayout from '@/modules/auth/components/AuthMinimalLayout.vue'
import AuthTextField from '@/modules/auth/components/AuthTextField.vue'
import { validateEmail, validatePassword } from '@/modules/auth/validation'
import { HttpError } from '@/services/http'
import { useSessionStore } from '@/stores/session'

usePageTitle('Ingresar')

const router = useRouter()
const route = useRoute()
const session = useSessionStore()

const form = reactive({
  email: '',
  password: '',
})

const fieldErrors = reactive({
  email: undefined as string | undefined,
  password: undefined as string | undefined,
})

const formError = ref<string | null>(null)
const isSubmitting = ref(false)
const rememberSession = ref(true)

function validateForm(): boolean {
  fieldErrors.email = validateEmail(form.email)
  fieldErrors.password = validatePassword(form.password)

  return !fieldErrors.email && !fieldErrors.password
}

const DEMO_ACCOUNTS = [
  { role: 'Propietario', hint: 'Todo el sistema', email: 'admin@restaurant.com', password: 'admin1234' },
  { role: 'Camarero', hint: 'Pedidos y entregas', email: 'mozo@restaurant.com', password: 'demo1234' },
  { role: 'Cocina', hint: 'Cola de cocina', email: 'cocina@restaurant.com', password: 'demo1234' },
  { role: 'Caja', hint: 'Cuentas y cierre', email: 'caja@restaurant.com', password: 'demo1234' },
] as const

/** Completa el formulario con una cuenta demo y entra directamente. */
async function useDemo(account: (typeof DEMO_ACCOUNTS)[number]): Promise<void> {
  form.email = account.email
  form.password = account.password
  await onSubmit()
}

async function onSubmit(): Promise<void> {
  formError.value = null

  if (!validateForm()) {
    return
  }

  isSubmitting.value = true

  try {
    const authSession = await login({
      email: form.email.trim(),
      password: form.password,
    })

    session.setSession(authSession, { persist: rememberSession.value })
    // La primera vista puede ser una sede: con el directorio cargado, su URL ya lleva el nombre del local.
    await ensureSiteDirectory()
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    await router.push(redirect && redirect.startsWith('/') ? redirect : landingRouteFor(authSession.user))
  } catch (error) {
    formError.value =
      error instanceof HttpError ? error.message : 'No se pudo iniciar sesión. Inténtalo de nuevo.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <AuthMinimalLayout audience="restaurant" mode="login" title="Bienvenido de nuevo" subtitle="Entra al portal de tu restaurante.">
    <form class="space-y-4" novalidate @submit.prevent="onSubmit">
      <p v-if="formError" class="rounded-xl bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">{{ formError }}</p>

      <AuthTextField
        id="login-email"
        v-model="form.email"
        label="Correo electrónico"
        type="email"
        autocomplete="email"
        placeholder="tu@restaurante.com"
        :error="fieldErrors.email"
      />
      <AuthTextField
        id="login-password"
        v-model="form.password"
        label="Contraseña"
        type="password"
        autocomplete="current-password"
        placeholder="Tu contraseña"
        :error="fieldErrors.password"
      />

      <label class="flex cursor-pointer items-center gap-2.5 select-none">
        <input v-model="rememberSession" class="h-4 w-4 cursor-pointer rounded accent-primary" type="checkbox" />
        <span class="text-sm text-on-surface-variant">Mantener sesión en este dispositivo</span>
      </label>

      <button type="submit" class="font-label flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-base font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60" :disabled="isSubmitting">
        {{ isSubmitting ? 'Ingresando…' : 'Ingresar' }}
      </button>
    </form>

    <template #footer>
      <details class="group rounded-xl ring-1 ring-outline-variant/50">
        <summary class="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium text-on-surface-variant">
          Probar con una cuenta demo
          <svg class="h-4 w-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </summary>
        <div class="grid grid-cols-2 gap-2 px-3 pb-3">
          <button
            v-for="account in DEMO_ACCOUNTS"
            :key="account.email"
            type="button"
            class="flex flex-col items-start rounded-lg bg-surface-container-low px-3 py-2 text-left transition-colors hover:bg-surface-container"
            @click="useDemo(account)"
          >
            <span class="text-sm font-semibold text-on-surface">{{ account.role }}</span>
            <span class="text-xs text-on-surface-variant">{{ account.hint }}</span>
          </button>
        </div>
      </details>
    </template>
  </AuthMinimalLayout>
</template>
