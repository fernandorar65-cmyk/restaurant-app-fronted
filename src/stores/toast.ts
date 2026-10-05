import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastTone = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id: number
  title: string
  message: string | null
  tone: ToastTone
}

let nextId = 1

function beep(): void {
  try {
    const context = new AudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.15, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.4)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.4)
  } catch {
    // Sin audio disponible (navegador sin interacción previa, etc.).
  }
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])

  function dismiss(id: number): void {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function show(
    title: string,
    options: { message?: string; tone?: ToastTone; sound?: boolean; vibrate?: boolean; durationMs?: number } = {},
  ): void {
    const id = nextId++
    toasts.value = [...toasts.value, { id, title, message: options.message ?? null, tone: options.tone ?? 'info' }]

    if (options.sound) {
      beep()
    }

    if (options.vibrate && 'vibrate' in navigator) {
      navigator.vibrate(200)
    }

    setTimeout(() => dismiss(id), options.durationMs ?? 6000)
  }

  return { toasts, show, dismiss }
})
