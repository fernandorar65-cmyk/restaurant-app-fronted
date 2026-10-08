<script setup lang="ts">
import { reactive, ref } from 'vue'

import BaseButton from '@/components/base/BaseButton.vue'
import { validatePassword } from '@/modules/auth/validation'
import { errorMessage } from '@/modules/orders/api'

/** Formulario de cambio de contraseña, común al perfil del cliente y al del restaurante. */
const props = defineProps<{
  submit: (currentPassword: string, nextPassword: string) => Promise<void>
}>()

const form = reactive({ current: '', next: '', confirm: '' })
const error = ref<string | null>(null)
const success = ref(false)
const isSaving = ref(false)

async function onSubmit(): Promise<void> {
  success.value = false
  error.value =
    (!form.current ? 'Ingresa tu contraseña actual.' : undefined) ??
    validatePassword(form.next) ??
    (form.next !== form.confirm ? 'Las contraseñas nuevas no coinciden.' : undefined) ??
    (form.next === form.current ? 'La nueva contraseña debe ser distinta a la actual.' : undefined) ??
    null

  if (error.value) {
    return
  }

  isSaving.value = true

  try {
    await props.submit(form.current, form.next)
    form.current = ''
    form.next = ''
    form.confirm = ''
    success.value = true
  } catch (caught) {
    error.value = errorMessage(caught, 'No se pudo cambiar la contraseña.')
  } finally {
    isSaving.value = false
  }
}

const inputClass =
  'min-h-11 w-full rounded-xl bg-surface px-3 text-sm text-on-surface outline-none ring-1 ring-outline-variant/60 focus:ring-2 focus:ring-primary'
</script>

<template>
  <form class="space-y-3" novalidate @submit.prevent="onSubmit">
    <label class="block space-y-1">
      <span class="text-xs font-semibold text-on-surface-variant">Contraseña actual</span>
      <input v-model="form.current" :class="inputClass" type="password" autocomplete="current-password" />
    </label>
    <div class="grid gap-3 sm:grid-cols-2">
      <label class="block space-y-1">
        <span class="text-xs font-semibold text-on-surface-variant">Nueva contraseña</span>
        <input v-model="form.next" :class="inputClass" type="password" autocomplete="new-password" />
      </label>
      <label class="block space-y-1">
        <span class="text-xs font-semibold text-on-surface-variant">Repite la nueva</span>
        <input v-model="form.confirm" :class="inputClass" type="password" autocomplete="new-password" />
      </label>
    </div>
    <p v-if="error" class="rounded-xl bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">{{ error }}</p>
    <p v-else-if="success" class="rounded-xl bg-success-container px-3 py-2 text-sm text-on-success-container" role="status">
      Contraseña actualizada.
    </p>
    <BaseButton variant="secondary" type="submit" :loading="isSaving">Cambiar contraseña</BaseButton>
  </form>
</template>
