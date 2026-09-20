<script setup lang="ts">
import { floorStatusLabel } from '@/modules/restaurants/site-labels'
import type { LiveTable } from '@/modules/restaurants/types'

defineProps<{
  table: LiveTable
  highlight?: boolean
}>()

const tagClass: Record<LiveTable['tagTone'], string> = {
  critical: 'bg-tertiary-container/30 text-on-tertiary-container',
  alert: 'bg-error-container text-on-error-container',
  neutral: 'bg-surface-container-highest text-on-surface-variant',
}
</script>

<template>
  <article class="rounded-xl bg-surface-container-low p-4 transition-all duration-200 hover:bg-surface-container sm:p-5">
    <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div class="flex items-center gap-3">
        <span
          class="font-headline flex h-10 w-10 items-center justify-center rounded-xl text-base font-bold shadow-sm"
          :class="highlight ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface'"
        >
          {{ table.number }}
        </span>
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="font-label text-sm font-bold text-on-surface">
              Mesa {{ table.number }} · {{ table.occupiedSeats }}/{{ table.seats }} sillas
            </h3>
            <span
              class="font-label rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase"
              :class="tagClass[table.tagTone]"
            >
              {{ table.tagLabel }}
            </span>
          </div>
          <p class="mt-0.5 text-xs text-on-surface-variant">
            {{ table.location }} · {{ table.staff }} · {{ floorStatusLabel[table.floorStatus] }}
          </p>
        </div>
      </div>
      <span
        class="font-label inline-flex items-center gap-1.5 self-end rounded-lg bg-surface-container-lowest px-2.5 py-1 text-xs font-semibold text-on-surface shadow-xs sm:self-center"
      >
        <span v-if="highlight" class="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
        {{ table.statusLabel }}
      </span>
    </div>
    <div class="mt-4 flex flex-col justify-between gap-2 pt-3.5 text-xs sm:flex-row sm:items-center">
      <p class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
        <span class="font-label text-[11px] font-semibold tracking-wider text-tertiary uppercase">{{ table.courseLabel }}</span>
        <span class="hidden text-on-surface-variant sm:inline">|</span>
        <span class="font-medium text-on-surface">{{ table.dish }}</span>
      </p>
      <span class="rounded bg-surface-container-highest px-2 py-0.5 font-medium text-on-surface-variant">{{ table.note }}</span>
    </div>
  </article>
</template>
