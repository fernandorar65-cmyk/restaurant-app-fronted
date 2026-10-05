import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), vueDevTools(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    watch: {
      // db.json is rewritten on disk by json-server on every mock write (POST/PATCH/DELETE).
      // Without this, Vite's root file watcher treats it as an asset change and forces a
      // full page reload on every mock API mutation, wiping client-side state (open dialogs,
      // active tabs, etc.) that has nothing to do with the actual code.
      ignored: ['**/db.json'],
    },
  },
})
