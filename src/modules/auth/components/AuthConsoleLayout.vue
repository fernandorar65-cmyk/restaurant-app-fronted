<script setup lang="ts">
import { AUTH_LOGO_URL } from '@/modules/auth/brand'
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
          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high p-1">
            <img alt="" class="h-full w-full object-contain" :src="AUTH_LOGO_URL" />
          </div>
          <span class="font-headline text-base font-bold text-on-surface">Restaurant CMR</span>
        </div>
        <p class="font-label hidden text-xs font-semibold tracking-wider text-secondary uppercase lg:block">
          Acceso del personal
        </p>
        <p
          class="font-label flex items-center gap-2 rounded-full bg-surface-container-low px-2.5 py-1 text-xs font-medium text-on-surface-variant"
        >
          <span class="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
          Servicio activo
        </p>
      </div>

      <div class="mx-auto w-full max-w-md py-2">
        <slot />
      </div>

      <p class="font-label pt-6 text-[11px] text-outline">Sistema CMR · uso interno</p>
    </section>
  </div>
</template>
