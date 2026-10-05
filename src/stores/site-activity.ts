import { defineStore } from 'pinia'
import { ref } from 'vue'

import { fetchAttentionsWithProductsBySite, isAttentionActive } from '@/modules/orders/api'
import { useSessionStore } from '@/stores/session'
import { useToastStore } from '@/stores/toast'

const POLL_MS = 8000

export interface SiteActivityCounts {
  /** Productos enviados por comensales o mozos, sin confirmar. */
  incoming: number
  /** Productos confirmados o en preparación. */
  kitchen: number
  /** Productos listos para llevar a la mesa. */
  ready: number
  /** Atenciones con la cuenta solicitada. */
  accountRequested: number
}

const EMPTY_COUNTS: SiteActivityCounts = { incoming: 0, kitchen: 0, ready: 0, accountRequested: 0 }

/**
 * Vigila la actividad de la sede abierta en el portal y avisa al personal según
 * su rol. Sustituye a Socket.IO mientras el backend sea json-server.
 */
export const useSiteActivityStore = defineStore('site-activity', () => {
  const restaurantId = ref<string | null>(null)
  const counts = ref<SiteActivityCounts>({ ...EMPTY_COUNTS })
  /** Aumenta cada vez que cambia algo en la sede; las vistas lo observan para recargar. */
  const revision = ref(0)

  let handle: ReturnType<typeof setInterval> | null = null
  let seen: { sent: Set<string>; confirmed: Set<string>; ready: Set<string>; account: Set<string> } | null = null
  let lastSignature = ''

  async function refresh(): Promise<void> {
    const id = restaurantId.value

    if (!id) {
      return
    }

    const session = useSessionStore()
    const toast = useToastStore()
    const attentions = await fetchAttentionsWithProductsBySite(id)

    if (restaurantId.value !== id) {
      return
    }

    // Solo cuenta lo que sigue en curso: lo de atenciones cerradas o canceladas ya no requiere acción.
    const products = attentions.filter(isAttentionActive).flatMap((attention) =>
      attention.products.map((product) => ({ product, table: attention.tableNumber })),
    )
    const sent = products.filter((item) => item.product.status === 'sent')
    const confirmed = products.filter((item) => item.product.status === 'confirmed')
    const preparing = products.filter((item) => item.product.status === 'preparing')
    const ready = products.filter((item) => item.product.status === 'ready')
    const accountRequested = attentions.filter((attention) => attention.status === 'account-requested')

    counts.value = {
      incoming: sent.length,
      kitchen: confirmed.length + preparing.length,
      ready: ready.length,
      accountRequested: accountRequested.length,
    }

    const signature = JSON.stringify([
      attentions.map((attention) => [attention.id, attention.status]),
      products.map((item) => [item.product.id, item.product.status]),
    ])

    if (signature !== lastSignature) {
      lastSignature = signature
      revision.value += 1
    }

    if (seen) {
      const newSent = sent.filter((item) => !seen?.sent.has(item.product.id))
      const newConfirmed = confirmed.filter((item) => !seen?.confirmed.has(item.product.id))
      const newReady = ready.filter((item) => !seen?.ready.has(item.product.id))
      const newAccounts = accountRequested.filter((attention) => !seen?.account.has(attention.id))
      const tables = (items: Array<{ table: string }>) => [...new Set(items.map((item) => item.table))].join(', ')

      if (newSent.length > 0 && session.can('orders.manage')) {
        toast.show(`Nuevo pedido · Mesa ${tables(newSent)}`, {
          message: `${newSent.length} producto(s) esperando confirmación.`,
          tone: 'warning',
          sound: true,
        })
      }

      if (newConfirmed.length > 0 && session.can('kitchen.manage')) {
        toast.show(`Nueva comanda en cocina · Mesa ${tables(newConfirmed)}`, {
          message: `${newConfirmed.length} producto(s) confirmados para preparar.`,
          sound: true,
        })
      }

      if (newReady.length > 0 && session.can('delivery.manage')) {
        toast.show(`Listo para servir · Mesa ${tables(newReady)}`, {
          message: `${newReady.length} producto(s) esperan en el pase.`,
          tone: 'success',
          sound: true,
        })
      }

      if (newAccounts.length > 0 && session.can('payments.manage')) {
        toast.show(`Cuenta solicitada · Mesa ${newAccounts.map((attention) => attention.tableNumber).join(', ')}`, {
          tone: 'warning',
          sound: true,
        })
      }
    }

    seen = {
      sent: new Set(sent.map((item) => item.product.id)),
      confirmed: new Set(confirmed.map((item) => item.product.id)),
      ready: new Set(ready.map((item) => item.product.id)),
      account: new Set(accountRequested.map((attention) => attention.id)),
    }
  }

  async function safeRefresh(): Promise<void> {
    try {
      await refresh()
    } catch {
      // Error de red puntual: se reintenta en el próximo ciclo.
    }
  }

  function watchSite(nextRestaurantId: string | null): void {
    if (restaurantId.value === nextRestaurantId) {
      return
    }

    stop()
    restaurantId.value = nextRestaurantId
    counts.value = { ...EMPTY_COUNTS }
    seen = null
    lastSignature = ''

    if (!nextRestaurantId) {
      return
    }

    void safeRefresh()
    handle = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void safeRefresh()
      }
    }, POLL_MS)
  }

  function stop(): void {
    if (handle !== null) {
      clearInterval(handle)
      handle = null
    }
  }

  return { restaurantId, counts, revision, watchSite, refresh: safeRefresh, stop }
})
