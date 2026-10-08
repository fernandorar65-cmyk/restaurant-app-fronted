<script setup lang="ts">
const { title, description } = defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <section class="space-y-2">
    <h1 class="text-2xl font-semibold tracking-tight text-on-surface">
      {{ title }}
    </h1>
    <p v-if="description" class="text-on-surface-variant">
      {{ description }}
    </p>
    <slot />
  </section>
</template>
