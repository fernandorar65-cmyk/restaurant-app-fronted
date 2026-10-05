<script setup lang="ts">
import { RouterLink } from 'vue-router'

defineProps<{
  section: string
  title: string
  description?: string
}>()
</script>

<template>
  <div class="space-y-4">
    <nav
      class="font-label flex flex-wrap items-center gap-2 text-[11px] font-semibold tracking-widest text-on-surface-variant uppercase"
      aria-label="Migas"
    >
      <RouterLink class="transition-colors hover:text-primary" :to="{ name: 'admin-home' }">Administración</RouterLink>
      <span class="text-outline-variant">/</span>
      <span class="font-bold text-primary">{{ section }}</span>
    </nav>
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 class="font-headline text-2xl font-semibold tracking-tight text-on-surface sm:text-3xl">{{ title }}</h1>
        <p v-if="description" class="mt-1 text-sm text-on-surface-variant">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="flex flex-wrap gap-2">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
