<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import DinerNotice from '@/components/feedback/DinerNotice.vue'
import type { DinerNoticeKind } from '@/components/feedback/DinerNotice.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { fetchOpenAttentionForTable } from '@/modules/orders/api'
import type { Attention } from '@/modules/orders/types'
import { fetchRestaurantById, fetchSiteOperation, isRestaurantOpen } from '@/modules/restaurants/api'
import type { RestaurantSite } from '@/modules/restaurants/types'
import { useDinerStore } from '@/stores/diner'

usePageTitle('Mesa')

const route = useRoute()
const router = useRouter()
const diner = useDinerStore()

type Step = 'checking' | 'error' | 'confirm' | 'identity' | 'wrong-table'

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
      restaurantName: site.name,
      currency: site.currency,
      tableNumber: table,
      entry: 'qr',
    })

    openAttention.value = await fetchOpenAttentionForTable(site.id, table)

    if (alreadyConfirmed) {
      diner.setAttention(openAttention.value?.id ?? diner.attentionId)
      await router.replace({ name: 'menu' })
      return
    }

    step.value = 'confirm'
  } catch {
    fail('connection')
  }
}

function confirmTable(): void {
  step.value = 'identity'
}

async function continueAs(mode: 'guest' | 'account'): Promise<void> {
  diner.setAttention(openAttention.value?.id ?? null)

  if (mode === 'account' && !diner.customer) {
    await router.push({ name: 'diner-auth', query: { redirect: '/menu' } })
    return
  }

  diner.confirmTable()
  await router.replace({ name: 'menu' })
}

function rejectTable(): void {
  diner.leaveTable()
  step.value = 'wrong-table'
}

watch([tableNumber, queryRestaurantId, queryToken], () => void validate(), { immediate: true })
</script>

<template>
  <div>
    <p v-if="step === 'checking'" class="py-16 text-center text-sm text-on-surface-variant">Validando mesa…</p>

    <DinerNotice v-else-if="step === 'error'" :kind="errorKind" @retry="validate" />

    <DinerNotice
      v-else-if="step === 'wrong-table'"
      kind="no-table"
      title="Escanea el QR de tu mesa"
      message="Si el código no corresponde a tu mesa, escanea el QR que está en tu mesa o pide ayuda a un mozo."
    />

    <div v-else-if="restaurant" class="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-5 px-4 text-center">
      <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-on-primary" aria-hidden="true">
        <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3.75 6A2.25 2.25 0 0 1 6 3.75h12A2.25 2.25 0 0 1 20.25 6v2.25H3.75V6ZM3.75 10.5h16.5V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-7.5Z"
          />
        </svg>
      </span>

      <template v-if="step === 'confirm'">
        <div class="space-y-1">
          <p class="font-label text-[11px] font-bold tracking-widest text-primary uppercase">{{ restaurant.name }}</p>
          <h1 class="font-headline text-3xl font-semibold text-on-surface">Mesa {{ tableNumber }}</h1>
          <p class="text-sm text-on-surface-variant">{{ restaurant.address }}</p>
        </div>
        <p class="text-base text-on-surface">¿Estás en esta mesa?</p>
        <p v-if="openAttention" class="rounded-xl bg-primary-fixed px-4 py-2 text-xs text-on-primary-fixed">
          Esta mesa ya tiene un pedido en curso. Lo que pidas se sumará a la misma cuenta.
        </p>
        <div class="grid w-full gap-2">
          <button
            type="button"
            class="font-label rounded-xl bg-primary py-3 text-sm font-semibold text-on-primary shadow-sm hover:bg-primary-container"
            @click="confirmTable"
          >
            Sí, es mi mesa
          </button>
          <button
            type="button"
            class="font-label rounded-xl bg-surface-container py-3 text-sm font-semibold text-on-surface hover:bg-surface-container-high"
            @click="rejectTable"
          >
            No es mi mesa
          </button>
        </div>
      </template>

      <template v-else-if="step === 'identity'">
        <div class="space-y-1">
          <h1 class="font-headline text-2xl font-semibold text-on-surface">¿Cómo quieres continuar?</h1>
          <p class="text-sm text-on-surface-variant">No necesitas una cuenta para pedir.</p>
        </div>
        <div class="grid w-full gap-2">
          <button
            v-if="diner.customer"
            type="button"
            class="font-label rounded-xl bg-primary py-3 text-sm font-semibold text-on-primary shadow-sm hover:bg-primary-container"
            @click="continueAs('account')"
          >
            Continuar como {{ diner.customer.name }}
          </button>
          <button
            v-if="diner.customer"
            type="button"
            class="font-label rounded-xl bg-surface-container py-3 text-sm font-semibold text-on-surface hover:bg-surface-container-high"
            @click="diner.setCustomer(null)"
          >
            No soy {{ diner.customer.name }}
          </button>
          <button
            v-else
            type="button"
            class="font-label rounded-xl bg-primary py-3 text-sm font-semibold text-on-primary shadow-sm hover:bg-primary-container"
            @click="continueAs('guest')"
          >
            Continuar como invitado
          </button>
          <button
            v-if="!diner.customer"
            type="button"
            class="font-label rounded-xl bg-surface-container py-3 text-sm font-semibold text-on-surface hover:bg-surface-container-high"
            @click="continueAs('account')"
          >
            Iniciar sesión o crear cuenta
          </button>
        </div>
        <RouterLink class="text-xs text-on-surface-variant underline-offset-2 hover:underline" :to="{ name: 'home' }">
          Volver al inicio
        </RouterLink>
      </template>
    </div>
  </div>
</template>
