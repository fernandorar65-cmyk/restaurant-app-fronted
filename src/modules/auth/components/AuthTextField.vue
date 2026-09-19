<script setup lang="ts">
withDefaults(
  defineProps<{
    id: string
    label: string
    type?: 'text' | 'email' | 'password'
    autocomplete?: string
    error?: string
  }>(),
  {
    type: 'text',
  },
)

const model = defineModel<string>({ required: true })
</script>

<template>
  <div class="space-y-1.5">
    <label :for="id" class="block text-sm font-medium text-stone-800">
      {{ label }}
    </label>
    <input
      :id="id"
      v-model="model"
      :type="type"
      :autocomplete="autocomplete"
      :aria-invalid="Boolean(error)"
      :aria-describedby="error ? `${id}-error` : undefined"
      class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-900/20"
    />
    <p v-if="error" :id="`${id}-error`" class="text-sm text-red-700">
      {{ error }}
    </p>
  </div>
</template>
