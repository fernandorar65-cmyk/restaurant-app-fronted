<script setup lang="ts">
import { onBeforeUnmount, ref, useId, watch } from 'vue'

import { useThemeStore } from '@/stores/theme'
import type { ThemePreference } from '@/stores/theme'

const theme = useThemeStore()
const menuId = useId()

const isOpen = ref(false)
const root = ref<HTMLElement | null>(null)

const OPTIONS: Array<{ value: ThemePreference; label: string; icon: string }> = [
  {
    value: 'light',
    label: 'Claro',
    icon: 'M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z',
  },
  {
    value: 'dark',
    label: 'Oscuro',
    icon: 'M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z',
  },
  {
    value: 'system',
    label: 'Sistema',
    icon: 'M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25',
  },
]

function choose(value: ThemePreference): void {
  theme.setPreference(value)
  isOpen.value = false
}

function onPointerDown(event: PointerEvent): void {
  if (root.value && !root.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    isOpen.value = false
  }
}

watch(isOpen, (open) => {
  if (open) {
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeydown)
  } else {
    document.removeEventListener('pointerdown', onPointerDown)
    document.removeEventListener('keydown', onKeydown)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
      :aria-label="`Tema: ${OPTIONS.find((option) => option.value === theme.preference)?.label}`"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
      :aria-controls="menuId"
      @click="isOpen = !isOpen"
    >
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" :d="theme.isDark ? OPTIONS[1]!.icon : OPTIONS[0]!.icon" />
      </svg>
    </button>

    <div
      v-if="isOpen"
      :id="menuId"
      role="menu"
      aria-label="Tema"
      class="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl bg-surface-container-lowest py-1.5 shadow-xl ring-1 ring-outline-variant/50"
    >
      <p class="font-label px-4 pt-1 pb-1.5 text-xs font-semibold tracking-wider text-outline uppercase">Tema</p>
      <button
        v-for="option in OPTIONS"
        :key="option.value"
        type="button"
        role="menuitemradio"
        :aria-checked="theme.preference === option.value"
        class="flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm transition-colors hover:bg-surface-container-low"
        :class="theme.preference === option.value ? 'font-semibold text-primary' : 'text-on-surface'"
        @click="choose(option.value)"
      >
        <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" :d="option.icon" />
        </svg>
        <span class="flex-1">{{ option.label }}</span>
        <svg
          v-if="theme.preference === option.value"
          class="h-4 w-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.4"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </button>
    </div>
  </div>
</template>
