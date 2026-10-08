<script setup lang="ts">
import AuthShowcasePanel from '@/modules/auth/components/AuthShowcasePanel.vue'
</script>

<template>
  <div class="grid min-h-screen grid-cols-1 overflow-hidden bg-background lg:grid-cols-12">
    <AuthShowcasePanel />

    <section
      class="col-span-1 flex flex-col justify-between overflow-y-auto bg-surface-bright p-6 sm:p-10 lg:col-span-5 lg:p-12 xl:p-16"
    >
      <div class="mb-8 flex items-center justify-between pb-4">
        <div class="flex items-center gap-2 lg:hidden">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary" aria-hidden="true">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
              />
            </svg>
          </div>
          <span class="font-headline text-base font-bold text-on-surface">Restaurant CMR</span>
        </div>
        <p class="font-label hidden text-xs font-semibold tracking-wider text-secondary uppercase lg:block">
          Acceso del personal
        </p>
        <p
          class="font-label flex items-center gap-2 rounded-full bg-surface-container-low px-2.5 py-0.5 text-xs font-medium text-on-surface-variant"
        >
          <span class="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
          Servicio activo
        </p>
      </div>

      <div class="mx-auto w-full max-w-md py-2">
        <slot />
      </div>

      <p class="font-label pt-6 text-xs text-outline">Sistema CMR · uso interno</p>
    </section>
  </div>
</template>
