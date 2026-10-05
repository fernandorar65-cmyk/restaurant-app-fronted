<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'

import { employeeAreaLabel, employeeStatusLabel } from '@/modules/administration/admin-labels'
import type {
  Employee,
  EmployeeArea,
  EmployeeDraft,
  EmployeeStatus,
  Role,
  SystemUser,
} from '@/modules/administration/types'
import type { RestaurantSite } from '@/modules/restaurants/types'

const props = defineProps<{
  /** null = alta de un empleado nuevo. */
  employee: Employee | null
  roles: Role[]
  restaurants: RestaurantSite[]
  users: SystemUser[]
  linkedUserIds: string[]
}>()

const emit = defineEmits<{
  close: []
  save: [draft: EmployeeDraft]
}>()

const dialogEl = ref<HTMLDialogElement | null>(null)
const name = ref(props.employee?.name ?? '')
const email = ref(props.employee?.email ?? '')
const phone = ref(props.employee?.phone ?? '')
const roleId = ref(props.employee?.roleId ?? props.roles[0]?.id ?? '')
const restaurantId = ref(props.employee?.restaurantId ?? props.restaurants[0]?.id ?? '')
const area = ref<EmployeeArea>(props.employee?.area ?? 'floor')
const status = ref<EmployeeStatus>(props.employee?.status ?? 'active')
const userId = ref<string>(props.employee?.userId ?? '')
const formError = ref<string | null>(null)

const availableUsers = props.users.filter(
  (user) => user.id === props.employee?.userId || !props.linkedUserIds.includes(user.id),
)

function closeDialog(): void {
  dialogEl.value?.close()
}

function submit(): void {
  if (name.value.trim().length < 2) {
    formError.value = 'Indica el nombre del empleado.'
    return
  }

  if (!roleId.value || !restaurantId.value) {
    formError.value = 'Elige puesto y sede.'
    return
  }

  emit('save', {
    name: name.value.trim(),
    email: email.value.trim(),
    phone: phone.value.trim(),
    roleId: roleId.value,
    restaurantId: restaurantId.value,
    area: area.value,
    status: status.value,
    userId: userId.value === '' ? null : userId.value,
  })
}

onMounted(async () => {
  await nextTick()
  dialogEl.value?.showModal()
})
</script>

<template>
  <dialog
    ref="dialogEl"
    class="m-auto w-[min(100%-1.5rem,28rem)] overflow-hidden rounded-2xl bg-surface-container-lowest p-0 text-on-surface shadow-[0_24px_64px_rgba(27,28,29,0.18)] backdrop:bg-on-surface/45"
    aria-labelledby="employee-dialog-title"
    @close="emit('close')"
  >
    <form class="space-y-4 p-6" @submit.prevent="submit">
      <div>
        <p class="font-label text-[11px] font-semibold tracking-widest text-tertiary uppercase">Empleado</p>
        <h2 id="employee-dialog-title" class="font-headline text-lg font-semibold text-on-surface">
          {{ employee ? employee.name : 'Nuevo empleado' }}
        </h2>
      </div>

      <label class="block space-y-1.5">
        <span class="font-label text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">Nombre</span>
        <input
          v-model="name"
          class="w-full rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          required
          type="text"
        />
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="block space-y-1.5">
          <span class="font-label text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">Correo</span>
          <input
            v-model="email"
            class="w-full rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
            type="email"
          />
        </label>
        <label class="block space-y-1.5">
          <span class="font-label text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">Teléfono</span>
          <input
            v-model="phone"
            class="w-full rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
            type="tel"
          />
        </label>
      </div>

      <label class="block space-y-1.5">
        <span class="font-label text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">Puesto</span>
        <select
          v-model="roleId"
          class="w-full rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
        >
          <option v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</option>
        </select>
      </label>

      <label class="block space-y-1.5">
        <span class="font-label text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">Sede</span>
        <select
          v-model="restaurantId"
          class="w-full rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
        >
          <option v-for="restaurant in restaurants" :key="restaurant.id" :value="restaurant.id">{{ restaurant.name }}</option>
        </select>
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="block space-y-1.5">
          <span class="font-label text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">Área</span>
          <select
            v-model="area"
            class="w-full rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          >
            <option v-for="(label, key) in employeeAreaLabel" :key="key" :value="key">{{ label }}</option>
          </select>
        </label>
        <label class="block space-y-1.5">
          <span class="font-label text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">Estado</span>
          <select
            v-model="status"
            class="w-full rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          >
            <option v-for="(label, key) in employeeStatusLabel" :key="key" :value="key">{{ label }}</option>
          </select>
        </label>
      </div>

      <label class="block space-y-1.5">
        <span class="font-label text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">Cuenta del sistema vinculada</span>
        <select
          v-model="userId"
          class="w-full rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
        >
          <option value="">Sin cuenta del sistema</option>
          <option v-for="user in availableUsers" :key="user.id" :value="user.id">{{ user.email }}</option>
        </select>
        <span class="block text-[11px] text-on-surface-variant">
          Un empleado puede existir sin cuenta de acceso; esto solo lo vincula a un login.
        </span>
      </label>

      <p v-if="formError" class="rounded-lg bg-error-container px-3 py-2 text-xs text-on-error-container">{{ formError }}</p>

      <div class="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          class="font-label rounded-xl bg-surface-container px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
          @click="closeDialog"
        >
          Cancelar
        </button>
        <button
          type="submit"
          class="font-label rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary-container"
        >
          Guardar
        </button>
      </div>
    </form>
  </dialog>
</template>
