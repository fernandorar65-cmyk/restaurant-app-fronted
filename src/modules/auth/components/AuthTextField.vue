<script setup lang="ts">
import { computed, ref } from 'vue'

/** Campo de los formularios de acceso (cliente y restaurante): etiqueta, input y error. */
const props = withDefaults(
  defineProps<{
    id: string
    label: string
    type?: 'text' | 'email' | 'password'
    autocomplete?: string
    error?: string
    placeholder?: string
  }>(),
  {
    type: 'text',
  },
)

const model = defineModel<string>({ required: true })
const isPasswordVisible = ref(false)

const inputType = computed(() => {
  if (props.type !== 'password') {
    return props.type
  }

  return isPasswordVisible.value ? 'text' : 'password'
})
</script>

<template>
  <div class="space-y-1.5">
    <label :for="id" class="block text-sm font-medium text-on-surface">{{ label }}</label>
    <div class="relative">
      <input
        :id="id"
        v-model="model"
        :type="inputType"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        :aria-invalid="Boolean(error)"
        :aria-describedby="error ? `${id}-error` : undefined"
        class="min-h-12 w-full rounded-xl bg-surface-container-lowest px-4 text-base text-on-surface ring-1 transition-shadow outline-none placeholder:text-outline focus:ring-2 focus:ring-primary"
        :class="[error ? 'ring-error' : 'ring-outline-variant/70', type === 'password' ? 'pr-12' : '']"
      />
      <button
        v-if="type === 'password'"
        type="button"
        class="absolute top-1/2 right-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-outline transition-colors hover:text-on-surface focus-visible:outline-2 focus-visible:outline-primary"
        :aria-label="isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'"
        :aria-pressed="isPasswordVisible"
        @click="isPasswordVisible = !isPasswordVisible"
      >
        <svg v-if="isPasswordVisible" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
          />
        </svg>
        <svg v-else class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z"
          />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      </button>
    </div>
    <p v-if="error" :id="`${id}-error`" class="text-sm text-error">{{ error }}</p>
  </div>
</template>
