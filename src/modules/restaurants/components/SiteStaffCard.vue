<script setup lang="ts">
import { staffAreaLabel, staffStatusLabel } from '@/modules/restaurants/site-labels'
import type { SiteStaffMember } from '@/modules/restaurants/types'
import { getInitials } from '@/utils/string'

defineProps<{
  member: SiteStaffMember
}>()

const statusClass: Record<SiteStaffMember['status'], string> = {
  'on-shift': 'bg-primary/10 text-primary',
  break: 'bg-tertiary-fixed text-on-tertiary-container',
  absent: 'bg-error-container text-on-error-container',
}
</script>

<template>
  <article class="flex items-center gap-3 rounded-xl bg-surface-container-low px-3 py-2.5">
    <span
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-on-primary"
      aria-hidden="true"
    >
      {{ getInitials(member.name) }}
    </span>
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-semibold text-on-surface">{{ member.name }}</p>
      <p class="truncate text-xs text-on-surface-variant">
        {{ member.role }} · {{ staffAreaLabel[member.area] }}
      </p>
    </div>
    <span
      class="font-label shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase"
      :class="statusClass[member.status]"
    >
      {{ staffStatusLabel[member.status] }}
    </span>
  </article>
</template>
