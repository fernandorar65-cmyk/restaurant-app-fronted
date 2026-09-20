<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'

import { ticketPriorityLabel, ticketStatusLabel } from '@/modules/orders/ticket-labels'
import type { KitchenTicket } from '@/modules/orders/types'

const props = defineProps<{
  ticket: KitchenTicket
}>()

const emit = defineEmits<{
  close: []
}>()

const dialogEl = ref<HTMLDialogElement | null>(null)

const priorityClass: Record<KitchenTicket['priority'], string> = {
  normal: 'bg-surface-container-high text-on-surface-variant',
  high: 'bg-tertiary-fixed text-on-tertiary-container',
  urgent: 'bg-error-container text-on-error-container',
}

const accentClass: Record<KitchenTicket['status'], string> = {
  backlog: 'bg-secondary',
  cooking: 'bg-primary',
  plating: 'bg-tertiary',
  pass: 'bg-emerald-600',
  served: 'bg-outline',
}

function closeDialog(): void {
  dialogEl.value?.close()
}

onMounted(async () => {
  await nextTick()
  dialogEl.value?.showModal()
})
</script>

<template>
  <dialog
    ref="dialogEl"
    class="m-auto w-[min(100%-1.5rem,32rem)] overflow-hidden rounded-2xl bg-surface-container-lowest p-0 text-on-surface shadow-[0_24px_64px_rgba(27,28,29,0.18)] backdrop:bg-on-surface/45"
    aria-labelledby="ticket-dialog-title"
    @close="emit('close')"
  >
    <div class="flex max-h-[min(90vh,720px)] flex-col">
      <div class="h-1.5 w-full" :class="ticket.allergen ? 'bg-error' : accentClass[ticket.status]" />

      <header class="flex items-start justify-between gap-4 px-5 pt-5 pb-4 sm:px-6">
        <div class="flex min-w-0 items-start gap-3">
          <span
            class="font-headline flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-on-primary shadow-sm"
          >
            {{ ticket.tableNumber }}
          </span>
          <div class="min-w-0">
            <p class="font-label text-[11px] font-semibold tracking-widest text-tertiary uppercase">Comanda de cocina</p>
            <h2 id="ticket-dialog-title" class="font-headline mt-0.5 text-2xl leading-tight font-semibold">
              Mesa {{ ticket.tableNumber }}
            </h2>
            <p class="mt-0.5 text-sm text-on-surface-variant">{{ ticket.guests }} comensales</p>
          </div>
        </div>
        <button
          type="button"
          class="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          aria-label="Cerrar"
          @click="closeDialog"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div class="space-y-5 overflow-y-auto px-5 pb-5 sm:px-6">
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-mono rounded-lg bg-primary-fixed px-2.5 py-1 text-[11px] font-bold text-on-primary-fixed">
            {{ ticket.code }}
          </span>
          <span class="font-label rounded-lg bg-surface-container px-2.5 py-1 text-[11px] font-semibold text-on-surface">
            {{ ticketStatusLabel[ticket.status] }}
          </span>
          <span class="font-label rounded-lg px-2.5 py-1 text-[11px] font-semibold" :class="priorityClass[ticket.priority]">
            {{ ticketPriorityLabel[ticket.priority] }}
          </span>
        </div>

        <div>
          <p class="font-label text-[11px] font-semibold tracking-wider text-tertiary uppercase">{{ ticket.courseLabel }}</p>
          <p class="font-headline mt-1 text-lg leading-snug font-medium">{{ ticket.title }}</p>
        </div>

        <p
          v-if="ticket.allergen"
          class="flex items-start gap-2 rounded-xl bg-error-container px-3 py-2.5 text-sm font-semibold text-on-error-container"
          role="status"
        >
          <svg class="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
          <span>Alérgeno: {{ ticket.allergen }}</span>
        </p>

        <dl class="grid grid-cols-2 gap-2.5">
          <div class="rounded-xl bg-surface-container-low px-3 py-3">
            <dt class="font-label text-[10px] font-semibold tracking-wider text-on-surface-variant uppercase">Partida</dt>
            <dd class="mt-1 text-sm font-semibold text-on-surface">{{ ticket.station }}</dd>
          </div>
          <div class="rounded-xl bg-surface-container-low px-3 py-3">
            <dt class="font-label text-[10px] font-semibold tracking-wider text-on-surface-variant uppercase">Ubicación</dt>
            <dd class="mt-1 text-sm font-semibold text-on-surface">{{ ticket.location }}</dd>
          </div>
          <div class="rounded-xl bg-surface-container-low px-3 py-3">
            <dt class="font-label text-[10px] font-semibold tracking-wider text-on-surface-variant uppercase">Tiempo</dt>
            <dd class="mt-1 font-mono text-sm font-semibold text-on-surface">{{ ticket.waitLabel }}</dd>
          </div>
          <div class="rounded-xl bg-surface-container-low px-3 py-3">
            <dt class="font-label text-[10px] font-semibold tracking-wider text-on-surface-variant uppercase">Entrega</dt>
            <dd class="mt-1 text-sm font-semibold text-on-surface">{{ ticket.deliveredBy ?? 'Pendiente de sala' }}</dd>
          </div>
        </dl>

        <div v-if="ticket.progressPercent !== null" class="space-y-2 rounded-xl bg-surface px-3 py-3">
          <div class="flex items-center justify-between text-[11px]">
            <span class="font-mono font-semibold text-on-surface">{{ ticket.progressLabel }}</span>
            <span class="font-label font-semibold text-secondary">{{ ticket.progressPercent }}%</span>
          </div>
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div class="h-full rounded-full bg-primary" :style="{ width: `${ticket.progressPercent}%` }" />
          </div>
        </div>

        <div v-if="ticket.checklist.length > 0" class="space-y-2">
          <h3 class="font-label text-[11px] font-semibold tracking-widest text-on-surface-variant uppercase">
            Puntos de cocción
          </h3>
          <ul class="space-y-2">
            <li v-for="item in ticket.checklist" :key="item.label" class="flex items-start gap-2.5 text-sm">
              <span
                class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                :class="item.done ? 'bg-primary text-on-primary' : 'border border-outline-variant bg-surface'"
                aria-hidden="true"
              >
                <svg v-if="item.done" class="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </span>
              <span :class="item.done ? 'text-secondary line-through' : 'text-on-surface'">{{ item.label }}</span>
            </li>
          </ul>
        </div>

        <p v-if="ticket.pairing" class="rounded-xl bg-surface-container-low px-3 py-3 text-sm text-on-surface">
          <span class="font-label mb-1 block text-[10px] font-semibold tracking-wider text-on-surface-variant uppercase">Maridaje</span>
          {{ ticket.pairing }}
        </p>

        <p v-if="ticket.notes" class="text-sm leading-relaxed text-on-surface-variant">{{ ticket.notes }}</p>

        <div class="flex items-center gap-3 rounded-xl bg-surface-container-low px-3 py-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
            {{ ticket.chefInitials }}
          </span>
          <div>
            <p class="text-sm font-semibold text-on-surface">{{ ticket.chefName }}</p>
            <p class="text-xs text-on-surface-variant">Responsable de partida</p>
          </div>
        </div>
      </div>

      <footer class="border-t border-outline-variant/50 px-5 py-3 sm:px-6">
        <button
          type="button"
          class="font-label w-full rounded-xl bg-surface-container px-4 py-2.5 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
          @click="closeDialog"
        >
          Cerrar
        </button>
      </footer>
    </div>
  </dialog>
</template>
