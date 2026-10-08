<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'

/**
 * Diálogo único de la app.
 * - En móvil siempre es una hoja que sube desde abajo, a todo el ancho.
 * - En escritorio: `center` (modal centrado) o `side` (panel lateral derecho,
 *   para detalles que conviene leer junto a la lista de fondo).
 */
const props = withDefaults(
  defineProps<{
    title: string
    eyebrow?: string
    subtitle?: string
    size?: 'sm' | 'md' | 'lg'
    placement?: 'center' | 'side'
  }>(),
  { size: 'md', placement: 'center' },
)

const emit = defineEmits<{
  close: []
}>()

const dialogEl = ref<HTMLDialogElement | null>(null)

const WIDTH = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl' } as const

function close(): void {
  dialogEl.value?.close()
}

defineExpose({ close })

onMounted(async () => {
  await nextTick()
  dialogEl.value?.showModal()
})
</script>

<template>
  <dialog
    ref="dialogEl"
    class="m-0 mt-auto max-h-[94dvh] w-full max-w-none overflow-hidden rounded-t-3xl bg-surface-container-lowest p-0 text-on-surface shadow-[0_-12px_48px_rgba(27,28,29,0.2)] backdrop:bg-on-surface/45 backdrop:backdrop-blur-[2px]"
    :class="
      props.placement === 'side'
        ? ['sm:mt-0 sm:mr-0 sm:ml-auto sm:h-dvh sm:max-h-dvh sm:rounded-none sm:rounded-l-3xl', WIDTH[props.size]]
        : ['sm:m-auto sm:max-h-[min(90dvh,880px)] sm:rounded-3xl sm:shadow-[0_24px_64px_rgba(27,28,29,0.2)]', WIDTH[props.size]]
    "
    aria-labelledby="base-dialog-title"
    @close="emit('close')"
  >
    <div class="flex max-h-[inherit] flex-col sm:h-full">
      <div class="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-outline-variant sm:hidden" aria-hidden="true" />
      <header class="flex shrink-0 items-start justify-between gap-4 px-5 pt-4 pb-3 sm:px-6 sm:pt-6">
        <div class="min-w-0">
          <p v-if="eyebrow" class="font-label text-xs font-semibold tracking-widest text-tertiary uppercase">{{ eyebrow }}</p>
          <h2 id="base-dialog-title" class="font-headline mt-0.5 text-2xl leading-tight font-semibold">{{ title }}</h2>
          <p v-if="subtitle" class="mt-1 text-sm text-on-surface-variant">{{ subtitle }}</p>
          <slot name="header" />
        </div>
        <button
          type="button"
          class="touch-target -mt-1 -mr-2 flex items-center justify-center rounded-xl text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          aria-label="Cerrar"
          @click="close"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div class="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">
        <slot />
      </div>

      <footer
        v-if="$slots.footer"
        class="flex shrink-0 flex-wrap items-center gap-2 border-t border-outline-variant/50 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6"
      >
        <slot name="footer" :close="close" />
      </footer>
    </div>
  </dialog>
</template>
