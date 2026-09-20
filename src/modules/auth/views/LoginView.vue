<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { usePageTitle } from '@/composables/usePageTitle'
import { login } from '@/modules/auth/api'
import AuthConsoleLayout from '@/modules/auth/components/AuthConsoleLayout.vue'
import AuthModeTabs from '@/modules/auth/components/AuthModeTabs.vue'
import AuthTextField from '@/modules/auth/components/AuthTextField.vue'
import { validateEmail, validatePassword } from '@/modules/auth/validation'
import { HttpError } from '@/services/http'
import { useSessionStore } from '@/stores/session'

usePageTitle('Ingresar')

const router = useRouter()
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
    await router.push({ name: 'dashboard' })
  } catch (error) {
    formError.value =
      error instanceof HttpError ? error.message : 'No se pudo iniciar sesión. Inténtalo de nuevo.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <AuthConsoleLayout>
    <AuthModeTabs current="login" />

    <div class="mb-8">
      <h1 class="font-headline text-3xl leading-snug font-semibold tracking-tight text-on-surface">
        Bienvenido de nuevo
      </h1>
      <p class="mt-2 text-sm leading-relaxed text-secondary">
        Introduce tus credenciales para acceder al panel de Restaurant CMR.
      </p>
    </div>

    <form class="space-y-5" novalidate @submit.prevent="onSubmit">
      <p
        v-if="formError"
        class="rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-on-error-container"
        role="alert"
      >
        {{ formError }}
      </p>

      <AuthTextField
        id="login-email"
        v-model="form.email"
        label="Correo electrónico"
        type="email"
        autocomplete="email"
        placeholder="chef@restaurantcmr.com"
        :error="fieldErrors.email"
      />

      <AuthTextField
        id="login-password"
        v-model="form.password"
        label="Contraseña"
        type="password"
        autocomplete="current-password"
        placeholder="••••••••••••"
        :error="fieldErrors.password"
      />

      <label class="flex cursor-pointer items-center gap-3 pt-1 select-none">
        <input
          v-model="rememberSession"
          class="h-4 w-4 cursor-pointer rounded border-outline-variant bg-surface-container-lowest text-primary focus:ring-primary"
          type="checkbox"
        />
        <span class="font-label text-xs font-medium text-secondary">Mantener sesión en este dispositivo</span>
      </label>

      <div class="pt-3">
        <button
          type="submit"
          class="font-label flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-primary to-primary-container px-6 py-3.5 text-sm font-semibold tracking-wide text-on-primary shadow-md transition-all hover:from-primary-container hover:to-primary hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? 'Ingresando…' : 'Ingresar' }}
          <svg class="h-4 w-4 text-tertiary-fixed" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </form>

    <p class="mt-8 rounded-xl bg-surface-container-low/70 p-4 text-center text-xs leading-relaxed text-secondary">
      Demo:
      <span class="font-semibold text-on-surface">admin@restaurant.com</span>
      /
      <span class="font-semibold text-on-surface">admin1234</span>
    </p>
  </AuthConsoleLayout>
</template>
