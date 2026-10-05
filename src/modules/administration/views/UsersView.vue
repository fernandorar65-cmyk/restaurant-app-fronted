<script setup lang="ts">
import { onMounted, ref } from 'vue'

import AdminPageHeader from '@/components/base/AdminPageHeader.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import {
  fetchEmployees,
  fetchRoles,
  fetchUsers,
  updateUserAccess,
  updateUserActive,
  updateUserBlocked,
} from '@/modules/administration/api'
import UserAccessDialog from '@/modules/administration/components/UserAccessDialog.vue'
import type { Employee, Role, SystemUser, SystemUserDraft } from '@/modules/administration/types'
import { fetchRestaurants } from '@/modules/restaurants/api'
import type { RestaurantSite } from '@/modules/restaurants/types'
import { HttpError } from '@/services/http'
import { useSessionStore } from '@/stores/session'
import { useToastStore } from '@/stores/toast'

usePageTitle('Usuarios')

const session = useSessionStore()
const toast = useToastStore()

const users = ref<SystemUser[]>([])
const employees = ref<Employee[]>([])
const roles = ref<Role[]>([])
const restaurants = ref<RestaurantSite[]>([])
const loadError = ref<string | null>(null)
const actionError = ref<string | null>(null)
const isLoading = ref(true)
const editingUser = ref<SystemUser | null>(null)

function employeeName(user: SystemUser): string {
  return employees.value.find((employee) => employee.id === user.employeeId)?.name ?? 'Sin empleado'
}

function roleName(user: SystemUser): string {
  return roles.value.find((role) => role.id === user.roleId)?.name ?? 'Sin rol'
}

function sitesLabel(user: SystemUser): string {
  if (user.restaurantIds.length === 0) {
    return 'Todas las sedes'
  }

  return user.restaurantIds
    .map((id) => restaurants.value.find((site) => site.id === id)?.name ?? id)
    .join(', ')
}

function statusOf(user: SystemUser): { label: string; className: string } {
  if (user.isBlocked) {
    return { label: 'Bloqueado', className: 'bg-error-container text-on-error-container' }
  }

  if (!user.isActive) {
    return { label: 'Inactivo', className: 'bg-surface-container-high text-on-surface-variant' }
  }

  return { label: 'Activo', className: 'bg-primary/10 text-primary' }
}

function isSelf(user: SystemUser): boolean {
  return user.id === session.user?.id
}

async function loadUsers(): Promise<void> {
  isLoading.value = true
  loadError.value = null

  try {
    const [userList, employeeList, roleList, siteList] = await Promise.all([
      fetchUsers(),
      fetchEmployees(),
      fetchRoles(),
      fetchRestaurants(),
    ])
    users.value = userList
    employees.value = employeeList
    roles.value = roleList
    restaurants.value = siteList
  } catch (error) {
    loadError.value = error instanceof HttpError ? error.message : 'No se pudieron cargar las cuentas.'
  } finally {
    isLoading.value = false
  }
}

function replaceUser(updated: SystemUser): void {
  users.value = users.value.map((item) => (item.id === updated.id ? updated : item))
}

async function toggleActive(user: SystemUser): Promise<void> {
  actionError.value = null

  try {
    replaceUser(await updateUserActive(user.id, !user.isActive))
  } catch {
    actionError.value = 'No se pudo actualizar la cuenta.'
  }
}

async function toggleBlocked(user: SystemUser): Promise<void> {
  actionError.value = null

  try {
    replaceUser(await updateUserBlocked(user.id, !user.isBlocked))
    toast.show(user.isBlocked ? `${user.name} desbloqueado` : `${user.name} bloqueado`, {
      message: user.isBlocked ? undefined : 'Ya no puede iniciar sesión y se cierra su sesión abierta.',
    })
  } catch {
    actionError.value = 'No se pudo actualizar la cuenta.'
  }
}

async function saveAccess(draft: SystemUserDraft): Promise<void> {
  const user = editingUser.value

  if (!user) {
    return
  }

  actionError.value = null

  try {
    await updateUserAccess(user, draft)
    editingUser.value = null
    await loadUsers()

    if (isSelf(user)) {
      await session.refreshUser()
    }

    toast.show('Acceso actualizado', { tone: 'success' })
  } catch {
    actionError.value = 'No se pudo guardar el acceso.'
  }
}

onMounted(() => {
  void loadUsers()
})
</script>

<template>
  <div class="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 lg:px-8">
    <AdminPageHeader
      section="Usuarios"
      title="Usuarios"
      description="Cuentas de acceso del personal: rol, sedes a las que entra y empleado vinculado. Un usuario bloqueado no puede iniciar sesión."
    />

    <p v-if="isLoading" class="text-sm text-on-surface-variant">Cargando cuentas…</p>
    <p
      v-else-if="loadError"
      class="rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-on-error-container"
      role="alert"
    >
      {{ loadError }}
    </p>

    <template v-else>
      <p v-if="actionError" class="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">
        {{ actionError }}
      </p>

      <div class="overflow-x-auto rounded-2xl bg-surface-container-lowest shadow-sm">
        <table class="w-full min-w-[760px] text-left text-sm">
          <thead class="bg-surface-container-low text-on-surface-variant">
            <tr>
              <th class="font-label px-4 py-3 text-[11px] font-semibold tracking-wide uppercase">Cuenta</th>
              <th class="font-label px-4 py-3 text-[11px] font-semibold tracking-wide uppercase">Rol</th>
              <th class="font-label px-4 py-3 text-[11px] font-semibold tracking-wide uppercase">Sedes</th>
              <th class="font-label px-4 py-3 text-[11px] font-semibold tracking-wide uppercase">Empleado</th>
              <th class="font-label px-4 py-3 text-[11px] font-semibold tracking-wide uppercase">Estado</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant/40">
            <tr v-for="user in users" :key="user.id">
              <td class="px-4 py-3">
                <p class="font-semibold text-on-surface">{{ user.name }} <span v-if="isSelf(user)" class="text-xs font-normal text-on-surface-variant">(tú)</span></p>
                <p class="text-xs text-on-surface-variant">{{ user.email }}</p>
              </td>
              <td class="px-4 py-3" :class="user.roleId ? 'text-on-surface' : 'text-error'">{{ roleName(user) }}</td>
              <td class="px-4 py-3 text-xs text-on-surface-variant">{{ sitesLabel(user) }}</td>
              <td class="px-4 py-3 text-xs text-on-surface-variant">{{ employeeName(user) }}</td>
              <td class="px-4 py-3">
                <span class="font-label rounded-md px-2 py-0.5 text-[10px] font-bold uppercase" :class="statusOf(user).className">
                  {{ statusOf(user).label }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-1.5">
                  <button
                    type="button"
                    class="font-label rounded-lg bg-surface-container px-2.5 py-1.5 text-[11px] font-semibold text-on-surface hover:bg-surface-container-high"
                    @click="editingUser = user"
                  >
                    Acceso
                  </button>
                  <template v-if="!isSelf(user)">
                    <button
                      type="button"
                      class="font-label rounded-lg bg-surface-container px-2.5 py-1.5 text-[11px] font-semibold text-on-surface hover:bg-surface-container-high"
                      @click="toggleActive(user)"
                    >
                      {{ user.isActive ? 'Desactivar' : 'Activar' }}
                    </button>
                    <button
                      type="button"
                      class="font-label rounded-lg px-2.5 py-1.5 text-[11px] font-semibold"
                      :class="user.isBlocked ? 'bg-primary text-on-primary hover:bg-primary-container' : 'bg-error-container text-on-error-container hover:bg-error/20'"
                      @click="toggleBlocked(user)"
                    >
                      {{ user.isBlocked ? 'Desbloquear' : 'Bloquear' }}
                    </button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <UserAccessDialog
      v-if="editingUser"
      :key="editingUser.id"
      :user="editingUser"
      :roles="roles"
      :restaurants="restaurants"
      :employees="employees"
      @close="editingUser = null"
      @save="saveAccess"
    />
  </div>
</template>
