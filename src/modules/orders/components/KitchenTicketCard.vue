<script setup lang="ts">
import { ticketPriorityLabel } from '@/modules/orders/ticket-labels'
import type { KitchenTicket } from '@/modules/orders/types'

defineProps<{
  ticket: KitchenTicket
  selected: boolean
}>()

const emit = defineEmits<{
  select: []
}>()

const borderClass: Record<KitchenTicket['status'], string> = {
  backlog: 'border-l-primary',
  cooking: 'border-l-primary-container',
  plating: 'border-l-tertiary',
  pass: 'border-l-emerald-600',
  served: 'border-l-outline',
}

const priorityClass: Record<KitchenTicket['priority'], string> = {
  normal: 'bg-surface-container-high text-on-surface-variant',
  high: 'bg-tertiary-fixed text-on-tertiary-container',
  urgent: 'bg-error-container text-on-error-container',
}
</script>

<template>
  <article>
    <button
      type="button"
      class="flex w-full flex-col gap-3 rounded-xl border-l-4 bg-surface-container-lowest p-4 text-left shadow-sm transition-shadow hover:shadow-md"
      :class="[
        ticket.allergen ? 'border-l-error' : borderClass[ticket.status],
        selected ? 'ring-2 ring-primary' : '',
      ]"
      :aria-pressed="selected"
      @click="emit('select')"
    >
      <div class="flex items-center justify-between gap-2">
        <div class="flex min-w-0 items-center gap-2">
          <span class="font-headline text-sm font-bold text-on-surface">Mesa {{ ticket.tableNumber }}</span>
          <span class="text-[11px] font-medium text-secondary">{{ ticket.guests }} pax</span>
        </div>
        <span class="font-mono shrink-0 rounded bg-primary-fixed/50 px-2 py-0.5 text-[11px] font-semibold text-primary">
          {{ ticket.code }}
        </span>
      </div>

      <div>
        <span class="font-label block text-[11px] font-semibold tracking-wider text-tertiary uppercase">
          {{ ticket.courseLabel }}
        </span>
        <h3 class="font-headline mt-0.5 text-sm leading-snug font-medium text-on-surface">{{ ticket.title }}</h3>
      </div>

      <p
        v-if="ticket.allergen"
        class="rounded-lg bg-error-container px-2 py-1.5 text-[11px] font-semibold text-on-error-container"
      >
        Alérgeno: {{ ticket.allergen }}
      </p>

      <div class="flex flex-wrap items-center gap-1.5">
        <span class="rounded bg-surface-container px-2 py-0.5 text-[10px] font-medium text-on-surface-variant">
          {{ ticket.location }}
        </span>
        <span class="rounded bg-surface-container-high px-2 py-0.5 text-[10px] font-medium text-on-surface-variant">
          {{ ticket.station }}
        </span>
        <span class="rounded px-2 py-0.5 text-[10px] font-semibold" :class="priorityClass[ticket.priority]">
          {{ ticketPriorityLabel[ticket.priority] }}
        </span>
      </div>

      <div v-if="ticket.progressPercent !== null" class="space-y-1">
        <div class="flex justify-between font-mono text-[11px]">
          <span class="font-semibold text-on-surface">{{ ticket.progressLabel }}</span>
          <span class="text-secondary">{{ ticket.progressPercent }}%</span>
        </div>
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
          <div class="h-full rounded-full bg-primary" :style="{ width: `${ticket.progressPercent}%` }" />
        </div>
      </div>

      <div class="flex items-center justify-between pt-1">
        <div class="flex min-w-0 items-center gap-2">
          <span
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-on-primary"
          >
            {{ ticket.chefInitials }}
          </span>
          <span class="truncate text-[11px] text-on-surface-variant">{{ ticket.chefName }}</span>
        </div>
        <span class="font-mono shrink-0 text-[11px] text-on-surface-variant">{{ ticket.waitLabel }}</span>
      </div>
    </button>
  </article>
</template>
