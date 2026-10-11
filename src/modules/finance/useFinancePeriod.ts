import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { toDateKey } from '@/modules/finance/period'
import type { FinancePeriod } from '@/modules/finance/types'

const QUERY_PERIOD: Record<FinancePeriod, string> = { day: 'dia', month: 'mes', year: 'anio' }

/**
 * Período y fecha de Finanzas, guardados en la URL (?periodo=mes&fecha=2026-10-11):
 * se conservan al pasar del resumen al detalle de un local y al volver.
 */
export function useFinancePeriod() {
  const route = useRoute()
  const router = useRouter()
  const today = toDateKey(new Date())

  const fromQuery = Object.entries(QUERY_PERIOD).find(([, value]) => value === route.query.periodo)?.[0] as FinancePeriod | undefined
  const queryDate = typeof route.query.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(route.query.fecha) ? route.query.fecha : null

  const period = ref<FinancePeriod>(fromQuery ?? 'month')
  const anchor = ref(queryDate && queryDate <= today ? queryDate : today)

  watch([period, anchor], () => {
    void router.replace({ query: { ...route.query, periodo: QUERY_PERIOD[period.value], fecha: anchor.value } })
  })

  /** Query para enlazar a otra vista de Finanzas con el mismo período. */
  const periodQuery = () => ({ periodo: QUERY_PERIOD[period.value], fecha: anchor.value })

  return { period, anchor, today, periodQuery }
}
