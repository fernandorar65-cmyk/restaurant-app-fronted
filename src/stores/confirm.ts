import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ConfirmRequest {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** `danger` para acciones que borran o no se pueden deshacer. */
  tone?: 'primary' | 'danger'
}

interface PendingConfirm extends ConfirmRequest {
  resolve: (accepted: boolean) => void
}

/** Confirmaciones con el diseño de la app (reemplaza a window.confirm). */
export const useConfirmStore = defineStore('confirm', () => {
  const pending = ref<PendingConfirm | null>(null)

  function ask(request: ConfirmRequest): Promise<boolean> {
    pending.value?.resolve(false)

    return new Promise((resolve) => {
      pending.value = { ...request, resolve }
    })
  }

  function answer(accepted: boolean): void {
    pending.value?.resolve(accepted)
    pending.value = null
  }

  return { pending, ask, answer }
})
