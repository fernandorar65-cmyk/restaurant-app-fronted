<script setup lang="ts">
import type { RestaurantBadgeTone, RestaurantSite } from '@/modules/restaurants/types'

const props = defineProps<{
  restaurant: RestaurantSite
  isSelected: boolean
}>()

const emit = defineEmits<{
  enter: []
}>()

const badgeClass: Record<RestaurantBadgeTone, string> = {
  amber: 'bg-amber-500 text-slate-950',
  emerald: 'bg-emerald-600 text-white',
  wine: 'bg-amber-700 text-white',
  blue: 'bg-blue-600 text-white',
}
</script>

<template>
  <article
    class="flex flex-col justify-between overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
  >
    <div class="relative h-56 w-full overflow-hidden bg-slate-900">
      <img :alt="restaurant.name" class="h-full w-full object-cover object-center" :src="restaurant.imageUrl" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div class="absolute top-3 left-3 flex flex-wrap items-center gap-2">
        <span
          class="font-label flex items-center rounded px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase shadow-sm"
          :class="badgeClass[restaurant.badgeTone]"
        >
          {{ restaurant.badgeLabel }}
        </span>
        <span
          class="font-label flex items-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-950/80 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 shadow-sm backdrop-blur-sm"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
          {{ restaurant.statusLabel }}
        </span>
      </div>
      <p
        class="absolute top-3 right-3 rounded border border-white/20 bg-black/60 px-2 py-0.5 font-mono text-[10px] font-bold text-white backdrop-blur-sm"
      >
        {{ restaurant.code }}
      </p>
      <div class="absolute right-4 bottom-3 left-4">
        <p class="font-label text-[10px] font-bold tracking-widest text-amber-300 uppercase">
          {{ restaurant.cuisine }}
        </p>
        <h2 class="font-headline text-2xl leading-tight font-semibold tracking-tight text-white">
          {{ restaurant.name }}
        </h2>
      </div>
    </div>

    <div class="flex flex-1 flex-col justify-between space-y-4 p-5">
      <div class="flex items-center justify-between border-b border-gray-100 pb-2.5 text-xs text-gray-500">
        <p class="flex items-center gap-1 font-medium text-gray-600">
          <svg class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
            />
          </svg>
          <span>{{ restaurant.address }}</span>
        </p>
        <span class="font-mono text-[11px] text-gray-400">{{ restaurant.capacityLabel }}</span>
      </div>

      <div class="grid grid-cols-3 gap-2.5">
        <div class="flex flex-col justify-between rounded border border-gray-200 bg-gray-50/60 p-2.5">
          <span class="font-label text-[10px] font-bold text-gray-500 uppercase">Facturación hoy</span>
          <div class="my-1">
            <span class="font-headline block text-base font-bold text-gray-900">{{ restaurant.kpis.revenueLabel }}</span>
            <span class="font-label inline-block rounded bg-emerald-50 px-1 text-[10px] font-bold text-emerald-700">
              {{ restaurant.kpis.revenueHint }}
            </span>
          </div>
          <span class="text-[10px] text-gray-500">{{ restaurant.kpis.marginLabel }}</span>
        </div>
        <div class="flex flex-col justify-between rounded border border-gray-200 bg-gray-50/60 p-2.5">
          <span class="font-label text-[10px] font-bold text-gray-500 uppercase">Estado de stock</span>
          <div class="my-1">
            <span class="font-headline block text-base font-bold text-gray-900">{{ restaurant.kpis.stockLabel }}</span>
            <span class="block text-[10px] text-gray-500">{{ restaurant.kpis.stockHint }}</span>
          </div>
          <span class="text-[10px] font-medium text-emerald-700">{{ restaurant.kpis.stockNote }}</span>
        </div>
        <div class="flex flex-col justify-between rounded border border-gray-200 bg-gray-50/60 p-2.5">
          <span class="font-label text-[10px] font-bold text-gray-500 uppercase">Aforo</span>
          <div class="my-1">
            <span class="font-headline block text-base font-bold text-gray-900">
              {{ restaurant.kpis.occupancyLabel }}
            </span>
            <span class="block text-[10px] text-gray-500">{{ restaurant.kpis.occupancyHint }}</span>
          </div>
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div class="h-full bg-primary" :style="{ width: `${restaurant.kpis.occupancyPercent}%` }" />
          </div>
        </div>
      </div>

      <div
        class="flex flex-col items-stretch justify-between gap-3 border-t border-gray-100 pt-3 sm:flex-row sm:items-center"
      >
        <p class="text-xs font-medium text-gray-600">
          Rol: <strong class="text-gray-900">{{ restaurant.roleLabel }}</strong>
        </p>
        <button
          type="button"
          class="font-label flex items-center justify-center gap-1.5 rounded px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-colors"
          :class="
            props.isSelected
              ? 'border border-primary bg-primary/10 text-primary'
              : 'bg-primary text-on-primary hover:bg-primary-container'
          "
          @click="emit('enter')"
        >
          {{ isSelected ? 'Sede activa' : 'Entrar a sala de mando' }}
        </button>
      </div>
    </div>
  </article>
</template>
