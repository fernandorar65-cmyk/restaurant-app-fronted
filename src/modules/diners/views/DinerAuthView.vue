<script setup lang="ts">
import { computed, reactive, ref, watch, watchEffect } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { usePageTitle } from '@/composables/usePageTitle'
import AuthMinimalLayout from '@/modules/auth/components/AuthMinimalLayout.vue'
import AuthTextField from '@/modules/auth/components/AuthTextField.vue'
import { validateEmail, validateName, validatePassword } from '@/modules/auth/validation'
import { loginCustomer, registerCustomer } from '@/modules/diners/api'
import { errorMessage } from '@/modules/orders/api'
import { useDinerStore } from '@/stores/diner'

const route = useRoute()
const router = useRouter()
const diner = useDinerStore()

/** La ruta decide el modo: /customer/auth/login o /customer/auth/register. */
const mode = computed<'login' | 'register'>(() => (route.name === 'diner-register' ? 'register' : 'login'))

watchEffect(() => usePageTitle(mode.value === 'register' ? 'Crear cuenta' : 'Ingresar'))

const form = reactive({ name: '', email: '', password: '' })
const fieldErrors = reactive({
  name: undefined as string | undefined,
  email: undefined as string | undefined,
  password: undefined as string | undefined,
})
const formError = ref<string | null>(null)
const isSubmitting = ref(false)

/* Al cambiar de pestaña se limpian los errores del otro formulario. */
watch(mode, () => {
  formError.value = null
  fieldErrors.name = undefined
  fieldErrors.email = undefined
  fieldErrors.password = undefined
})

const redirectTarget = computed(() => {
  const value = route.query.redirect
  return typeof value === 'string' && value.startsWith('/') ? value : null
})

async function goBack(): Promise<void> {
  await router.push(redirectTarget.value ?? (diner.isReadyToOrder ? diner.menuRoute : { name: 'diner-profile' }))
}

async function submit(): Promise<void> {
  formError.value = null
  fieldErrors.name = mode.value === 'register' ? validateName(form.name) : undefined
  fieldErrors.email = validateEmail(form.email)
  fieldErrors.password = validatePassword(form.password)

  if (fieldErrors.name || fieldErrors.email || fieldErrors.password) {
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

async function continueAsGuest(): Promise<void> {
  diner.confirmTable()
  await goBack()
}

function logout(): void {
  diner.setCustomer(null)
}
</script>

<template>
  <!-- Ya tiene sesión de cliente -->
  <AuthMinimalLayout
    v-if="diner.customer"
    audience="customer"
    :mode="mode"
    :title="`Hola, ${diner.customer.name}`"
    :subtitle="diner.customer.email"
    hide-switches
  >
    <div class="grid gap-2">
      <RouterLink
        class="font-label flex min-h-12 items-center justify-center rounded-xl bg-primary text-base font-semibold text-on-primary hover:bg-primary-container"
        :to="{ name: 'diner-profile' }"
      >
        Ir a mi perfil
      </RouterLink>
      <button
        type="button"
        class="font-label flex min-h-12 items-center justify-center rounded-xl text-base font-semibold text-on-surface ring-1 ring-outline-variant hover:bg-surface-container-low"
        @click="logout"
      >
        Cerrar sesión
      </button>
    </div>
  </AuthMinimalLayout>

  <AuthMinimalLayout
    v-else
    audience="customer"
    :mode="mode"
    :title="mode === 'login' ? 'Ingresa a tu cuenta' : 'Crea tu cuenta'"
    subtitle="Guarda tus visitas, preferencias y pedidos. También puedes pedir como invitado."
  >
    <form class="space-y-4" novalidate @submit.prevent="submit">
      <p v-if="formError" class="rounded-xl bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">{{ formError }}</p>

      <AuthTextField
        v-if="mode === 'register'"
        id="customer-name"
        v-model="form.name"
        label="Nombre"
        autocomplete="name"
        placeholder="Tu nombre"
        :error="fieldErrors.name"
      />
      <AuthTextField
        id="customer-email"
        v-model="form.email"
        label="Correo electrónico"
        type="email"
        autocomplete="email"
        placeholder="tu@correo.com"
        :error="fieldErrors.email"
      />
      <AuthTextField
        id="customer-password"
        v-model="form.password"
        label="Contraseña"
        type="password"
        :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
        :placeholder="mode === 'login' ? 'Tu contraseña' : 'Mínimo 8 caracteres'"
        :error="fieldErrors.password"
      />

      <button
        type="submit"
        class="font-label flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-base font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="isSubmitting"
      >
        {{ isSubmitting ? 'Un momento…' : mode === 'login' ? 'Ingresar' : 'Crear cuenta' }}
      </button>

      <button
        v-if="diner.hasTable"
        type="button"
        class="font-label min-h-11 w-full text-center text-sm font-semibold text-primary underline-offset-2 hover:underline"
        @click="continueAsGuest"
      >
        Prefiero seguir como invitado
      </button>
    </form>

    <template #footer>
      <p class="text-center text-xs text-on-surface-variant">Demo: cliente@demo.com / cliente1234</p>
    </template>
  </AuthMinimalLayout>
</template>
