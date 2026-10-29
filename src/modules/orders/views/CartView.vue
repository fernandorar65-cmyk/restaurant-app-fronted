<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import BaseButton from '@/components/base/BaseButton.vue'
import EmptyState from '@/components/base/EmptyState.vue'
import QuantityStepper from '@/modules/menus/components/QuantityStepper.vue'
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
const isCheckingOut = ref(false)

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

/**
 * Sin mesa confirmada: revisa la orden contra la carta y pasa a elegir cómo recibir
 * el pedido (en mesa, llego al local o delivery) antes del método de pago.
 */
async function continueToPayment(): Promise<void> {
  const restaurantId = diner.restaurantId

  if (!restaurantId || cart.items.length === 0 || isCheckingOut.value) {
    return
  }

  isCheckingOut.value = true
  submitError.value = null

  try {
    issues.value = await validateOrderItems(
      restaurantId,
      cart.items.map((item) => ({ productId: item.productId, name: item.name, unitPrice: item.price })),
    )

    if (issues.value.length > 0) {
      return
    }

    await router.push({ name: 'checkout-fulfillment' })
  } catch (error) {
    submitError.value = errorMessage(error, 'No pudimos revisar tu orden. Revisa tu conexión y vuelve a intentarlo.')
  } finally {
    isCheckingOut.value = false
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
      <span class="flex h-20 w-20 items-center justify-center rounded-full bg-success-container text-success" aria-hidden="true">
        <svg class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </span>
      <h1 class="font-headline text-4xl font-semibold text-on-surface">¡Pedido <span class="text-heading-accent">enviado!</span></h1>
      <p class="text-sm text-on-surface-variant">
        El restaurante recibió tus {{ sent.count }} producto(s) para la mesa {{ diner.tableNumber }}. Te avisaremos cuando
        estén confirmados y listos.
      </p>
      <BaseButton variant="primary" size="lg" block @click="goToStatus">Ver cómo va mi pedido</BaseButton>
      <BaseButton variant="secondary" size="lg" block :to="diner.menuRoute">Seguir viendo la carta</BaseButton>
    </div>

    <template v-else>
      <div>
        <h1 class="font-headline text-4xl font-semibold text-on-surface">Tu <span class="text-heading-accent">orden</span></h1>
        <p class="text-sm text-on-surface-variant">
          {{ diner.isReadyToOrder ? 'Revisa y confirma antes de enviarla a la cocina.' : `Productos de ${diner.restaurantName ?? 'la sede'}.` }}
        </p>
      </div>

      <EmptyState v-if="cart.items.length === 0" icon="inbox" title="Tu carrito está vacío" message="Elige productos de la carta para armar tu pedido.">
        <BaseButton variant="primary" :to="diner.menuRoute">Ver la carta</BaseButton>
      </EmptyState>

      <template v-else>
        <div v-if="issues.length > 0" class="space-y-3 rounded-2xl bg-warning-container p-4 text-on-warning-container" role="alert">
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
            <BaseButton v-if="blockingIssues.length > 0" variant="dark" @click="removeUnavailable">
              Quitar los no disponibles
            </BaseButton>
            <BaseButton v-if="priceIssues.length > 0" variant="dark" @click="acceptNewPrices">Aceptar precios nuevos</BaseButton>
          </div>
        </div>

        <!-- Lista de la orden en una sola tarjeta, al estilo de las apps de delivery. -->
        <section class="overflow-hidden rounded-3xl bg-surface-container-lowest shadow-sm ring-1 ring-outline-variant/30">
          <ul class="divide-y divide-outline-variant/40">
            <li v-for="item in cart.items" :key="item.productId" class="space-y-3 p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-base leading-snug font-semibold text-on-surface">{{ item.name }}</p>
                  <p class="text-sm text-on-surface-variant tabular-nums">{{ formatMoney(item.price, diner.currency) }} c/u</p>
                </div>
                <span class="font-label shrink-0 text-base font-bold text-on-surface tabular-nums">
                  {{ formatMoney(item.price * item.quantity, diner.currency) }}
                </span>
              </div>
              <div class="flex items-center gap-3">
                <QuantityStepper
                  :quantity="item.quantity"
                  :label="item.name"
                  @increase="cart.setQuantity(item.productId, item.quantity + 1)"
                  @decrease="cart.setQuantity(item.productId, item.quantity - 1)"
                />
                <label
                  class="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface-container-low px-3 ring-1 ring-outline-variant/40 focus-within:ring-2 focus-within:ring-primary"
                >
                  <svg class="h-4 w-4 shrink-0 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"
                    />
                  </svg>
                  <span class="sr-only">Observación para {{ item.name }}</span>
                  <input
                    class="min-w-0 flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/70"
                    placeholder="Añadir observación"
                    type="text"
                    :value="item.notes"
                    @input="cart.setNotes(item.productId, ($event.target as HTMLInputElement).value)"
                  />
                </label>
              </div>
            </li>
          </ul>
          <RouterLink
            class="font-label flex min-h-12 items-center justify-center gap-2 border-t border-outline-variant/40 text-sm font-semibold text-primary transition-colors hover:bg-surface-container-low"
            :to="diner.menuRoute"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Agregar más productos
          </RouterLink>
        </section>

        <section class="space-y-2 rounded-3xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-outline-variant/30" aria-labelledby="cart-summary-title">
          <h2 id="cart-summary-title" class="text-base font-bold text-on-surface">Resumen</h2>
          <div class="flex items-center justify-between text-sm text-on-surface-variant">
            <span>Productos ({{ cart.itemCount }})</span>
            <span class="tabular-nums">{{ formatMoney(cart.subtotal, diner.currency) }}</span>
          </div>
          <div class="flex items-center justify-between border-t border-outline-variant/40 pt-2">
            <span class="text-base font-bold text-on-surface">Total estimado</span>
            <span class="font-label text-xl font-bold text-on-surface tabular-nums">{{ formatMoney(cart.subtotal, diner.currency) }}</span>
          </div>
          <p class="text-xs text-on-surface-variant">El restaurante confirma cada producto; lo que se rechace no se cobra.</p>
        </section>

        <div class="sticky bottom-20 z-10 space-y-2 rounded-3xl bg-surface-container-lowest p-3 shadow-[0_-4px_24px_rgba(27,28,29,0.08)] ring-1 ring-outline-variant/30">
          <p
            v-if="submitError"
            class="rounded-xl bg-error-container px-3 py-2 text-sm text-on-error-container"
            role="alert"
          >
            {{ submitError }}
          </p>
          <BaseButton
            v-if="diner.isReadyToOrder"
            variant="primary"
            size="lg"
            block
            :loading="isSubmitting"
            :disabled="issues.length > 0"
            @click="confirmOrder"
          >
            <span class="flex flex-1 items-center justify-between gap-3">
              <span>{{ isSubmitting ? 'Enviando pedido…' : submitError ? 'Reintentar envío' : 'Confirmar pedido' }}</span>
              <span class="tabular-nums">{{ formatMoney(cart.subtotal, diner.currency) }}</span>
            </span>
          </BaseButton>
          <BaseButton
            v-else
            variant="primary"
            size="lg"
            block
            :loading="isCheckingOut"
            :disabled="issues.length > 0"
            @click="continueToPayment"
          >
            <span class="flex flex-1 items-center justify-between gap-3">
              <span>Continuar al pago</span>
              <span class="tabular-nums">{{ formatMoney(cart.subtotal, diner.currency) }}</span>
            </span>
          </BaseButton>
        </div>
      </template>
    </template>
  </div>
</template>
