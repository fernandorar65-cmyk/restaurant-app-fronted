<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { usePageTitle } from '@/composables/usePageTitle'
import type { Permission } from '@/modules/auth/permissions'
import { fetchEmployees, fetchInventoryItems, fetchRoles } from '@/modules/administration/api'
import type { Employee, InventoryItem, Role } from '@/modules/administration/types'
import { fetchOrganizations, fetchRestaurants } from '@/modules/restaurants/api'
import type { Organization, RestaurantSite } from '@/modules/restaurants/types'
import { HttpError } from '@/services/http'
import { useSessionStore } from '@/stores/session'

usePageTitle('Administración')

const organization = ref<Organization | null>(null)
const restaurants = ref<RestaurantSite[]>([])
const employees = ref<Employee[]>([])
const roles = ref<Role[]>([])
const inventory = ref<InventoryItem[]>([])
const loadError = ref<string | null>(null)
const isLoading = ref(true)

const session = useSessionStore()

const inventoryAlerts = computed(
  () => inventory.value.filter((item) => item.isActive && item.status !== 'ok' && session.canAccessRestaurant(item.restaurantId)).length,
)

const ALL_SECTIONS: Array<{ name: string; title: string; description: string; permission: Permission }> = [
  {
    name: 'admin-restaurants',
    title: 'Restaurantes',
    description: 'Alta de sedes, datos generales, moneda, zona horaria y estado operativo.',
    permission: 'org.manage',
  },
  {
    name: 'admin-employees',
    title: 'Empleados',
    description: 'Directorio de personal: alta, baja, puesto, sede y contacto.',
    permission: 'staff.manage',
  },
  {
    name: 'admin-users',
    title: 'Usuarios',
    description: 'Cuentas de acceso: rol, sedes, activar, bloquear y vincular a un empleado.',
    permission: 'users.manage',
  },
  {
    name: 'admin-roles',
    title: 'Roles y permisos',
    description: 'Crea y edita roles; cada permiso habilita secciones del portal.',
    permission: 'users.manage',
  },
  {
    name: 'admin-inventory',
    title: 'Inventario',
    description: 'Insumos por sede, cantidades mínimas y alertas de stock.',
    permission: 'inventory.manage',
  },
  {
    name: 'admin-settings',
    title: 'Configuración',
    description: 'Datos generales de la organización.',
    permission: 'org.manage',
  },
]

const sections = computed(() => ALL_SECTIONS.filter((section) => session.can(section.permission)))

async function loadOverview(): Promise<void> {
  isLoading.value = true
  loadError.value = null

  try {
    const [organizations, restaurantList, employeeList, roleList, inventoryList] = await Promise.all([
      fetchOrganizations(),
      fetchRestaurants(),
      fetchEmployees(),
      fetchRoles(),
      fetchInventoryItems(),
    ])
    organization.value = organizations[0] ?? null
    restaurants.value = restaurantList
    employees.value = employeeList
    roles.value = roleList
    inventory.value = inventoryList
  } catch (error) {
    loadError.value = error instanceof HttpError ? error.message : 'No se pudo cargar el panel de administración.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadOverview()
})
</script>

<template>
  <div class="mx-auto w-full max-w-6xl space-y-6 px-6 py-8 lg:px-12">
    <div>
      <p class="font-label text-[11px] font-bold tracking-widest text-primary uppercase">
        {{ organization?.name ?? 'Organización' }}
      </p>
      <h1 class="font-headline text-2xl font-semibold tracking-tight text-on-surface sm:text-3xl">Administración</h1>
      <p class="mt-1 text-sm text-on-surface-variant">
        Restaurantes, empleados, roles, inventario y configuración de toda la cadena.
      </p>
    </div>

    <p v-if="isLoading" class="text-sm text-on-surface-variant">Cargando panel…</p>
    <p
      v-else-if="loadError"
      class="rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-on-error-container"
      role="alert"
    >
      {{ loadError }}
    </p>

    <template v-else>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <article class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <span class="font-label text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">Sedes</span>
          <p class="font-headline pt-1 text-3xl font-semibold text-on-surface">{{ restaurants.length }}</p>
        </article>
        <article class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <span class="font-label text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">Empleados</span>
          <p class="font-headline pt-1 text-3xl font-semibold text-on-surface">{{ employees.length }}</p>
        </article>
        <article class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <span class="font-label text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">Roles</span>
          <p class="font-headline pt-1 text-3xl font-semibold text-on-surface">{{ roles.length }}</p>
        </article>
        <article class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <span class="font-label text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">Alertas de stock</span>
          <p class="font-headline pt-1 text-3xl font-semibold" :class="inventoryAlerts > 0 ? 'text-error' : 'text-on-surface'">
            {{ inventoryAlerts }}
          </p>
        </article>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <RouterLink
          v-for="section in sections"
          :key="section.name"
          class="flex flex-col gap-2 rounded-2xl bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-md"
          :to="{ name: section.name }"
        >
          <h2 class="font-headline text-lg font-semibold text-on-surface">{{ section.title }}</h2>
          <p class="text-sm text-on-surface-variant">{{ section.description }}</p>
          <span class="font-label mt-auto inline-flex items-center gap-1 text-xs font-semibold text-primary">
            Abrir sección →
          </span>
        </RouterLink>
      </div>
    </template>
  </div>
</template>
