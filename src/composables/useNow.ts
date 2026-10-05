import { onUnmounted, ref } from 'vue'

/** Hora actual reactiva, para mostrar tiempos transcurridos que se actualizan solos. */
export function useNow(intervalMs = 30000) {
  const now = ref(Date.now())
  const handle = setInterval(() => {
    now.value = Date.now()
  }, intervalMs)

  onUnmounted(() => clearInterval(handle))

  return now
}
