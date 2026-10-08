import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

/** Debe coincidir con el script de index.html que aplica el tema antes de montar la app. */
export const THEME_KEY = 'restaurant-cmr:theme'

export type ThemePreference = 'light' | 'dark' | 'system'

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

/**
 * Tema claro/oscuro de toda la app. "system" sigue la configuración del dispositivo
 * y cambia en vivo si el usuario la cambia.
 */
export const useThemeStore = defineStore('theme', () => {
  const preference = ref<ThemePreference>(readPreference())
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const systemDark = ref(media.matches)

  media.addEventListener('change', (event) => {
    systemDark.value = event.matches
  })

  const isDark = computed(() => preference.value === 'dark' || (preference.value === 'system' && systemDark.value))

  function setPreference(next: ThemePreference): void {
    preference.value = next
  }

  watch(
    isDark,
    (dark) => {
      document.documentElement.classList.toggle('theme-dark', dark)
    },
    { immediate: true },
  )

  watch(preference, (value) => {
    try {
      if (value === 'system') {
        localStorage.removeItem(THEME_KEY)
      } else {
        localStorage.setItem(THEME_KEY, value)
      }
    } catch {
      // Sin almacenamiento: la preferencia dura solo esta sesión.
    }
  })

  return { preference, isDark, setPreference }
})
