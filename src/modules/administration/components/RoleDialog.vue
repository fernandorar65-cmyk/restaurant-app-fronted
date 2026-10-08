<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'

import type { Role, RoleDraft } from '@/modules/administration/types'
import { PERMISSIONS, permissionLabel } from '@/modules/auth/permissions'
import type { Permission } from '@/modules/auth/permissions'

const props = defineProps<{
  role: Role | null
}>()

const emit = defineEmits<{
  close: []
  save: [draft: RoleDraft]
}>()

const dialogEl = ref<HTMLDialogElement | null>(null)
const name = ref(props.role?.name ?? '')
const description = ref(props.role?.description ?? '')
const permissions = ref<Permission[]>([...(props.role?.permissions ?? [])])
const formError = ref<string | null>(null)

function togglePermission(permission: Permission): void {
  permissions.value = permissions.value.includes(permission)
    ? permissions.value.filter((item) => item !== permission)
    : [...permissions.value, permission]
}

function closeDialog(): void {
  dialogEl.value?.close()
}

function submit(): void {
  if (!name.value.trim()) {
    formError.value = 'El rol necesita un nombre.'
    return
  }

  emit('save', {
    name: name.value.trim(),
    description: description.value.trim(),
    permissions: PERMISSIONS.filter((permission) => permissions.value.includes(permission)),
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
    class="app-dialog overflow-hidden bg-surface-container-lowest p-0 text-on-surface" style="--dialog-width: 30rem"
    aria-labelledby="role-dialog-title"
    @close="emit('close')"
  >
    <form class="max-h-[85vh] space-y-4 overflow-y-auto p-6" @submit.prevent="submit">
      <h2 id="role-dialog-title" class="font-headline text-lg font-semibold text-on-surface">
        {{ role ? `Editar rol: ${role.name}` : 'Nuevo rol' }}
      </h2>

      <label class="block space-y-1.5">
        <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Nombre</span>
        <input
          v-model="name"
          class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          required
          type="text"
        />
      </label>

      <label class="block space-y-1.5">
        <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Descripción</span>
        <textarea
          v-model="description"
          class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          rows="2"
        />
      </label>

      <fieldset class="space-y-2">
        <legend class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Permisos</legend>
        <div class="grid gap-1.5 rounded-lg bg-surface p-3">
          <label v-for="permission in PERMISSIONS" :key="permission" class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              class="h-4 w-4 accent-primary"
              :checked="permissions.includes(permission)"
              @change="togglePermission(permission)"
            />
            {{ permissionLabel[permission] }}
          </label>
        </div>
      </fieldset>

      <p v-if="formError" class="rounded-lg bg-error-container px-3 py-2 text-xs text-on-error-container">{{ formError }}</p>

      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="font-label rounded-xl bg-surface-container min-h-11 px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-high"
          @click="closeDialog"
        >
          Cancelar
        </button>
        <button type="submit" class="font-label rounded-xl bg-primary min-h-11 px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-container">
          Guardar
        </button>
      </div>
    </form>
  </dialog>
</template>
