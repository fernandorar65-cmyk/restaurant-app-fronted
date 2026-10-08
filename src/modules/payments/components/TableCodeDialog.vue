<script setup lang="ts">
import { computed, ref } from 'vue'

import BaseButton from '@/components/base/BaseButton.vue'
import BaseDialog from '@/components/base/BaseDialog.vue'

const props = defineProps<{
  /** Código ya guardado, para corregirlo. */
  initialCode?: string | null
  restaurantName?: string | null
}>()

const emit = defineEmits<{
  close: []
  save: [code: string]
}>()

const MAX_LENGTH = 30

const dialog = ref<InstanceType<typeof BaseDialog> | null>(null)
const code = ref(props.initialCode ?? '')
const touched = ref(false)

const error = computed(() => {
  if (!touched.value) {
    return null
  }

  return code.value.trim() ? null : 'Ingresa el código de tu mesa.'
})

function submit(): void {
  touched.value = true

  if (!code.value.trim()) {
    return
  }

  emit('save', code.value.trim())
  dialog.value?.close()
}
</script>

<template>
  <BaseDialog
    ref="dialog"
    title="¿En qué mesa estás?"
    :subtitle="restaurantName ? `Lo necesitamos para llevar tu orden en ${restaurantName}.` : 'Lo necesitamos para llevar tu orden.'"
    size="sm"
    @close="emit('close')"
  >
    <form id="table-code-form" class="space-y-2" novalidate @submit.prevent="submit">
      <label class="block space-y-1.5">
        <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Código de mesa</span>
        <input
          v-model="code"
          class="min-h-12 w-full rounded-xl bg-surface px-4 text-base text-on-surface outline-none ring-1 ring-outline-variant/60 placeholder:text-outline focus:ring-2 focus:ring-primary"
          :class="{ 'ring-error': error }"
          type="text"
          inputmode="text"
          autocomplete="off"
          autocapitalize="characters"
          :maxlength="MAX_LENGTH"
          placeholder="Ej: 12 o T-04"
          :aria-invalid="Boolean(error)"
          aria-describedby="table-code-hint"
          autofocus
          @blur="touched = true"
        />
      </label>
      <p v-if="error" class="text-sm text-error" role="alert">{{ error }}</p>
      <p v-else id="table-code-hint" class="text-sm text-on-surface-variant">Lo encuentras en la placa o tarjeta de tu mesa.</p>
    </form>

    <template #footer="{ close }">
      <BaseButton variant="ghost" size="lg" @click="close">Cancelar</BaseButton>
      <BaseButton variant="primary" size="lg" type="submit" form="table-code-form" class="ml-auto">Continuar</BaseButton>
    </template>
  </BaseDialog>
</template>
