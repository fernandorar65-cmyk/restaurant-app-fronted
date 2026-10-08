<script setup lang="ts">
import { ref } from 'vue'

import BaseButton from '@/components/base/BaseButton.vue'
import BaseDialog from '@/components/base/BaseDialog.vue'
import { useConfirmStore } from '@/stores/confirm'

const confirm = useConfirmStore()
const dialogRef = ref<InstanceType<typeof BaseDialog> | null>(null)
let accepted = false

function choose(value: boolean): void {
  accepted = value
  dialogRef.value?.close()
}

function onClose(): void {
  confirm.answer(accepted)
  accepted = false
}
</script>

<template>
  <BaseDialog
    v-if="confirm.pending"
    ref="dialogRef"
    :key="confirm.pending.title"
    :title="confirm.pending.title"
    size="sm"
    @close="onClose"
  >
    <p v-if="confirm.pending.message" class="text-base text-on-surface-variant">{{ confirm.pending.message }}</p>
    <template #footer>
      <BaseButton variant="secondary" class="flex-1 sm:flex-none" @click="choose(false)">
        {{ confirm.pending.cancelLabel ?? 'Cancelar' }}
      </BaseButton>
      <BaseButton
        :variant="confirm.pending.tone === 'danger' ? 'danger' : 'primary'"
        class="flex-1 sm:ml-auto sm:flex-none"
        @click="choose(true)"
      >
        {{ confirm.pending.confirmLabel ?? 'Confirmar' }}
      </BaseButton>
    </template>
  </BaseDialog>
</template>
