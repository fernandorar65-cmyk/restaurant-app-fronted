<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { useConfirmStore } from '@/stores/confirm'
import StatusBadge from '@/components/base/StatusBadge.vue'
import SkeletonBlock from '@/components/base/SkeletonBlock.vue'
import AdminPageHeader from '@/components/base/AdminPageHeader.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { employeeAreaLabel, employeeStatusLabel, employeeStatusTone } from '@/modules/administration/admin-labels'
import {
  createEmployee,
  deleteEmployee,
  fetchEmployees,
  fetchRoles,
  fetchUsers,
  syncEmployeeUserLink,
  updateEmployee,
} from '@/modules/administration/api'
import EmployeeDialog from '@/modules/administration/components/EmployeeDialog.vue'
import type { Employee, EmployeeArea, EmployeeDraft, Role, SystemUser } from '@/modules/administration/types'
import { fetchRestaurants } from '@/modules/restaurants/api'
import type { RestaurantSite } from '@/modules/restaurants/types'
import { HttpError } from '@/services/http'
import { getInitials } from '@/utils/string'

usePageTitle('Empleados')

const confirm = useConfirmStore()

const employees = ref<Employee[]>([])
const roles = ref<Role[]>([])
const restaurants = ref<RestaurantSite[]>([])
const users = ref<SystemUser[]>([])
const loadError = ref<string | null>(null)
const isLoading = ref(true)
const searchQuery = ref('')
const areaFilter = ref<'all' | EmployeeArea>('all')
/** undefined = diálogo cerrado · null = alta de empleado. */
const editingEmployee = ref<Employee | null | undefined>(undefined)
const actionError = ref<string | null>(null)

const linkedUserIds = computed(() =>
  employees.value.map((employee) => employee.userId).filter((id): id is string => id !== null),
)

function userEmailFor(employee: Employee): string {
  return users.value.find((user) => user.id === employee.userId)?.email ?? 'Sin cuenta del sistema'
}

const filteredEmployees = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return employees.value.filter((employee) => {
    if (areaFilter.value !== 'all' && employee.area !== areaFilter.value) {
      return false
    }

    if (!query) {
      return true
    }

    return (
      employee.name.toLowerCase().includes(query) ||
      employee.email.toLowerCase().includes(query) ||
      employee.restaurantName.toLowerCase().includes(query)
    )
  })
})

async function loadEmployees(): Promise<void> {
  isLoading.value = true
  loadError.value = null

  try {
    const [employeeList, roleList, restaurantList, userList] = await Promise.all([
      fetchEmployees(),
      fetchRoles(),
      fetchRestaurants(),
      fetchUsers(),
    ])
    employees.value = employeeList
    roles.value = roleList
    restaurants.value = restaurantList
    users.value = userList
  } catch (error) {
    loadError.value = error instanceof HttpError ? error.message : 'No se pudo cargar el directorio de empleados.'
  } finally {
    isLoading.value = false
  }
}

async function saveEmployee(draft: EmployeeDraft): Promise<void> {
  const original = editingEmployee.value
  const role = roles.value.find((item) => item.id === draft.roleId)
  const restaurant = restaurants.value.find((item) => item.id === draft.restaurantId)
  const payload = { ...draft, roleName: role?.name ?? '', restaurantName: restaurant?.name ?? '' }
  actionError.value = null

  try {
    const saved = original ? await updateEmployee(original.id, payload) : await createEmployee(payload)
    await syncEmployeeUserLink(saved.id, original?.userId ?? null, draft.userId)
    employees.value = original
      ? employees.value.map((employee) => (employee.id === saved.id ? saved : employee))
      : [...employees.value, saved]
    editingEmployee.value = undefined
  } catch {
    actionError.value = 'No se pudo guardar el empleado.'
  }
}

async function removeEmployee(employee: Employee): Promise<void> {
  const accepted = await confirm.ask({
    title: `¿Dar de baja a ${employee.name}?`,
    message: 'Se elimina del directorio. Su cuenta de acceso, si tiene, queda sin empleado vinculado.',
    confirmLabel: 'Dar de baja',
    tone: 'danger',
  })

  if (!accepted) {
    return
  }

  actionError.value = null

  try {
    await deleteEmployee(employee)
    employees.value = employees.value.filter((item) => item.id !== employee.id)
  } catch {
    actionError.value = 'No se pudo dar de baja al empleado.'
  }
}

onMounted(() => {
  void loadEmployees()
})
</script>

<template>
  <div class="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 lg:px-8">
    <AdminPageHeader
      section="Empleados"
      title="Empleados"
      description="Directorio de personal de toda la organización: puesto, sede, contacto, estado laboral y cuenta de acceso vinculada."
    >
      <template #actions>
        <button
          type="button"
          class="font-label rounded-xl bg-primary min-h-11 px-4 py-2.5 text-sm font-semibold text-on-primary shadow-sm hover:bg-primary-container"
          @click="editingEmployee = null"
        >
          + Empleado
        </button>
      </template>
    </AdminPageHeader>

    <p v-if="actionError" class="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">
      {{ actionError }}
    </p>

    <SkeletonBlock v-if="isLoading" variant="page" />
    <p
      v-else-if="loadError"
      class="rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-on-error-container"
      role="alert"
    >
      {{ loadError }}
    </p>

    <template v-else>
      <div class="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-3 shadow-sm sm:flex-row sm:items-center">
        <input
          v-model="searchQuery"
          class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent placeholder:text-on-surface-variant/60 focus:ring-primary sm:max-w-sm"
          placeholder="Buscar por nombre, correo o sede..."
          type="search"
        />
        <div class="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por área">
          <button
            type="button"
            class="font-label min-h-9 rounded-full px-3 py-1.5 text-sm font-semibold"
            :class="areaFilter === 'all' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant'"
            @click="areaFilter = 'all'"
          >
            Todas
          </button>
          <button
            v-for="(label, key) in employeeAreaLabel"
            :key="key"
            type="button"
            class="font-label min-h-9 rounded-full px-3 py-1.5 text-sm font-semibold"
            :class="areaFilter === key ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant'"
            @click="areaFilter = key as EmployeeArea"
          >
            {{ label }}
          </button>
        </div>
      </div>

      <div class="md:overflow-x-auto md:rounded-2xl md:bg-surface-container-lowest md:shadow-sm">
        <table class="responsive-table w-full md:min-w-[860px] text-left text-sm">
          <thead class="bg-surface-container-low text-on-surface-variant">
            <tr>
              <th class="font-label px-4 py-3 text-xs font-semibold tracking-wide uppercase">Empleado</th>
              <th class="font-label px-4 py-3 text-xs font-semibold tracking-wide uppercase">Sede</th>
              <th class="font-label px-4 py-3 text-xs font-semibold tracking-wide uppercase">Puesto</th>
              <th class="font-label px-4 py-3 text-xs font-semibold tracking-wide uppercase">Área</th>
              <th class="font-label px-4 py-3 text-xs font-semibold tracking-wide uppercase">Estado</th>
              <th class="font-label px-4 py-3 text-xs font-semibold tracking-wide uppercase">Cuenta</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant/40">
            <tr v-for="employee in filteredEmployees" :key="employee.id">
              <td class="cell-main flex items-center gap-2.5 px-4 py-3">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-on-primary">
                  {{ getInitials(employee.name) }}
                </span>
                <div class="min-w-0">
                  <p class="truncate font-semibold text-on-surface">{{ employee.name }}</p>
                  <p class="truncate text-xs text-on-surface-variant">{{ employee.email }}<template v-if="employee.phone"> · {{ employee.phone }}</template></p>
                </div>
              </td>
              <td class="px-4 py-3 text-on-surface-variant" data-label="Sede">{{ employee.restaurantName }}</td>
              <td class="px-4 py-3 text-on-surface-variant" data-label="Puesto">{{ employee.roleName }}</td>
              <td class="px-4 py-3 text-on-surface-variant" data-label="Área">{{ employeeAreaLabel[employee.area] }}</td>
              <td class="px-4 py-3" data-label="Estado">
                <StatusBadge :tone="employeeStatusTone[employee.status]" :label="employeeStatusLabel[employee.status]" />
              </td>
              <td class="px-4 py-3" data-label="Cuenta">
                <span :class="employee.userId ? 'text-on-surface' : 'text-on-surface-variant italic'">
                  {{ userEmailFor(employee) }}
                </span>
              </td>
              <td class="cell-actions px-4 py-3 text-right">
                <div class="flex justify-end gap-1.5">
                  <button
                    type="button"
                    class="font-label rounded-lg bg-surface-container min-h-9 px-3 py-1.5 text-sm font-semibold text-on-surface hover:bg-surface-container-high"
                    @click="editingEmployee = employee"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    class="font-label rounded-lg bg-error-container min-h-9 px-3 py-1.5 text-sm font-semibold text-on-error-container hover:bg-error/20"
                    @click="removeEmployee(employee)"
                  >
                    Baja
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="filteredEmployees.length === 0" class="px-4 py-6 text-center text-sm text-on-surface-variant">
          No hay empleados que coincidan con el filtro.
        </p>
      </div>
    </template>

    <EmployeeDialog
      v-if="editingEmployee !== undefined"
      :employee="editingEmployee"
      :linked-user-ids="linkedUserIds"
      :restaurants="restaurants"
      :roles="roles"
      :users="users"
      @close="editingEmployee = undefined"
      @save="saveEmployee"
    />
  </div>
</template>
