import { onUnmounted } from 'vue'

/**
 * Reemplazo de tiempo real mientras el backend sea json-server: ejecuta `task`
 * cada `intervalMs` y se pausa cuando la pestaña no está visible.
 */
export function usePolling(task: () => Promise<void> | void, intervalMs: number) {
  let handle: ReturnType<typeof setInterval> | null = null

  function stop(): void {
    if (handle !== null) {
      clearInterval(handle)
      handle = null
    }
  }

  function start(): void {
    stop()
    handle = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void task()
      }
    }, intervalMs)
  }

  function onVisibilityChange(): void {
    if (document.visibilityState === 'visible' && handle !== null) {
      void task()
    }
  }

  document.addEventListener('visibilitychange', onVisibilityChange)

  onUnmounted(() => {
    stop()
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return { start, stop }
}
