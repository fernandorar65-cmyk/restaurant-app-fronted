<script setup lang="ts">
import { computed, ref } from 'vue'

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

function togglePasswordVisibility(): void {
  isPasswordVisible.value = !isPasswordVisible.value
}
</script>

<template>
  <div class="space-y-1.5">
    <label :for="id" class="font-label block text-[11px] font-bold tracking-widest text-on-surface uppercase">
      {{ label }}
    </label>
    <div class="relative flex items-center">
      <span class="pointer-events-none absolute left-3.5 text-secondary" aria-hidden="true">
        <svg
          v-if="type === 'email'"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15A2.25 2.25 0 0 1 2.25 17.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0-8.693 5.78a2.25 2.25 0 0 1-2.614 0L2.25 6.75"
          />
        </svg>
        <svg
          v-else-if="type === 'password'"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
          />
        </svg>
        <svg v-else class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
          />
        </svg>
      </span>
      <input
        :id="id"
        v-model="model"
        :type="inputType"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        :aria-invalid="Boolean(error)"
        :aria-describedby="error ? `${id}-error` : undefined"
        class="w-full rounded-lg bg-surface-container-lowest py-3 pr-11 pl-10 text-sm text-on-surface shadow-sm transition-all placeholder:text-outline focus:ring-2 focus:ring-primary focus:outline-none"
        :class="{ 'tracking-wider': type === 'password' && !isPasswordVisible }"
      />
      <button
        v-if="type === 'password'"
        type="button"
        class="absolute right-3 rounded p-1 text-secondary transition-colors hover:text-on-surface focus:ring-2 focus:ring-primary focus:outline-none"
        :aria-label="isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'"
        :aria-pressed="isPasswordVisible"
        @click="togglePasswordVisibility"
      >
        <svg
          v-if="isPasswordVisible"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
          />
        </svg>
        <svg v-else class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z"
          />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      </button>
    </div>
    <p v-if="error" :id="`${id}-error`" class="text-sm text-error">
      {{ error }}
    </p>
  </div>
</template>
