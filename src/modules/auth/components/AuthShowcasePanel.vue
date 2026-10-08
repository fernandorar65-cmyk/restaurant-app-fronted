<script setup lang="ts">
import { AUTH_SHOWCASE_IMAGE_URL } from '@/modules/auth/brand'
</script>

<template>
  <section
    class="relative hidden overflow-hidden text-white select-none lg:col-span-7 lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14"
    aria-hidden="true"
  >
    <div
      class="absolute inset-0 scale-105 bg-cover bg-center"
      :style="{ backgroundImage: `url('${AUTH_SHOWCASE_IMAGE_URL}')` }"
    />
    <div class="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/75 to-[#1E3A8A]/60 mix-blend-multiply" />
    <div class="absolute inset-0 bg-gradient-to-r from-[#0F172A]/90 via-[#0F172A]/40 to-transparent" />

    <header class="relative z-10 flex items-center justify-between">
      <div class="flex items-center gap-3.5">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-on-primary shadow-lg shadow-black/20" aria-hidden="true">
          <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
            />
          </svg>
        </div>
        <div>
          <p class="font-headline block text-xl leading-tight font-bold tracking-wider text-white">
            Restaurant<span class="font-light text-tertiary-fixed">—CMR</span>
          </p>
          <p class="font-label block text-xs font-semibold tracking-[0.22em] text-primary-fixed-dim uppercase">
            Hospitality intelligence
          </p>
        </div>
      </div>
      <p
        class="font-label flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-0.5 text-xs tracking-wide text-white/90 backdrop-blur-md"
      >
        <span class="h-2 w-2 rounded-full bg-emerald-400" />
        Red central
      </p>
    </header>

    <div class="relative z-10 my-auto max-w-2xl py-12">
      <p
        class="font-label mb-6 inline-flex items-center rounded-full bg-white/10 px-3.5 py-1 text-xs tracking-widest text-tertiary-fixed uppercase backdrop-blur-md"
      >
        Precisión gastronómica
      </p>
      <p class="font-headline mb-6 text-4xl leading-[1.15] font-normal tracking-tight text-white xl:text-5xl">
        Donde la
        <em class="font-headline italic font-normal text-tertiary-fixed">alta cocina</em>
        se une con la precisión operativa.
      </p>
      <p class="mb-10 max-w-xl text-base leading-relaxed font-light text-slate-200/90 xl:text-lg">
        Ecosistema para orquestar brigada, menú, pedidos y servicio en una cadena de restaurantes.
      </p>
      <div class="grid grid-cols-3 gap-4">
        <article class="rounded-xl bg-slate-900/60 p-4 backdrop-blur-xl">
          <p class="font-label mb-2 text-xs tracking-wider text-slate-400 uppercase">Operación</p>
          <p class="font-headline text-2xl font-semibold tracking-tight text-white">Tiempo real</p>
          <p class="font-label mt-0.5 text-xs text-slate-300">Pedidos y cocina</p>
        </article>
        <article class="rounded-xl bg-slate-900/60 p-4 backdrop-blur-xl">
          <p class="font-label mb-2 text-xs tracking-wider text-slate-400 uppercase">Control</p>
          <p class="font-headline text-2xl font-semibold tracking-tight text-white">Trazable</p>
          <p class="font-label mt-0.5 text-xs text-slate-300">Mesas, menú y pagos</p>
        </article>
        <article class="rounded-xl bg-slate-900/60 p-4 backdrop-blur-xl">
          <p class="font-label mb-2 text-xs tracking-wider text-slate-400 uppercase">Red</p>
          <p class="font-headline text-2xl font-semibold tracking-tight text-white">Multi-sede</p>
          <p class="font-label mt-0.5 text-xs text-slate-300">Organizaciones y locales</p>
        </article>
      </div>
    </div>

    <p class="font-label relative z-10 text-xs text-slate-300/80">Restaurant CMR · acceso del personal</p>
  </section>
</template>
