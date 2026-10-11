<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { landingRouteFor } from '@/app/router/landing'
import { usePageTitle } from '@/composables/usePageTitle'
import { register as registerAccount } from '@/modules/auth/api'
import AuthMinimalLayout from '@/modules/auth/components/AuthMinimalLayout.vue'
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
    await router.push(landingRouteFor(authSession.user))
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
  <AuthMinimalLayout audience="restaurant" mode="register" title="Registra tu restaurante" subtitle="Crea tu cuenta de dueño para empezar.">
    <form class="space-y-4" novalidate @submit.prevent="onSubmit">
      <p v-if="formError" class="rounded-xl bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">{{ formError }}</p>

      <AuthTextField id="register-name" v-model="form.name" label="Nombre" autocomplete="name" placeholder="Ana Pérez" :error="fieldErrors.name" />
      <AuthTextField
        id="register-email"
        v-model="form.email"
        label="Correo electrónico"
        type="email"
        autocomplete="email"
        placeholder="tu@restaurante.com"
        :error="fieldErrors.email"
      />
      <AuthTextField
        id="register-password"
        v-model="form.password"
        label="Contraseña"
        type="password"
        autocomplete="new-password"
        placeholder="Mínimo 8 caracteres"
        :error="fieldErrors.password"
      />

      <button type="submit" class="font-label flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-base font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60" :disabled="isSubmitting">
        {{ isSubmitting ? 'Creando cuenta…' : 'Crear cuenta' }}
      </button>
    </form>
  </AuthMinimalLayout>
</template>
