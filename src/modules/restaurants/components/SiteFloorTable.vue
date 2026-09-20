<script setup lang="ts">
import { computed } from 'vue'

import { floorStatusLabel } from '@/modules/restaurants/site-labels'
import type { LiveTable } from '@/modules/restaurants/types'

const props = defineProps<{
  table: LiveTable
  selected: boolean
}>()

const emit = defineEmits<{
  select: []
}>()

const seatTone: Record<LiveTable['floorStatus'], string> = {
  occupied: 'border-primary bg-primary text-on-primary',
  available: 'border-outline-variant bg-surface-container-lowest text-on-surface',
  reserved: 'border-tertiary bg-tertiary-fixed text-on-tertiary-container',
  cleaning: 'border-outline bg-surface-container-high text-on-surface-variant',
}

const seats = computed(() => {
  const total = Math.max(props.table.seats, 1)

  return Array.from({ length: total }, (_, index) => {
    const angle = ((Math.PI * 2 * index) / total) - Math.PI / 2
    const radius = 34

    return {
      occupied: index < props.table.occupiedSeats,
      style: {
        left: `calc(50% + ${Math.cos(angle) * radius}px)`,
        top: `calc(50% + ${Math.sin(angle) * radius}px)`,
      },
    }
  })
})
</script>

<template>
  <button
    type="button"
    class="flex flex-col items-center gap-2 rounded-xl p-2 text-left transition-colors hover:bg-surface-container"
    :class="selected ? 'bg-surface-container ring-2 ring-primary' : ''"
    :aria-pressed="selected"
    :aria-label="`Mesa ${table.number}, ${floorStatusLabel[table.floorStatus]}, ${table.occupiedSeats} de ${table.seats} sillas`"
    @click="emit('select')"
  >
    <span class="relative block h-[88px] w-[88px]">
      <span
        v-for="(seat, index) in seats"
        :key="index"
        class="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
        :class="seat.occupied ? 'bg-primary' : 'bg-outline-variant'"
        :style="seat.style"
        aria-hidden="true"
      />
      <span
        class="absolute top-1/2 left-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border-2 text-xs font-bold"
        :class="seatTone[table.floorStatus]"
      >
        {{ table.number }}
      </span>
    </span>
    <span class="font-label text-[10px] font-semibold tracking-wide text-on-surface-variant uppercase">
      {{ table.occupiedSeats }}/{{ table.seats }} sillas
    </span>
  </button>
</template>
