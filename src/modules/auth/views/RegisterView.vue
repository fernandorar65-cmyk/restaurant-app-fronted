<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { usePageTitle } from '@/composables/usePageTitle'
import { register as registerAccount } from '@/modules/auth/api'
import AuthConsoleLayout from '@/modules/auth/components/AuthConsoleLayout.vue'
import AuthModeTabs from '@/modules/auth/components/AuthModeTabs.vue'
import AuthTextField from '@/modules/auth/components/AuthTextField.vue'
import { validateEmail, validateName, validatePassword } from '@/modules/auth/validation'
import { HttpError } from '@/services/http'
import { useSessionStore } from '@/stores/session'

usePageTitle('Crear cuenta')

const router = useRouter()
const session = useSessionStore()

const form = reactive({
  name: '',
  email: '',
  password: '',
})

const fieldErrors = reactive({
  name: undefined as string | undefined,
  email: undefined as string | undefined,
  password: undefined as string | undefined,
})

const formError = ref<string | null>(null)
const isSubmitting = ref(false)

function validateForm(): boolean {
  fieldErrors.name = validateName(form.name)
  fieldErrors.email = validateEmail(form.email)
  fieldErrors.password = validatePassword(form.password)

  return !fieldErrors.name && !fieldErrors.email && !fieldErrors.password
}

async function onSubmit(): Promise<void> {
  formError.value = null

  if (!validateForm()) {
    return
  }

  isSubmitting.value = true

  try {
    const authSession = await registerAccount({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
    })

    session.setSession(authSession)
    await router.push({ name: 'dashboard' })
  } catch (error) {
    formError.value =
      error instanceof HttpError
        ? error.message
        : 'No se pudo crear la cuenta. Inténtalo de nuevo.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <AuthConsoleLayout>
    <AuthModeTabs current="register" />

    <div class="mb-8">
      <h1 class="font-headline text-3xl leading-snug font-semibold tracking-tight text-on-surface">
        Crear cuenta
      </h1>
      <p class="mt-2 text-sm leading-relaxed text-secondary">
        Regístrate para acceder al panel de Restaurant CMR.
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
        id="register-name"
        v-model="form.name"
        label="Nombre"
        autocomplete="name"
        placeholder="Ana Pérez"
        :error="fieldErrors.name"
      />

      <AuthTextField
        id="register-email"
        v-model="form.email"
        label="Correo electrónico"
        type="email"
        autocomplete="email"
        placeholder="chef@restaurantcmr.com"
        :error="fieldErrors.email"
      />

      <AuthTextField
        id="register-password"
        v-model="form.password"
        label="Contraseña"
        type="password"
        autocomplete="new-password"
        placeholder="••••••••••••"
        :error="fieldErrors.password"
      />

      <div class="pt-3">
        <button
          type="submit"
          class="font-label flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-primary to-primary-container px-6 py-3.5 text-sm font-semibold tracking-wide text-on-primary shadow-md transition-all hover:from-primary-container hover:to-primary hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? 'Creando cuenta…' : 'Crear cuenta' }}
        </button>
      </div>
    </form>
  </AuthConsoleLayout>
</template>
