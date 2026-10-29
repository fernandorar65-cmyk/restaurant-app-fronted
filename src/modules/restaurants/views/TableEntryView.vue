<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import BaseButton from '@/components/base/BaseButton.vue'
import DinerNotice from '@/components/feedback/DinerNotice.vue'
import type { DinerNoticeKind } from '@/components/feedback/DinerNotice.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { fetchOpenAttentionForTable } from '@/modules/orders/api'
import type { Attention } from '@/modules/orders/types'
import { fetchRestaurantById, fetchSiteOperation, isRestaurantOpen } from '@/modules/restaurants/api'
import type { RestaurantSite } from '@/modules/restaurants/types'
import { useDinerStore } from '@/stores/diner'
import { getInitials } from '@/utils/string'

usePageTitle('Mesa')

const route = useRoute()
const router = useRouter()
const diner = useDinerStore()

type Step = 'checking' | 'error' | 'confirm' | 'wrong-table'

const step = ref<Step>('checking')
const errorKind = ref<DinerNoticeKind>('invalid-qr')
const restaurant = ref<RestaurantSite | null>(null)
const openAttention = ref<Attention | null>(null)

const tableNumber = computed(() => (typeof route.params.tableId === 'string' ? route.params.tableId : null))
const queryRestaurantId = computed(() => (typeof route.query.restaurant === 'string' ? route.query.restaurant : null))
const queryToken = computed(() => (typeof route.query.token === 'string' ? route.query.token : null))

function fail(kind: DinerNoticeKind): void {
  errorKind.value = kind
  step.value = 'error'
}

/**
 * Valida el QR (sede activa, mesa existente y habilitada, token vigente) y
 * fija el contexto del comensal. Si ya confirmó esta misma mesa, va directo a la carta.
 */
async function validate(): Promise<void> {
  const table = tableNumber.value
  const restaurantId = queryRestaurantId.value
  const token = queryToken.value
  step.value = 'checking'

  if (!table || !restaurantId || !token) {
    fail('invalid-qr')
    return
  }

  try {
    const [site, operation] = await Promise.all([fetchRestaurantById(restaurantId), fetchSiteOperation(restaurantId)])
    const liveTable = operation?.tables.find((item) => item.number === table)

    if (!site || !liveTable || liveTable.qrToken !== token || !liveTable.qrActive) {
      fail('invalid-qr')
      return
    }

    if (!isRestaurantOpen(site)) {
      fail('restaurant-closed')
      return
    }

    if (liveTable.status === 'maintenance') {
      fail('table-maintenance')
      return
    }

    if (liveTable.status === 'inactive') {
      fail('table-inactive')
      return
    }

    restaurant.value = site
    const alreadyConfirmed = diner.confirmed && diner.restaurantId === site.id && diner.tableNumber === table

    diner.setTable({
      restaurantId: site.id,
      restaurantSlug: site.slug,
      restaurantName: site.name,
      currency: site.currency,
      tableNumber: table,
      entry: 'qr',
    })

    openAttention.value = await fetchOpenAttentionForTable(site.id, table)

    if (alreadyConfirmed) {
      diner.setAttention(openAttention.value?.id ?? diner.attentionId)
      await router.replace(diner.menuRoute)
      return
    }

    step.value = 'confirm'
  } catch {
    fail('connection')
  }
}

async function continueAs(mode: 'guest' | 'account'): Promise<void> {
  diner.setAttention(openAttention.value?.id ?? null)

  if (mode === 'account' && !diner.customer) {
    await router.push({ name: 'diner-auth', query: { redirect: router.resolve(diner.menuRoute).fullPath } })
    return
  }

  diner.confirmTable()
  await router.replace(diner.menuRoute)
}

function rejectTable(): void {
  diner.leaveTable()
  step.value = 'wrong-table'
}

watch([tableNumber, queryRestaurantId, queryToken], () => void validate(), { immediate: true })
</script>

<template>
  <div>
    <!-- Esqueleto con la misma forma que la confirmación: evita saltos al cargar. -->
    <div v-if="step === 'checking'" class="mx-auto flex min-h-[65vh] max-w-md flex-col justify-center gap-6" role="status">
      <div class="overflow-hidden rounded-3xl bg-surface-container-lowest ring-1 ring-outline-variant/30">
        <div class="skeleton h-36 rounded-none" />
        <div class="flex flex-col items-center gap-3 p-5">
          <div class="skeleton h-4 w-40" />
          <div class="skeleton h-12 w-48" />
          <div class="skeleton h-4 w-56" />
        </div>
      </div>
      <p class="text-center text-base text-on-surface-variant">Buscando tu mesa…</p>
    </div>

    <DinerNotice v-else-if="step === 'error'" :kind="errorKind" @retry="validate" />

    <DinerNotice
      v-else-if="step === 'wrong-table'"
      kind="no-table"
      title="Escanea el QR de tu mesa"
      message="Cada mesa tiene su propio código. Escanea el que está en tu mesa o pide ayuda a un mozo."
    />

    <div v-else-if="restaurant" class="mx-auto flex min-h-[65vh] max-w-md flex-col justify-center gap-6">
      <h1 class="font-headline text-center text-3xl text-on-surface">¿Estás en esta <span class="text-heading-accent">mesa?</span></h1>

      <div class="overflow-hidden rounded-3xl bg-surface-container-lowest shadow-sm ring-1 ring-outline-variant/30">
        <img :src="restaurant.imageUrl" alt="" class="h-36 w-full object-cover" />
        <div class="relative flex flex-col items-center gap-1 px-5 pt-10 pb-6 text-center">
          <span
            class="font-label absolute -top-8 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-on-primary shadow-md ring-4 ring-surface-container-lowest"
            aria-hidden="true"
          >
            {{ getInitials(restaurant.name) }}
          </span>
          <p class="text-base font-semibold text-on-surface">{{ restaurant.name }}</p>
          <p class="font-label mt-2 rounded-2xl bg-primary-fixed px-6 py-2 text-4xl font-bold text-on-primary-fixed tabular-nums">
            Mesa {{ tableNumber }}
          </p>
          <p class="mt-2 flex items-center gap-1.5 text-sm text-on-surface-variant">
            <svg class="h-4 w-4 shrink-0 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            {{ restaurant.address }}
          </p>
        </div>
      </div>

      <div v-if="openAttention" class="flex items-start gap-3 rounded-2xl bg-primary-fixed px-4 py-3 text-on-primary-fixed" role="note">
        <svg class="mt-0.5 h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
        <p class="text-sm">Tu mesa ya tiene un pedido en curso: lo que pidas se suma a la misma cuenta.</p>
      </div>

      <div class="space-y-3">
        <BaseButton variant="primary" size="lg" block @click="continueAs(diner.customer ? 'account' : 'guest')">
          {{ diner.customer ? `Sí, es mi mesa · pedir como ${diner.customer.name}` : 'Sí, es mi mesa · ver la carta' }}
        </BaseButton>
        <BaseButton variant="secondary" size="lg" block @click="rejectTable">No es mi mesa</BaseButton>
      </div>

      <p class="text-center text-sm text-on-surface-variant">
        <template v-if="diner.customer">
          ¿No eres {{ diner.customer.name }}?
          <button type="button" class="min-h-11 font-semibold text-primary underline-offset-2 hover:underline" @click="diner.setCustomer(null)">
            Pedir como invitado
          </button>
        </template>
        <template v-else>
          No necesitas cuenta para pedir.
          <button type="button" class="min-h-11 font-semibold text-primary underline-offset-2 hover:underline" @click="continueAs('account')">
            Iniciar sesión (opcional)
          </button>
        </template>
      </p>
    </div>
  </div>
</template>
