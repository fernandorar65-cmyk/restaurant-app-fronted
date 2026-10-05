<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import DinerNotice from '@/components/feedback/DinerNotice.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import {
  addOrderedProducts,
  BusinessRuleError,
  errorMessage,
  openOrReuseAttention,
  validateOrderItems,
} from '@/modules/orders/api'
import type { CartIssue } from '@/modules/orders/api'
import { useCartStore } from '@/stores/cart'
import { useDinerStore } from '@/stores/diner'
import { formatMoney } from '@/utils/money'

usePageTitle('Carrito')

const cart = useCartStore()
const diner = useDinerStore()
const router = useRouter()

const isSubmitting = ref(false)
const submitError = ref<string | null>(null)
const issues = ref<CartIssue[]>([])
const sent = ref<{ attentionId: string; count: number } | null>(null)

const blockingIssues = computed(() => issues.value.filter((issue) => issue.kind !== 'price-changed'))
const priceIssues = computed(() => issues.value.filter((issue) => issue.kind === 'price-changed'))

const issueLabel: Record<CartIssue['kind'], string> = {
  missing: 'ya no está en la carta',
  inactive: 'ya no está en la carta',
  unavailable: 'se agotó',
  'price-changed': 'cambió de precio',
}

function removeUnavailable(): void {
  for (const issue of blockingIssues.value) {
    cart.removeItem(issue.productId)
  }

  issues.value = priceIssues.value
}

function acceptNewPrices(): void {
  for (const issue of priceIssues.value) {
    if (issue.currentPrice !== null) {
      cart.setPrice(issue.productId, issue.currentPrice)
    }
  }

  issues.value = blockingIssues.value
}

async function confirmOrder(): Promise<void> {
  const restaurantId = diner.restaurantId
  const tableNumber = diner.tableNumber

  if (!restaurantId || !tableNumber || !diner.confirmed || cart.items.length === 0 || isSubmitting.value) {
    return
  }

  isSubmitting.value = true
  submitError.value = null

  try {
    issues.value = await validateOrderItems(
      restaurantId,
      cart.items.map((item) => ({ productId: item.productId, name: item.name, unitPrice: item.price })),
    )

    if (issues.value.length > 0) {
      return
    }

    const attention = await openOrReuseAttention(restaurantId, tableNumber, {
      customerId: diner.customer?.id ?? null,
    })

    await addOrderedProducts(
      attention,
      cart.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        unitPrice: item.price,
        quantity: item.quantity,
        notes: item.notes.trim(),
      })),
      { batchId: cart.batchId, createdBy: null, customerId: diner.customer?.id ?? null },
    )

    sent.value = { attentionId: attention.id, count: cart.itemCount }
    diner.setAttention(attention.id)
    cart.clear()
  } catch (error) {
    // El batchId del carrito se conserva: reintentar no duplica lo que ya llegó.
    submitError.value =
      error instanceof BusinessRuleError
        ? error.message
        : errorMessage(error, 'No se pudo enviar el pedido. Revisa tu conexión y vuelve a intentarlo.')
  } finally {
    isSubmitting.value = false
  }
}

async function goToStatus(): Promise<void> {
  if (sent.value) {
    await router.push({ name: 'order-status', params: { attentionId: sent.value.attentionId } })
  }
}
</script>

<template>
  <div class="space-y-5 pb-8">
    <div v-if="sent" class="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 text-center">
      <span class="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700" aria-hidden="true">
        <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </span>
      <h1 class="font-headline text-2xl font-semibold text-on-surface">¡Pedido enviado!</h1>
      <p class="text-sm text-on-surface-variant">
        El restaurante recibió tus {{ sent.count }} producto(s) para la mesa {{ diner.tableNumber }}. Te avisaremos cuando
        estén confirmados y listos.
      </p>
      <button
        type="button"
        class="font-label w-full rounded-xl bg-primary py-3 text-sm font-semibold text-on-primary hover:bg-primary-container"
        @click="goToStatus"
      >
        Seguir mi pedido
      </button>
    </div>

    <DinerNotice v-else-if="!diner.isReadyToOrder" kind="no-table">
      <RouterLink
        v-if="diner.restaurantId"
        class="font-label rounded-xl bg-surface-container px-5 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-high"
        :to="{ name: 'menu' }"
      >
        Ver la carta
      </RouterLink>
    </DinerNotice>

    <template v-else>
      <div>
        <h1 class="font-headline text-2xl font-semibold text-on-surface">Tu carrito</h1>
        <p class="text-sm text-on-surface-variant">{{ diner.restaurantName }} · Mesa {{ diner.tableNumber }}</p>
      </div>

      <div v-if="cart.items.length === 0" class="space-y-3 rounded-2xl bg-surface-container-lowest p-6 text-center">
        <p class="text-sm text-on-surface-variant">Todavía no añadiste productos.</p>
        <RouterLink
          class="font-label inline-flex rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary"
          :to="{ name: 'menu' }"
        >
          Ver el menú
        </RouterLink>
      </div>

      <template v-else>
        <div v-if="issues.length > 0" class="space-y-3 rounded-2xl bg-tertiary-fixed/50 p-4" role="alert">
          <p class="text-sm font-semibold text-on-surface">Algo cambió en la carta desde que armaste tu pedido:</p>
          <ul class="space-y-1 text-sm text-on-surface">
            <li v-for="issue in issues" :key="issue.productId">
              <span class="font-semibold">{{ issue.name }}</span> {{ issueLabel[issue.kind] }}
              <template v-if="issue.currentPrice !== null">
                (ahora {{ formatMoney(issue.currentPrice, diner.currency) }})
              </template>
            </li>
          </ul>
          <div class="flex flex-wrap gap-2">
            <button
              v-if="blockingIssues.length > 0"
              type="button"
              class="font-label rounded-lg bg-on-surface px-3 py-1.5 text-xs font-semibold text-surface"
              @click="removeUnavailable"
            >
              Quitar los no disponibles
            </button>
            <button
              v-if="priceIssues.length > 0"
              type="button"
              class="font-label rounded-lg bg-on-surface px-3 py-1.5 text-xs font-semibold text-surface"
              @click="acceptNewPrices"
            >
              Aceptar precios nuevos
            </button>
          </div>
        </div>

        <ul class="space-y-3">
          <li v-for="item in cart.items" :key="item.productId" class="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-headline text-sm font-semibold text-on-surface">{{ item.name }}</p>
                <p class="mt-0.5 text-xs text-on-surface-variant">{{ formatMoney(item.price, diner.currency) }} / unidad</p>
              </div>
              <button type="button" class="text-xs font-semibold text-error" @click="cart.removeItem(item.productId)">
                Quitar
              </button>
            </div>
            <div class="mt-3 flex items-center justify-between gap-3">
              <div class="flex items-center gap-3 rounded-full bg-surface-container px-1 py-1">
                <button
                  type="button"
                  class="flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high"
                  aria-label="Quitar unidad"
                  @click="cart.setQuantity(item.productId, item.quantity - 1)"
                >
                  −
                </button>
                <span class="font-label w-4 text-center text-sm font-bold text-on-surface">{{ item.quantity }}</span>
                <button
                  type="button"
                  class="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-on-primary hover:bg-primary-container"
                  aria-label="Añadir unidad"
                  @click="cart.setQuantity(item.productId, item.quantity + 1)"
                >
                  +
                </button>
              </div>
              <span class="font-label text-sm font-bold text-on-surface">
                {{ formatMoney(item.price * item.quantity, diner.currency) }}
              </span>
            </div>
            <label class="mt-3 block">
              <span class="sr-only">Notas para {{ item.name }}</span>
              <input
                class="w-full rounded-lg bg-surface px-3 py-1.5 text-xs text-on-surface shadow-inner outline-none ring-1 ring-transparent placeholder:text-on-surface-variant/60 focus:ring-primary"
                placeholder="Notas (ej: sin cebolla)"
                type="text"
                :value="item.notes"
                @input="cart.setNotes(item.productId, ($event.target as HTMLInputElement).value)"
              />
            </label>
          </li>
        </ul>

        <div class="space-y-3 rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <div class="flex items-center justify-between text-sm">
            <span class="text-on-surface-variant">Total estimado</span>
            <span class="font-headline text-lg font-semibold text-on-surface">{{ formatMoney(cart.subtotal, diner.currency) }}</span>
          </div>
          <p class="text-[11px] text-on-surface-variant">El restaurante confirma cada producto; lo que se rechace no se cobra.</p>
          <p
            v-if="submitError"
            class="rounded-lg border border-error-container bg-error-container px-3 py-2 text-xs text-on-error-container"
            role="alert"
          >
            {{ submitError }}
          </p>
          <button
            type="button"
            class="font-label w-full rounded-xl bg-primary py-3 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:opacity-60"
            :disabled="isSubmitting || issues.length > 0"
            @click="confirmOrder"
          >
            {{ isSubmitting ? 'Enviando pedido…' : submitError ? 'Reintentar envío' : 'Confirmar pedido' }}
          </button>
        </div>
      </template>
    </template>
  </div>
</template>
