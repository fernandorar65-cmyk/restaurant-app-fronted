<script setup lang="ts">
import type { RestaurantBadgeTone, RestaurantSite } from '@/modules/restaurants/types'

defineProps<{
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
    class="flex flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm transition-shadow hover:shadow-md"
  >
    <div class="relative h-40 w-full overflow-hidden bg-on-surface/80">
      <img :alt="restaurant.name" class="h-full w-full object-cover object-center" :src="restaurant.imageUrl" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <span
        class="font-label absolute top-3 left-3 rounded px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase shadow-sm"
        :class="badgeClass[restaurant.badgeTone]"
      >
        {{ restaurant.badgeLabel }}
      </span>
      <div class="absolute right-4 bottom-3 left-4">
        <p class="font-label text-[10px] font-bold tracking-widest text-amber-300 uppercase">{{ restaurant.cuisine }}</p>
        <h2 class="font-headline text-xl leading-tight font-semibold tracking-tight text-white">{{ restaurant.name }}</h2>
      </div>
    </div>

    <div class="flex flex-1 flex-col justify-between gap-4 p-5">
      <p class="flex items-center gap-1.5 text-xs text-on-surface-variant">
        <svg class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
          />
        </svg>
        {{ restaurant.city }}
      </p>
      <button
        type="button"
        class="font-label rounded-xl px-4 py-2.5 text-xs font-semibold shadow-sm transition-colors"
        :class="
          isSelected
            ? 'border border-primary bg-primary/10 text-primary'
            : 'bg-primary text-on-primary hover:bg-primary-container'
        "
        @click="emit('enter')"
      >
        {{ isSelected ? 'Restaurante activo' : 'Ver menú' }}
      </button>
    </div>
  </article>
</template>
