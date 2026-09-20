<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'

import { useSessionStore } from '@/stores/session'
import { getInitials } from '@/utils/string'

const session = useSessionStore()
const router = useRouter()

async function logout(): Promise<void> {
  session.clearAuth()
  await router.push({ name: 'login' })
}
</script>

<template>
  <header
    class="sticky top-0 z-50 w-full border-b border-gray-200/80 bg-white/95 shadow-[0_1px_3px_rgba(0,0,0,0.03)] backdrop-blur-md"
  >
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-6 lg:px-8">
      <div class="flex items-center gap-5">
        <RouterLink :to="{ name: 'dashboard' }" class="flex items-center gap-3">
          <div
            class="flex h-9 w-9 items-center justify-center rounded bg-primary text-on-primary shadow-sm ring-1 ring-blue-700/20"
            aria-hidden="true"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
              />
            </svg>
          </div>
          <span class="flex flex-col">
            <span class="font-headline text-[17px] leading-none font-semibold tracking-tight text-gray-900">
              Restaurant-CMR
            </span>
            <span class="font-label mt-0.5 text-[10px] font-medium tracking-wider text-gray-500 uppercase">
              Editorial Cuisine System
            </span>
          </span>
        </RouterLink>
      </div>

      <nav class="font-label hidden items-center gap-7 text-xs font-medium tracking-wider uppercase lg:flex" aria-label="Portal">
        <RouterLink
          :to="{ name: 'dashboard' }"
          class="flex items-center border-b-2 border-primary py-5 -mb-px font-semibold text-primary"
        >
          Sedes
        </RouterLink>
      </nav>

      <div class="flex items-center gap-3">
        <div v-if="session.user" class="hidden items-center gap-2.5 border-l border-gray-200 pl-2 sm:flex">
          <div
            class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white"
          >
            {{ getInitials(session.user.name) }}
          </div>
          <div class="flex flex-col text-left">
            <span class="text-xs leading-tight font-semibold text-gray-900">{{ session.user.name }}</span>
            <span class="font-label text-[10px] leading-tight text-gray-500">{{ session.user.email }}</span>
          </div>
        </div>
        <button
          type="button"
          class="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-700"
          title="Cerrar sesión"
          @click="logout"
        >
          <span class="sr-only">Cerrar sesión</span>
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
            />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>
