<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import PageHeader from '@/components/base/PageHeader.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { register as registerAccount } from '@/modules/auth/api'
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
  <PageHeader title="Crear cuenta" description="Regístrate para guardar tus pedidos y continuar como usuario.">
    <form class="mt-6 space-y-4" novalidate @submit.prevent="onSubmit">
      <p
        v-if="formError"
        class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        role="alert"
      >
        {{ formError }}
      </p>

      <AuthTextField
        id="register-name"
        v-model="form.name"
        label="Nombre"
        autocomplete="name"
        :error="fieldErrors.name"
      />

      <AuthTextField
        id="register-email"
        v-model="form.email"
        label="Correo"
        type="email"
        autocomplete="email"
        :error="fieldErrors.email"
      />

      <AuthTextField
        id="register-password"
        v-model="form.password"
        label="Contraseña"
        type="password"
        autocomplete="new-password"
        :error="fieldErrors.password"
      />

      <button
        type="submit"
        class="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="isSubmitting"
      >
        {{ isSubmitting ? 'Creando cuenta…' : 'Crear cuenta' }}
      </button>
    </form>

    <p class="mt-4 text-sm text-stone-600">
      ¿Ya tienes cuenta?
      <RouterLink class="font-medium text-stone-900 underline" :to="{ name: 'login' }">
        Ingresar
      </RouterLink>
    </p>
  </PageHeader>
</template>
