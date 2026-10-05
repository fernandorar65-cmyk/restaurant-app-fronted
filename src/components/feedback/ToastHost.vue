<script setup lang="ts">
import { useToastStore } from '@/stores/toast'
import type { ToastTone } from '@/stores/toast'

const toast = useToastStore()

const toneClass: Record<ToastTone, string> = {
  info: 'bg-on-surface text-surface',
  success: 'bg-emerald-700 text-white',
  warning: 'bg-tertiary-fixed text-on-tertiary-container',
  error: 'bg-error text-on-error',
}
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4"
    aria-live="polite"
    role="status"
  >
    <button
      v-for="item in toast.toasts"
      :key="item.id"
      type="button"
      class="pointer-events-auto w-full max-w-sm rounded-xl px-4 py-3 text-left shadow-lg"
      :class="toneClass[item.tone]"
      @click="toast.dismiss(item.id)"
    >
      <p class="text-sm font-semibold">{{ item.title }}</p>
      <p v-if="item.message" class="mt-0.5 text-xs opacity-90">{{ item.message }}</p>
    </button>
  </div>
</template>
