<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { useToastStore } from '@/stores/toast'
import type { ToastTone } from '@/stores/toast'

const toast = useToastStore()
const route = useRoute()

/** En el portal los avisos van arriba a la derecha; para el comensal, abajo, sobre la barra de navegación. */
const isPortal = computed(() => route.matched.some((record) => record.meta.requiresAuth))

const toneClass: Record<ToastTone, string> = {
  info: 'bg-on-surface text-surface',
  success: 'bg-success text-on-success',
  warning: 'bg-warning-container text-on-warning-container ring-1 ring-warning/40',
  error: 'bg-error text-on-error',
}

const iconPath: Record<ToastTone, string> = {
  info: 'm11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z',
  success: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  warning: 'M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0',
  error: 'M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z',
}
</script>

<template>
  <div
    class="pointer-events-none fixed z-[100] flex flex-col gap-2 px-4"
    :class="isPortal ? 'top-20 right-0 left-0 items-center sm:left-auto sm:items-end' : 'right-0 bottom-24 left-0 items-center'"
    aria-live="polite"
    role="status"
  >
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <button
        v-for="item in toast.toasts"
        :key="item.id"
        type="button"
        class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl px-4 py-3 text-left shadow-lg"
        :class="toneClass[item.tone]"
        @click="toast.dismiss(item.id)"
      >
        <svg class="mt-0.5 h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" :d="iconPath[item.tone]" />
        </svg>
        <span>
          <span class="block text-sm font-semibold">{{ item.title }}</span>
          <span v-if="item.message" class="mt-0.5 block text-sm opacity-90">{{ item.message }}</span>
        </span>
      </button>
    </TransitionGroup>
  </div>
</template>
