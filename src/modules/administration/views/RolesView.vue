<script setup lang="ts">
import { onMounted, ref } from 'vue'

import AdminPageHeader from '@/components/base/AdminPageHeader.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { createRole, deleteRole, fetchRoles, fetchUsers, updateRole } from '@/modules/administration/api'
import RoleDialog from '@/modules/administration/components/RoleDialog.vue'
import type { Role, RoleDraft, SystemUser } from '@/modules/administration/types'
import { permissionLabel } from '@/modules/auth/permissions'
import { HttpError } from '@/services/http'
import { useSessionStore } from '@/stores/session'
import { useToastStore } from '@/stores/toast'

usePageTitle('Roles y permisos')

/** Rol del dueño: no se edita ni se elimina para no dejar la organización sin administrador. */
const OWNER_ROLE_ID = 'role-0'

const session = useSessionStore()
const toast = useToastStore()

const roles = ref<Role[]>([])
const users = ref<SystemUser[]>([])
const loadError = ref<string | null>(null)
const actionError = ref<string | null>(null)
const isLoading = ref(true)
/** undefined = diálogo cerrado · null = nuevo rol. */
const editingRole = ref<Role | null | undefined>(undefined)

function usersWithRole(role: Role): number {
  return users.value.filter((user) => user.roleId === role.id).length
}

async function loadRoles(): Promise<void> {
  isLoading.value = true
  loadError.value = null

  try {
    const [roleList, userList] = await Promise.all([fetchRoles(), fetchUsers()])
    roles.value = roleList
    users.value = userList
  } catch (error) {
    loadError.value = error instanceof HttpError ? error.message : 'No se pudieron cargar los roles.'
  } finally {
    isLoading.value = false
  }
}

async function saveRole(draft: RoleDraft): Promise<void> {
  const original = editingRole.value
  actionError.value = null

  try {
    if (original) {
      const updated = await updateRole(original.id, draft)
      roles.value = roles.value.map((role) => (role.id === updated.id ? updated : role))

      if (session.user?.roleId === updated.id) {
        await session.refreshUser()
      }
    } else {
      roles.value = [...roles.value, await createRole(draft)]
    }

    editingRole.value = undefined
    toast.show('Rol guardado', { message: 'Los usuarios con este rol ven los cambios al navegar.', tone: 'success' })
  } catch {
    actionError.value = 'No se pudo guardar el rol.'
  }
}

async function removeRole(role: Role): Promise<void> {
  actionError.value = null

  if (usersWithRole(role) > 0) {
    actionError.value = `No se puede eliminar "${role.name}": tiene usuarios asignados. Reasígnalos primero.`
    return
  }

  if (!window.confirm(`¿Eliminar el rol "${role.name}"?`)) {
    return
  }

  try {
    await deleteRole(role.id)
    roles.value = roles.value.filter((item) => item.id !== role.id)
  } catch {
    actionError.value = 'No se pudo eliminar el rol.'
  }
}

onMounted(() => {
  void loadRoles()
})
</script>

<template>
  <div class="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 lg:px-8">
    <AdminPageHeader
      section="Roles y permisos"
      title="Roles y permisos"
      description="Cada permiso habilita secciones concretas del portal. Los cambios se aplican a los usuarios con ese rol."
    >
      <template #actions>
        <button
          type="button"
          class="font-label rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-on-primary shadow-sm hover:bg-primary-container"
          @click="editingRole = null"
        >
          + Rol
        </button>
      </template>
    </AdminPageHeader>

    <p v-if="isLoading" class="text-sm text-on-surface-variant">Cargando roles…</p>
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

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <article v-for="role in roles" :key="role.id" class="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <div class="flex items-start justify-between gap-2">
            <div>
              <h2 class="font-headline text-lg font-semibold text-on-surface">{{ role.name }}</h2>
              <p class="mt-0.5 text-xs text-on-surface-variant">{{ role.description }}</p>
            </div>
            <span class="font-label shrink-0 rounded-full bg-surface-container px-2.5 py-1 text-[11px] font-bold text-primary">
              {{ usersWithRole(role) }} {{ usersWithRole(role) === 1 ? 'usuario' : 'usuarios' }}
            </span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="permission in role.permissions"
              :key="permission"
              class="font-label rounded bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary"
            >
              {{ permissionLabel[permission] }}
            </span>
            <span v-if="role.permissions.length === 0" class="text-xs text-on-surface-variant">Sin permisos</span>
          </div>
          <div v-if="role.id !== OWNER_ROLE_ID" class="mt-auto flex justify-end gap-2 border-t border-outline-variant/50 pt-3">
            <button
              type="button"
              class="font-label rounded-lg bg-surface-container px-3 py-1.5 text-[11px] font-semibold text-on-surface hover:bg-surface-container-high"
              @click="editingRole = role"
            >
              Editar
            </button>
            <button
              type="button"
              class="font-label rounded-lg bg-error-container px-3 py-1.5 text-[11px] font-semibold text-on-error-container hover:bg-error/20"
              @click="removeRole(role)"
            >
              Eliminar
            </button>
          </div>
          <p v-else class="mt-auto text-[11px] text-on-surface-variant">Rol del sistema: no se puede editar ni eliminar.</p>
        </article>
      </div>
    </template>

    <RoleDialog v-if="editingRole !== undefined" :role="editingRole" @close="editingRole = undefined" @save="saveRole" />
  </div>
</template>
