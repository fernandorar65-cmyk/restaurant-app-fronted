<script setup lang="ts">
import { computed } from 'vue'

import { ticketPriorityLabel } from '@/modules/orders/ticket-labels'
import type { KitchenTicket } from '@/modules/orders/types'

const props = defineProps<{
  ticket: KitchenTicket
  selected: boolean
}>()

const emit = defineEmits<{
  select: []
}>()

const isServed = computed(() => props.ticket.status === 'served')

const isLiteBacklog = computed(
  () => props.ticket.status === 'backlog' && props.ticket.waitLabel.toLowerCase().includes('espera'),
)

const isVip = computed(() => {
  const haystack = `${props.ticket.notes ?? ''} ${props.ticket.tags.join(' ')}`.toLowerCase()
  return haystack.includes('presidencial') || haystack.includes('vip')
})

const isAllergen = computed(() => props.ticket.allergen !== null)

const chefShortName = computed(() => props.ticket.chefName.split(' ')[0] ?? props.ticket.chefName)

const checklistProgress = computed(() => {
  const items = props.ticket.checklist
  if (items.length === 0) {
    return null
  }

  return `${items.filter((item) => item.done).length}/${items.length}`
})

const chips = computed(() => {
  if (props.ticket.tags.length > 0) {
    return props.ticket.tags
  }

  return [props.ticket.location, props.ticket.station]
})

const showPriorityChip = computed(() => {
  return props.ticket.priority !== 'normal' || (props.ticket.status === 'backlog' && props.ticket.tags.length > 0)
})

const passWaitParts = computed(() => {
  const label = props.ticket.waitLabel
  const match = label.match(/(\d{2}:\d{2}\s*min)/i)

  if (props.ticket.deliveredBy) {
    return {
      caption: 'Campana sonada:',
      time: match?.[1] ?? label,
    }
  }

  return {
    caption: 'En pasaplatos:',
    time: label,
  }
})

const servedCourse = computed(() => props.ticket.courseLabel.replace(/^Pase\s+/i, 'Pase ').replace(/\s+de\s+/i, '/'))

const cardClass = computed(() => {
  if (isServed.value) {
    return 'min-w-0 gap-1 rounded-xl bg-surface-container-lowest/80 p-2.5'
  }

  if (isLiteBacklog.value) {
    return 'min-w-0 gap-1.5 rounded-xl bg-surface-container-lowest/80 p-2.5'
  }

  if (isVip.value) {
    return 'relative min-w-0 gap-2 rounded-xl bg-surface-container-lowest p-2.5 shadow-md ring-1 ring-tertiary/20'
  }

  return 'min-w-0 gap-2 rounded-xl bg-surface-container-lowest p-2.5'
})

const borderClass = computed(() => {
  if (isAllergen.value) {
    return 'border-l-error'
  }

  const byStatus: Record<KitchenTicket['status'], string> = {
    backlog: isLiteBacklog.value ? 'border-l-secondary' : 'border-l-primary',
    cooking: 'border-l-primary',
    plating: isVip.value ? 'border-l-amber-500' : 'border-l-primary-fixed-dim',
    pass: 'border-l-emerald-600',
    served: 'border-l-transparent',
  }

  return byStatus[props.ticket.status]
})

const codeClass = computed(() => {
  if (isAllergen.value) {
    return 'bg-error-container text-error'
  }

  const byStatus: Record<KitchenTicket['status'], string> = {
    backlog: 'bg-primary-fixed/40 text-primary',
    cooking: 'bg-primary-fixed/40 text-primary',
    plating: isVip.value ? 'bg-tertiary-fixed text-tertiary' : 'bg-surface-container text-secondary',
    pass: 'bg-emerald-50 text-emerald-800',
    served: 'bg-surface-container text-secondary',
  }

  return byStatus[props.ticket.status]
})

const courseClass = computed(() => {
  const byStatus: Record<KitchenTicket['status'], string> = {
    backlog: 'text-tertiary',
    cooking: 'text-primary',
    plating: isVip.value ? 'text-tertiary' : 'text-on-surface-variant',
    pass: 'text-emerald-700',
    served: 'text-on-surface-variant',
  }

  return byStatus[props.ticket.status]
})

const avatarClass = computed(() => {
  if (isAllergen.value) {
    return 'bg-purple-200 text-purple-900'
  }

  const byStatus: Record<KitchenTicket['status'], string> = {
    backlog: 'bg-secondary-container text-on-secondary-container',
    cooking: 'bg-primary text-on-primary',
    plating: 'bg-tertiary-container text-on-tertiary-container',
    pass: 'bg-emerald-700 text-white',
    served: 'bg-surface-container-highest text-on-surface-variant',
  }

  return byStatus[props.ticket.status]
})
</script>

<template>
  <article class="min-w-0">
    <button
      type="button"
      class="flex min-w-0 w-full flex-col overflow-hidden border-l-4 text-left shadow-sm transition-shadow hover:shadow-md"
      :class="[cardClass, borderClass, selected ? 'ring-2 ring-primary' : '']"
      :aria-pressed="selected"
      @click="emit('select')"
    >
      <template v-if="isServed">
        <div class="flex items-center justify-between">
          <span class="font-headline text-xs font-bold text-on-surface">Mesa {{ ticket.tableNumber }} · {{ servedCourse }}</span>
          <span class="flex items-center font-mono text-[11px] font-semibold text-emerald-700">
            <svg class="mr-0.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            {{ ticket.waitLabel }}
          </span>
        </div>
        <p class="truncate text-[11px] text-secondary">{{ ticket.title }}</p>
        <span class="font-mono text-[9px] text-on-surface-variant">
          Entregado por: {{ ticket.deliveredBy ?? ticket.chefName }}
        </span>
      </template>

      <template v-else-if="isLiteBacklog">
        <div class="font-label flex items-center justify-between text-xs">
          <div class="flex items-center gap-2">
            <span class="font-headline font-bold text-on-surface">Mesa {{ ticket.tableNumber }}</span>
            <span class="text-[10px] text-secondary">{{ ticket.guests }} Pax</span>
          </div>
          <span class="rounded bg-surface-container px-1.5 py-0.5 font-mono text-[10px] text-secondary">{{ ticket.code }}</span>
        </div>
        <p class="font-headline text-xs leading-tight text-on-surface">{{ ticket.title }}</p>
        <div class="flex items-center justify-between pt-1">
          <span class="font-mono text-[10px] text-on-surface-variant">{{ ticket.waitLabel }}</span>
          <span class="text-[10px] font-semibold text-secondary">{{ ticket.courseLabel }}</span>
        </div>
      </template>

      <template v-else>
        <div
          v-if="isVip"
          class="font-label flex items-center justify-between rounded-lg bg-gradient-to-r from-amber-500/15 via-tertiary-fixed to-amber-500/10 p-2 text-xs font-bold text-on-tertiary-container"
        >
          <span class="flex items-center gap-1.5">
            <svg class="h-4 w-4 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M5 16 3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5Zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1Z"
              />
            </svg>
            ★ Inspector guía Michelin en sala
          </span>
          <span class="rounded bg-white/80 px-1.5 py-0.5 font-mono text-[10px] shadow-sm">VIP crítico</span>
        </div>

        <div class="font-label flex items-center justify-between gap-2 text-xs">
          <div class="flex min-w-0 items-center gap-2">
            <span
              class="font-headline text-sm font-bold"
              :class="isAllergen ? 'flex items-center gap-1 text-error' : 'text-on-surface'"
            >
              <svg
                v-if="isAllergen"
                class="h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
              Mesa {{ ticket.tableNumber }}
            </span>
            <span class="text-[11px] font-medium text-secondary">
              {{ ticket.guests }} Pax
              <template v-if="isVip"> (Mesa presidencial)</template>
            </span>
          </div>
          <span class="shrink-0 rounded px-2 py-0.5 font-mono text-[11px] font-semibold" :class="codeClass">
            {{ ticket.code }}
          </span>
        </div>

        <p
          v-if="isAllergen"
          class="font-label flex items-center gap-2 rounded-lg bg-error-container/80 p-2 text-xs font-semibold text-on-error-container"
        >
          <svg class="h-4 w-4 shrink-0 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.001C19.48 4.841 16.04 3 12 3Z"
            />
          </svg>
          <span>Alergia severa: {{ ticket.allergen }}</span>
        </p>

        <div>
          <span class="font-label block text-[11px] font-semibold tracking-wider uppercase" :class="courseClass">
            {{ ticket.courseLabel }}
          </span>
          <h3
            class="font-headline mt-0.5 line-clamp-2 leading-snug text-on-surface"
            :class="isVip ? 'text-sm font-bold' : 'text-sm font-semibold'"
          >
            {{ ticket.title }}
          </h3>
        </div>

        <div v-if="ticket.status !== 'pass' && !isVip" class="flex flex-wrap items-center gap-1.5">
          <span
            v-for="chip in chips"
            :key="chip"
            class="font-label rounded px-2 py-0.5 text-[10px] font-medium"
            :class="chip.toLowerCase().includes('bloqueo') ? 'bg-error/10 font-bold text-error' : 'bg-surface-container text-on-surface-variant'"
          >
            {{ chip }}
          </span>
          <span
            v-if="showPriorityChip && ticket.status !== 'plating'"
            class="font-label rounded px-2 py-0.5 text-[10px] font-semibold"
            :class="ticket.priority === 'normal' ? 'bg-emerald-100 text-emerald-800' : 'bg-error-container text-on-error-container'"
          >
            {{ ticketPriorityLabel[ticket.priority] }}
          </span>
        </div>

        <div
          v-if="ticket.checklist.length > 0"
          class="font-label flex flex-col gap-1.5 rounded-lg bg-surface p-2.5 text-[11px]"
        >
          <div class="flex items-center justify-between text-secondary">
            <span>Puntos de cocción / Subtareas:</span>
            <span class="font-mono font-semibold text-on-surface">{{ checklistProgress }}</span>
          </div>
          <div v-for="item in ticket.checklist" :key="item.label" class="flex items-center gap-2">
            <span
              class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm"
              :class="item.done ? 'bg-emerald-600 text-white' : 'border border-primary bg-surface'"
              aria-hidden="true"
            >
              <svg v-if="item.done" class="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </span>
            <span :class="item.done ? 'text-secondary line-through' : 'font-medium text-on-surface'">{{ item.label }}</span>
          </div>
        </div>

        <div v-if="ticket.progressPercent !== null">
          <div class="mb-1 flex items-center justify-between font-mono text-[11px]">
            <span class="flex items-center gap-1 font-semibold text-on-surface">
              <svg class="h-3.5 w-3.5 animate-spin text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2" />
                <circle cx="12" cy="12" r="9" />
              </svg>
              {{ ticket.progressLabel }}
            </span>
            <span class="font-medium text-secondary">{{ ticket.progressPercent }}% completado</span>
          </div>
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
            <div class="h-1.5 rounded-full bg-gradient-to-r from-primary to-primary-container" :style="{ width: `${ticket.progressPercent}%` }" />
          </div>
        </div>

        <div v-if="isVip" class="font-label grid grid-cols-2 gap-2 rounded-lg bg-surface p-2.5 text-[11px]">
          <div>
            <span class="block text-[10px] text-secondary uppercase">Control calidad</span>
            <span class="block truncate text-xs font-bold text-on-surface">{{ ticket.chefName }}</span>
          </div>
          <div>
            <span class="block text-[10px] text-secondary uppercase">Notas de pase</span>
            <span class="block truncate text-xs font-medium text-on-surface">{{ ticket.notes }}</span>
          </div>
        </div>

        <div
          v-if="isVip"
          class="flex items-center justify-between rounded bg-amber-50/70 p-2 font-mono text-xs text-amber-900"
        >
          <span>{{ ticket.waitLabel }}</span>
          <span class="font-sans text-[10px] font-bold tracking-wide text-amber-800 uppercase">Prioridad cero</span>
        </div>

        <div
          v-if="ticket.status === 'pass'"
          class="flex items-center justify-between rounded-lg px-2.5 py-2.5 font-mono text-xs font-semibold"
          :class="ticket.deliveredBy ? 'bg-emerald-50 text-emerald-900' : 'bg-surface text-on-surface'"
        >
          <span class="flex items-center gap-1.5">
            <span v-if="ticket.deliveredBy" class="relative flex h-2 w-2">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-600 opacity-75" />
              <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
            </span>
            {{ passWaitParts.caption }}
          </span>
          <span :class="ticket.deliveredBy ? 'text-sm font-bold text-emerald-800' : 'font-semibold text-on-surface'">
            {{ passWaitParts.time }}
          </span>
        </div>

        <p
          v-if="ticket.pairing"
          class="font-label flex items-center gap-2 rounded-lg bg-purple-50 p-2 text-xs text-purple-900"
        >
          <svg class="h-4 w-4 shrink-0 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 4h8v3a4 4 0 0 1-4 4 4 4 0 0 1-4-4V4Zm4 7v9m-3 0h6" />
          </svg>
          <span class="truncate">Maridaje listo: <strong>{{ ticket.pairing }}</strong></span>
        </p>

        <p v-if="ticket.status === 'pass' && ticket.deliveredBy" class="font-label flex items-center gap-1 text-[11px] text-on-surface-variant">
          Asignado recogida: <strong>{{ ticket.deliveredBy }}</strong>
        </p>

        <div v-if="!isVip" class="font-label flex items-center justify-between gap-2 pt-2 text-xs">
          <div class="flex min-w-0 items-center gap-1.5">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold" :class="avatarClass">
              {{ ticket.chefInitials }}
            </span>
            <span class="truncate text-[11px] text-on-surface-variant">
              {{ ticket.status === 'plating' && ticket.pairing ? `Emplatando: ${ticket.station}` : chefShortName }}
            </span>
          </div>
          <span v-if="isAllergen" class="shrink-0 font-mono text-[11px] font-semibold text-error">
            {{ ticket.waitLabel }}
          </span>
          <span
            v-else-if="ticket.status === 'backlog'"
            class="rounded bg-surface-container px-2.5 py-1 text-[11px] font-semibold text-primary"
            aria-hidden="true"
          >
            Marchar →
          </span>
          <span v-else-if="ticket.status === 'cooking'" class="flex items-center gap-1.5" aria-hidden="true">
            <span class="px-2 py-1 text-[11px] font-medium text-secondary">Retener</span>
            <span class="rounded bg-primary px-2.5 py-1 text-[11px] font-semibold text-on-primary shadow-sm">A emplatar</span>
          </span>
          <span
            v-else-if="ticket.status === 'plating' && ticket.pairing"
            class="rounded bg-surface-container px-3 py-1 text-[11px] font-semibold text-primary"
            aria-hidden="true"
          >
            Al pasaplatos →
          </span>
        </div>

        <span
          v-if="isAllergen"
          class="flex w-full items-center justify-center rounded-lg bg-error py-1.5 text-xs font-semibold text-on-error"
          aria-hidden="true"
        >
          Protocolo de alérgeno activo
        </span>
        <span
          v-else-if="isVip"
          class="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-tertiary to-amber-700 py-2 text-xs font-bold text-white"
          aria-hidden="true"
        >
          Pase VIP en emplatado
        </span>
        <span
          v-else-if="ticket.status === 'pass'"
          class="flex w-full items-center justify-center rounded-lg py-2 text-xs font-semibold"
          :class="ticket.deliveredBy ? 'bg-emerald-700 text-white' : 'bg-surface-container text-on-surface'"
          aria-hidden="true"
        >
          {{ ticket.deliveredBy ? 'Listo para entrega a sala' : 'En pasaplatos' }}
        </span>
      </template>
    </button>
  </article>
</template>
