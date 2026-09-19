import { createPinia } from 'pinia'
import type { App } from 'vue'

import { router } from '@/app/router'

export function registerAppProviders(app: App): void {
  app.use(createPinia())
  app.use(router)
}
