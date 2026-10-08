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
    <div v-if="step === 'checking'" class="flex min-h-[50vh] flex-col items-center justify-center gap-3" role="status">
      <span class="h-10 w-10 animate-spin rounded-full border-4 border-primary-fixed border-t-primary" aria-hidden="true" />
      <p class="text-base text-on-surface-variant">Buscando tu mesa…</p>
    </div>

    <DinerNotice v-else-if="step === 'error'" :kind="errorKind" @retry="validate" />

    <DinerNotice
      v-else-if="step === 'wrong-table'"
      kind="no-table"
      title="Escanea el QR de tu mesa"
      message="Cada mesa tiene su propio código. Escanea el que está en tu mesa o pide ayuda a un mozo."
    />

    <div v-else-if="restaurant" class="mx-auto flex min-h-[65vh] max-w-md flex-col justify-center gap-6">
      <div class="overflow-hidden rounded-3xl bg-surface-container-lowest shadow-sm ring-1 ring-outline-variant/30">
        <img :src="restaurant.imageUrl" :alt="restaurant.name" class="h-36 w-full object-cover" />
        <div class="space-y-1 p-5 text-center">
          <p class="text-sm font-medium text-on-surface-variant">{{ restaurant.name }}</p>
          <p class="font-headline text-5xl font-semibold text-on-surface">Mesa {{ tableNumber }}</p>
          <p class="text-sm text-on-surface-variant">{{ restaurant.address }}</p>
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
