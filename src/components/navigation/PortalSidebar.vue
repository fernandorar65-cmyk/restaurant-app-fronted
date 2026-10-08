<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import type { Permission } from '@/modules/auth/permissions'
import { fetchRestaurantById } from '@/modules/restaurants/api'
import { useSessionStore } from '@/stores/session'
import { useSiteActivityStore } from '@/stores/site-activity'
import type { SiteActivityCounts } from '@/stores/site-activity'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const route = useRoute()
const session = useSessionStore()
const activity = useSiteActivityStore()
const siteName = ref<string | null>(null)

interface NavItem {
  group: 'service' | 'site' | 'reports'
  routeName: string
  activeNames: string[]
  label: string
  permission: Permission
  icon: string
  badge?: keyof SiteActivityCounts
}

const ICONS = {
  sedes:
    'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
  sala: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z',
  pedidos:
    'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18A2.25 2.25 0 0 0 20.25 16.5V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z',
  cocina:
    'M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z',
  entregas:
    'M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12',
  menu: 'M12 6.75a5.25 5.25 0 0 1 6.775-5.025.5.5 0 0 1 .225.865l-2.625 2.625a1.5 1.5 0 0 0 2.121 2.121l2.625-2.625a.5.5 0 0 1 .865.225A5.25 5.25 0 0 1 15.312 12L21 17.688a2.25 2.25 0 0 1-3.182 3.183L12 15.062l-5.687 5.687a2.25 2.25 0 0 1-3.182-3.182l6.747-6.748A5.226 5.226 0 0 1 9 6.75Z',
  cuentas:
    'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3M3.75 4.5h16.5A1.5 1.5 0 0 1 21.75 6v12a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5V6a1.5 1.5 0 0 1 1.5-1.5Z',
  metricas:
    'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
  cierre:
    'M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z',
  admin:
    'M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75',
} as const

const SITE_ITEMS: NavItem[] = [
  { group: 'site', routeName: 'site-dashboard', activeNames: ['site-dashboard'], label: 'Sala y mesas', permission: 'sites.manage', icon: ICONS.sala },
  {
    group: 'service',
    routeName: 'site-orders',
    activeNames: ['site-orders', 'site-order-detail'],
    label: 'Pedidos entrantes',
    permission: 'orders.manage',
    icon: ICONS.pedidos,
    badge: 'incoming',
  },
  { group: 'service', routeName: 'site-kitchen', activeNames: ['site-kitchen'], label: 'Cocina', permission: 'kitchen.manage', icon: ICONS.cocina, badge: 'kitchen' },
  {
    group: 'service',
    routeName: 'site-deliveries',
    activeNames: ['site-deliveries'],
    label: 'Entregas',
    permission: 'delivery.manage',
    icon: ICONS.entregas,
    badge: 'ready',
  },
  {
    group: 'service',
    routeName: 'site-accounts',
    activeNames: ['site-accounts', 'site-account-detail'],
    label: 'Cuentas',
    permission: 'payments.manage',
    icon: ICONS.cuentas,
    badge: 'accountRequested',
  },
  { group: 'site', routeName: 'site-menu', activeNames: ['site-menu'], label: 'Menú', permission: 'menu.manage', icon: ICONS.menu },
  { group: 'reports', routeName: 'site-metrics', activeNames: ['site-metrics'], label: 'Métricas', permission: 'reports.view', icon: ICONS.metricas },
  { group: 'reports', routeName: 'site-closing', activeNames: ['site-closing'], label: 'Cierre del día', permission: 'reports.view', icon: ICONS.cierre },
]

const restaurantId = computed(() => {
  const param = route.params.restaurantId
  if (typeof param === 'string') {
    return param
  }

  const fallback = session.restaurantId ?? (session.user?.restaurantIds.length === 1 ? session.user.restaurantIds[0] : null)
  return fallback && session.canAccessRestaurant(fallback) ? fallback : null
})

const visibleSiteItems = computed(() => SITE_ITEMS.filter((item) => session.can(item.permission)))

const GROUP_LABEL: Record<NavItem['group'], string> = {
  service: 'Servicio en curso',
  site: 'Sede',
  reports: 'Reportes',
}

/** Agrupado por momento de uso: lo del servicio arriba, la configuración y los reportes después. */
const siteGroups = computed(() =>
  (['service', 'site', 'reports'] as const)
    .map((group) => ({ group, label: GROUP_LABEL[group], items: visibleSiteItems.value.filter((item) => item.group === group) }))
    .filter((entry) => entry.items.length > 0),
)
const isSedes = computed(() => route.name === 'dashboard')
const isAdmin = computed(() => typeof route.name === 'string' && route.name.startsWith('admin-'))
const showSedes = computed(() => session.hasSiteAccess && (session.user?.restaurantIds.length ?? 0) !== 1)

const itemClass =
  'font-label flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors'
const idleClass = 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
const activeClass = 'bg-primary-container text-on-primary-container'

function isActive(item: NavItem): boolean {
  return typeof route.name === 'string' && item.activeNames.includes(route.name)
}

async function loadSiteName(): Promise<void> {
  const id = restaurantId.value
  activity.watchSite(id)

  if (!id) {
    siteName.value = null
    return
  }

  const site = await fetchRestaurantById(id)
  siteName.value = site?.name ?? null
}

watch(restaurantId, () => {
  void loadSiteName()
})

onMounted(() => {
  void loadSiteName()
})
</script>

<template>
  <div class="lg:w-64 lg:shrink-0 lg:self-stretch">
    <button
      v-if="open"
      type="button"
      class="fixed inset-0 top-16 z-30 bg-on-surface/40 lg:hidden"
      aria-label="Cerrar menú"
      @click="emit('close')"
    />

    <aside
      class="fixed top-16 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-outline-variant/60 bg-surface-container-lowest shadow-sm transition-transform duration-200 lg:static lg:top-auto lg:z-0 lg:h-auto lg:min-h-full lg:translate-x-0 lg:shadow-none"
      :class="open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
      aria-label="Navegación del portal"
    >
      <nav class="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-5">
        <div v-if="showSedes" class="space-y-1">
          <p class="font-label px-3 pb-1 text-xs font-bold tracking-widest text-on-surface-variant uppercase">
            Cadena
          </p>
          <RouterLink :class="[itemClass, isSedes ? activeClass : idleClass]" :to="{ name: 'dashboard' }">
            <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" :d="ICONS.sedes" />
            </svg>
            Sedes
          </RouterLink>
        </div>

        <template v-if="restaurantId && visibleSiteItems.length > 0">
          <p class="truncate px-3 text-sm font-semibold text-on-surface">{{ siteName ?? 'Sede' }}</p>
          <div v-for="section in siteGroups" :key="section.group" class="space-y-1">
            <p class="font-label px-3 pb-1 text-xs font-bold tracking-widest text-on-surface-variant uppercase">
              {{ section.label }}
            </p>
            <RouterLink
              v-for="item in section.items"
              :key="item.routeName"
              :class="[itemClass, isActive(item) ? activeClass : idleClass]"
              :to="{ name: item.routeName, params: { restaurantId } }"
              :aria-current="isActive(item) ? 'page' : undefined"
            >
              <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
              </svg>
              <span class="flex-1">{{ item.label }}</span>
              <span
                v-if="item.badge && activity.counts[item.badge] > 0"
                class="min-w-6 rounded-full bg-error px-1.5 py-0.5 text-center text-xs leading-none font-bold text-on-error"
                :aria-label="`${activity.counts[item.badge]} pendientes`"
              >
                {{ activity.counts[item.badge] }}
              </span>
            </RouterLink>
          </div>
        </template>

        <div v-if="session.hasAdminAccess" class="mt-auto space-y-1">
          <p class="font-label px-3 pb-1 text-xs font-bold tracking-widest text-on-surface-variant uppercase">
            Organización
          </p>
          <RouterLink :class="[itemClass, isAdmin ? activeClass : idleClass]" :to="{ name: 'admin-home' }">
            <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" :d="ICONS.admin" />
            </svg>
            Administración
          </RouterLink>
        </div>

        <p v-if="session.user?.roleName" class="px-3 text-xs text-on-surface-variant" :class="session.hasAdminAccess ? '' : 'mt-auto'">
          {{ session.user.name }} · {{ session.user.roleName }}
        </p>
      </nav>
    </aside>
  </div>
</template>
