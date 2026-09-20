<script setup lang="ts">
defineProps<{
  current: 'login' | 'register'
}>()
</script>

<template>
  <div class="mb-8 flex items-center rounded-xl bg-surface-container-high p-1.5 shadow-inner" role="tablist">
    <RouterLink
      :to="{ name: 'login' }"
      role="tab"
      :aria-selected="current === 'login'"
      class="font-label flex-1 rounded-lg px-4 py-2.5 text-center text-xs tracking-wide transition-all duration-200"
      :class="
        current === 'login'
          ? 'bg-primary font-semibold text-on-primary shadow-sm'
          : 'font-medium text-on-surface-variant hover:text-on-surface'
      "
    >
      Iniciar sesión
    </RouterLink>
    <RouterLink
      :to="{ name: 'register' }"
      role="tab"
      :aria-selected="current === 'register'"
      class="font-label flex-1 rounded-lg px-4 py-2.5 text-center text-xs tracking-wide transition-all duration-200"
      :class="
        current === 'register'
          ? 'bg-primary font-semibold text-on-primary shadow-sm'
          : 'font-medium text-on-surface-variant hover:text-on-surface'
      "
    >
      Crear cuenta
    </RouterLink>
  </div>
</template>
