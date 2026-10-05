<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'

import type { Employee, Role, SystemUser, SystemUserDraft } from '@/modules/administration/types'
import type { RestaurantSite } from '@/modules/restaurants/types'

const props = defineProps<{
  user: SystemUser
  roles: Role[]
  restaurants: RestaurantSite[]
  employees: Employee[]
}>()

const emit = defineEmits<{
  close: []
  save: [draft: SystemUserDraft]
}>()

const dialogEl = ref<HTMLDialogElement | null>(null)
const roleId = ref<string | null>(props.user.roleId)
const allSites = ref(props.user.restaurantIds.length === 0)
const restaurantIds = ref<string[]>([...props.user.restaurantIds])
const employeeId = ref<string | null>(props.user.employeeId)
const formError = ref<string | null>(null)

const selectedRole = computed(() => props.roles.find((role) => role.id === roleId.value) ?? null)

function toggleSite(id: string): void {
  restaurantIds.value = restaurantIds.value.includes(id)
    ? restaurantIds.value.filter((item) => item !== id)
    : [...restaurantIds.value, id]
}

function closeDialog(): void {
  dialogEl.value?.close()
}

function submit(): void {
  if (!allSites.value && restaurantIds.value.length === 0) {
    formError.value = 'Elige al menos una sede o marca "Todas las sedes".'
    return
  }

  emit('save', {
    roleId: roleId.value,
    restaurantIds: allSites.value ? [] : restaurantIds.value,
    employeeId: employeeId.value,
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
    aria-labelledby="user-access-title"
    @close="emit('close')"
  >
    <form class="max-h-[85vh] space-y-4 overflow-y-auto p-6" @submit.prevent="submit">
      <div>
        <h2 id="user-access-title" class="font-headline text-lg font-semibold text-on-surface">Acceso de {{ user.name }}</h2>
        <p class="text-xs text-on-surface-variant">{{ user.email }}</p>
      </div>

      <label class="block space-y-1.5">
        <span class="font-label text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">Rol</span>
        <select
          v-model="roleId"
          class="w-full rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
        >
          <option :value="null">Sin rol (no puede entrar a ninguna sección)</option>
          <option v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</option>
        </select>
        <span v-if="selectedRole" class="block text-[11px] text-on-surface-variant">{{ selectedRole.description }}</span>
      </label>

      <fieldset class="space-y-2">
        <legend class="font-label text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">Sedes</legend>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="allSites" type="checkbox" class="h-4 w-4 accent-primary" />
          Todas las sedes de la organización
        </label>
        <div v-if="!allSites" class="grid gap-1.5 rounded-lg bg-surface p-3">
          <label v-for="site in restaurants" :key="site.id" class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              class="h-4 w-4 accent-primary"
              :checked="restaurantIds.includes(site.id)"
              @change="toggleSite(site.id)"
            />
            {{ site.name }} <span class="text-xs text-on-surface-variant">({{ site.city }})</span>
          </label>
        </div>
      </fieldset>

      <label class="block space-y-1.5">
        <span class="font-label text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">Empleado vinculado</span>
        <select
          v-model="employeeId"
          class="w-full rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
        >
          <option :value="null">Sin empleado</option>
          <option v-for="employee in employees" :key="employee.id" :value="employee.id">
            {{ employee.name }} · {{ employee.restaurantName }}{{ employee.userId && employee.userId !== user.id ? ' (ya vinculado)' : '' }}
          </option>
        </select>
      </label>

      <p v-if="formError" class="rounded-lg bg-error-container px-3 py-2 text-xs text-on-error-container">{{ formError }}</p>

      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="font-label rounded-xl bg-surface-container px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
          @click="closeDialog"
        >
          Cancelar
        </button>
        <button type="submit" class="font-label rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary-container">
          Guardar
        </button>
      </div>
    </form>
  </dialog>
</template>
