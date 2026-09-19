import { createApp } from 'vue'

import { registerAppProviders } from '@/app/providers'
import App from '@/App.vue'

import '@/assets/main.css'

const app = createApp(App)

registerAppProviders(app)
app.mount('#app')
